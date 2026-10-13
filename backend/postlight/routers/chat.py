from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from postlight.dependencies import current_user
from postlight.schemas import ChatRequest
from postlight.services.retrieval import answer_question

router = APIRouter()


@router.post("/chat")
def chat(payload: ChatRequest, _user_id: Annotated[UUID, Depends(current_user)]):
    return answer_question(payload.question)
