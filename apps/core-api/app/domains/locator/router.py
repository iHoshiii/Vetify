from fastapi import APIRouter, Query
from app.domains.locator.services import find_nearby_clinics

router = APIRouter(prefix="/locator", tags=["Locator"])


@router.get("/nearby")
async def nearby_clinics(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: int = Query(5000, description="Search radius in metres"),
):
    """Return vet clinics within a given radius of the provided coordinates."""
    clinics = await find_nearby_clinics(lat, lng, radius)
    return {"clinics": clinics}
