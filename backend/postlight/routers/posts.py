from typing import Annotated
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from postlight.database import connection
from postlight.dependencies import current_user
from postlight.services.posts import serialize_post, validate_text
from postlight.services.retrieval import index_post
from postlight.services.storage import remove_image_best_effort, store_image

router = APIRouter()


@router.get("/posts")
def list_posts():
    with connection() as conn, conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute("select * from public.posts order by created_at desc")
        return [serialize_post(row) for row in cur.fetchall()]


@router.get("/posts/{post_id}")
def get_post(post_id: UUID):
    with connection() as conn, conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute("select * from public.posts where id = %s", (post_id,))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "Post not found")
    return serialize_post(row)


@router.post("/posts", status_code=201)
async def create_post(
    title: Annotated[str, Form()],
    body: Annotated[str, Form()],
    user_id: Annotated[UUID, Depends(current_user)],
    image: UploadFile | None = File(default=None),
):
    title, body = validate_text(title, body)
    new_path = await store_image(image, user_id)
    try:
        with connection() as conn, conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                "insert into public.posts (author_id, title, body, image_path) values (%s, %s, %s, %s) returning *",
                (user_id, title, body, new_path),
            )
            row = cur.fetchone()
            index_post(cur, row["id"], title, body)
            return serialize_post(row)
    except Exception:
        remove_image_best_effort(new_path)
        raise


@router.put("/posts/{post_id}")
async def update_post(
    post_id: UUID,
    title: Annotated[str, Form()],
    body: Annotated[str, Form()],
    user_id: Annotated[UUID, Depends(current_user)],
    remove_existing_image: bool = Form(default=False),
    image: UploadFile | None = File(default=None),
):
    title, body = validate_text(title, body)
    if image and remove_existing_image:
        raise HTTPException(422, "Choose a replacement image or remove the current image")
    new_path = await store_image(image, user_id)
    old_path = None
    try:
        with connection() as conn, conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute("select * from public.posts where id = %s for update", (post_id,))
            old = cur.fetchone()
            if old is None:
                raise HTTPException(404, "Post not found")
            if old["author_id"] != user_id:
                raise HTTPException(403, "You can only edit your own posts")
            old_path = old["image_path"]
            path = new_path if new_path else (None if remove_existing_image else old_path)
            cur.execute(
                "update public.posts set title = %s, body = %s, image_path = %s, updated_at = now() where id = %s returning *",
                (title, body, path, post_id),
            )
            row = cur.fetchone()
            index_post(cur, post_id, title, body)
    except Exception:
        remove_image_best_effort(new_path)
        raise
    if old_path and old_path != path:
        remove_image_best_effort(old_path)
    return serialize_post(row)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: UUID, user_id: Annotated[UUID, Depends(current_user)]):
    with connection() as conn, conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute("select author_id, image_path from public.posts where id = %s for update", (post_id,))
        row = cur.fetchone()
        if row is None:
            raise HTTPException(404, "Post not found")
        if row["author_id"] != user_id:
            raise HTTPException(403, "You can only delete your own posts")
        cur.execute("delete from public.posts where id = %s", (post_id,))
    remove_image_best_effort(row["image_path"])
