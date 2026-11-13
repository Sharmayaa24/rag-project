from io import BytesIO

from pypdf import PdfReader


def extract_pdf(data: bytes) -> list[tuple[int, str]]:
    """Return [(page_number, text)] with 1-based page numbers."""
    reader = PdfReader(BytesIO(data))
    return [(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]

