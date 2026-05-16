from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator

from composition import AppContext
from domain.models import CommunityComment, CommunityPost
from infrastructure.repositories.community_repository import COMMUNITY_BOARDS, COMMUNITY_FEEDS
from presentation.http.schemas import success_response


class _CreateCommunityPostBody(BaseModel):
    board: str = Field(min_length=1)
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    authorName: str | None = None
    tags: list[str] | None = None
    locationLabel: str | None = None

    @field_validator("board", "title", "body")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped

    @field_validator("authorName")
    @classmethod
    def normalize_author_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized: list[str] = []
        for tag in value:
            stripped = tag.strip().lstrip("#").strip()
            if stripped and stripped not in normalized:
                normalized.append(stripped)
        return normalized or None

    @field_validator("locationLabel")
    @classmethod
    def normalize_location_label(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class _CreateCommunityCommentBody(BaseModel):
    body: str = Field(min_length=1)
    authorName: str | None = None

    @field_validator("body")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped

    @field_validator("authorName")
    @classmethod
    def normalize_author_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


def build_community_router() -> APIRouter:
    router = APIRouter(prefix="/api/v1/community")

    @router.get("/boards")
    def list_boards() -> dict[str, object]:
        return success_response({"boards": list(COMMUNITY_BOARDS), "feeds": list(COMMUNITY_FEEDS)})

    @router.get("/posts")
    def list_posts(
        http_request: Request,
        feed: str | None = None,
        board: str | None = None,
        limit: int | None = Query(default=None, ge=1, le=50),
        offset: int = Query(default=0, ge=0),
    ) -> dict[str, object]:
        repository = _community_repository(http_request)
        requested_limit = limit + 1 if limit is not None else None
        posts = list(repository.list_posts(feed=feed, board=board, limit=requested_limit, offset=offset))
        total_count = repository.count_posts(feed=feed, board=board)
        has_more = limit is not None and len(posts) > limit
        if limit is not None:
            posts = posts[:limit]
        return success_response(
            {"posts": [_post_to_frontend(post) for post in posts], "hasMore": has_more, "totalCount": total_count}
        )

    @router.get("/posts/{post_id}")
    def get_post(http_request: Request, post_id: str) -> dict[str, object]:
        repository = _community_repository(http_request)
        post = repository.get_post(post_id)
        if post is None:
            raise HTTPException(status_code=404, detail="Community post not found")
        comments = repository.list_comments(post_id)
        return success_response({"post": _post_detail_to_frontend(post, comments)})

    @router.post("/posts", status_code=status.HTTP_201_CREATED)
    def create_post(http_request: Request, body: _CreateCommunityPostBody) -> dict[str, object]:
        repository = _community_repository(http_request)
        post = repository.create_post(
            board=body.board,
            title=body.title,
            body=body.body,
            author_name=body.authorName,
            tags=body.tags,
            location_label=body.locationLabel,
        )
        return success_response({"post": _post_to_frontend(post)})

    @router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
    def create_comment(
        http_request: Request,
        post_id: str,
        body: _CreateCommunityCommentBody,
    ) -> dict[str, object]:
        repository = _community_repository(http_request)
        if repository.get_post(post_id) is None:
            raise HTTPException(status_code=404, detail="Community post not found")
        comment = repository.create_comment(post_id=post_id, body=body.body, author_name=body.authorName)
        post = repository.get_post(post_id)
        return success_response({"comment": _comment_to_frontend(comment), "post": _post_to_frontend(post)})

    @router.post("/posts/{post_id}/reactions")
    def add_reaction(http_request: Request, post_id: str) -> dict[str, object]:
        repository = _community_repository(http_request)
        try:
            post = repository.add_reaction(post_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Community post not found") from None
        return success_response({"post": _post_to_frontend(post)})

    return router


def _community_repository(request: Request):
    app_context: AppContext = request.app.state.app_context
    if app_context.community_repository is None:
        raise HTTPException(status_code=500, detail="Community repository not configured")
    return app_context.community_repository


def _post_to_frontend(post: CommunityPost | None) -> dict[str, object]:
    if post is None:
        raise HTTPException(status_code=404, detail="Community post not found")
    payload: dict[str, object] = {
        "id": post.id,
        "board": post.board,
        "title": post.title,
        "body": post.body,
        "authorName": post.author_name,
        "createdAt": post.created_at,
        "comments": post.comments,
        "likes": post.likes,
        "feeds": list(post.feeds),
    }
    if post.distance:
        payload["distance"] = post.distance
    if post.location_label:
        payload["locationLabel"] = post.location_label
    if post.tags:
        payload["tags"] = list(post.tags)
    return payload


def _post_detail_to_frontend(post: CommunityPost, comments: tuple[CommunityComment, ...]) -> dict[str, object]:
    payload = _post_to_frontend(post)
    location_label = f" · 위치 {post.location_label}" if post.location_label else ""
    payload["commentItems"] = [_comment_to_frontend(comment) for comment in comments]
    payload["meta"] = f"{post.board} · 댓글 {post.comments} · 공감 {post.likes}{location_label}"
    return payload


def _comment_to_frontend(comment: CommunityComment) -> dict[str, object]:
    return {
        "id": comment.id,
        "postId": comment.post_id,
        "authorName": comment.author_name,
        "body": comment.body,
        "createdAt": comment.created_at,
    }
