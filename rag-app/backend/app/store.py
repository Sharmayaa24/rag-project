from datetime import datetime, timezone
import uuid

from qdrant_client import QdrantClient, models

from . import config

_client = None


def client() -> QdrantClient:
    global _client
    if _client is None:
        if config.QDRANT_URL:
            _client = QdrantClient(url=config.QDRANT_URL, api_key=config.QDRANT_API_KEY or None)
        else:
            _client = QdrantClient(path=config.QDRANT_PATH)
    return _client


def _ensure(dim: int):
    c = client()
    if not c.collection_exists(config.COLLECTION):
        c.create_collection(
            config.COLLECTION,
            vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE),
        )
        # Index needed for fast filtering by document on Qdrant Cloud.
        c.create_payload_index(
            config.COLLECTION,
            field_name="documentId",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )


def _doc_filter(document_id: str) -> models.Filter:
    return models.Filter(
        must=[models.FieldCondition(key="documentId", match=models.MatchValue(value=document_id))]
    )


def add_chunks(document_id, file_name, chunks, vectors):
    _ensure(len(vectors[0]))
    now_iso = datetime.now(timezone.utc).isoformat()
    points = [
        models.PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload={
                "documentId": document_id,
                "fileName": file_name,
                "page": ch["page"],
                "chunkIndex": ch["chunk_index"],
                "text": ch["text"],
                "uploadedAt": now_iso,
            },
        )
        for ch, vec in zip(chunks, vectors)
    ]
    for i in range(0, len(points), 64):
        client().upsert(config.COLLECTION, points=points[i : i + 64])


def search(vector, document_id, top_k):
    c = client()
    if not c.collection_exists(config.COLLECTION):
        return []
    query_filter = _doc_filter(document_id) if document_id and document_id != "all" else None
    res = c.query_points(
        config.COLLECTION,
        query=vector,
        query_filter=query_filter,
        limit=top_k,
        with_payload=True,
    )
    return res.points


def list_documents():
    c = client()
    if not c.collection_exists(config.COLLECTION):
        return []
    docs = {}
    offset = None
    while True:
        points, offset = c.scroll(
            config.COLLECTION, limit=256, offset=offset, with_payload=True, with_vectors=False
        )
        for p in points:
            d = docs.setdefault(
                p.payload["documentId"],
                {"documentId": p.payload["documentId"], "fileName": p.payload["fileName"], "chunks": 0, "pages": 0},
            )
            d["chunks"] += 1
            d["pages"] = max(d["pages"], p.payload["page"])
        if offset is None:
            break
    return list(docs.values())


def delete_document(document_id):
    c = client()
    if c.collection_exists(config.COLLECTION):
        c.delete(config.COLLECTION, points_selector=models.FilterSelector(filter=_doc_filter(document_id)))

