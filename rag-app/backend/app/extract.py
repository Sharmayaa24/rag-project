import csv
from io import BytesIO, StringIO

from pypdf import PdfReader

SUPPORTED_EXTENSIONS = (".pdf", ".txt", ".md", ".csv")


def extract_pdf(data: bytes) -> list[tuple[int, str]]:
    """Return [(page_number, text)] with 1-based page numbers for PDF bytes."""
    reader = PdfReader(BytesIO(data))
    return [(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]


def extract_document(data: bytes, filename: str) -> list[tuple[int, str]]:
    """Extract text pages/sections from .pdf, .txt, .md, or .csv files."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == ".pdf":
        if not data.startswith(b"%PDF"):
            raise ValueError("File is not a valid PDF.")
        return extract_pdf(data)

    text = data.decode("utf-8", errors="replace")
    if ext == ".csv":
        reader = csv.reader(StringIO(text))
        rows = [", ".join(cell.strip() for cell in row if cell.strip()) for row in reader]
        non_empty = [r for r in rows if r]
        # Group every 50 rows as a logical "page"
        pages = []
        for idx in range(0, len(non_empty), 50):
            pages.append((idx // 50 + 1, "\n".join(non_empty[idx : idx + 50])))
        return pages or [(1, "")]

    # .txt or .md: split into logical pages of ~3000 chars so citations stay granular
    pages = []
    step = 3000
    for idx in range(0, max(len(text), 1), step):
        pages.append((idx // step + 1, text[idx : idx + step]))
    return pages
