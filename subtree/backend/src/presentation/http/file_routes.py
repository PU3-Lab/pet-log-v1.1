from __future__ import annotations

import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from composition import AppContext
from domain.enums import FilePurpose
from domain.models import StoredFile
from presentation.http.schemas import success_response

MAX_IMAGE_BYTES = 5 * 1024 * 1024
FILE_PURPOSES: set[FilePurpose] = {"profile_photo", "record_attachment", "product_image"}


def build_file_router() -> APIRouter:
    router = APIRouter()

    @router.post("/api/v1/files", status_code=201)
    async def upload_file(
        http_request: Request,
        file: UploadFile = File(...),
        pet_id: str | None = Form(default=None),
        purpose: str = Form(default="record_attachment"),
        owner_user_id: str = Form(default="local-user"),
    ) -> dict[str, object]:
        app_context = _app_context(http_request)
        if getattr(app_context, "file_repository", None) is None or getattr(app_context, "file_storage", None) is None:
            raise HTTPException(status_code=500, detail="File storage is not configured")

        if purpose not in FILE_PURPOSES:
            raise HTTPException(status_code=422, detail="Unsupported file purpose")

        content_type = file.content_type or "application/octet-stream"
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="Only image files are supported")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=422, detail="Image file must not be empty")
        if len(content) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image file is too large")

        file_id = str(uuid4())
        storage_key = _storage_key(
            file_id=file_id,
            filename=file.filename or "",
            pet_id=pet_id,
            purpose=purpose,
            content_type=content_type,
        )
        app_context.file_storage.write(storage_key, content)
        stored_file = app_context.file_repository.save_metadata(
            owner_user_id=owner_user_id,
            pet_id=pet_id,
            purpose=purpose,
            storage_key=storage_key,
            mime_type=content_type,
            byte_size=len(content),
            file_id=file_id,
        )
        if purpose == "profile_photo" and pet_id:
            app_context.pet_profile_reader.set_profile_photo_file(pet_id, stored_file.id)

        return success_response({"file": _file_to_dict(stored_file)})

    @router.get("/api/v1/files/{file_id}")
    def get_file(http_request: Request, file_id: str) -> FileResponse:
        app_context = _app_context(http_request)
        if getattr(app_context, "file_repository", None) is None or getattr(app_context, "file_storage", None) is None:
            raise HTTPException(status_code=500, detail="File storage is not configured")

        try:
            stored_file = app_context.file_repository.get_file(file_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="File not found") from exc

        path = app_context.file_storage.path_for(stored_file.storage_key)
        if not path.exists():
            raise HTTPException(status_code=404, detail="File content not found")
        return FileResponse(path, media_type=stored_file.mime_type)

    @router.delete("/api/v1/files/{file_id}")
    def delete_file(http_request: Request, file_id: str) -> dict[str, object]:
        app_context = _app_context(http_request)
        if getattr(app_context, "file_repository", None) is None or getattr(app_context, "file_storage", None) is None:
            raise HTTPException(status_code=500, detail="File storage is not configured")

        try:
            stored_file = app_context.file_repository.get_file(file_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="File not found") from exc

        deleted_metadata = app_context.file_repository.delete_metadata(file_id)
        if not deleted_metadata:
            raise HTTPException(status_code=404, detail="File metadata not found or already deleted")

        app_context.file_storage.delete(stored_file.storage_key)
        return success_response({"id": file_id})

    return router


def _app_context(request: Request) -> AppContext:
    return request.app.state.app_context


def _storage_key(
    *,
    file_id: str,
    filename: str,
    pet_id: str | None,
    purpose: FilePurpose,
    content_type: str,
) -> str:
    extension = Path(filename).suffix.lower() or mimetypes.guess_extension(content_type) or ".bin"
    owner_segment = pet_id or "unassigned"
    return f"{purpose}s/{owner_segment}/{file_id}{extension}"


def _file_to_dict(stored_file: StoredFile) -> dict[str, object]:
    return {
        "id": stored_file.id,
        "owner_user_id": stored_file.owner_user_id,
        "pet_id": stored_file.pet_id,
        "purpose": stored_file.purpose,
        "storage_key": stored_file.storage_key,
        "mime_type": stored_file.mime_type,
        "byte_size": stored_file.byte_size,
        "created_at": stored_file.created_at,
        "url": f"/api/v1/files/{stored_file.id}",
    }
