from fastapi import HTTPException

from postlight.services.storage import image_url


def serialize_post(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "author_id": str(row["author_id"]),
        "title": row["title"],
        "body": row["body"],
        "image_url": image_url(row["image_path"]),
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


def validate_text(title: str, body: str) -> tuple[str, str]:
    title, body = title.strip(), body.strip()
    if not 1 <= len(title) <= 160 or not 1 <= len(body) <= 20000:
        raise HTTPException(422, "Title must be 1–160 characters and body 1–20,000 characters")
    return title, body
