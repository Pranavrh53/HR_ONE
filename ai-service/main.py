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


def call_gemini(prompt: str, retries: int = 2) -> str:
    if not client:
        raise Exception("Gemini API key not configured")

    import time

    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=2048),
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


def analyze_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: str,
    candidate_name: str = "",
) -> dict:
    """
    Pipeline: PyMuPDF text → deterministic skill match + ATS score → Gemini explanation only.
    """
    gemini_fn = call_gemini if client else None
    return run_screening_pipeline(
        resume_text=resume_text,
        job_title=job_title,
        job_description=job_description,
        required_skills=required_skills,
        candidate_name=candidate_name,
        call_gemini_fn=gemini_fn,
        parse_json_fn=parse_json_response,
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
        analysis["candidate_name"] = analysis.get("candidate_name") or file.filename
        results.append(analysis)

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
