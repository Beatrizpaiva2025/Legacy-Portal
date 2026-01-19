"""
Script to add MASS discount coupons for partners.
Run this script once after deploying the coupon management endpoints.

Usage:
    python add_mass_coupons.py

Requires MONGO_URL environment variable to be set.
"""
import asyncio
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

async def add_coupons():
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.legacy_portal

    # Define the coupons to create
    coupons = [
        {
            "id": str(uuid.uuid4()),
            "code": "MASS5",
            "discount_type": "percentage",
            "discount_value": 5.0,  # 5% discount
            "max_uses": 9999,
            "times_used": 0,
            "is_active": True,
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=365),
            "min_order_value": 0.0,
            "first_order_only": False,
            "partner_id": None,  # Available for all partners
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "MASS10",
            "discount_type": "percentage",
            "discount_value": 10.0,  # 10% discount
            "max_uses": 9999,
            "times_used": 0,
            "is_active": True,
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=365),
            "min_order_value": 0.0,
            "first_order_only": False,
            "partner_id": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "MASS15",
            "discount_type": "percentage",
            "discount_value": 15.0,  # 15% discount
            "max_uses": 9999,
            "times_used": 0,
            "is_active": True,
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=365),
            "min_order_value": 0.0,
            "first_order_only": False,
            "partner_id": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "MASS20",
            "discount_type": "percentage",
            "discount_value": 20.0,  # 20% discount
            "max_uses": 9999,
            "times_used": 0,
            "is_active": True,
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=365),
            "min_order_value": 0.0,
            "first_order_only": False,
            "partner_id": None,
            "created_at": datetime.utcnow()
        }
    ]

    print("Adding MASS discount coupons...")

    for coupon in coupons:
        # Check if coupon already exists
        existing = await db.coupons.find_one({"code": coupon["code"]})
        if existing:
            print(f"  Coupon {coupon['code']} already exists, skipping...")
            continue

        # Insert coupon
        await db.coupons.insert_one(coupon)
        print(f"  Created coupon: {coupon['code']} ({coupon['discount_value']}% discount)")

    print("\nDone! Coupons created:")
    print("  - MASS5: 5% discount")
    print("  - MASS10: 10% discount")
    print("  - MASS15: 15% discount")
    print("  - MASS20: 20% discount")
    print("\nThese coupons are valid for 1 year and can be used by any partner.")

    client.close()

if __name__ == "__main__":
    asyncio.run(add_coupons())
