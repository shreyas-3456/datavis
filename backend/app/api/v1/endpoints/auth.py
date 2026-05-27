import socket
from contextlib import contextmanager
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_password_reset_email
from app.core.logger import auth_logger
from app.core.oauth import oauth
from app.core.security import (
    decode_token,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    verify_password_reset_token,
    get_password_hash,
)
from app.db.session import get_db
from app.models.user import AuthProvider
from app.schemas.token import LoginRequest, SignupRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.user import UserOut
from app.services.auth import login_user, signup_user, refresh_access_token
from app.services.user import get_or_create_oauth_user, get_user_by_email, get_user_by_id
from uuid import UUID

router = APIRouter(prefix="/auth", tags=["auth"])

_original_getaddrinfo = socket.getaddrinfo

@contextmanager
def force_ipv4():
    def ipv4_getaddrinfo(host, port, family=0, *args, **kwargs):
        return _original_getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)
    socket.getaddrinfo = ipv4_getaddrinfo
    try:
        yield
    finally:
        socket.getaddrinfo = _original_getaddrinfo


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=not settings.DEBUG, samesite="lax", max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=not settings.DEBUG, samesite="lax", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)


@router.post("/signup", response_model=UserOut)
async def signup(data: SignupRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user, access_token, refresh_token = await signup_user(db, data)
    set_auth_cookies(response, access_token, refresh_token)
    return user


@router.post("/login", response_model=UserOut)
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user, access_token, refresh_token = await login_user(db, data)
    set_auth_cookies(response, access_token, refresh_token)
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    new_access_token = await refresh_access_token(token)
    response.set_cookie("access_token", new_access_token, httponly=True, secure=not settings.DEBUG, samesite="lax", max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return {"message": "Token refreshed"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, data.email)
    if not user or user.provider != AuthProvider.local:
        return {"message": "If that email exists, a reset link has been sent"}
    token = create_password_reset_token(user.email)
    await send_password_reset_email(user.email, user.full_name or "there", token)
    auth_logger.info(f"Password reset email sent: {user.email}", extra={"event": "reset_email_sent"})
    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    email = verify_password_reset_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(data.password)
    await db.flush()
    auth_logger.info(f"Password reset success: {email}", extra={"event": "password_reset"})
    return {"message": "Password reset successful"}


@router.get("/google")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        with force_ipv4():
            token = await oauth.google.authorize_access_token(request)

        userinfo = token.get("userinfo")
        if not userinfo:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")

        user = await get_or_create_oauth_user(
            db,
            email=userinfo["email"],
            full_name=userinfo.get("name", ""),
            avatar_url=userinfo.get("picture", ""),
            provider=AuthProvider.google,
            provider_id=userinfo["sub"],
        )

        payload = {"sub": str(user.id), "email": user.email, "role": user.role}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth"
                f"?access_token={access_token}&refresh_token={refresh_token}"
        )

    except Exception as e:
        auth_logger.error(f"Google OAuth error: {e}", exc_info=True)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/login?error=oauth_failed")


@router.get("/me", response_model=UserOut)
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await get_user_by_id(db, UUID(payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user