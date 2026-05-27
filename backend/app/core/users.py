# app/core/users.py
from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.core.security import decode_token
from app.services.user import get_user_by_id
from app.models.user import User


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Cookie(default=None),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    if not access_token:
        raise credentials_exception

    payload = decode_token(access_token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = await get_user_by_id(db, UUID(user_id))
    if user is None or not user.is_active:
        raise credentials_exception

    return user