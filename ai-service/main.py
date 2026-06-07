import os
import json
import fitz  # PyMuPDF
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from google.genai import types

from screening_pipeline import (
    parse_skills,
    run_screening_pipeline,
)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

app = FastAPI(title="TalentSphere AI Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def extract_text(pdf_bytes: bytes) -> str:
    text = ""
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()


def parse_json_response(raw: str):
    cleaned = raw.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned.strip())


def call_gemini(prompt: str) -> str:
    """Call Gemini once; fail fast on rate limits so deterministic fallback is used immediately."""
    if not client:
        raise Exception("Gemini API key not configured")

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=2048),
        )
        return response.text
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise Exception("Gemini quota exceeded or unavailable")
        raise


import time

def call_gemini_chat(prompt: str, retries: int = 3, base_delay: float = 2.0) -> str:
    """Call Gemini with exponential backoff for HR chat — tolerates short rate limit bursts."""
    if not client:
        raise Exception("Gemini API key not configured")

    last_err = None
    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.7, max_output_tokens=512),
            )
            return response.text
        except Exception as e:
            last_err = e
            err_str = str(e)
            is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
            if is_rate_limit and attempt < retries - 1:
                wait = base_delay * (2 ** attempt)   # 2s, 4s, 8s
                print(f"[HR Chat] Rate limited, retrying in {wait}s (attempt {attempt + 1}/{retries})")
                time.sleep(wait)
                continue
            raise  # non-rate-limit error or last attempt
    raise last_err


def analyze_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: str,
    candidate_name: str = "",
    skip_gemini: bool = False,
    requirements: str = "",
    experience_min: int = 0,
    experience_max: int = 0,
    education: str = "",
) -> dict:
    """
    Pipeline: PyMuPDF text → deterministic skill match + ATS score → Gemini explanation only.
    """
    gemini_fn = None if skip_gemini or not client else call_gemini
    return run_screening_pipeline(
        resume_text=resume_text,
        job_title=job_title,
        job_description=job_description,
        required_skills=required_skills,
        candidate_name=candidate_name,
        call_gemini_fn=gemini_fn,
        parse_json_fn=parse_json_response,
        requirements=requirements,
        experience_min=experience_min,
        education=education,
    )


@app.get("/health")
async def health():
    from screening_pipeline import get_embedding_model

    model = get_embedding_model()
    return {
        "status": "ok",
        "service": "TalentSphere AI",
        "model": MODEL,
        "gemini_configured": bool(GEMINI_API_KEY),
        "pipeline": "PyMuPDF → Skill Match → Deterministic ATS Score → Gemini Explanation",
        "sentence_transformers": model is not None,
    }


@app.post("/screen-resume")
async def screen_resume(
    file: UploadFile = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    required_skills: str = Form(default=""),
    skip_gemini: str = Form(default="false"),
    requirements: str = Form(default=""),
    experience_min: str = Form(default="0"),
    experience_max: str = Form(default="0"),
    education: str = Form(default=""),
):
    pdf_bytes = await file.read()
    resume_text = extract_text(pdf_bytes)

    if not resume_text or len(resume_text) < 30:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

    fast_mode = skip_gemini.lower() in ("true", "1", "yes")

    try:
        result = analyze_resume(
            resume_text,
            job_title,
            job_description,
            required_skills,
            candidate_name=file.filename or "",
            skip_gemini=fast_mode,
            requirements=requirements,
            experience_min=int(experience_min or 0),
            experience_max=int(experience_max or 0),
            education=education,
        )
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Screening error: {str(e)}")


@app.post("/screen-multiple")
async def screen_multiple(
    files: List[UploadFile] = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    required_skills: str = Form(default=""),
    requirements: str = Form(default=""),
    experience_min: str = Form(default="0"),
    experience_max: str = Form(default="0"),
    education: str = Form(default=""),
):
    print(f"Bulk processing {len(files)} resumes for job: {job_title}")

    results = []
    for file in files:
        pdf_bytes = await file.read()
        text = extract_text(pdf_bytes)
        if not text or len(text) < 30:
            results.append({
                "candidate_name": file.filename,
                "score": 0,
                "match_percentage": 0,
                "summary": "Could not extract text from PDF.",
                "strengths": [],
                "weaknesses": ["Unreadable or empty PDF"],
                "skills_matched": [],
                "skills_missing": parse_skills(required_skills),
                "years_of_experience": "N/A",
                "education": "N/A",
                "recommendation": "Not Recommended",
                "interview_questions": [],
                "analysis_mode": "error",
            })
            continue

        try:
            analysis = analyze_resume(
                text, job_title, job_description, required_skills,
                file.filename, skip_gemini=True,
                requirements=requirements,
                experience_min=int(experience_min or 0),
                experience_max=int(experience_max or 0),
                education=education,
            )
            analysis["candidate_name"] = analysis.get("candidate_name") or file.filename
            results.append(analysis)
        except Exception as exc:
            print(f"Error screening {file.filename}: {exc}")
            results.append({
                "candidate_name": file.filename,
                "score": 0,
                "match_percentage": 0,
                "summary": f"Screening failed: {exc}",
                "strengths": [],
                "weaknesses": ["Processing error"],
                "skills_matched": [],
                "skills_missing": parse_skills(required_skills),
                "years_of_experience": "N/A",
                "education": "N/A",
                "recommendation": "Not Recommended",
                "interview_questions": [],
                "analysis_mode": "error",
                "error": str(exc),
            })

    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return {"results": results, "total": len(results)}


@app.post("/compare-candidates")
async def compare_candidates_endpoint(body: dict):
    job_title = body.get("job_title", "")
    job_description = body.get("job_description", "")
    required_skills = body.get("required_skills", "")
    candidates = body.get("candidates", [])

    if len(candidates) < 2:
        raise HTTPException(status_code=400, detail="At least 2 candidates required")

    candidates_sorted = sorted(candidates, key=lambda x: x.get("score", 0), reverse=True)
    prompt = f"""You are a senior technical recruiter comparing candidates for one role.

Job: {job_title}
Description: {job_description[:1000]}
Required Skills: {required_skills}

Candidates (pre-scored by ATS — do not change scores):
{json.dumps(candidates_sorted, indent=2)}

Write a comparative hiring report. Be specific — reference actual skills, experience, and summaries.

Return ONLY valid JSON:
{{
  "best_technical_fit": {{"candidate_id": "", "name": "", "reason": ""}},
  "best_project_portfolio": {{"candidate_id": "", "name": "", "reason": ""}},
  "best_experience_match": {{"candidate_id": "", "name": "", "reason": ""}},
  "final_recommendation": "<who to interview first and why>",
  "comparison_summary": "<3-4 sentence overview>",
  "ranking_rationale": ["<why #1 ranked above #2>", "..."]
}}"""

    try:
        raw = call_gemini(prompt).strip()
        report = parse_json_response(raw)
        report["candidates_compared"] = len(candidates)
        report["analysis_mode"] = "gemini"
        return report
    except Exception as e:
        top = candidates_sorted[0]
        second = candidates_sorted[1] if len(candidates_sorted) > 1 else top
        return {
            "best_technical_fit": {
                "candidate_id": top.get("id", ""),
                "name": top.get("name", ""),
                "reason": f"Highest ATS score ({top.get('score')}) with skills: {', '.join((top.get('matched_skills') or [])[:4])}",
            },
            "best_project_portfolio": {
                "candidate_id": top.get("id", ""),
                "name": top.get("name", ""),
                "reason": top.get("summary", "Strongest overall profile from ATS breakdown"),
            },
            "best_experience_match": {
                "candidate_id": top.get("id", ""),
                "name": top.get("name", ""),
                "reason": f"Experience: {top.get('experience', 'N/A')}",
            },
            "final_recommendation": f"Interview {top.get('name')} first (score {top.get('score')}), then {second.get('name')} (score {second.get('score')}).",
            "comparison_summary": f"Compared {len(candidates)} candidates. {top.get('name')} leads on composite ATS score.",
            "ranking_rationale": [
                f"{top.get('name')} outscores {second.get('name')} on overall ATS fit",
            ],
            "candidates_compared": len(candidates),
            "analysis_mode": "deterministic_fallback",
            "error": str(e),
        }


@app.post("/chat")
async def chat(body: dict):
    message = body.get("message", "")
    context = body.get("context", "")

    prompt = f"""You are an intelligent HR Assistant for TalentSphere HRMS.
Help HR managers and employees with HR-related queries professionally.

Context: {context}

Question: {message}

Respond concisely and helpfully."""

    try:
        reply = call_gemini(prompt)
        return {"reply": reply, "analysis_mode": "gemini"}
    except Exception as e:
        return {
            "reply": (
                "HR Assistant is temporarily unavailable (Gemini quota exceeded). "
                "Please check leave policies in the employee handbook or contact HR directly."
            ),
            "analysis_mode": "fallback",
            "error": str(e),
        }



# ─── AI Voice Interview Endpoints ────────────────────────────────────────────────

@app.post("/interview/generate-questions")
async def generate_interview_questions(body: dict):
    job_title = body.get("job_title", "")
    job_description = body.get("job_description", "")
    required_skills = body.get("required_skills", "")
    candidate_name = body.get("candidate_name", "Candidate")
    resume_summary = body.get("resume_summary", "")
    strengths = body.get("strengths", [])
    weaknesses = body.get("weaknesses", [])
    skills_matched = body.get("skills_matched", [])
    skills_missing = body.get("skills_missing", [])

    skills_str = ', '.join(skills_matched) if skills_matched else required_skills or 'general software development'
    missing_str = ', '.join(skills_missing) if skills_missing else 'none identified'

    prompt = f"""You are a senior technical interviewer for a {job_title} position.

Candidate: {candidate_name}
Job Description: {job_description[:2000]}
Required Skills: {required_skills}

Candidate's Resume Analysis:
- Summary: {resume_summary[:1000]}
- Technical Strengths: {', '.join(strengths)}
- Weaknesses: {', '.join(weaknesses)}
- Skills They Have: {skills_str}
- Skills They're Missing: {missing_str}

Generate exactly 10 interview questions following this EXACT distribution:

QUESTION 1 (Intro): Brief warm-up — "Walk me through your most relevant project experience for this {job_title} role."

QUESTIONS 2-4 (Deep Technical — based on their skills: {skills_str}):
- Ask about specific technical concepts, not vague questions
- Example: "Explain how you'd implement X using Y" or "What's the difference between X and Y and when would you use each?"
- Probe their understanding of the technologies listed in the JD

QUESTION 5 (System Design / Architecture):
- A system design or architecture question relevant to {job_title}
- Example: "How would you design a scalable [system relevant to JD]?"

QUESTION 6 (Debugging / Problem Solving):
- A practical debugging or troubleshooting scenario
- Example: "Your API response time just jumped from 200ms to 5s in production. Walk me through your debugging process."

QUESTION 7 (Project Deep-Dive):
- Ask them to deep-dive into a project from their resume
- "Pick one project you're proudest of. Explain the technical challenges, your architecture choices, and what you'd do differently."

QUESTION 8 (Gap Probing — their missing skills: {missing_str}):
- Ask about a skill they DON'T have to see how they learn
- "This role requires {missing_str}. How would you approach learning and implementing it?"

QUESTION 9 (Situational / Behavioral):
- ONE hypothetical work scenario (deadline pressure, team conflict, etc.)

QUESTION 10 (Closing):
- "What technical problems excite you most, and how does this role align with your career goals?"

CRITICAL RULES:
- Do NOT ask generic questions like "Tell me about yourself" or "Where do you see yourself in 5 years"
- Every question must reference specific technologies, skills, or scenarios from the JD
- Questions should feel like a real tech interview, not HR screening

Respond ONLY with a valid JSON array of 10 question strings:
["question 1", "question 2", ..., "question 10"]"""

    try:
        raw = call_gemini(prompt).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        questions = json.loads(raw)
        if isinstance(questions, list) and len(questions) >= 5:
            return {"questions": questions}
        raise ValueError("Invalid question format")
    except Exception as e:
        print(f"Gemini Question Generation failed: {e}")
        # Technical fallback using context
        primary = skills_matched[0] if skills_matched else "your primary technology stack"
        secondary = skills_matched[1] if len(skills_matched) > 1 else "system design"
        gap_skill = skills_missing[0] if skills_missing else "a technology you haven't used before"
        return {"questions": [
            f"Walk me through your most relevant project experience for this {job_title} role — what was the tech stack and what was your specific contribution?",
            f"Explain how {primary} works under the hood. What are its key strengths and limitations in a production environment?",
            f"Describe a complex technical problem you solved using {primary}. What was your approach and what tradeoffs did you make?",
            f"How would you design a scalable backend system for a {job_title} use case? Walk me through your architecture decisions.",
            f"Tell me about a production bug you debugged that was particularly tricky. How did you isolate and fix it?",
            f"Pick your best project. Explain the architecture, the hardest technical challenge, and what you'd change if you rebuilt it today.",
            f"This role involves {secondary}. Can you explain a real scenario where you applied it and what the outcome was?",
            f"This position requires {gap_skill}, which wasn't highlighted in your resume. How would you approach learning and implementing it?",
            f"Imagine your team is behind on a critical release and you discover a major design flaw. How would you handle the situation?",
            f"What technical challenges excite you most right now, and how does this {job_title} role fit into your growth path?"
        ]}


@app.post("/interview/evaluate-answer")
async def evaluate_answer(body: dict):
    question = body.get("question", "")
    answer = body.get("answer", "")
    job_title = body.get("job_title", "")

    # Deterministic quality analysis of the answer
    answer_clean = answer.strip().lower()
    word_count = len(answer_clean.split())
    
    # Detect non-answers
    non_answer_phrases = ["i don't know", "idk", "i have no idea", "not sure", "no idea", 
                          "i don't have", "skip", "pass", "next question", "i can't answer",
                          "no experience", "haven't done", "never done", "i'm not familiar"]
    is_non_answer = any(phrase in answer_clean for phrase in non_answer_phrases)
    
    if not answer or word_count < 3:
        return {"technical_score": 0, "communication_score": 0, "clarity_score": 0, "relevance_score": 0, 
                "feedback": "No meaningful answer provided."}

    if is_non_answer and word_count < 20:
        return {"technical_score": 5, "communication_score": 15, "clarity_score": 10, "relevance_score": 0,
                "feedback": "Candidate could not answer this question. No technical depth demonstrated."}

    # Try Gemini for nuanced evaluation
    prompt = f"""You are a STRICT technical interviewer scoring a job interview answer for: {job_title}

Question: {question}
Candidate Answer: {answer}

SCORING RULES (BE HARSH AND HONEST):
- If the candidate says "I don't know" or gives a vague non-answer: ALL scores should be 0-15
- If the answer is generic with no specific details: scores should be 20-40
- If the answer shows some knowledge but lacks depth: scores should be 40-60
- If the answer is good with specific examples: scores should be 60-80
- Only give 80+ for exceptional answers with deep technical insight

Score each dimension from 0-100:
- technical_score: Does the answer demonstrate real technical knowledge? Specific technologies, concepts, patterns?
- communication_score: Is the answer well-structured and clear?
- clarity_score: Is the answer easy to follow with logical flow?
- relevance_score: Does the answer actually address the question asked?

Respond ONLY with valid JSON:
{{
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "clarity_score": <0-100>,
  "relevance_score": <0-100>,
  "feedback": "<2-3 sentence honest feedback>"
}}"""

    try:
        raw = call_gemini(prompt).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        result = json.loads(raw)
        # Sanity check: if all scores are identical, Gemini likely gave lazy output
        scores = [result.get("technical_score", 0), result.get("communication_score", 0), 
                  result.get("clarity_score", 0), result.get("relevance_score", 0)]
        if len(set(scores)) == 1 and scores[0] > 30:
            # All scores identical and high — likely lazy, use deterministic
            raise ValueError("Gemini returned lazy identical scores")
        return result
    except Exception as e:
        print(f"[evaluate-answer] Gemini failed: {e} — using deterministic scoring")
        # Deterministic scoring based on answer quality
        tech_keywords = ["api", "database", "algorithm", "framework", "architecture", "deploy", 
                         "server", "client", "component", "function", "class", "method", "test",
                         "debug", "performance", "cache", "queue", "async", "docker", "git",
                         "react", "node", "python", "javascript", "sql", "mongodb", "aws"]
        keyword_hits = sum(1 for kw in tech_keywords if kw in answer_clean)
        
        # Base score from word count
        if word_count < 10: base = 10
        elif word_count < 30: base = 25
        elif word_count < 60: base = 40
        elif word_count < 100: base = 55
        else: base = 65
        
        tech_bonus = min(keyword_hits * 5, 25)
        specificity_bonus = 10 if any(c.isdigit() for c in answer) else 0  # mentions numbers = specific
        
        tech_score = min(base + tech_bonus, 95)
        comm_score = min(base + 5, 90)
        clarity = min(base, 85)
        relevance = min(base + specificity_bonus, 90)
        
        feedback = f"Answer was {word_count} words. "
        if keyword_hits > 3: feedback += "Good use of technical terminology. "
        elif keyword_hits > 0: feedback += "Some technical content detected. "
        else: feedback += "Answer lacked technical specificity. "
        if is_non_answer: feedback = "Candidate did not provide a substantive answer to this question."
            
        return {
            "technical_score": tech_score if not is_non_answer else 5,
            "communication_score": comm_score if not is_non_answer else 15,
            "clarity_score": clarity if not is_non_answer else 10,
            "relevance_score": relevance if not is_non_answer else 0,
            "feedback": feedback,
        }


@app.post("/interview/follow-up")
async def generate_follow_up(body: dict):
    last_question = body.get("last_question", "")
    last_answer = body.get("last_answer", "")
    job_title = body.get("job_title", "")

    prompt = f"""You are an expert technical interviewer conducting a {job_title} interview.

The candidate just answered:
Question: {last_question}
Answer: {last_answer}

Generate ONE intelligent follow-up question based on what they said.
- If they mentioned a specific technology, ask them to go deeper.
- If something was vague, ask for clarification.
- If the answer was good, challenge them with an edge case.

Return ONLY the follow-up question as a plain string (no JSON, no quotes)."""

    try:
        follow_up = call_gemini(prompt).strip().strip('"').strip("'")
        return {"follow_up": follow_up}
    except Exception as e:
        return {"follow_up": "Can you elaborate more on that point?"}


@app.post("/interview/final-analysis")
async def final_analysis(body: dict):
    job_title = body.get("job_title", "")
    candidate_name = body.get("candidate_name", "Candidate")
    transcript = body.get("transcript", "")

    # Deterministic pre-analysis of transcript quality
    lines = transcript.strip().split("\n")
    answers_only = [l.strip() for l in lines if l.strip().startswith("A:")]
    total_answer_words = sum(len(a.split()) for a in answers_only)
    num_answers = max(len(answers_only), 1)
    avg_words = total_answer_words / num_answers
    
    non_answer_phrases = ["i don't know", "idk", "not sure", "no idea", "skip", "pass", "can't answer"]
    non_answer_count = sum(1 for a in answers_only if any(p in a.lower() for p in non_answer_phrases))
    non_answer_ratio = non_answer_count / num_answers

    prompt = f"""You are a STRICT senior technical interviewer reviewing a completed interview for: {job_title}
Candidate: {candidate_name}

Full Interview Transcript:
{transcript[:8000]}

IMPORTANT SCORING GUIDELINES:
- If the candidate said "I don't know" or gave no real answer to most questions: ALL scores must be below 20
- If answers were vague/generic with no specifics: scores should be 20-40  
- If answers showed some knowledge but lacked depth: scores 40-60
- Good answers with examples and technical depth: 60-80
- Only 80+ for exceptional, detailed, insightful answers
- "I don't know" is NOT a valid answer — it shows lack of preparation

Be HONEST. Do NOT inflate scores. A candidate who cannot answer questions should score below 20.

Respond ONLY with valid JSON:
{{
  "communication_score": <0-100>,
  "technical_score": <0-100>,
  "problem_solving_score": <0-100>,
  "behavioral_score": <0-100>,
  "overall_score": <0-100>,
  "strengths": ["<genuine strength 1>", "<genuine strength 2>"],
  "weaknesses": ["<honest weakness 1>", "<honest weakness 2>", "<honest weakness 3>"],
  "recommendation": "<Strong Hire|Hire|Consider|Reject>",
  "summary": "<3-4 sentence HONEST assessment. If the candidate couldn't answer questions, say so clearly.>"
}}"""

    try:
        raw = call_gemini(prompt).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        result = json.loads(raw)
        
        # Sanity check: all scores should NOT be identical
        scores = [result.get("communication_score", 0), result.get("technical_score", 0),
                  result.get("problem_solving_score", 0), result.get("behavioral_score", 0)]
        if len(set(scores)) == 1:
            raise ValueError("Gemini returned identical scores — using deterministic")
        return result
    except Exception as e:
        print(f"[final-analysis] Gemini failed: {e} — using deterministic scoring")
        
        # Smart deterministic scoring based on transcript quality
        if non_answer_ratio > 0.6:
            # Majority non-answers
            return {
                "communication_score": 10, "technical_score": 5,
                "problem_solving_score": 5, "behavioral_score": 10, "overall_score": 8,
                "strengths": ["Attended the interview"],
                "weaknesses": [
                    f"Could not answer {non_answer_count} out of {num_answers} questions",
                    "No technical depth demonstrated",
                    "Appears unprepared for the role"
                ],
                "recommendation": "Reject",
                "summary": f"{candidate_name} was unable to answer most interview questions for the {job_title} role. The candidate appears to lack the required technical knowledge. Not recommended for advancement."
            }
        elif avg_words < 15:
            # Very short answers
            return {
                "communication_score": 25, "technical_score": 15,
                "problem_solving_score": 15, "behavioral_score": 20, "overall_score": 18,
                "strengths": ["Completed the interview"],
                "weaknesses": [
                    "Answers were extremely brief and lacked detail",
                    "No technical examples or specifics provided",
                    "Communication skills need significant improvement"
                ],
                "recommendation": "Reject",
                "summary": f"{candidate_name} provided very brief answers averaging {int(avg_words)} words each. Technical competence for {job_title} could not be verified. Not recommended."
            }
        elif avg_words < 40:
            # Below average answers
            base = 30
            return {
                "communication_score": base + 10, "technical_score": base,
                "problem_solving_score": base - 5, "behavioral_score": base + 5, "overall_score": base,
                "strengths": ["Attempted all questions", "Showed basic communication ability"],
                "weaknesses": [
                    "Answers lacked technical depth",
                    "Few specific examples or project references",
                ],
                "recommendation": "Consider",
                "summary": f"{candidate_name} completed the interview for {job_title} but answers were brief and lacked technical specificity. Further evaluation recommended."
            }
        else:
            # Decent length answers — moderate scores
            base = 50
            return {
                "communication_score": base + 10, "technical_score": base,
                "problem_solving_score": base - 5, "behavioral_score": base + 5, "overall_score": base,
                "strengths": ["Provided detailed answers", "Showed engagement with the process"],
                "weaknesses": ["AI analysis unavailable — manual review needed"],
                "recommendation": "Consider",
                "summary": f"{candidate_name} completed the interview for {job_title} with moderately detailed responses. AI-powered analysis was unavailable; manual review is recommended."
            }


@app.post("/interview/ai-hr-assistant")
async def ai_hr_assistant(body: dict):
    message = body.get("message", "")
    context = body.get("context", {})
    user_role = context.get("role", "employee")
    user_name = context.get("name", "User")
    
    # Structure the system prompt based on user role
    system_tone = ""
    if user_role == "candidate":
        system_tone = f"You are an empathetic HR Assistant for TalentSphere. Your goal is to guide candidates through their application and interview process. The current candidate is {user_name}."
    elif user_role == "employee":
        system_tone = f"You are a helpful HR Assistant for employees at TalentSphere. You help with leaves, payroll, and internal policies. You are talking to {user_name}."
    else:
        system_tone = f"You are a professional HR Analyst and Assistant. You provide recruitment stats and help managers with hiring decisions. You are assisting {user_name} (Role: {user_role})."

    prompt = f"""{system_tone}

RULE: You MUST ONLY assist with HR-related topics:
- Leave Management (Balance, Apply, Policy)
- Attendance & Working Hours
- Payroll & Benefits
- Recruitment (Job postings, Application status, Shortlisting)
- Interview Process & Feedback
- Onboarding (New joiner tasks, Status)
- Company Policies & Employee Handbook
- Employee Information

If the user asks about ANYTHING ELSE (recipes, history, sports, coding, etc.), respond with: 
"I can assist only with HR-related queries."

USER CONTEXT (Use this data to answer accurately):
{json.dumps(context, indent=2)}

USER QUESTION:
{message}

Answer concisely and professionally as a friendly HR bot."""

    try:
        reply = call_gemini_chat(prompt).strip()
        return {"reply": reply}
    except Exception as e:
        err_str = str(e)
        print(f"AI HR Assistant failed: {err_str}")
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
            return {"reply": "⚠️ The AI service is temporarily rate-limited due to high demand. Please wait a moment and try again."}
        return {"reply": "HR Assistant is temporarily unavailable. Please try again later."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
