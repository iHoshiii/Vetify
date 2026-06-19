import motor.motor_asyncio
from app.core.config import settings

_client: motor.motor_asyncio.AsyncIOMotorClient | None = None


def get_mongo_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    return _client


async def get_database() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """Return the application MongoDB database via async Motor client."""
    client = get_mongo_client()
    return client[settings.MONGODB_DB_NAME]
