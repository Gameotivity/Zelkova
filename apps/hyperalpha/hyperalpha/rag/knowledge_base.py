"""RAG Knowledge Base — ChromaDB vector store for trading strategies."""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import structlog

from hyperalpha.config import settings

log = structlog.get_logger(__name__)

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"

_collection: Optional[object] = None


def _get_collection():
    """Lazy-initialize ChromaDB collection."""
    global _collection
    if _collection is not None:
        return _collection

    try:
        import chromadb
        client = chromadb.PersistentClient(path=settings.rag_vector_store_path)
        _collection = client.get_or_create_collection(
            name=settings.rag_collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        # Auto-ingest if empty
        if _collection.count() == 0:
            _ingest_knowledge(_collection)

        log.info("rag_initialized", doc_count=_collection.count())
        return _collection
    except Exception as e:
        log.error("rag_init_failed", error=str(e))
        return None


def _ingest_knowledge(collection: object) -> None:
    """Load markdown files from knowledge/ into ChromaDB."""
    documents = []
    ids = []
    metadatas = []

    for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
        content = md_file.read_text()
        # Split by ## headers into chunks
        sections = content.split("\n## ")
        for i, section in enumerate(sections):
            if not section.strip():
                continue
            # Add back the ## for non-first sections
            text = section if i == 0 else f"## {section}"
            doc_id = f"{md_file.stem}_{i}"
            documents.append(text.strip())
            ids.append(doc_id)
            metadatas.append({"source": md_file.name, "section": i})

    if documents:
        collection.add(documents=documents, ids=ids, metadatas=metadatas)
        log.info("rag_ingested", doc_count=len(documents))


def search_knowledge(query: str, k: int = 3) -> list[str]:
    """Search the knowledge base for relevant trading strategies."""
    collection = _get_collection()
    if collection is None:
        return [f"RAG unavailable. Query was: {query}"]

    try:
        results = collection.query(query_texts=[query], n_results=k)
        docs = results.get("documents", [[]])[0]
        return docs if docs else ["No relevant knowledge found."]
    except Exception as e:
        log.error("rag_search_failed", error=str(e))
        return [f"RAG search failed: {e}"]
