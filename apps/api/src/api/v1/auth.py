"""
Authentication Endpoints & Demo User Seeding
"""
from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.database import get_db
from apps.api.src.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from apps.api.src.models.user import User
from apps.api.src.schemas.auth import LoginRequest, TokenResponse, UserResponse
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Pre-configured demo accounts for SIH 2026 demonstration
DEMO_USERS = [
    {
        "email": "investigator@chaintrace.internal",
        "password": "Investigator123!",
        "full_name": "Senior Investigator Alex Mercer",
        "role": "INVESTIGATOR",
    },
    {
        "email": "admin@chaintrace.internal",
        "password": "AdminSecure123!",
        "full_name": "Admin Director Sarah Vance",
        "role": "ADMIN",
    },
    {
        "email": "analyst@chaintrace.internal",
        "password": "AnalystSecure123!",
        "full_name": "Cyber Intelligence Analyst Raj Patel",
        "role": "ANALYST",
    },
    {
        "email": "viewer@chaintrace.internal",
        "password": "ViewerSecure123!",
        "full_name": "Observer Officer David Kim",
        "role": "VIEWER",
    },
]


async def seed_demo_users_if_needed(db: AsyncSession):
    """Ensures demo accounts exist in database for seamless local and SIH evaluation."""
    for demo in DEMO_USERS:
        stmt = select(User).where(User.email == demo["email"])
        result = await db.execute(stmt)
        if not result.scalar_one_or_none():
            user = User(
                email=demo["email"],
                hashed_password=get_password_hash(demo["password"]),
                full_name=demo["full_name"],
                role=demo["role"],
                is_active=True,
            )
            db.add(user)
    await db.commit()


@router.post("/login", response_model=TokenResponse)
async def login_json(
    credentials: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await seed_demo_users_if_needed(db)
    stmt = select(User).where(User.email == credentials.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        await log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            request=request,
            result="FAILURE",
            metadata={"email": credentials.email},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    await log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        actor=user,
        request=request,
        result="SUCCESS",
    )

    return TokenResponse(
        accessToken=access_token,
        tokenType="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            fullName=user.full_name,
            role=user.role,
            isActive=user.is_active,
            createdAt=user.created_at.isoformat(),
        ),
    )


@router.post("/oauth2-login", response_model=TokenResponse, include_in_schema=False)
async def login_oauth2(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    return await login_json(
        credentials=LoginRequest(email=form_data.username, password=form_data.password),
        request=request,
        db=db,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        fullName=current_user.full_name,
        role=current_user.role,
        isActive=current_user.is_active,
        createdAt=current_user.created_at.isoformat(),
    )
