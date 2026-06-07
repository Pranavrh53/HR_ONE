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

    prompt = f"""You are an expert technical interviewer preparing for a job interview.

Candidate: {candidate_name}
Role: {job_title}
Job Description: {job_description}
Required Skills: {required_skills}

Candidate AI Screening Results:
- Summary: {resume_summary}
- Strengths: {', '.join(strengths)}
- Weaknesses: {', '.join(weaknesses)}
- Matched Skills: {', '.join(skills_matched)}
- Missing Skills: {', '.join(skills_missing)}

Generate exactly 8 personalized interview questions that:
1. Start with a warm intro question ("Tell me about yourself / your background")
2. Include 3 technical questions based on their matched skills
3. Include 2 behavioral questions (STAR format)
4. Include 1 question about their missing/weak skills to probe depth
5. End with 1 scenario-based question relevant to the role

Make questions conversational, not robotic. Probe their actual experience.

Respond ONLY with a valid JSON array of strings:
["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8"]"""

    try:
        raw = call_gemini(prompt).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        questions = json.loads(raw)
        return {"questions": questions}
    except Exception as e:
        # Fallback questions
        return {"questions": [
            f"Tell me about yourself and your background in {job_title}.",
            f"Walk me through a challenging technical project you've worked on.",
            f"How do you approach debugging a complex problem?",
            f"Tell me about a time you had to learn a new technology quickly.",
            f"How do you handle tight deadlines and pressure?",
            f"Describe your experience with {required_skills.split(',')[0] if required_skills else 'your primary skill'}.",
            f"Where do you see yourself in 3 years?",
            f"Do you have any questions for us about the role?"
        ]}


@app.post("/interview/evaluate-answer")
async def evaluate_answer(body: dict):
    question = body.get("question", "")
    answer = body.get("answer", "")
    job_title = body.get("job_title", "")

    if not answer or len(answer.strip()) < 5:
        return {"technical_score": 0, "communication_score": 0, "clarity_score": 0, "relevance_score": 0, "feedback": "No answer provided."}

    prompt = f"""You are evaluating a job interview answer for a {job_title} role.

Question: {question}
Candidate Answer: {answer}

Score each dimension from 0-100 and give brief feedback.

Respond ONLY with valid JSON:
{{
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "clarity_score": <0-100>,
  "relevance_score": <0-100>,
  "feedback": "<2-3 sentence constructive feedback>"
}}"""

    try:
        raw = call_gemini(prompt).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        return json.loads(raw)
    except Exception as e:
        return {"technical_score": 60, "communication_score": 60, "clarity_score": 60, "relevance_score": 60, "feedback": "Answer received and recorded."}


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

    prompt = f"""You are a senior HR analyst reviewing a completed job interview for: {job_title}
Candidate: {candidate_name}

Full Interview Transcript:
{transcript[:8000]}

Provide a comprehensive final evaluation.

Respond ONLY with valid JSON:
{{
  "communication_score": <0-100>,
  "technical_score": <0-100>,
  "problem_solving_score": <0-100>,
  "behavioral_score": <0-100>,
  "overall_score": <0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendation": "<Strong Hire|Hire|Consider|Reject>",
  "summary": "<3-4 sentence professional summary of the candidate based on the interview>"
}}"""

    try:
        raw = call_gemini(prompt).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        return json.loads(raw)
    except Exception as e:
        return {
            "communication_score": 65, "technical_score": 65,
            "problem_solving_score": 65, "behavioral_score": 65, "overall_score": 65,
            "strengths": ["Completed the interview", "Showed willingness to engage"],
            "weaknesses": ["Analysis unavailable"],
            "recommendation": "Consider",
            "summary": f"{candidate_name} completed the AI interview for {job_title}. Manual review recommended."
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
