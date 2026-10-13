from typing import Annotated
from uuid import UUID

from fastapi import Header, HTTPException

from postlight.clients import storage_client


def current_user(authorization: Annotated[str | None, Header()] = None) -> UUID:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in to continue")
    try:
        user = storage_client.auth.get_user(authorization[7:]).user
        if user is None:
            raise ValueError("Missing user")
        return UUID(str(user.id))
    except Exception as exc:
        raise HTTPException(401, "Session expired. Please sign in again") from exc
