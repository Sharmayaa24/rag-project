def create_chunks(pages, chunk_size=800, overlap=120):
    """Word-based chunking per page. pages: [(page_number, text)]."""
    if overlap >= chunk_size:
        raise ValueError("Overlap must be smaller than chunk size")

    step = chunk_size - overlap
    chunks = []
    for page_number, text in pages:
        words = text.split()
        for start in range(0, len(words), step):
            section = " ".join(words[start : start + chunk_size])
            if section.strip():
                chunks.append(
                    {"text": section, "page": page_number, "chunk_index": len(chunks)}
                )
            if start + chunk_size >= len(words):
                break
    return chunks

