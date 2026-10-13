from io import BytesIO
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from postlight.clients import storage_client
from postlight.config import settings


def image_url(path: str | None) -> str | None:
    if not path:
        return None
    return storage_client.storage.from_(settings.supabase_storage_bucket).get_public_url(path)


async def store_image(file: UploadFile | None, user_id: UUID) -> str | None:
    if file is None:
        return None
    raw = await file.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(413, "Image must be 5 MB or smaller")
    try:
        with Image.open(BytesIO(raw)) as image:
            image.verify()
            image_format = image.format
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(422, "Choose a valid PNG, JPEG, or WebP image") from exc
    extension = {"PNG": "png", "JPEG": "jpg", "WEBP": "webp"}.get(image_format)
    if not extension:
        raise HTTPException(422, "Choose a PNG, JPEG, or WebP image")
    path = f"{user_id}/{uuid4()}.{extension}"
    storage_client.storage.from_(settings.supabase_storage_bucket).upload(
        path=path,
        file=raw,
        file_options={"content-type": f"image/{'jpeg' if extension == 'jpg' else extension}", "upsert": "false"},
    )
    return path


def remove_image(path: str | None) -> None:
    if path:
        storage_client.storage.from_(settings.supabase_storage_bucket).remove([path])


def remove_image_best_effort(path: str | None) -> None:
    try:
        remove_image(path)
    except Exception:
        # The database operation has already committed. An orphaned file is
        # preferable to reporting a failed write or removing its new image.
        pass
