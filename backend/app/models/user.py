import uuid
from sqlalchemy import Column, String, Boolean, Enum as SAEnum 
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum
from app.models.dataset import Dataset

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"
    viewer = "viewer"

class AuthProvider(str, enum.Enum):
    local = "local"
    google = "google"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    provider = Column(SAEnum(AuthProvider), default=AuthProvider.local, nullable=False)
    provider_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    datasets = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")