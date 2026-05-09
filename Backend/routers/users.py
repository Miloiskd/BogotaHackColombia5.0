from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import TelegramUser

router = APIRouter()


class FormatBody(BaseModel):
    format: str  # "texto" | "audio"
    username: str = ""


@router.get("/{chat_id}")
def get_user(chat_id: str, db: Session = Depends(get_db)):
    user = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
    if not user:
        return {"chat_id": chat_id, "response_format": "texto"}
    return {"chat_id": chat_id, "response_format": user.response_format}


@router.post("/{chat_id}")
def upsert_user(chat_id: str, body: FormatBody, db: Session = Depends(get_db)):
    user = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
    if user:
        user.response_format = body.format
    else:
        user = TelegramUser(chat_id=chat_id, username=body.username, response_format=body.format)
        db.add(user)
    db.commit()
    return {"chat_id": chat_id, "response_format": body.format}
