from app.infra.database import get_database


async def find_nearby_clinics(lat: float, lng: float, radius: int) -> list[dict]:
    """Execute a MongoDB $near geospatial query to find vet clinics within radius."""
    db = await get_database()
    collection = db["clinics"]

    cursor = collection.find(
        {
            "location": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": radius,
                }
            }
        }
    ).limit(20)

    clinics = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        clinics.append(doc)

    return clinics
