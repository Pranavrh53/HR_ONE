"""
TalentSphere ATS pipeline:
  Resume → PyMuPDF text → structured extraction → 7-factor deterministic score → Gemini narrative only
"""
import json
import re
from typing import List, Tuple, Dict, Any

# Category max points (sum = 100)
WEIGHTS = {
    "skills": 35,
    "experience": 22,
    "projects": 18,
    "education": 8,
    "certifications": 7,
    "achievements": 5,
    "resume_quality": 5,
}

SKILL_ALIASES: Dict[str, List[str]] = {
    "react": ["react.js", "reactjs", "react native", "react-native"],
    "node.js": ["nodejs", "node", "express.js", "expressjs"],
    "mongodb": ["mongo", "mongo db"],
    "docker": ["docker compose", "containerization"],
    "aws": ["amazon web services", "ec2", "s3", "lambda"],
    "python": ["py"],
    "javascript": ["js", "ecmascript"],
    "typescript": ["ts"],
    "postgresql": ["postgres", "psql"],
    "mysql": ["sql"],
    "machine learning": ["ml", "scikit-learn", "sklearn"],
    "deep learning": ["dl", "neural network", "neural networks"],
    "generative ai": ["gen ai", "llm", "large language model"],
    "natural language processing": ["nlp"],
    "kubernetes": ["k8s"],
    "git": ["github", "gitlab", "bitbucket"],
    "rest": ["rest api", "restful", "rest apis"],
    "jwt": ["json web token"],
}

COMMON_TECH_PATTERNS = [
    r"\b(?:Python|Java|JavaScript|TypeScript|C\+\+|C#|Go|Rust|Ruby|PHP|Swift|Kotlin)\b",
    r"\b(?:React(?:\.js)?|Angular|Vue(?:\.js)?|Next\.js|Node\.js|Express(?:\.js)?|Django|Flask|FastAPI|Spring)\b",
    r"\b(?:MongoDB|PostgreSQL|MySQL|Redis|SQLite|DynamoDB)\b",
    r"\b(?:Docker|Kubernetes|AWS|Azure|GCP|Terraform|CI/CD|GitHub Actions)\b",
    r"\b(?:TensorFlow|PyTorch|scikit-learn|OpenAI|Gemini|LLM|NLP|Machine Learning|Deep Learning)\b",
    r"\b(?:HTML|CSS|Tailwind(?:CSS)?|Bootstrap|GraphQL|REST|JWT|OAuth)\b",
]

CERT_PATTERNS = [
    r"(?:AWS Certified|Azure Certified|GCP Certified|Google Cloud)",
    r"(?:Coursera|Udemy|IBM|Microsoft|Oracle|Cisco)\s+[\w\s]+(?:Certification|Certificate|Certified)",
    r"Certification[s]?:?\s*([^\n]{10,120})",
    r"(?:certified|certification)\s+(?:in|for)\s+([\w\s/+.-]{3,40})",
]

ACHIEVEMENT_PATTERNS = [
    r"(?:top\s+\d+|#\d+|ranked\s+\d+|finalist|winner|award|hackathon)",
    r"\d+%\s+(?:improvement|increase|reduction|accuracy|uptime)",
    r"\d+[kKmM+]?\s*(?:users|customers|requests|transactions)",
    r"(?:led|managed|mentored)\s+(?:a\s+)?team\s+of\s+\d+",
    r"\d+\+\s*(?:leetcode|problems solved)",
]

_embedding_model = None
_embedding_unavailable = False


def get_embedding_model():
    global _embedding_model, _embedding_unavailable
    if _embedding_unavailable:
        return None
    if _embedding_model is not None:
        return _embedding_model
    try:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        return _embedding_model
    except Exception as exc:
        print(f"SentenceTransformer unavailable: {exc}")
        _embedding_unavailable = True
        return None


def parse_skills(required_skills: str) -> List[str]:
    if not required_skills:
        return []
    parts = re.split(r"[,;\n|]+", required_skills)
    return [p.strip() for p in parts if p.strip()]


def skill_search_terms(skill: str) -> List[str]:
    terms = [skill.strip()]
    key = skill.strip().lower()
    if key in SKILL_ALIASES:
        terms.extend(SKILL_ALIASES[key])
    for alias_key, aliases in SKILL_ALIASES.items():
        if alias_key in key or key in alias_key:
            terms.append(alias_key)
            terms.extend(aliases)
    seen, unique = set(), []
    for t in terms:
        if t.lower() not in seen:
            seen.add(t.lower())
            unique.append(t)
    return unique


def exact_skill_in_text(skill: str, resume_lower: str) -> bool:
    for term in skill_search_terms(skill):
        if term.lower() in resume_lower:
            return True
        pattern = r"\b" + re.escape(term.lower()).replace(r"\ ", r"\s+") + r"\b"
        if re.search(pattern, resume_lower):
            return True
    return False


def semantic_skill_in_text(skill: str, resume_text: str, threshold: float = 0.52) -> bool:
    model = get_embedding_model()
    if model is None:
        return False
    try:
        from sentence_transformers import util
        chunks = [c.strip() for c in resume_text.split("\n") if len(c.strip()) > 15] or [resume_text[:2000]]
        skill_emb = model.encode(skill, convert_to_tensor=True)
        chunk_embs = model.encode(chunks[:80], convert_to_tensor=True)
        return float(util.cos_sim(skill_emb, chunk_embs)[0].max()) >= threshold
    except Exception:
        return False


def skill_has_project_evidence(skill: str, resume_text: str) -> bool:
    """Skill mentioned near project/action verbs = proficiency signal."""
    resume_lower = resume_text.lower()
    for term in skill_search_terms(skill):
        t = term.lower()
        if not re.search(re.escape(t), resume_lower):
            continue
        for m in re.finditer(re.escape(t), resume_lower):
            start = max(0, m.start() - 120)
            end = min(len(resume_lower), m.end() + 120)
            window = resume_lower[start:end]
            if any(v in window for v in ["built", "developed", "implemented", "designed", "project", "engineered", "deployed"]):
                return True
    return False


def match_required_skills(resume_text: str, required_skills: List[str]) -> Tuple[List[str], List[str], Dict[str, str]]:
    resume_lower = resume_text.lower()
    matched, missing, methods = [], [], {}
    for skill in required_skills:
        if exact_skill_in_text(skill, resume_lower):
            matched.append(skill)
            methods[skill] = "exact"
        elif semantic_skill_in_text(skill, resume_text):
            matched.append(skill)
            methods[skill] = "semantic"
        else:
            missing.append(skill)
            methods[skill] = "none"
    return matched, missing, methods


def extract_technical_skills_from_resume(resume_text: str) -> List[str]:
    found, seen = [], set()
    skills_section = re.search(
        r"(?:SKILLS|TECHNICAL SKILLS|TECHNOLOGIES|TECH STACK)[:\s]*([\s\S]{0,800})",
        resume_text, re.I,
    )
    if skills_section:
        for part in re.split(r"[,;\n|•·]", skills_section.group(1)):
            part = part.strip()
            if 2 <= len(part) <= 40 and part.lower() not in seen:
                seen.add(part.lower())
                found.append(part)
    for pattern in COMMON_TECH_PATTERNS:
        for m in re.finditer(pattern, resume_text, re.I):
            skill = m.group(0).strip()
            if skill.lower() not in seen:
                seen.add(skill.lower())
                found.append(skill)
    return found[:40]


def extract_project_snippets(resume_text: str, limit: int = 4) -> List[str]:
    snippets = []
    section = re.search(r"(?:PROJECTS?|WORK EXPERIENCE|EXPERIENCE)([\s\S]{0,2500})", resume_text, re.I)
    block = section.group(1) if section else resume_text
    lines = [ln.strip() for ln in block.split("\n") if len(ln.strip()) > 25]
    for ln in lines:
        if any(k in ln.lower() for k in ["built", "developed", "engineered", "designed", "implemented", "created"]):
            snippets.append(ln[:180])
        if len(snippets) >= limit:
            break
    return snippets


def extract_role_titles(resume_text: str) -> List[str]:
    titles = []
    patterns = [
        r"(?:Software|Full[\s-]?Stack|Backend|Frontend|AI|ML|Data|DevOps|Engineer|Developer|Analyst|Intern)[\w\s/-]{0,30}",
        r"(?:at|@)\s+([A-Z][\w\s&.,]{2,40})",
    ]
    for pattern in patterns:
        for m in re.finditer(pattern, resume_text, re.I):
            t = m.group(0).strip()
            if 5 < len(t) < 60:
                titles.append(t)
    return list(dict.fromkeys(titles))[:5]


def extract_certifications(resume_text: str) -> List[str]:
    certs = []
    cert_section = re.search(r"CERTIFICATIONS?([\s\S]{0,600})", resume_text, re.I)
    block = cert_section.group(1) if cert_section else resume_text
    for pattern in CERT_PATTERNS:
        for m in re.finditer(pattern, block, re.I):
            text = (m.group(1) if m.lastindex else m.group(0)).strip()
            if 5 < len(text) < 100:
                certs.append(text)
    return list(dict.fromkeys(certs))[:8]


def extract_achievements(resume_text: str) -> List[str]:
    achievements = []
    for pattern in ACHIEVEMENT_PATTERNS:
        for m in re.finditer(pattern, resume_text, re.I):
            start = max(0, m.start() - 40)
            end = min(len(resume_text), m.end() + 80)
            snippet = resume_text[start:end].replace("\n", " ").strip()
            if len(snippet) > 15:
                achievements.append(snippet[:150])
    return list(dict.fromkeys(achievements))[:6]


def estimate_years_experience(resume_text: str) -> Tuple[str, int]:
    patterns = [
        r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)",
        r"experience[:\s]*(\d+)\+?",
    ]
    for pattern in patterns:
        m = re.search(pattern, resume_text, re.I)
        if m:
            years = int(m.group(1))
            return f"{years} years", min(years, 15)
    if re.search(r"(?:20\d{2}|19\d{2})\s*[-–]\s*(?:20\d{2}|Present)", resume_text):
        return "Estimated from education timeline", 1
    return "Not specified", 0


def estimate_education(resume_text: str) -> str:
    edu_section = re.search(r"EDUCATION([\s\S]{0,400})", resume_text, re.I)
    block = edu_section.group(1) if edu_section else resume_text
    patterns = [
        r"B\.?\s*E\.?\s*(?:\s*/\s*)?B\.?\s*Tech|M\.?\s*Tech|B\.?\s*Sc|M\.?\s*Sc|MBA|Ph\.?\s*D",
        r"Bachelor|Master|Doctorate|Engineering|Information Science|Computer Science|AI|Data Science",
    ]
    for pattern in patterns:
        m = re.search(pattern, block, re.I)
        if m:
            return m.group(0).strip()
    return "Not specified"


def jd_required_years(job_description: str) -> int:
    m = re.search(r"(\d+)\+?\s*(?:years?|yrs?)", job_description or "", re.I)
    return int(m.group(1)) if m else 2


def score_skills(resume_text: str, required: List[str], matched: List[str]) -> Tuple[float, str]:
    max_pts = WEIGHTS["skills"]
    if not required:
        return max_pts * 0.6, "No required skills listed on job — partial credit applied"

    ratio = len(matched) / len(required)
    base = ratio * (max_pts * 0.75)  # up to ~26 for full match

    proficiency_count = sum(1 for s in matched if skill_has_project_evidence(s, resume_text))
    proficiency_bonus = min(max_pts * 0.25, proficiency_count * (max_pts * 0.25 / max(len(matched), 1)))

    total = min(max_pts, round(base + proficiency_bonus, 1))
    note = f"{len(matched)}/{len(required)} required skills matched"
    if proficiency_count:
        note += f"; {proficiency_count} demonstrated in projects/experience"
    return total, note


def score_experience(resume_text: str, job_title: str, job_description: str) -> Tuple[float, str]:
    max_pts = WEIGHTS["experience"]
    years_label, years = estimate_years_experience(resume_text)
    required = jd_required_years(job_description)

    # Years component (0-12 of 22)
    if years == 0:
        years_pts = 3
    elif years >= required + 3:
        years_pts = 12
    elif years >= required:
        years_pts = 10
    elif years >= max(1, required - 1):
        years_pts = 6
    else:
        years_pts = 3

    # Role relevance (0-6)
    title_tokens = set(re.findall(r"[a-z]{3,}", job_title.lower()))
    roles = extract_role_titles(resume_text)
    role_pts = 0
    best_role = ""
    for role in roles:
        role_tokens = set(re.findall(r"[a-z]{3,}", role.lower()))
        overlap = len(title_tokens & role_tokens)
        if overlap > role_pts:
            role_pts = min(6, overlap * 2)
            best_role = role
    if not best_role and any(k in resume_text.lower() for k in ["developer", "engineer", "intern"]):
        role_pts = 2

    # Progression / industry (0-4)
    prog_pts = 0
    prog_signals = []
    for signal in ["senior", "lead", "manager", "promoted", "mentor", "hackathon", "intern to"]:
        if signal in resume_text.lower():
            prog_pts += 1
            prog_signals.append(signal)
    prog_pts = min(4, prog_pts)

    total = min(max_pts, years_pts + role_pts + prog_pts)
    note = f"{years_label} (role needs ~{required} yrs)"
    if best_role:
        note += f"; closest role: {best_role[:50]}"
    if prog_signals:
        note += f"; progression signals: {', '.join(prog_signals[:3])}"
    return float(total), note


def score_projects(resume_text: str, job_description: str, matched_skills: List[str]) -> Tuple[float, str]:
    max_pts = WEIGHTS["projects"]
    snippets = extract_project_snippets(resume_text)
    text_lower = resume_text.lower()
    jd_words = set(re.findall(r"[a-z]{4,}", (job_description or "").lower()))

    # Count & depth (0-10)
    depth_pts = min(6, len(snippets) * 2)
    depth_signals = ["architecture", "scalable", "production", "microservice", "api", "deployment", "real-time"]
    depth_pts += min(4, sum(1 for s in depth_signals if s in text_lower))

    # JD alignment (0-5)
    align_pts = 0
    for snip in snippets:
        snip_words = set(re.findall(r"[a-z]{4,}", snip.lower()))
        if len(jd_words & snip_words) >= 2:
            align_pts += 2
    align_pts = min(5, align_pts)

    # Tech overlap with matched skills in projects (0-3)
    tech_pts = 0
    project_block = re.search(r"PROJECTS?([\s\S]{0,2000})", resume_text, re.I)
    proj_text = (project_block.group(1) if project_block else resume_text).lower()
    tech_pts = min(3, sum(1 for s in matched_skills if s.lower() in proj_text))

    total = min(max_pts, depth_pts + align_pts + tech_pts)
    note = f"{len(snippets)} relevant project entries identified"
    if snippets:
        note += f"; e.g. {snippets[0][:60]}..."
    return float(total), note


def score_education(resume_text: str, job_description: str) -> Tuple[float, str]:
    max_pts = WEIGHTS["education"]
    edu = estimate_education(resume_text)
    if edu == "Not specified":
        return 2.0, "No clear degree or specialization listed"

    pts = 4.0
    jd_lower = (job_description or "").lower()
    edu_lower = edu.lower()

    tech_fields = ["engineering", "computer", "science", "information", "ai", "data"]
    if any(f in edu_lower for f in tech_fields):
        pts += 2
    if any(k in jd_lower for k in ["b.e", "b.tech", "bachelor", "engineering"]):
        if any(k in edu_lower for k in ["b.e", "b.tech", "bachelor", "engineering"]):
            pts += 2

    total = min(max_pts, pts)
    return total, f"Education: {edu}"


def score_certifications(resume_text: str, required_skills: List[str]) -> Tuple[float, str]:
    max_pts = WEIGHTS["certifications"]
    certs = extract_certifications(resume_text)
    if not certs:
        cert_mentions = len(re.findall(r"\bcertif", resume_text, re.I))
        if cert_mentions:
            return 2.0, "Certifications section present but details are limited"
        return 0.0, "No industry certifications found"

    pts = min(4, len(certs) * 1.5)
    related = 0
    for cert in certs:
        cert_lower = cert.lower()
        if any(s.lower() in cert_lower for s in required_skills):
            related += 1
    pts += min(3, related * 1.5)

    total = min(max_pts, round(pts, 1))
    note = f"{len(certs)} certification(s): {certs[0][:50]}"
    if related:
        note += f"; {related} aligned with required skills"
    return total, note


def score_achievements(resume_text: str) -> Tuple[float, str]:
    max_pts = WEIGHTS["achievements"]
    achievements = extract_achievements(resume_text)
    if not achievements:
        return 0.0, "No quantifiable achievements or awards detected"

    pts = min(max_pts, 2 + len(achievements))
    note = achievements[0][:80]
    return float(pts), note


def score_resume_quality(resume_text: str) -> Tuple[float, str]:
    max_pts = WEIGHTS["resume_quality"]
    checks = {
        "contact": bool(re.search(r"[@+]\s*\d|@\w+\.\w+|linkedin|github", resume_text, re.I)),
        "skills_section": bool(re.search(r"\bSKILLS?\b|\bTECHNOLOGIES\b", resume_text, re.I)),
        "experience_section": bool(re.search(r"\bEXPERIENCE\b|\bWORK\b", resume_text, re.I)),
        "projects_section": bool(re.search(r"\bPROJECTS?\b", resume_text, re.I)),
        "education_section": bool(re.search(r"\bEDUCATION\b", resume_text, re.I)),
    }
    passed = sum(checks.values())
    pts = min(max_pts, passed)  # 1 pt per check, max 5
    missing = [k for k, v in checks.items() if not v]
    note = f"{passed}/5 structure checks passed"
    if missing:
        note += f"; missing: {', '.join(missing)}"
    return float(pts), note


def recommendation_from_score(score: int) -> str:
    if score >= 90:
        return "Highly Recommended"
    if score >= 75:
        return "Recommended"
    if score >= 60:
        return "Needs Review"
    return "Not Recommended"


def calculate_comprehensive_scores(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: List[str],
    matched_skills: List[str],
) -> Dict[str, Any]:
    skills_pts, skills_note = score_skills(resume_text, required_skills, matched_skills)
    exp_pts, exp_note = score_experience(resume_text, job_title, job_description)
    proj_pts, proj_note = score_projects(resume_text, job_description, matched_skills)
    edu_pts, edu_note = score_education(resume_text, job_description)
    cert_pts, cert_note = score_certifications(resume_text, required_skills)
    ach_pts, ach_note = score_achievements(resume_text)
    qual_pts, qual_note = score_resume_quality(resume_text)

    final_score = int(min(100, round(
        skills_pts + exp_pts + proj_pts + edu_pts + cert_pts + ach_pts + qual_pts
    )))

    years_label, _ = estimate_years_experience(resume_text)
    education = estimate_education(resume_text)

    score_breakdown = [
        {"category": "Skills Match", "score": skills_pts, "max": WEIGHTS["skills"], "note": skills_note},
        {"category": "Relevant Experience", "score": exp_pts, "max": WEIGHTS["experience"], "note": exp_note},
        {"category": "Projects & Quality", "score": proj_pts, "max": WEIGHTS["projects"], "note": proj_note},
        {"category": "Education Alignment", "score": edu_pts, "max": WEIGHTS["education"], "note": edu_note},
        {"category": "Certifications", "score": cert_pts, "max": WEIGHTS["certifications"], "note": cert_note},
        {"category": "Achievements & Impact", "score": ach_pts, "max": WEIGHTS["achievements"], "note": ach_note},
        {"category": "Resume Quality", "score": qual_pts, "max": WEIGHTS["resume_quality"], "note": qual_note},
    ]

    return {
        "skill_score": skills_pts,
        "experience_score": exp_pts,
        "projects_score": proj_pts,
        "education_score": edu_pts,
        "certifications_score": cert_pts,
        "achievements_score": ach_pts,
        "resume_quality_score": qual_pts,
        "final_score": final_score,
        "score_breakdown": score_breakdown,
        "years_of_experience": years_label,
        "education": education,
        "recommendation": recommendation_from_score(final_score),
    }


def build_evaluation_context(
    resume_text: str,
    job_title: str,
    matched: List[str],
    missing: List[str],
    scores: Dict[str, Any],
) -> Dict[str, Any]:
    projects = extract_project_snippets(resume_text)
    roles = extract_role_titles(resume_text)
    certs = extract_certifications(resume_text)
    achievements = extract_achievements(resume_text)
    proficient = [s for s in matched if skill_has_project_evidence(s, resume_text)]

    return {
        "projects": projects,
        "roles": roles,
        "certifications": certs,
        "achievements": achievements,
        "skills_with_project_evidence": proficient,
        "skills_listed_only": [s for s in matched if s not in proficient],
        "missing_skills": missing,
        "score_breakdown": scores.get("score_breakdown", []),
    }


def build_specific_fallback_explanation(
    job_title: str,
    scores: Dict[str, Any],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    strengths, weaknesses = [], []

    # Skills — specific, not just list
    proficient = context.get("skills_with_project_evidence", [])
    if proficient:
        strengths.append(
            f"Demonstrates hands-on proficiency in {', '.join(proficient[:3])} through named projects and implementation work — not just keyword listing."
        )
    listed_only = context.get("skills_listed_only", [])
    if listed_only:
        weaknesses.append(
            f"{', '.join(listed_only[:3])} appear on the resume but lack clear project or work-history evidence; verify depth in interview."
        )

    # Projects
    projects = context.get("projects", [])
    if scores["projects_score"] >= 12 and projects:
        strengths.append(
            f"Project work shows technical depth relevant to {job_title}: \"{projects[0][:100]}...\""
        )
    elif scores["projects_score"] < 8:
        weaknesses.append(
            "Limited project descriptions with measurable outcomes or JD-aligned technical complexity."
        )

    # Experience
    if scores["experience_score"] >= 15:
        roles = context.get("roles", [])
        if roles:
            strengths.append(
                f"Professional background includes roles aligned with this position (e.g. {roles[0][:60]})."
            )
    elif scores["experience_score"] < 10:
        weaknesses.append(
            f"Experience section does not clearly establish {scores['years_of_experience']} of directly relevant {job_title} responsibilities."
        )

    # Education
    if scores["education_score"] >= 6:
        strengths.append(
            f"Educational background ({scores['education']}) aligns with technical requirements for this role."
        )
    elif scores["education_score"] < 4:
        weaknesses.append("Degree or specialization is unclear or may not match role requirements.")

    # Certifications
    certs = context.get("certifications", [])
    if certs and scores["certifications_score"] >= 4:
        strengths.append(f"Industry certifications strengthen credibility: {certs[0][:70]}.")
    elif scores["certifications_score"] == 0 and context.get("missing_skills"):
        weaknesses.append("No certifications found to compensate for missing required technical skills.")

    # Achievements
    achievements = context.get("achievements", [])
    if achievements:
        strengths.append(f"Quantifiable impact or recognition: {achievements[0][:100]}.")

    # Resume quality
    if scores["resume_quality_score"] < 3:
        weaknesses.append("Resume structure is incomplete — missing key sections that help assess fit quickly.")

    missing = context.get("missing_skills", [])
    if missing and len(weaknesses) < 4:
        weaknesses.append(
            f"Gap in required stack: no evidence of {', '.join(missing[:3])} — may limit immediate contribution in those areas."
        )

    if not strengths:
        strengths.append("Candidate profile warrants manual HR review against specific team needs.")
    if not weaknesses:
        weaknesses.append("No major red flags; confirm cultural and team fit in interview.")

    breakdown = scores.get("score_breakdown", [])
    breakdown_str = "; ".join(f"{b['category']} {b['score']}/{b['max']}" for b in breakdown[:3])

    summary = (
        f"Overall suitability {scores['final_score']}/100 for {job_title} ({scores['recommendation']}). "
        f"Strongest areas: {breakdown_str}. "
        f"Evaluation uses 7-factor recruiter model — not skill matching alone."
    )

    questions = []
    if proficient:
        questions.append(f"Deep-dive on your {proficient[0]} project — architecture, your role, and production outcomes.")
    if projects:
        questions.append(f"Explain the technical decisions behind: {projects[0][:80]}...")
    if missing:
        questions.append(f"How would you ramp up on {missing[0]} required for this role?")
    questions.append(f"What makes you a strong fit for {job_title} beyond your resume keywords?")
    questions.append("Describe a challenging technical problem you solved and how you measured success.")

    recruiter_insights = build_recruiter_insights(job_title, scores, context, matched, missing)

    return {
        "strengths": strengths[:4],
        "weaknesses": weaknesses[:3],
        "summary": summary,
        "interview_questions": questions[:5],
        "candidate_name": "",
        "recruiter_insights": recruiter_insights,
    }


def build_recruiter_insights(
    job_title: str,
    scores: Dict[str, Any],
    context: Dict[str, Any],
    matched: List[str],
    missing: List[str],
) -> str:
    """Plain-language explanation of why the candidate received this score."""
    parts = []
    proficient = context.get("skills_with_project_evidence", [])
    projects = context.get("projects", [])
    certs = context.get("certifications", [])
    achievements = context.get("achievements", [])

    if proficient:
        parts.append(
            f"Demonstrates strong {' and '.join(proficient[:3])} expertise through hands-on project work"
        )
    elif matched:
        parts.append(f"Lists required skills ({', '.join(matched[:4])}) but limited project evidence")

    if projects:
        parts.append(f"Relevant project portfolio including work on {projects[0][:70]}")

    if scores["experience_score"] >= 15:
        parts.append(f"Experience profile ({scores['years_of_experience']}) aligns with the {job_title} role")
    elif scores["experience_score"] < 10:
        parts.append("Professional experience is unclear or below typical requirements for this role")

    if missing:
        parts.append(f"Missing {', '.join(missing[:3])} — may need upskilling or mentorship")

    if certs:
        parts.append(f"Certifications ({certs[0][:50]}) add credibility")

    if achievements:
        parts.append(f"Notable achievement: {achievements[0][:80]}")

    rec = scores["recommendation"]
    if rec in ("Highly Recommended", "Recommended"):
        parts.append("Suitable for technical interview round")
    elif rec == "Needs Review":
        parts.append("Recommend manual HR review before advancing")
    else:
        parts.append("May not be the best fit without significant skill development")

    body = ". ".join(parts) + "." if parts else "Profile requires manual recruiter review."
    return f"{body} Overall ATS score: {scores['final_score']}/100 ({rec})."


def build_explanation_prompt(
    job_title: str,
    job_description: str,
    resume_text: str,
    matched_skills: List[str],
    missing_skills: List[str],
    scores: Dict[str, Any],
    context: Dict[str, Any],
) -> str:
    breakdown_json = json.dumps(scores.get("score_breakdown", []), indent=2)
    context_json = json.dumps({
        "projects": context.get("projects", [])[:4],
        "roles": context.get("roles", [])[:3],
        "certifications": context.get("certifications", [])[:4],
        "achievements": context.get("achievements", [])[:3],
        "skills_with_project_evidence": context.get("skills_with_project_evidence", []),
        "skills_listed_only": context.get("skills_listed_only", []),
    }, indent=2)

    return f"""You are a senior technical recruiter writing a candidate evaluation narrative.

CRITICAL: Scores and skill matches are PRE-COMPUTED. Do NOT change them. Do NOT invent skills, projects, or experience.

Write SPECIFIC strengths and weaknesses that reference ACTUAL resume evidence (project names, roles, certs, metrics).
DO NOT write generic lines like "matched skills: X" or "missing skills: Y".
DO NOT list skills as bullet strengths — explain WHY they matter for this role.

Job Title: {job_title}
Job Description: {job_description[:1200]}

PRE-COMPUTED SCORE: {scores['final_score']}/100 — {scores['recommendation']}
SCORE BREAKDOWN (do not modify):
{breakdown_json}

MATCHED SKILLS (fixed): {json.dumps(matched_skills)}
MISSING SKILLS (fixed): {json.dumps(missing_skills)}

RESUME EVIDENCE EXTRACTED:
{context_json}

Resume excerpt:
{resume_text[:4500]}

Return ONLY valid JSON:
{{
  "candidate_name": "",
  "strengths": ["<specific strength citing project/role/cert/metric>", "...", "..."],
  "weaknesses": ["<specific gap with context, not just skill names>", "..."],
  "summary": "<2-3 sentences tying education, experience, projects to the JD>",
  "interview_questions": ["<technical Q1>", "...", "..."],
  "recruiter_insights": "<2-3 sentences explaining WHY this score — cite projects, experience gaps, JD fit>"
}}"""


def merge_screening_result(
    scores: Dict[str, Any],
    matched: List[str],
    missing: List[str],
    technical_skills_found: List[str],
    explanation: Dict[str, Any],
    analysis_mode: str,
    extracted_text: str,
) -> Dict[str, Any]:
    final_score = scores["final_score"]
    return {
        "score": final_score,
        "match_percentage": float(final_score),
        "skills_matched": matched,
        "skills_missing": missing,
        "matched_skills": matched,
        "missing_skills": missing,
        "years_of_experience": scores["years_of_experience"],
        "education": scores["education"],
        "recommendation": scores["recommendation"],
        "strengths": explanation.get("strengths", []),
        "weaknesses": explanation.get("weaknesses", []),
        "summary": explanation.get("summary", ""),
        "interview_questions": explanation.get("interview_questions", []),
        "extracted_text": extracted_text[:8000],
        "analysis_mode": analysis_mode,
        "candidate_name": explanation.get("candidate_name", ""),
        "technical_skills_found": technical_skills_found,
        "skill_score": scores["skill_score"],
        "experience_score": scores["experience_score"],
        "projects_score": scores["projects_score"],
        "education_score": scores["education_score"],
        "certifications_score": scores.get("certifications_score", 0),
        "achievements_score": scores.get("achievements_score", 0),
        "resume_quality_score": scores.get("resume_quality_score", 0),
        "final_score": final_score,
        "score_breakdown": scores.get("score_breakdown", []),
        "recruiter_insights": explanation.get("recruiter_insights", ""),
        "ai_insights": explanation.get("recruiter_insights", ""),
    }


def run_screening_pipeline(
    resume_text: str,
    job_title: str,
    job_description: str,
    required_skills: str,
    candidate_name: str = "",
    call_gemini_fn=None,
    parse_json_fn=None,
) -> Dict[str, Any]:
    required_list = parse_skills(required_skills)
    matched, missing, _ = match_required_skills(resume_text, required_list)
    technical_found = extract_technical_skills_from_resume(resume_text)
    for s in matched:
        if s not in technical_found:
            technical_found.insert(0, s)

    scores = calculate_comprehensive_scores(
        resume_text, job_title, job_description, required_list, matched
    )
    context = build_evaluation_context(resume_text, job_title, matched, missing, scores)

    explanation = build_specific_fallback_explanation(job_title, scores, context)
    if candidate_name:
        explanation["candidate_name"] = candidate_name

    analysis_mode = "deterministic"

    if call_gemini_fn and parse_json_fn:
        try:
            prompt = build_explanation_prompt(
                job_title, job_description, resume_text,
                matched, missing, scores, context,
            )
            raw = call_gemini_fn(prompt).strip()
            gemini_explanation = parse_json_fn(raw)
            for key in ("strengths", "weaknesses", "summary", "interview_questions", "recruiter_insights"):
                if gemini_explanation.get(key):
                    explanation[key] = gemini_explanation[key]
            if gemini_explanation.get("candidate_name"):
                explanation["candidate_name"] = gemini_explanation["candidate_name"]
            analysis_mode = "deterministic+gemini"
        except Exception as exc:
            print(f"Gemini explanation skipped: {exc}")

    return merge_screening_result(
        scores, matched, missing, technical_found,
        explanation, analysis_mode, resume_text,
    )
