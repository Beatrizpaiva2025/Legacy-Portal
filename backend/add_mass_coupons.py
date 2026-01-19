"""
Script to add MASS discount coupon templates for partners.
Run this script once after deploying the coupon management endpoints.

These are TEMPLATE coupons (partner_id = None) that can be assigned to
specific partners via the admin API.

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

    # Define the coupon TEMPLATES to create (partner_id = None)
    # These are templates that can be assigned to specific partners
    coupons = [
        {"code": "MASS5", "discount_value": 5.0},
        {"code": "MASS10", "discount_value": 10.0},
        {"code": "MASS15", "discount_value": 15.0},
        {"code": "MASS20", "discount_value": 20.0},
        {"code": "MASS25", "discount_value": 25.0},
        {"code": "MASS30", "discount_value": 30.0},
        {"code": "MASS35", "discount_value": 35.0},
    ]

    print("Adding MASS discount coupon TEMPLATES...")
    print("(These are templates that can be assigned to specific partners via admin)")
    print()

    for coupon_data in coupons:
        coupon = {
            "id": str(uuid.uuid4()),
            "code": coupon_data["code"],
            "discount_type": "percentage",
            "discount_value": coupon_data["discount_value"],
            "max_uses": 9999,  # Template has high limit
            "times_used": 0,
            "is_active": True,
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=365 * 5),  # 5 years
            "min_order_value": 0.0,
            "first_order_only": False,
            "partner_id": None,  # NULL = Template coupon, not assigned to any partner
            "created_at": datetime.utcnow()
        }

        # Check if coupon template already exists
        existing = await db.coupons.find_one({
            "code": coupon["code"],
            "partner_id": None  # Template coupons have no partner_id
        })

        if existing:
            print(f"  Template {coupon['code']} already exists, skipping...")
            continue

        # Insert coupon template
        await db.coupons.insert_one(coupon)
        print(f"  Created template: {coupon['code']} ({int(coupon['discount_value'])}% discount)")

    print()
    print("=" * 50)
    print("COUPON TEMPLATES CREATED:")
    print("=" * 50)
    for c in coupons:
        print(f"  - {c['code']}: {int(c['discount_value'])}% discount")
    print()
    print("IMPORTANT: These are TEMPLATES only!")
    print("To make a coupon available to a partner, use the admin API:")
    print()
    print("  POST /api/admin/coupons/assign")
    print("  {")
    print('    "coupon_code": "MASS10",')
    print('    "partner_id": "<partner-uuid>",')
    print('    "max_uses": 5')
    print("  }")
    print()
    print("Or use the Admin Portal to assign coupons to partners.")

    client.close()

if __name__ == "__main__":
    asyncio.run(add_coupons())
