import csv
from html.parser import HTMLParser
from io import BytesIO, StringIO
import json
import xml.etree.ElementTree as ET
import zipfile

from pypdf import PdfReader

SUPPORTED_EXTENSIONS = (
    ".pdf",
    ".docx",
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
)
MAX_OCR_PAGES = 15

_ocr_engine = None


def _get_ocr():
    global _ocr_engine
    if _ocr_engine is None:
        from rapidocr_onnxruntime import RapidOCR

        _ocr_engine = RapidOCR()
    return _ocr_engine


def _ocr_image_bytes(img_bytes: bytes) -> str:
    try:
        ocr = _get_ocr()
        result, _ = ocr(img_bytes, use_cls=False)
        if result:
            lines = [line[1] for line in result if len(line) > 1 and isinstance(line[1], str)]
            return "\n".join(lines).strip()
    except Exception:
        pass
    return ""


def _ocr_scanned_pdf(data: bytes) -> list[tuple[int, str]]:
    """Fast grayscale OCR fallback used only when a PDF has zero digital text."""
    pages: list[tuple[int, str]] = []
    try:
        import pymupdf

        doc = pymupdf.open(stream=data, filetype="pdf")
        limit = min(len(doc), MAX_OCR_PAGES)
        for idx in range(limit):
            page = doc[idx]
            pix = page.get_pixmap(dpi=96, colorspace=pymupdf.csGRAY)
            text = _ocr_image_bytes(pix.tobytes("png"))
            pages.append((idx + 1, text))
        doc.close()
    except Exception:
        pass
    return pages


def extract_pdf(data: bytes) -> list[tuple[int, str]]:
    """Return [(page_number, text)] with 1-based page numbers for PDF bytes."""
    pages: list[tuple[int, str]] = []

    # 1. Fast C-based extraction via PyMuPDF
    try:
        import pymupdf

        doc = pymupdf.open(stream=data, filetype="pdf")
        pages = [(i + 1, (page.get_text("text") or "").strip()) for i, page in enumerate(doc)]
        doc.close()
    except Exception:
        pages = []

    # 2. Fallback to pypdf if PyMuPDF found no text (e.g. minimal synthetic test PDFs)
    if not any(t for _, t in pages):
        try:
            reader = PdfReader(BytesIO(data))
            pages = [(i + 1, (page.extract_text() or "").strip()) for i, page in enumerate(reader.pages)]
        except Exception:
            pass

    # 3. Only run neural OCR if the entire document is a scanned PDF with zero selectable text
    if pages and not any(t for _, t in pages):
        ocr_pages = _ocr_scanned_pdf(data)
        if any(t for _, t in ocr_pages):
            return ocr_pages

    return pages


def _extract_docx(data: bytes) -> list[tuple[int, str]]:
    """Extract text from a .docx file using stdlib zipfile + XML (with PyMuPDF fallback)."""
    paragraphs: list[str] = []
    try:
        with zipfile.ZipFile(BytesIO(data)) as zf:
            if "word/document.xml" in zf.namelist():
                xml_bytes = zf.read("word/document.xml")
                root = ET.fromstring(xml_bytes)
                for elem in root.iter():
                    if elem.tag.endswith("}p"):
                        texts = [t.text for t in elem.iter() if t.tag.endswith("}t") and t.text]
                        line = "".join(texts).strip()
                        if line:
                            paragraphs.append(line)
    except Exception:
        pass

    full_text = "\n".join(paragraphs).strip()
    if not full_text:
        try:
            import pymupdf

            doc = pymupdf.open(stream=data, filetype="docx")
            pages = [(i + 1, (page.get_text("text") or "").strip()) for i, page in enumerate(doc)]
            doc.close()
            if any(t for _, t in pages):
                return pages
        except Exception:
            pass

    return split_text_into_pages(full_text)


def split_text_into_pages(text: str, step: int = 3000) -> list[tuple[int, str]]:
    text = text.strip()
    if not text:
        return [(1, "")]
    return [(idx // step + 1, text[idx : idx + step]) for idx in range(0, len(text), step)]


class _HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._skip = False
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg", "head"):
            self._skip = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg", "head"):
            self._skip = False
        elif tag in ("p", "div", "section", "article", "li", "h1", "h2", "h3", "h4", "br", "tr"):
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            cleaned = data.strip()
            if cleaned:
                self.parts.append(cleaned + " ")


def extract_html_text(html: str) -> str:
    parser = _HTMLTextExtractor()
    parser.feed(html)
    raw = "".join(parser.parts)
    lines = [" ".join(line.split()) for line in raw.splitlines()]
    return "\n".join(line for line in lines if line)


def extract_document(data: bytes, filename: str) -> list[tuple[int, str]]:
    """Extract [(page_number, text)] from .pdf, .docx, .txt, .md, .csv, .json, or image files."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file format '{ext or filename}'. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    if ext == ".pdf":
        if not data.startswith(b"%PDF"):
            raise ValueError("File is not a valid PDF.")
        return extract_pdf(data)

    if ext == ".docx":
        return _extract_docx(data)

    if ext in (".png", ".jpg", ".jpeg"):
        ocr_text = _ocr_image_bytes(data)
        return [(1, ocr_text)]

    text = data.decode("utf-8", errors="replace")
    if ext == ".csv":
        reader = csv.reader(StringIO(text))
        rows = [", ".join(cell.strip() for cell in row if cell.strip()) for row in reader]
        non_empty = [r for r in rows if r]
        pages = []
        for idx in range(0, len(non_empty), 50):
            pages.append((idx // 50 + 1, "\n".join(non_empty[idx : idx + 50])))
        return pages or [(1, "")]

    if ext == ".json":
        try:
            parsed = json.loads(text)
            text = json.dumps(parsed, indent=2, ensure_ascii=False)
        except Exception:
            pass

    return split_text_into_pages(text)
