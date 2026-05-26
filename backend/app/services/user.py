from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, AuthProvider
from app.schemas.token import SignupRequest
from app.core.security import get_password_hash
from app.core.logger import auth_logger
from uuid import UUID
from typing import Optional

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, data: SignupRequest) -> User:
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        provider=AuthProvider.local,
        is_verified=False,
    )
    db.add(user)
    await db.flush()
    auth_logger.info(f"New user created: {user.email}", extra={"event": "user_created", "email": user.email})
    return user

async def get_or_create_oauth_user(db: AsyncSession, email: str, full_name: str, avatar_url: str, provider: AuthProvider, provider_id: str) -> User:
    user = await get_user_by_email(db, email)
    if user:
        user.avatar_url = avatar_url
        user.provider_id = provider_id
        await db.flush()
        auth_logger.info(f"OAuth login: {email}", extra={"event": "oauth_login", "email": email, "provider": provider})
        return user

    user = User(
        email=email,
        full_name=full_name,
        avatar_url=avatar_url,
        provider=provider,
        provider_id=provider_id,
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    auth_logger.info(f"New OAuth user: {email}", extra={"event": "oauth_user_created", "email": email, "provider": provider})
    return user