"""Schemas for client management and multi-tenant RBAC."""

from pydantic import BaseModel, Field


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    business_description: str = ""
    product_info: str = ""
    tone_of_voice: str = ""
    target_audience: str = ""
    brand_colors: dict | None = None
    brand_fonts: dict | None = None
    logo_url: str = ""
    website_url: str = ""
    languages: list[str] | None = None
    content_pillars: list[dict] | None = None
    social_handles: dict | None = None
    hashtags: list[str] | None = None
    ai_system_prompt_override: str = ""


class ClientUpdate(BaseModel):
    name: str | None = None
    business_description: str | None = None
    product_info: str | None = None
    tone_of_voice: str | None = None
    target_audience: str | None = None
    brand_colors: dict | None = None
    brand_fonts: dict | None = None
    logo_url: str | None = None
    website_url: str | None = None
    languages: list[str] | None = None
    content_pillars: list[dict] | None = None
    social_handles: dict | None = None
    hashtags: list[str] | None = None
    ai_system_prompt_override: str | None = None


class ClientResponse(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    business_description: str
    product_info: str
    tone_of_voice: str
    target_audience: str
    brand_colors: dict | None
    brand_fonts: dict | None
    logo_url: str
    website_url: str
    languages: list | None
    content_pillars: list | None
    social_handles: dict | None
    hashtags: list | None
    ai_system_prompt_override: str


class ClientMembership(BaseModel):
    client_id: str
    client_name: str
    client_slug: str
    client_logo_url: str
    role: str


class AddMemberRequest(BaseModel):
    email: str
    role: str = Field(..., pattern=r"^(viewer|moderator|admin)$")


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., pattern=r"^(viewer|moderator|admin)$")


class MemberResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    is_active: bool
