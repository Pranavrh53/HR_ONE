import os
import json
import re
import fitz  # PyMuPDF
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from google.genai import types

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


def parse_skills(required_skills: str) -> List[str]:
    if not required_skills:
        return []
    parts = re.split(r"[,;\n|]+", required_skills)
    return [p.strip() for p in parts if p.strip()]


def estimate_experience(text: str) -> str:
    match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)", text, re.I)
    if match:
        return f"{match.group(1)} years"
    return "Not specified"


def estimate_education(text: str) -> str:
    patterns = [
        r"B\.?\s*E\.?|B\.?\s*Tech|M\.?\s*Tech|B\.?\s*Sc|M\.?\s*Sc|MBA|Ph\.?\s*D",
        r"Bachelor|Master|Doctorate",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return match.group(0)
    return "Not specified"


def recommendation_from_score(score: int) -> str:
    if score >= 85:
        return "Highly Recommended"
    if score >= 70:
        return "Recommended"
    if score >= 50:
        return "Potential Match"
    return "Not Recommended"


def build_interview_questions(matched: List[str], missing: List[str], job_title: str) -> List[str]:
    questions = []
    for skill in matched[:2]:
        questions.append(f"Explain your experience with {skill} and a project where you used it.")
    for skill in missing[:2]:
        questions.append(f"The role requires {skill}. How would you approach learning or applying it?")
    if len(questions) < 3:
        questions.append(f"Describe a challenging project relevant to the {job_title} role.")
    if len(questions) < 4:
        questions.append("How would you design a scalable REST API for an HRMS product?")
    if len(questions) < 5:
        questions.append("Explain how you would optimize MongoDB queries for large datasets.")
    return questions[:5]


def local_screen_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: str,
    candidate_name: str = "",
) -> dict:
    skills = parse_skills(required_skills)
    text_lower = resume_text.lower()

    matched = [skill for skill in skills if skill.lower() in text_lower]
    missing = [skill for skill in skills if skill.lower() not in text_lower]

    skill_ratio = (len(matched) / len(skills)) if skills else 0.5
    jd_hits = sum(1 for word in re.findall(r"[a-zA-Z]{4,}", job_description.lower()) if word in text_lower)
    jd_bonus = min(jd_hits / 20, 1) * 15
    experience = estimate_experience(resume_text)
    education = estimate_education(resume_text)

    score = int(min(100, round(skill_ratio * 70 + jd_bonus + min(len(resume_text) / 500, 15))))
    recommendation = recommendation_from_score(score)

    strengths = []
    if matched:
        strengths.append(f"Strong match on: {', '.join(matched[:4])}")
    if "project" in text_lower or "built" in text_lower or "developed" in text_lower:
        strengths.append("Demonstrates hands-on project experience")
    if not strengths:
        strengths.append("Resume provides baseline profile for review")

    weaknesses = []
    if missing:
        weaknesses.append(f"Missing key skills: {', '.join(missing[:4])}")
    if experience == "Not specified":
        weaknesses.append("Experience level not clearly stated")
    if not weaknesses:
        weaknesses.append("Limited alignment with some job requirements")

    return {
        "score": score,
        "match_percentage": float(score),
        "summary": (
            f"Local screening analysis for {candidate_name or 'candidate'} against {job_title}. "
            f"Matched {len(matched)} of {len(skills) or 'listed'} required skills."
        ),
        "strengths": strengths[:3],
        "weaknesses": weaknesses[:2],
        "skills_matched": matched,
        "skills_missing": missing,
        "years_of_experience": experience,
        "education": education,
        "recommendation": recommendation,
        "interview_questions": build_interview_questions(matched, missing, job_title),
        "extracted_text": resume_text[:8000],
        "analysis_mode": "local",
    }


def parse_json_response(raw: str):
    cleaned = raw.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned.strip())


def call_gemini(prompt: str, retries: int = 2) -> str:
    if not client:
        raise Exception("Gemini API key not configured")

    import time

    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=2048),
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                wait = 10 * (attempt + 1)
                print(f"Rate limited. Waiting {wait}s before retry {attempt + 1}/{retries}...")
                time.sleep(wait)
            else:
                raise
    raise Exception("Gemini quota exceeded or unavailable")


def screen_with_gemini(resume_text: str, job_title: str, job_description: str, required_skills: str) -> dict:
    prompt = f"""You are a senior Technical HR Recruiter with 15+ years of experience.

Carefully analyze this Resume against the Job Description and provide an accurate evaluation.

=== JOB DETAILS ===
Title: {job_title}
Required Skills: {required_skills}
Description: {job_description}

=== RESUME ===
{resume_text[:6000]}

=== TASK ===
Evaluate strictly. Consider skill match, experience level, education, and project relevance.

Respond ONLY with a valid JSON object (no markdown fences, no extra text):
{{
  "score": <integer 0-100>,
  "match_percentage": <float same as score>,
  "summary": "<2-3 sentence professional summary of the candidate fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<gap 1>", "<gap 2>"],
  "skills_matched": ["<matched skill>"],
  "skills_missing": ["<missing skill>"],
  "years_of_experience": "<estimated e.g. 3 years>",
  "education": "<highest qualification>",
  "recommendation": "<Highly Recommended|Recommended|Potential Match|Not Recommended>",
  "interview_questions": ["<question 1>", "<question 2>", "<question 3>", "<question 4>", "<question 5>"]
}}"""

    raw = call_gemini(prompt).strip()
    result = parse_json_response(raw)
    result["extracted_text"] = resume_text[:8000]
    result["analysis_mode"] = "gemini"
    return result


def analyze_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: str,
    candidate_name: str = "",
) -> dict:
    try:
        return screen_with_gemini(resume_text, job_title, job_description, required_skills)
    except Exception as error:
        print(f"Gemini unavailable, using local screening: {error}")
        return local_screen_resume(
            resume_text,
            job_title,
            job_description,
            required_skills,
            candidate_name,
        )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "TalentSphere AI",
        "model": MODEL,
        "gemini_configured": bool(GEMINI_API_KEY),
    }


@app.post("/screen-resume")
async def screen_resume(
    file: UploadFile = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    required_skills: str = Form(default=""),
):
    pdf_bytes = await file.read()
    resume_text = extract_text(pdf_bytes)

    if not resume_text or len(resume_text) < 30:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

    try:
        result = analyze_resume(
            resume_text,
            job_title,
            job_description,
            required_skills,
            candidate_name=file.filename or "",
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
):
    print(f"Bulk processing {len(files)} resumes...")

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

        analysis = analyze_resume(text, job_title, job_description, required_skills, file.filename)
        analysis["candidate_name"] = file.filename
        results.append(analysis)

    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return {"results": results, "total": len(results)}


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
