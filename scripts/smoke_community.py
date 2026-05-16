from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi.testclient import TestClient

from composition import AppContext
from infrastructure.database import connect
from infrastructure.repositories import CommunityRepository
from infrastructure.seed_data import seed_default_data
from presentation.http.app import create_app


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env", override=False)

    connection = connect(":memory:")
    try:
        seed_default_data(connection)
        community_repository = CommunityRepository(connection=connection)
        context = AppContext(
            pet_log_agent_pipeline=object(),
            pet_profile_reader=object(),
            speech_to_text=object(),
            community_repository=community_repository,
            close=lambda: None,
        )

        with TestClient(create_app(app_context=context)) as client:
            boards_response = client.get("/api/v1/community/boards")
            popular_response = client.get(
                "/api/v1/community/posts",
                params={"feed": "인기글", "board": "행동 고민"},
            )
            create_response = client.post(
                "/api/v1/community/posts",
                json={
                    "board": "자유게시판",
                    "title": "스모크 테스트 글",
                    "body": "커뮤니티 게시글 작성 흐름을 확인합니다.",
                },
            )
            created_post = create_response.json()["data"]["post"]
            post_id = created_post["id"]
            comment_response = client.post(
                f"/api/v1/community/posts/{post_id}/comments",
                json={"body": "스모크 테스트 댓글입니다."},
            )
            reaction_response = client.post(f"/api/v1/community/posts/{post_id}/reactions")
            detail_response = client.get(f"/api/v1/community/posts/{post_id}")

        _raise_for_status("boards", boards_response.status_code)
        _raise_for_status("popular posts", popular_response.status_code)
        _raise_for_status("create post", create_response.status_code, expected=201)
        _raise_for_status("create comment", comment_response.status_code, expected=201)
        _raise_for_status("add reaction", reaction_response.status_code)
        _raise_for_status("post detail", detail_response.status_code)

        boards = boards_response.json()["data"]["boards"]
        popular_posts = popular_response.json()["data"]["posts"]
        commented_post = comment_response.json()["data"]["post"]
        reacted_post = reaction_response.json()["data"]["post"]
        detail = detail_response.json()["data"]["post"]

        assert "행동 고민" in boards
        assert popular_posts[0]["id"] == "c1"
        assert created_post["feeds"] == ["최신글"]
        assert commented_post["comments"] == 1
        assert reacted_post["likes"] == 1
        assert detail["commentItems"][0]["body"] == "스모크 테스트 댓글입니다."
    finally:
        connection.close()

    print("boards:", boards)
    print("popular_behavior_post:", popular_posts[0])
    print("created_post:", created_post)
    print("commented_post:", commented_post)
    print("reacted_post:", reacted_post)
    print("detail_comment_count:", len(detail["commentItems"]))


def _raise_for_status(name: str, status_code: int, expected: int = 200) -> None:
    if status_code != expected:
        raise RuntimeError(f"{name} returned {status_code}, expected {expected}")


if __name__ == "__main__":
    main()
