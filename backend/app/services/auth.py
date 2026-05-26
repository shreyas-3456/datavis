from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.services.user import get_user_by_email, create_user
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.token import LoginRequest, SignupRequest
from app.core.logger import auth_logger

async def login_user(db: AsyncSession, data: LoginRequest):
    user = await get_user_by_email(db, data.email)

    if not user or not user.hashed_password:
        auth_logger.warning(f"Failed login attempt: {data.email}", extra={"event": "login_failed", "email": data.email})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(data.password, user.hashed_password):
        auth_logger.warning(f"Wrong password: {data.email}", extra={"event": "wrong_password", "email": data.email})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    payload = {"sub": str(user.id), "email": user.email, "role": user.role}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    auth_logger.info(f"Login success: {user.email}", extra={"event": "login_success", "email": user.email})
    return user, access_token, refresh_token

async def signup_user(db: AsyncSession, data: SignupRequest):
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = await create_user(db, data)
    payload = {"sub": str(user.id), "email": user.email, "role": user.role}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    return user, access_token, refresh_token

async def refresh_access_token(refresh_token: str):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    new_access_token = create_access_token({"sub": payload["sub"], "email": payload["email"], "role": payload["role"]})
    return new_access_token