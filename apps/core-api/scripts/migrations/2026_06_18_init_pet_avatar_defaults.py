"""
Migration: 2026_06_18_init_pet_avatar_defaults
Sets default avatar fields on all existing pet documents that lack them.
"""

import asyncio
import motor.motor_asyncio
import os


MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "vetify")


async def _run():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    result = await db["pets"].update_many(
        {"avatar": {"$exists": False}},
        {"$set": {"avatar": {"url": None, "color": "#A78BFA", "initials": True}}},
    )

    print(f"Updated {result.modified_count} pet documents with default avatar.")
    client.close()


def up():
    asyncio.run(_run())


def down():
    print("down() not implemented — manual rollback required.")
