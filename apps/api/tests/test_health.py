"""
Health check & API initialization tests
"""
import pytest
from apps.api.src.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "ChainTrace API"
    assert data["status"] == "operational"


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert "database" in data["services"]
    assert "neo4j" in data["services"]
    assert "redis" in data["services"]
    # With fallbacks enabled, system should report either healthy or degraded (mock mode), never crash
    assert data["status"] in ("healthy", "degraded")
