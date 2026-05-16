from __future__ import annotations

import argparse
import importlib.util
import os
import sys
from pathlib import Path
from types import ModuleType


BACKEND_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = BACKEND_ROOT / "src"


def main() -> None:
    args = parse_args()
    load_env_file(BACKEND_ROOT / ".env")
    sys.path.insert(0, str(SRC_ROOT))

    from application.agents.care_context import CareContextBuilder
    from domain.models import CareKnowledgeChunk, CareKnowledgeHit
    from infrastructure.database import connect
    from infrastructure.repositories.pet_profile_repository import PetProfileRepository
    from infrastructure.repositories.record_repository import RecordRepository
    from infrastructure.repositories.schedule_repository import ScheduleRepository

    connection = connect(args.database_path)
    try:
        pet_id = args.pet_id or first_pet_id(connection)
        context = CareContextBuilder(
            pet_profile_reader=PetProfileRepository(connection=connection),
            record_history_reader=RecordRepository(connection=connection),
            schedule_context_reader=ScheduleRepository(connection=connection),
            days_ahead=args.days_ahead,
        ).build(pet_id, args.lookback_days)

        knowledge_hits: tuple[CareKnowledgeHit, ...] = ()
        real_rag_error: Exception | None = None
        if args.check_real_rag:
            try:
                knowledge_hits = search_real_rag(args.question)
            except Exception as exc:
                real_rag_error = exc

        if args.fake_rag:
            knowledge_hits = knowledge_hits + (
                CareKnowledgeHit(
                    chunk=CareKnowledgeChunk(
                        id="smoke-rag-chunk",
                        source_id="smoke-rag-source",
                        title="Smoke RAG source",
                        text="SMOKE_RAG_SENTINEL: this text proves care_knowledge is included in the prompt.",
                        source_url="https://example.org/smoke-rag",
                        content_hash="smoke-rag-hash",
                    ),
                    score=0.99,
                ),
            )

        prompt_module = load_module(
            "care_answer_prompt_smoke",
            SRC_ROOT / "infrastructure" / "llm" / "care_answer" / "prompt.py",
        )
        messages = prompt_module.build_care_answer_messages(context, args.question, knowledge_hits)
        user_prompt = messages[1][1]

        print_context_report(
            database_path=args.database_path,
            pet_id=pet_id,
            context=context,
            user_prompt=user_prompt,
            fake_rag=args.fake_rag,
        )

        if args.check_real_rag:
            print_real_rag_report(knowledge_hits, real_rag_error)

        if args.invoke_llm:
            print_llm_answer(context, args.question)
    finally:
        connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Smoke-test care_answer context assembly against pet_log.sqlite3."
    )
    parser.add_argument(
        "--database-path",
        default=None,
        help="SQLite DB path. Defaults to PET_LOG_DATABASE_PATH or backend/pet_log.sqlite3.",
    )
    parser.add_argument("--pet-id", default=None, help="Pet ID to test. Defaults to the first active pet.")
    parser.add_argument("--lookback-days", type=int, default=30)
    parser.add_argument("--days-ahead", type=int, default=14)
    parser.add_argument(
        "--question",
        default="요즘 밥을 잘 안 먹는데 어떻게 봐야 해?",
    )
    parser.add_argument(
        "--fake-rag",
        action="store_true",
        help="Inject a fake RAG hit to verify the prompt includes care_knowledge.",
    )
    parser.add_argument(
        "--check-real-rag",
        action="store_true",
        help="Call the current CareKnowledgeRetriever.search() and print the hit count.",
    )
    parser.add_argument(
        "--invoke-llm",
        action="store_true",
        help="Actually call CareAnswerProvider.answer(). Requires installed LLM dependencies and credentials.",
    )
    return parser.parse_args()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", maxsplit=1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


def load_module(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def first_pet_id(connection) -> str:
    row = connection.execute(
        """
        SELECT id
        FROM pets
        WHERE deleted_at IS NULL
        ORDER BY created_at, id
        LIMIT 1
        """
    ).fetchone()
    if row is None:
        raise RuntimeError("No active pet found in the selected database.")
    return row["id"]


def print_context_report(*, database_path: str | None, pet_id: str, context, user_prompt: str, fake_rag: bool) -> None:
    print("=== care_answer smoke ===")
    print(f"database_path: {database_path or os.environ.get('PET_LOG_DATABASE_PATH') or BACKEND_ROOT / 'pet_log.sqlite3'}")
    print(f"pet_id: {pet_id}")
    print(f"pet_name: {context.pet.name}")
    print(f"species/breed: {context.pet.species or '-'} / {context.pet.breed or '-'}")
    print(f"recent_records: {len(context.recent_records)}")
    print(f"due_reminders: {len(context.due_reminders)}")

    if context.recent_records:
        latest = context.recent_records[-1]
        print(f"latest_record: {latest.recorded_at} | {latest.category}/{latest.status} | {latest.title}")

    print()
    print("=== prompt checks ===")
    print(f"has_pet_name: {context.pet.name in user_prompt}")
    print(f"has_recent_records_section: {'recent_records:' in user_prompt}")
    print(f"has_due_reminders_section: {'due_reminders:' in user_prompt}")
    print(f"has_care_knowledge_section: {'care_knowledge:' in user_prompt}")
    if fake_rag:
        print(f"has_fake_rag_sentinel: {'SMOKE_RAG_SENTINEL' in user_prompt}")

    print()
    print("=== user prompt preview ===")
    print(user_prompt[:2000])


def search_real_rag(question: str) -> tuple[CareKnowledgeHit, ...]:
    from infrastructure.knowledge.retriever import CareKnowledgeRetriever

    return CareKnowledgeRetriever().search(question)


def print_real_rag_report(hits: tuple[CareKnowledgeHit, ...], error: Exception | None) -> None:
    print()
    print("=== real RAG check ===")
    if error is not None:
        print(f"real_rag_error: {type(error).__name__}: {error}")
        return

    print(f"real_rag_hits: {len(hits)}")
    if not hits:
        print("note: current CareKnowledgeRetriever.search() returned no hits.")
        return

    for index, hit in enumerate(hits, start=1):
        preview = " ".join(hit.chunk.text.split())[:240]
        safe_print(f"{index}. score={hit.score:.4f} | title={hit.chunk.title} | source={hit.chunk.source_url}")
        safe_print(f"   {preview}")


def print_llm_answer(context, question: str) -> None:
    from infrastructure.knowledge.retriever import CareKnowledgeRetriever
    from infrastructure.llm.care_answer.provider import CareAnswerProvider

    print()
    print("=== LLM answer ===")
    answer = CareAnswerProvider(knowledge_retriever=CareKnowledgeRetriever()).answer(context, question)
    safe_print(answer)


def safe_print(value: str) -> None:
    encoding = sys.stdout.encoding or "utf-8"
    print(value.encode(encoding, errors="replace").decode(encoding))


if __name__ == "__main__":
    main()
