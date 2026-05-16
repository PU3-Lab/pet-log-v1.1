from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = BACKEND_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from infrastructure.knowledge.ingester import calculate_hash
from infrastructure.knowledge.retriever import (
    CARE_KNOWLEDGE_COLLECTION,
    DEFAULT_EMBEDDING_MODEL,
    default_persist_directory,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest a PDF document into the care_answer RAG vector DB.")
    parser.add_argument("pdf_path", type=str, help="Path to the PDF file.")
    parser.add_argument("--persist-directory", default=None)
    parser.add_argument("--embedding-model", default=DEFAULT_EMBEDDING_MODEL)
    parser.add_argument("--chunk-size", type=int, default=1000)
    parser.add_argument("--chunk-overlap", type=int, default=200)
    args = parser.parse_args()

    load_dotenv(BACKEND_ROOT / ".env", override=False)

    pdf_path = Path(args.pdf_path).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    loader = PyPDFLoader(str(pdf_path))
    pages = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    documents = splitter.split_documents(pages)

    ids: list[str] = []
    for index, document in enumerate(documents):
        page = document.metadata.get("page", 0)
        content_hash = calculate_hash(document.page_content)
        source_id = f"pdf_{pdf_path.stem}"
        ids.append(f"{source_id}_{content_hash[:12]}_{index}")
        document.metadata = {
            "source_id": source_id,
            "title": f"{pdf_path.stem} page {page}",
            "source_url": f"file://{pdf_path.name}",
            "content_hash": content_hash,
            "page": page,
            "chunk_index": index,
        }

    persist_directory = args.persist_directory or default_persist_directory()
    vector_store = Chroma(
        collection_name=CARE_KNOWLEDGE_COLLECTION,
        embedding_function=OpenAIEmbeddings(model=args.embedding_model),
        persist_directory=persist_directory,
    )
    inserted_ids = vector_store.add_documents(documents=documents, ids=ids)

    print(f"loaded_pages: {len(pages)}")
    print(f"inserted_chunks: {len(inserted_ids)}")
    print(f"persist_directory: {persist_directory}")


if __name__ == "__main__":
    main()
