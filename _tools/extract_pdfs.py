from pathlib import Path
import re

files = [
    r"e:\\HR_One\\FWC Inc_ SD-1_AIML_Job Description.pdf",
    r"e:\\HR_One\\FWC.pdf",
]

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

try:
    import PyPDF2
except Exception:
    PyPDF2 = None

for f in files:
    path = Path(f)
    print("\n" + "=" * 80)
    print(path.name)
    print("=" * 80)
    text = ""
    if fitz is not None:
        try:
            doc = fitz.open(f)
            text = "\n".join(page.get_text() for page in doc)
        except Exception as exc:
            print("PyMuPDF failed:", exc)
    if not text and PyPDF2 is not None:
        try:
            with open(f, "rb") as fh:
                reader = PyPDF2.PdfReader(fh)
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            print("PyPDF2 failed:", exc)
    if not text:
        print("No text extracted.")
        continue
    text = re.sub(r"[ \t]+", " ", text)
    out_path = Path(__file__).with_name(path.stem + ".txt")
    out_path.write_text(text, encoding="utf-8")
    print(f"Wrote: {out_path}")
