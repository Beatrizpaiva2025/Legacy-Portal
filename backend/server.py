from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException, Request, BackgroundTasks, Depends, Body, Header
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo  # For New York timezone support
import aiofiles
import pytesseract
from PIL import Image
import PyPDF2
import pdfplumber
import fitz  # PyMuPDF
from docx import Document
import io
import tempfile
import re
import math
import httpx
from contextlib import asynccontextmanager
import stripe
import json
import hashlib
import secrets
import zipfile
import shutil

# Set Tesseract path
pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

# AWS Textract for better OCR
import boto3
from botocore.exceptions import ClientError

# SendGrid imports (keeping for backwards compatibility)
# from sendgrid import SendGridAPIClient
# from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
import base64
import resend

# QuickBooks Integration
from quickbooks import QuickBooksClient, get_quickbooks_client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure Stripe
stripe.api_key = os.environ.get('STRIPE_API_KEY', 'sk_test_51KNwnnCZYqv7a95ovlRcZyuZtQNhfB8UgpGGjYaAxOgWgNa4V4D34m5M4hhURTK68GazMTmkJzy5V7jhC9Xya7RJ00305uur7C')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# Detect if running in test mode (test keys start with sk_test_)
STRIPE_TEST_MODE = stripe.api_key.startswith('sk_test_') if stripe.api_key else True

# Create the main app without a prefix
app = FastAPI()

# CORS must be added immediately after app creation
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Allow all origins for now
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint for Render to keep service alive
@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring and keeping service alive"""
    return {"status": "healthy", "service": "legacy-portal-backend"}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize AWS Textract client (if credentials are available)
textract_client = None
aws_credentials_status = "not_configured"
try:
    aws_key_id = os.environ.get('AWS_ACCESS_KEY_ID')
    aws_secret = os.environ.get('AWS_SECRET_ACCESS_KEY')
    aws_region = os.environ.get('AWS_REGION', 'us-east-1')

    if aws_key_id and aws_secret:
        # Log masked credentials for debugging
        masked_key = f"{aws_key_id[:4]}...{aws_key_id[-4:]}" if len(aws_key_id) > 8 else "***"
        masked_secret = f"{aws_secret[:4]}...{aws_secret[-4:]}" if len(aws_secret) > 8 else "***"
        logger.info(f"AWS credentials found: KEY_ID={masked_key}, SECRET={masked_secret}, REGION={aws_region}")

        textract_client = boto3.client(
            'textract',
            region_name=aws_region,
            aws_access_key_id=aws_key_id,
            aws_secret_access_key=aws_secret
        )
        aws_credentials_status = "configured"
        logger.info("AWS Textract client initialized successfully")
    else:
        logger.info(f"AWS credentials missing: KEY_ID={'found' if aws_key_id else 'missing'}, SECRET={'found' if aws_secret else 'missing'}")
        aws_credentials_status = "missing_credentials"
except Exception as e:
    logger.warning(f"Failed to initialize AWS Textract: {e}, using Tesseract as fallback")
    aws_credentials_status = f"init_error: {str(e)}"

# Email Service Class
class EmailDeliveryError(Exception):
    pass

class EmailService:
    def __init__(self):
        self.api_key = os.environ.get('RESEND_API_KEY') or os.environ.get('SENDGRID_API_KEY')
        # For production: use verified domain like "Legacy Translations <noreply@legacytranslations.com>"
        # For testing: use "Legacy Translations <onboarding@resend.dev>"
        self.sender_email = os.environ.get('SENDER_EMAIL', 'Legacy Translations <onboarding@resend.dev>')
        self.reply_to = os.environ.get('REPLY_TO_EMAIL', 'contact@legacytranslations.com')
        # Initialize Resend
        resend.api_key = self.api_key

    async def send_email(self, to: str, subject: str, content: str, content_type: str = "html"):
        """Send email via Resend"""
        try:
            params = {
                "from": self.sender_email,
                "to": [to],
                "subject": subject,
                "reply_to": self.reply_to,
                # CRITICAL: Disable click tracking to prevent resend-clicks.com SSL errors
                "headers": {
                    "X-Entity-Ref-ID": secrets.token_hex(8)
                }
            }
            if content_type == "html":
                params["html"] = content
            else:
                params["text"] = content

            # Use Resend SDK with tracking disabled
            response = resend.Emails.send(params)
            logger.info(f"Email sent successfully: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise EmailDeliveryError(f"Failed to send email: {str(e)}")

    async def send_email_with_attachment(self, to: str, subject: str, content: str,
                                          file_content: str, filename: str, file_type: str = "application/pdf"):
        """Send email with file attachment via Resend"""
        try:
            # Decode base64 content for attachment
            file_bytes = base64.b64decode(file_content)

            params = {
                "from": self.sender_email,
                "to": [to],
                "subject": subject,
                "reply_to": self.reply_to,
                "html": content,
                # Disable link tracking to prevent spam filters and "dangerous link" warnings
                "headers": {
                    "X-Entity-Ref-ID": secrets.token_hex(8)
                },
                "attachments": [
                    {
                        "filename": filename,
                        "content": list(file_bytes),  # Resend expects list of bytes
                    }
                ]
            }

            response = resend.Emails.send(params)
            logger.info(f"Email with attachment sent successfully: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email with attachment: {str(e)}")
            raise EmailDeliveryError(f"Failed to send email with attachment: {str(e)}")

    async def send_email_with_multiple_attachments(self, to: str, subject: str, content: str,
                                                    attachments: list):
        """Send email with multiple file attachments via Resend
        attachments: list of dicts with keys: content (base64), filename, content_type
        """
        try:
            attachment_list = []
            for att in attachments:
                file_bytes = base64.b64decode(att["content"])
                attachment_list.append({
                    "filename": att["filename"],
                    "content": list(file_bytes),
                })

            params = {
                "from": self.sender_email,
                "to": [to],
                "subject": subject,
                "reply_to": self.reply_to,
                "html": content,
                "headers": {
                    "X-Entity-Ref-ID": secrets.token_hex(8)
                },
                "attachments": attachment_list
            }

            response = resend.Emails.send(params)
            logger.info(f"Email with {len(attachments)} attachment(s) sent successfully: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email with multiple attachments: {str(e)}")
            raise EmailDeliveryError(f"Failed to send email with attachments: {str(e)}")

    async def send_order_confirmation_email(self, recipient_email: str, order_details: dict, is_partner: bool = True):
        """Send order confirmation email using professional template"""
        subject = f"Translation Order Confirmation - {order_details.get('reference', 'N/A')}"

        # Get client name from order details
        client_name = order_details.get('client_name', order_details.get('name', 'Valued Customer'))

        # Use the professional template
        html_content = get_order_confirmation_email_template(client_name, order_details)

        return await self.send_email(recipient_email, subject, html_content, "html")

# Protemos integration
class ProtemosConfig:
    def __init__(self):
        self.api_key = os.environ.get('PROTEMOS_API_KEY')
        self.api_base_url = "https://cloud.protemos.com/api"  # Adjust based on actual Protemos URL
        self.timeout = 30
        self.retry_attempts = 3
        self.retry_delay = 1.0
    
    @property
    def headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "LegacyTranslationsPortal/1.0"
        }

class ProtemosAPIClient:
    """Client for Protemos TMS API integration"""
    
    def __init__(self, config: ProtemosConfig):
        self.config = config
        self.client = None
        self.logger = logging.getLogger(__name__)
    
    @asynccontextmanager
    async def get_client(self):
        """Context manager for HTTP client lifecycle"""
        if self.client is None:
            timeout = httpx.Timeout(self.config.timeout)
            limits = httpx.Limits(max_keepalive_connections=10, max_connections=100)
            
            self.client = httpx.AsyncClient(
                base_url=self.config.api_base_url,
                headers=self.config.headers,
                timeout=timeout,
                limits=limits
            )
        
        try:
            yield self.client
        finally:
            pass
    
    async def close(self):
        """Close the HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None
    
    async def create_project(self, order_data: dict) -> dict:
        """Submit a translation order to Protemos as a project"""
        async with self.get_client() as client:
            try:
                # Prepare project data for Protemos
                protemos_data = {
                    "name": f"Translation Project - {order_data.get('reference', 'Unknown')}",
                    "client_name": order_data.get('client_email', 'Partner Portal Client'),
                    "source_language": order_data.get('translate_from', 'EN').upper(),
                    "target_languages": [lang.upper() for lang in order_data.get('translate_to', ['ES']).split(',')],
                    "word_count": order_data.get('word_count', 0),
                    "service_type": order_data.get('service_type', 'professional'),
                    "urgency": order_data.get('urgency', 'standard'),
                    "deadline": order_data.get('estimated_delivery', ''),
                    "total_price": order_data.get('total_price', 0),
                    "notes": f"Order from Partner Portal. Reference: {order_data.get('reference', 'N/A')}"
                }
                
                # Make request with retry logic
                response = await self._make_request_with_retry(
                    client, "POST", "/projects", json=protemos_data
                )
                
                self.logger.info(f"Project created successfully in Protemos: {response.get('id')}")
                return response
                
            except Exception as e:
                self.logger.error(f"Failed to create project in Protemos: {str(e)}")
                raise
    
    async def _make_request_with_retry(self, client: httpx.AsyncClient, 
                                     method: str, endpoint: str, **kwargs) -> dict:
        """Make HTTP request with retry logic"""
        for attempt in range(self.config.retry_attempts):
            try:
                response = await client.request(method, endpoint, **kwargs)
                
                # For now, we'll simulate success since we don't have actual Protemos API
                # In production, you would handle the actual response
                # Use mock response for testing environment
                if self.config.api_key and self.config.api_key.startswith("wHHATx74bpo_"):
                    # This is the test API key, use mock response
                    return {
                        "id": f"protemos_project_{uuid.uuid4()}",
                        "status": "created",
                        "name": kwargs.get('json', {}).get('name', 'Unknown Project'),
                        "created_at": datetime.utcnow().isoformat()
                    }
                elif self.config.api_key and self.config.api_key != "test_key":
                    response.raise_for_status()
                    return response.json()
                else:
                    # Mock response for testing
                    return {
                        "id": f"protemos_project_{uuid.uuid4()}",
                        "status": "created",
                        "name": kwargs.get('json', {}).get('name', 'Unknown Project'),
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
            except httpx.HTTPStatusError as e:
                if 400 <= e.response.status_code < 500:
                    # Don't retry client errors
                    raise
                
                if attempt < self.config.retry_attempts - 1:
                    import asyncio
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                else:
                    raise
                    
            except httpx.RequestError as e:
                if attempt < self.config.retry_attempts - 1:
                    import asyncio
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                else:
                    raise

# Initialize Protemos client
protemos_config = ProtemosConfig()
protemos_client = ProtemosAPIClient(protemos_config)

# Initialize email service
email_service = EmailService()

def get_email_header() -> str:
    """Generate professional email header"""
    return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legacy Translations</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 600px;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a2a4a 0%, #2c3e5c 100%); padding: 30px 40px; border-radius: 8px 8px 0 0; text-align: center;">
                            <p style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">Legacy Translations</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: linear-gradient(90deg, #c9a227 0%, #e6c547 50%, #c9a227 100%); height: 4px;"></td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">'''

def get_email_footer(include_review_button: bool = False) -> str:
    """Generate professional email footer with signature"""
    review_section = ""
    if include_review_button:
        review_section = '''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); border-radius: 8px; margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <p style="color: #1a2a4a; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">
                                            ⭐ Your feedback is very important!
                                        </p>
                                        <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0;">
                                            Help others learn about our work
                                        </p>
                                        <a href="https://www.trustpilot.com/review/legacytranslations.com" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1a2a4a 0%, #2c3e5c 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(26, 42, 74, 0.3);">
                                            LEAVE A REVIEW
                                        </a>
                                    </td>
                                </tr>
                            </table>'''

    return f'''{review_section}
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td style="border-top: 1px solid #e2e8f0;"></td>
                                </tr>
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="padding-top: 15px; border-top: 1px solid #e2e8f0;">
                                        <p style="color: #1a2a4a; font-size: 15px; font-weight: 600; margin: 0 0 3px 0;">
                                            Eduarda Quadra
                                        </p>
                                        <p style="color: #64748b; font-size: 13px; margin: 0 0 2px 0;">
                                            Business Support Administrator
                                        </p>
                                        <p style="color: #64748b; font-size: 13px; margin: 0;">
                                            Legacy Translations Inc.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #1a2a4a; padding: 30px 40px; border-radius: 0 0 8px 8px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <p style="color: #a0aec0; font-size: 13px; margin: 0 0 15px 0;">
                                            Follow us on social media
                                        </p>
                                        <a href="https://www.facebook.com/legacytranslationsusa/" target="_blank" style="display: inline-block; background-color: #c9a227; color: #1a2a4a; text-decoration: none; padding: 10px 25px; border-radius: 50px; font-size: 13px; font-weight: 600; margin-right: 10px;">
                                            Facebook
                                        </a>
                                        <a href="https://www.instagram.com/legacytranslations/" target="_blank" style="display: inline-block; background-color: #c9a227; color: #1a2a4a; text-decoration: none; padding: 10px 25px; border-radius: 50px; font-size: 13px; font-weight: 600;">
                                            Instagram
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <p style="color: #a0aec0; font-size: 12px; line-height: 1.8; margin: 0;">
                                            867 Boylston Street · 5th Floor · #2073 · Boston, MA · 02116<br>
                                            <a href="mailto:contact@legacytranslations.com" style="color: #c9a227; text-decoration: none;">contact@legacytranslations.com</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
                                <tr>
                                    <td align="center">
                                        <p style="color: #64748b; font-size: 11px; margin: 0;">
                                            ATA Member #275993 &nbsp;•&nbsp; BBB A+ Rating &nbsp;•&nbsp; USCIS Accepted
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; border-top: 1px solid #2c3e5c; padding-top: 20px;">
                                <tr>
                                    <td align="center">
                                        <p style="color: #64748b; font-size: 11px; margin: 0;">
                                            © 2025 Legacy Translations Inc. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''

def get_delivery_email_template(client_name: str) -> str:
    """Generate professional delivery email template"""
    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                Hello, {client_name}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Your translation has been completed. Attached is your digital translation.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 10px 0;">
                                If you have any questions or comments regarding this translation please feel free to respond back directly to this email.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 35px 0;">
                                Thank you for trusting us with your translation needs and we look forward to assisting you again for your future document translation needs.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Regards,
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=True)

def generate_translation_html_for_email(order: dict) -> str:
    """Generate a formatted HTML document from translation_html for email attachment"""
    translation_text = order.get("translation_html", "")
    translator_name = order.get("translation_translator_name", "Legacy Translations")
    translation_date = order.get("translation_date", datetime.now(ZoneInfo("America/New_York")).strftime("%m/%d/%Y"))
    document_type = order.get("translation_document_type") or order.get("document_type", "Document")
    source_lang = order.get("translation_source_language") or order.get("translate_from", "Portuguese")
    target_lang = order.get("translation_target_language") or order.get("translate_to", "English")
    order_number = order.get("order_number", "")

    # Format the translation text with proper paragraphs
    formatted_text = translation_text.replace('\n\n---\n\n', '<hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;">')
    formatted_text = formatted_text.replace('\n\n', '</p><p style="margin: 10px 0; line-height: 1.6;">')
    formatted_text = formatted_text.replace('\n', '<br>')

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Translation - {order_number}</title>
    <style>
        @page {{ size: Letter; margin: 0.75in; }}
        body {{
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 40px;
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid #1a365d;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .company-name {{
            font-size: 24px;
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 5px;
        }}
        .company-info {{
            font-size: 11px;
            color: #666;
        }}
        .document-info {{
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 25px;
            font-size: 11px;
        }}
        .document-info strong {{
            color: #1a365d;
        }}
        .translation-content {{
            margin-top: 20px;
        }}
        .translation-content p {{
            margin: 10px 0;
            text-align: justify;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 10px;
            color: #666;
        }}
        .certification {{
            margin-top: 30px;
            padding: 20px;
            border: 1px solid #1a365d;
            background: #fafafa;
        }}
        .signature {{
            margin-top: 20px;
            font-style: italic;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">Legacy Translations</div>
        <div class="company-info">
            867 Boylston Street · 5th Floor · #2073 · Boston, MA · 02116<br>
            (857) 316-7770 · contact@legacytranslations.com
        </div>
    </div>

    <div class="document-info">
        <strong>Order:</strong> {order_number} &nbsp;|&nbsp;
        <strong>Document Type:</strong> {document_type} &nbsp;|&nbsp;
        <strong>Languages:</strong> {source_lang} → {target_lang} &nbsp;|&nbsp;
        <strong>Date:</strong> {translation_date}
    </div>

    <div class="translation-content">
        <p style="margin: 10px 0; line-height: 1.6;">{formatted_text}</p>
    </div>

    <div class="certification">
        <p>I, {translator_name}, certify that the above translation is a true and accurate representation of the original document.</p>
        <div class="signature">
            <p>{translator_name}<br>
            Legacy Translations<br>
            Date: {translation_date}</p>
        </div>
    </div>

    <div class="footer">
        <p>Legacy Translations Inc. · ATA Member #275993 · www.legacytranslations.com</p>
    </div>
</body>
</html>'''
    return html

def get_order_confirmation_email_template(client_name: str, order_details: dict) -> str:
    """Generate professional order confirmation email template"""
    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                Hello, {client_name}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Thank you for your order! We have received your translation request and our team is now working on it.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #1a2a4a; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                                            📋 Order Details
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Reference:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('reference', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Service:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('service_type', 'N/A').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Languages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('translate_from', 'N/A').title()} → {order_details.get('translate_to', 'N/A').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Estimated Delivery:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('estimated_delivery', 'N/A')}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                If you have any questions about your order, please feel free to respond to this email.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Regards,
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=False)

def get_simple_client_email_template(client_name: str, message_content: str) -> str:
    """Generate a simple professional email template for general client communications"""
    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                Hello, {client_name}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                {message_content}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                If you have any questions, please feel free to respond to this email.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Regards,
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=False)

def get_zelle_pending_email_template(client_name: str, order_details: dict) -> str:
    """Generate email template for Zelle payment pending confirmation"""
    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                Hello, {client_name}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Thank you for your order! We have received your Zelle payment submission and are currently verifying it.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #1a2a4a; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                                            📋 Order Details
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0; width: 40%;"><strong>Order Number:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">{order_details.get('reference', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Service:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('service_type', 'Translation').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Languages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('translate_from', 'N/A')} → {order_details.get('translate_to', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Total Amount:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">${order_details.get('total_price', 0):.2f}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Payment Method:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">Zelle</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Payment Status:</strong></td>
                                                <td style="color: #f59e0b; font-size: 14px; padding: 5px 0; font-weight: 600;">⏳ Pending Verification</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Once we confirm your Zelle payment, you will receive another email confirming that your translation has begun.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                If you have any questions, please reply to this email.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Best regards,<br>
                                Legacy Translations Team
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=False)

def get_zelle_confirmed_email_template(client_name: str, order_details: dict) -> str:
    """Generate email template for Zelle payment confirmed - translation started"""
    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                Hello, {client_name}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Great news! Your Zelle payment has been confirmed and your translation is now in progress.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #1a2a4a; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                                            ✅ Order Confirmed
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0; width: 40%;"><strong>Order Number:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">{order_details.get('reference', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Service:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('service_type', 'Translation').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Languages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('translate_from', 'N/A')} → {order_details.get('translate_to', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Total Amount:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">${order_details.get('total_price', 0):.2f}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Payment Status:</strong></td>
                                                <td style="color: #10b981; font-size: 14px; padding: 5px 0; font-weight: 600;">✓ Confirmed</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Our team has started working on your translation. You will receive another email when your translation is complete and ready for download.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                If you have any questions, please reply to this email.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Best regards,<br>
                                Legacy Translations Team
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=False)

def get_zelle_admin_notification_template(order_details: dict, receipt_url: Optional[str] = None) -> str:
    """Generate email template for admin notification of new Zelle payment"""
    portal_url = os.environ.get("FRONTEND_URL", "https://legacy-portal-frontend.onrender.com")

    receipt_section = ""
    if receipt_url:
        receipt_section = f'''
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Receipt:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;"><a href="{receipt_url}" style="color: #3b82f6;">View Receipt</a></td>
                                            </tr>'''

    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                🔔 New Zelle Payment Received
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                A new order has been submitted with Zelle payment. Please verify the payment and confirm it in the admin panel.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%); border-radius: 8px; margin: 25px 0; border: 1px solid #ffc107;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #856404; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                                            💰 Zelle Payment Details
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0; width: 40%;"><strong>Order Number:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">{order_details.get('reference', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Customer Name:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('customer_name', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Customer Email:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('customer_email', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Service:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('service_type', 'Translation').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Languages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('translate_from', 'N/A')} → {order_details.get('translate_to', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Total Amount:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">${order_details.get('total_price', 0):.2f}</td>
                                            </tr>{receipt_section}
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                        <a href="{portal_url}/#/admin/orders" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
                                            View in Admin Panel
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Please verify the Zelle payment in your bank account and confirm the order in the admin panel.
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=False)

def get_translator_assignment_email_template(translator_name: str, order_details: dict, accept_url: str, decline_url: str) -> str:
    """Generate email template for translator assignment with accept/decline buttons"""
    portal_url = os.environ.get("FRONTEND_URL", "https://legacy-portal-frontend.onrender.com")

    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                Hello, {translator_name}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                You have been assigned a new translation project. Please review the details below and accept or decline this assignment.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #1a2a4a; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                                            📋 Project Details
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0; width: 40%;"><strong>Project Number:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">{order_details.get('order_number', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Languages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('translate_from', 'N/A').title()} → {order_details.get('translate_to', 'N/A').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Document Type:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('document_type', 'General')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Field:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('document_category', 'General').replace('_', ' ').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Pages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('page_count', 1)} page(s)</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Deadline:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('deadline', 'To be confirmed')}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 10px;">
                                        <a href="{accept_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #218838 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); margin: 5px;">
                                            ✓ ACCEPT PROJECT
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 10px;">
                                        <a href="{decline_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); margin: 5px;">
                                            ✗ DECLINE PROJECT
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #64748b; font-size: 13px; line-height: 1.7; margin: 20px 0; text-align: center;">
                                Please respond as soon as possible so we can proceed with the project.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Regards,
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=False)

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class TranslationQuote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reference: str
    service_type: str  # standard, professional, specialist
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str  # no, priority, urgent
    base_price: float
    urgency_fee: float
    shipping_fee: float = 0.0
    discount_amount: float = 0.0
    discount_code: Optional[str] = None
    total_price: float
    estimated_delivery: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    document_ids: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TranslationQuoteCreate(BaseModel):
    reference: str
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    document_ids: Optional[List[str]] = None
    shipping_fee: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    discount_code: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    filename: str
    word_count: int
    file_size: int
    message: str
    document_id: Optional[str] = None

# Payment Models
class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    quote_id: str
    amount: float
    currency: str = "usd"
    payment_status: str = "pending"  # pending, paid, failed, expired
    status: str = "initiated"  # initiated, pending, completed, expired
    protemos_project_id: Optional[str] = None
    protemos_status: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentCheckoutRequest(BaseModel):
    quote_id: str
    origin_url: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None

class ZelleOrderRequest(BaseModel):
    quote_id: str
    customer_email: str
    customer_name: str
    payment_method: str = "zelle"
    zelle_receipt_id: Optional[str] = None
    total_price: float
    notes: Optional[str] = None
    shipping_address: Optional[Dict[str, str]] = None

class EmailNotificationRequest(BaseModel):
    quote_id: str
    partner_email: EmailStr
    send_to_company: bool = True

class SupportRequest(BaseModel):
    issue_type: str
    description: str
    customer_email: Optional[str] = "Not provided"
    customer_name: Optional[str] = "Not provided"
    files_count: int = 0

# Partner Models
class Partner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    email: EmailStr
    password_hash: str
    contact_name: str
    phone: Optional[str] = None
    # Address
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    address_country: Optional[str] = "USA"
    tax_id: Optional[str] = None  # EIN/CNPJ
    # Payment & Billing
    payment_plan: str = "pay_per_order"  # pay_per_order, biweekly, monthly
    default_payment_method: str = "zelle"  # zelle, card, invoice
    credit_limit: float = 0.0  # Maximum outstanding balance allowed
    current_balance: float = 0.0  # Current outstanding balance
    # Statistics for eligibility
    total_orders: int = 0
    total_paid_orders: int = 0
    total_revenue: float = 0.0
    # Status
    is_active: bool = True
    is_approved: bool = True  # Admin can approve/suspend partners
    payment_plan_approved: bool = False  # For invoice plans, needs admin approval
    # Agreement
    agreed_to_terms: bool = False
    agreed_at: Optional[datetime] = None
    # Dates
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_order_at: Optional[datetime] = None
    last_payment_at: Optional[datetime] = None

class PartnerCreate(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    contact_name: str
    phone: Optional[str] = None
    # Address
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    address_country: Optional[str] = "USA"
    tax_id: Optional[str] = None
    # Payment preferences
    payment_plan: str = "pay_per_order"
    default_payment_method: str = "zelle"
    # Agreement
    agreed_to_terms: bool = False

class PartnerLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class PartnerResponse(BaseModel):
    id: str
    company_name: str
    email: str
    contact_name: str
    phone: Optional[str] = None
    token: str

# Admin User Models (with roles: admin, pm, translator)
class AdminUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    name: str
    role: str  # 'admin', 'pm', 'translator'
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # For translators: track pages translated
    pages_translated: int = 0
    pages_pending_payment: int = 0
    # For PM: list of project IDs they manage
    assigned_projects: List[str] = []
    # Translator type: 'in_house' (full access) or 'contractor' (limited access)
    translator_type: Optional[str] = 'contractor'  # Default to contractor for safety

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None  # Optional - user will set via invitation
    name: str
    role: str  # 'admin', 'pm', 'translator', 'sales'
    # Translator-specific fields
    rate_per_page: Optional[float] = None
    rate_per_word: Optional[float] = None
    language_pairs: Optional[str] = None
    translator_type: Optional[str] = 'contractor'  # 'in_house' or 'contractor'

class AdminInvitationAccept(BaseModel):
    token: str
    password: str
    # Translator onboarding fields (optional - only for translators)
    language_pairs: Optional[str] = None
    rate_per_page: Optional[float] = None
    rate_per_word: Optional[float] = None
    payment_method: Optional[str] = None  # 'bank_transfer', 'paypal', 'zelle', etc.
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    paypal_email: Optional[str] = None
    zelle_email: Optional[str] = None
    accepted_terms: Optional[bool] = False
    accepted_ethics: Optional[bool] = False

class AdminForgotPassword(BaseModel):
    email: EmailStr

class AdminResetPassword(BaseModel):
    token: str
    new_password: str

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    rate_per_page: Optional[float] = None
    rate_per_word: Optional[float] = None
    language_pairs: Optional[str] = None
    is_active: Optional[bool] = None
    translator_type: Optional[str] = None  # 'in_house' or 'contractor'

class AdminUserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    token: str
    pages_translated: Optional[int] = 0
    pages_pending_payment: Optional[int] = 0
    translator_type: Optional[str] = 'contractor'  # 'in_house' or 'contractor'

class AdminUserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    translator_type: Optional[str] = 'contractor'  # 'in_house' or 'contractor'

# Translation Order Models (with invoice tracking)
class TranslationOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}")
    partner_id: str
    partner_company: str
    # Partner contact (for invoices/receipts)
    partner_email: Optional[str] = None
    partner_name: Optional[str] = None
    # Client info (end customer - for translation delivery only)
    client_name: str
    client_email: EmailStr
    # Translation details
    service_type: str  # standard (certified), professional
    translate_from: str
    translate_to: str
    word_count: int
    page_count: int
    urgency: str  # no, priority, urgent
    reference: Optional[str] = None
    notes: Optional[str] = None
    # Pricing
    base_price: float
    urgency_fee: float
    total_price: float
    # Status tracking
    translation_status: str = "received"  # received, in_translation, review, ready, delivered
    payment_status: str = "pending"  # pending, paid, overdue
    # Dates
    created_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    # Protemos integration
    protemos_project_id: Optional[str] = None
    # Files
    document_filename: Optional[str] = None
    translated_file: Optional[str] = None  # Base64 encoded translated file
    translated_filename: Optional[str] = None
    # NEW: Assignment and source tracking
    source_type: str = "partner_portal"  # partner_portal, manual
    assigned_pm_id: Optional[str] = None  # PM responsible for this project
    assigned_pm_name: Optional[str] = None
    assigned_translator_id: Optional[str] = None  # Translator assigned
    assigned_translator_name: Optional[str] = None
    translator_assignment_token: Optional[str] = None  # Token for accept/decline
    translator_assignment_status: str = "none"  # none, pending, accepted, declined
    translator_assignment_responded_at: Optional[datetime] = None
    deadline: Optional[datetime] = None  # Client deadline - when to deliver to client
    translator_deadline: Optional[datetime] = None  # Translator deadline - when translator must return
    internal_notes: Optional[str] = None  # Notes visible only to admin/PM
    revenue_source: str = "website"  # website, whatsapp, social_media, referral, partner, other
    payment_method: Optional[str] = None  # credit_card, debit, paypal, zelle, venmo, pix, apple_pay, bank_transfer, invoice
    zelle_receipt_id: Optional[str] = None
    zelle_receipt_url: Optional[str] = None
    shipping_address: Optional[Dict[str, str]] = None
    # Document classification
    document_type: Optional[str] = None  # birth_certificate, marriage_certificate, diploma, etc.
    document_category: Optional[str] = None  # financial, educational, personal, bank_statement, etc.

class TranslationOrderCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: Optional[str] = None
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    reference: Optional[str] = None
    notes: Optional[str] = None
    document_filename: Optional[str] = None
    document_ids: Optional[List[str]] = None  # IDs of uploaded documents
    payment_method: Optional[str] = "invoice"  # 'invoice' or 'zelle'
    zelle_receipt_id: Optional[str] = None
    payment_status: Optional[str] = "pending"
    total_price: Optional[float] = None
    shipping_address: Optional[Dict[str, str]] = None
    create_invoice: Optional[bool] = True

class TranslationOrderUpdate(BaseModel):
    translation_status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_date: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    # Assignment updates (by ID)
    assigned_pm_id: Optional[str] = None
    assigned_translator_id: Optional[str] = None
    # Assignment updates (by name - for direct assignment from dropdown)
    assigned_pm: Optional[str] = None
    assigned_translator: Optional[str] = None
    deadline: Optional[str] = None  # Client deadline - Changed to str to accept ISO string
    translator_deadline: Optional[str] = None  # Translator deadline - when translator must return
    internal_notes: Optional[str] = None
    revenue_source: Optional[str] = None  # website, whatsapp, social_media, referral, partner, other
    # NEW: Additional editable fields
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    translate_from: Optional[str] = None
    translate_to: Optional[str] = None
    service_type: Optional[str] = None
    page_count: Optional[int] = None
    urgency: Optional[str] = None
    document_type: Optional[str] = None
    total_price: Optional[float] = None
    base_price: Optional[float] = None
    # Skip automatic email when using dedicated project email endpoint
    skip_email: Optional[bool] = False

# Manual Project Creation (by Admin)
class ManualProjectCreate(BaseModel):
    # Client info
    client_name: str
    client_email: EmailStr
    client_phone: Optional[str] = None
    # Translation details
    service_type: str = "standard"  # standard (certified), professional
    translate_from: str
    translate_to: str
    word_count: int = 0
    page_count: int = 1
    urgency: str = "no"  # no, priority, urgent
    reference: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    # Pricing (optional - can be set later)
    base_price: Optional[float] = 0.0
    urgency_fee: Optional[float] = 0.0
    total_price: Optional[float] = 0.0
    # Assignment
    assigned_pm_id: Optional[str] = None
    assigned_translator_id: Optional[str] = None
    deadline: Optional[str] = None  # ISO date string
    revenue_source: str = "website"  # website, whatsapp, social_media, referral, partner, other
    payment_method: Optional[str] = None  # credit_card, debit, paypal, zelle, venmo, pix, apple_pay, bank_transfer
    # Payment status
    payment_status: Optional[str] = "pending"  # pending, paid
    payment_received: Optional[bool] = False
    payment_tag: Optional[str] = None  # '', 'bonus', 'no_charge', 'partner'
    # Invoice options
    create_invoice: Optional[bool] = False
    invoice_terms: Optional[str] = "30_days"  # '15_days', '30_days', 'custom'
    invoice_custom_date: Optional[str] = None
    # Document classification
    document_type: Optional[str] = None  # birth_certificate, marriage_certificate, diploma, etc.
    document_category: Optional[str] = None  # financial, educational, personal, bank_statement, etc.
    # Files (base64)
    document_data: Optional[str] = None
    document_filename: Optional[str] = None
    # Multiple files support
    documents: Optional[list] = None  # List of {filename, data, content_type}

# Document Certification Model
class DocumentCertification(BaseModel):
    certification_id: str = Field(default_factory=lambda: f"LT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}")
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    # Document info
    document_type: str  # birth_certificate, diploma, etc.
    source_language: str
    target_language: str
    page_count: int = 1
    # Content hash for integrity verification
    document_hash: str  # SHA-256 hash of document content
    # Certifier info
    certifier_name: str
    certifier_title: str = "Certified Translator"
    certifier_credentials: Optional[str] = None  # ATA # 275993
    company_name: str = "Legacy Translations Inc."
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    # Client info
    client_name: Optional[str] = None
    # Timestamps
    certified_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # Optional expiration
    # Status
    is_valid: bool = True
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    # Verification
    verification_url: Optional[str] = None
    qr_code_data: Optional[str] = None  # Base64 QR code image

class CertificationCreate(BaseModel):
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    document_type: str
    source_language: str
    target_language: str
    page_count: int = 1
    document_content: str  # Content to hash for verification
    certifier_name: str
    certifier_title: str = "Certified Translator"
    certifier_credentials: Optional[str] = None
    company_name: str = "Legacy Translations Inc."
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    client_name: Optional[str] = None

class CertificationVerifyResponse(BaseModel):
    is_valid: bool
    certification_id: str
    certified_at: Optional[datetime] = None
    document_type: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    certifier_name: Optional[str] = None
    certifier_title: Optional[str] = None
    certifier_credentials: Optional[str] = None
    company_name: Optional[str] = None
    client_name: Optional[str] = None
    message: str

# Make.com Webhook URL for QuickBooks integration
MAKE_WEBHOOK_URL = "https://hook.us2.make.com/9qd4rfzl5re2u2t24lr94qwcqahrpt1i"

async def send_to_make_webhook(order_data: dict, invoice_data: dict):
    """Send invoice data to Make.com webhook for QuickBooks integration"""
    try:
        import httpx

        # Calculate due date based on invoice terms
        due_date = datetime.utcnow()
        if invoice_data.get("invoice_terms") == "15_days":
            due_date = due_date + timedelta(days=15)
        elif invoice_data.get("invoice_terms") == "30_days":
            due_date = due_date + timedelta(days=30)
        elif invoice_data.get("invoice_terms") == "custom" and invoice_data.get("invoice_custom_date"):
            try:
                due_date = datetime.fromisoformat(invoice_data["invoice_custom_date"])
            except:
                due_date = due_date + timedelta(days=30)

        # Build webhook payload
        payload = {
            "action": "create_invoice",
            "timestamp": datetime.utcnow().isoformat(),
            "client": {
                "name": order_data.get("client_name", ""),
                "email": order_data.get("client_email", "")
            },
            "invoice": {
                "order_number": order_data.get("order_number", ""),
                "amount": float(order_data.get("total_price", 0)),
                "currency": "USD",
                "due_date": due_date.strftime("%Y-%m-%d"),
                "payment_terms": invoice_data.get("invoice_terms", "30_days"),
                "payment_method": order_data.get("payment_method", ""),
                "description": f"Translation Services - {order_data.get('translate_from', '')} to {order_data.get('translate_to', '')}"
            },
            "service": {
                "type": order_data.get("service_type", "standard"),
                "pages": order_data.get("page_count", 1),
                "language_from": order_data.get("translate_from", ""),
                "language_to": order_data.get("translate_to", ""),
                "urgency": order_data.get("urgency", "no")
            },
            "payment_tag": invoice_data.get("payment_tag", ""),
            "notes": order_data.get("notes", ""),
            "internal_notes": order_data.get("internal_notes", "")
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                MAKE_WEBHOOK_URL,
                json=payload,
                timeout=30.0
            )
            logger.info(f"Make webhook response: {response.status_code}")
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Error sending to Make webhook: {str(e)}")
        return False

# ==================== MIA BOT QUOTE CALCULATION ====================
# Pricing configuration for bot quotes (must match customer page prices!)
BOT_PRICING = {
    "certified": {"price_per_page": 24.99, "name": "Certified Translation", "description": "Official documents, legal, immigration"},
    "standard": {"price_per_page": 19.99, "name": "Standard Translation", "description": "General use, no certification"},
    "sworn": {"price_per_page": 55.00, "name": "Sworn Translation", "description": "For use outside USA - official sworn translator"},
    "rmv": {"price_per_page": 24.99, "name": "RMV Certified Translation", "description": "Massachusetts Motor Vehicle - requires physical copy"},
    # NOTE: Apostille is "Coming Soon" - not available yet
}

BOT_URGENCY = {
    "standard": {"multiplier": 1.0, "name": "Standard (2-3 business days)"},
    "priority": {"multiplier": 1.25, "name": "Priority (+25%, 24 hours)"},
    "urgent": {"multiplier": 2.0, "name": "Urgent (+100%, 12 hours)"},
}

class BotQuoteRequest(BaseModel):
    """Request model for bot quote calculation"""
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    service_type: str = "certified"  # certified, standard, sworn, rmv
    source_language: str = "Portuguese"
    target_language: str = "English"
    urgency: str = "standard"  # standard, priority, urgent
    document_type: Optional[str] = None  # birth_certificate, diploma, etc.
    notes: Optional[str] = None
    # Document can be sent as base64 or URL
    document_base64: Optional[str] = None  # Base64 encoded PDF/image
    document_url: Optional[str] = None  # URL to download document
    page_count: Optional[int] = None  # Manual page count override

class BotQuoteResponse(BaseModel):
    """Response model for bot quote"""
    success: bool
    quote_id: str
    page_count: int
    price_per_page: float
    subtotal: float
    urgency_fee: float
    total_price: float
    service_name: str
    urgency_name: str
    message: str
    quote_link: Optional[str] = None

async def count_document_pages(document_base64: str = None, document_url: str = None) -> int:
    """Count pages in a PDF or count images as 1 page each"""
    try:
        content = None

        # Get content from base64 or URL
        if document_base64:
            # Remove data URI prefix if present
            if ',' in document_base64:
                document_base64 = document_base64.split(',')[1]
            content = base64.b64decode(document_base64)
        elif document_url:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(document_url, timeout=30)
                content = response.content

        if not content:
            return 1

        # Check if PDF
        if content[:4] == b'%PDF':
            try:
                doc = fitz.open(stream=content, filetype="pdf")
                page_count = doc.page_count
                doc.close()
                logger.info(f"Bot: PDF has {page_count} pages")
                return max(1, page_count)
            except Exception as e:
                logger.error(f"Bot: Failed to read PDF pages: {e}")
                return 1
        else:
            # Image = 1 page
            logger.info("Bot: Document is image, counting as 1 page")
            return 1

    except Exception as e:
        logger.error(f"Bot: Error counting pages: {e}")
        return 1

def calculate_bot_quote(page_count: int, service_type: str, urgency: str) -> dict:
    """Calculate quote based on page count, service type and urgency"""
    pricing = BOT_PRICING.get(service_type, BOT_PRICING["certified"])
    urgency_config = BOT_URGENCY.get(urgency, BOT_URGENCY["standard"])

    price_per_page = pricing["price_per_page"]
    subtotal = page_count * price_per_page
    urgency_fee = subtotal * (urgency_config["multiplier"] - 1)
    total_price = subtotal + urgency_fee

    return {
        "page_count": page_count,
        "price_per_page": price_per_page,
        "subtotal": round(subtotal, 2),
        "urgency_fee": round(urgency_fee, 2),
        "total_price": round(total_price, 2),
        "service_name": pricing["name"],
        "urgency_name": urgency_config["name"]
    }

@api_router.post("/bot/calculate-quote", response_model=BotQuoteResponse)
async def bot_calculate_quote(request: BotQuoteRequest):
    """
    Calculate quote for MIA WhatsApp bot.
    Receives document, counts pages, calculates price, and creates lead in admin.
    """
    try:
        # Count pages from document
        if request.page_count and request.page_count > 0:
            page_count = request.page_count
        else:
            page_count = await count_document_pages(
                document_base64=request.document_base64,
                document_url=request.document_url
            )

        # Calculate quote
        quote = calculate_bot_quote(page_count, request.service_type, request.urgency)

        # Generate order number for Projects list
        count = await db.translation_orders.count_documents({})
        order_number = f"P{count + 6001}"
        order_id = str(uuid.uuid4())

        # Create order directly in translation_orders (appears in Projects with Quote status)
        order_data = {
            "id": order_id,
            "order_number": order_number,
            "partner_id": "whatsapp_bot",
            "client_name": request.client_name,
            "client_email": request.client_email or "",
            "client_phone": request.client_phone,
            "document_type": request.document_type or "Document",
            "service_type": request.service_type,
            "translate_from": request.source_language,
            "translate_to": request.target_language,
            "page_count": page_count,
            "word_count": page_count * 250,  # Estimate
            "urgency": request.urgency,
            "total_price": quote["total_price"],
            "base_price": quote["subtotal"],
            "urgency_fee": quote["urgency_fee"],
            "translation_status": "Quote",  # This makes it appear in Quote filter!
            "payment_status": "pending",
            "source": "whatsapp_bot",
            "revenue_source": "whatsapp",  # Track as WhatsApp revenue
            "notes": request.notes or f"📱 WhatsApp Bot Quote\nPhone: {request.client_phone}",
            "created_at": datetime.utcnow(),
            "deadline": calculate_client_deadline("whatsapp", datetime.utcnow()),  # 3 business days
            "has_document": bool(request.document_base64 or request.document_url)
        }

        # Store document if provided
        if request.document_base64:
            order_data["bot_document_data"] = request.document_base64

        # Save to translation_orders (main Projects collection)
        await db.translation_orders.insert_one(order_data)
        logger.info(f"Bot quote created as order {order_number} for {request.client_name} - ${quote['total_price']}")

        # Create notification for admin
        admin_notification = {
            "id": str(uuid.uuid4()),
            "type": "bot_quote",
            "title": f"📱 New WhatsApp Quote - {order_number}",
            "message": f"Client: {request.client_name}\nPhone: {request.client_phone}\nService: {quote['service_name']}\nPages: {page_count}\nTotal: ${quote['total_price']:.2f}",
            "order_number": order_number,
            "order_id": order_id,
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        await db.admin_notifications.insert_one(admin_notification)

        # Format response message for bot
        message = f"""✅ *Orçamento #{order_number}*

📄 *Serviço:* {quote['service_name']}
📑 *Páginas:* {page_count}
💵 *Preço por página:* ${quote['price_per_page']:.2f}
📊 *Subtotal:* ${quote['subtotal']:.2f}"""

        if quote['urgency_fee'] > 0:
            message += f"\n⚡ *Taxa de urgência:* ${quote['urgency_fee']:.2f}"

        message += f"""
━━━━━━━━━━━━━━━━
💰 *TOTAL: ${quote['total_price']:.2f}*

Este orçamento é válido por 7 dias.
Para prosseguir, responda SIM ou entre em contato conosco!"""

        return BotQuoteResponse(
            success=True,
            quote_id=order_number,
            page_count=page_count,
            price_per_page=quote["price_per_page"],
            subtotal=quote["subtotal"],
            urgency_fee=quote["urgency_fee"],
            total_price=quote["total_price"],
            service_name=quote["service_name"],
            urgency_name=quote["urgency_name"],
            message=message,
            quote_link=f"https://portal.legacytranslations.com/#/admin"
        )

    except Exception as e:
        logger.error(f"Bot quote calculation error: {e}")
        import traceback
        traceback.print_exc()
        return BotQuoteResponse(
            success=False,
            quote_id="",
            page_count=0,
            price_per_page=0,
            subtotal=0,
            urgency_fee=0,
            total_price=0,
            service_name="",
            urgency_name="",
            message=f"Erro ao calcular orçamento: {str(e)}"
        )

@api_router.get("/bot/quotes")
async def get_bot_quotes(admin_key: str, status: str = None, limit: int = 50):
    """Get all quotes generated by the bot (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid admin key")

    query = {}
    if status:
        query["status"] = status

    quotes = await db.bot_quotes.find(query).sort("created_at", -1).limit(limit).to_list(limit)

    # Convert ObjectId to string
    for q in quotes:
        q["_id"] = str(q["_id"])
        if q.get("document_data"):
            q["has_document"] = True
            del q["document_data"]  # Don't send full document data in list

    return {"quotes": quotes, "total": len(quotes)}

@api_router.put("/bot/quotes/{quote_id}/status")
async def update_bot_quote_status(quote_id: str, admin_key: str, status: str = Body(...)):
    """Update bot quote status (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.bot_quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")

    return {"success": True, "quote_id": quote_id, "status": status}

@api_router.post("/bot/quotes/{quote_id}/convert")
async def convert_bot_quote_to_order(quote_id: str, admin_key: str):
    """Convert a bot quote to a translation order (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get the quote
    quote = await db.bot_quotes.find_one({"quote_id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Generate order number
    count = await db.translation_orders.count_documents({})
    order_number = f"P{count + 6001}"

    # Create order
    order_data = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        "partner_id": "direct_client",
        "client_name": quote["client_name"],
        "client_email": quote.get("client_email", ""),
        "client_phone": quote["client_phone"],
        "document_type": quote.get("document_type", "General Document"),
        "service_type": quote["service_type"],
        "translate_from": quote["source_language"],
        "translate_to": quote["target_language"],
        "page_count": quote["page_count"],
        "urgency": quote["urgency"],
        "total_price": quote["total_price"],
        "base_price": quote["subtotal"],
        "urgency_fee": quote["urgency_fee"],
        "translation_status": "pending",
        "payment_status": "pending",
        "source": "whatsapp_bot",
        "revenue_source": "whatsapp",  # Track as WhatsApp revenue
        "bot_quote_id": quote_id,
        "created_at": datetime.utcnow(),
        "deadline": calculate_client_deadline("whatsapp", datetime.utcnow()),  # 3 business days
        "notes": quote.get("notes", "")
    }

    await db.translation_orders.insert_one(order_data)

    # Update quote status
    await db.bot_quotes.update_one(
        {"quote_id": quote_id},
        {"$set": {"status": "converted", "order_number": order_number, "updated_at": datetime.utcnow()}}
    )

    logger.info(f"Bot quote {quote_id} converted to order {order_number}")

    return {
        "success": True,
        "quote_id": quote_id,
        "order_number": order_number,
        "order_id": order_data["id"]
    }

# Notification Model
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Recipient user ID
    type: str  # project_assigned, revision_requested, project_completed, etc.
    title: str
    message: str
    order_id: Optional[str] = None  # Related order
    order_number: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Translator Payment Model
class TranslatorPayment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    translator_id: str
    translator_name: str
    period_start: datetime
    period_end: datetime
    pages_count: int
    rate_per_page: float = 25.0  # Default rate per page
    total_amount: float
    status: str = "pending"  # pending, paid
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None  # bank_transfer, paypal, etc.
    payment_reference: Optional[str] = None  # Transaction ID
    notes: Optional[str] = None
    order_ids: List[str] = []  # Orders included in this payment
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = None
    created_by_name: Optional[str] = None

class PaymentCreate(BaseModel):
    translator_id: str
    period_start: str  # ISO date
    period_end: str  # ISO date
    pages_count: int
    rate_per_page: float = 25.0
    total_amount: float
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    order_ids: List[str] = []

class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None

# ==================== EXPENSE MODELS ====================
class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # fixed, translators, ai, marketing, office, utilities, other
    subcategory: Optional[str] = None  # rent, software, ads, etc.
    description: str
    amount: float
    date: datetime = Field(default_factory=datetime.utcnow)
    is_recurring: bool = False
    recurring_period: Optional[str] = None  # monthly, yearly
    vendor: Optional[str] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by_id: Optional[str] = None
    created_by_name: Optional[str] = None

class ExpenseCreate(BaseModel):
    category: str
    subcategory: Optional[str] = None
    description: str
    amount: float
    date: Optional[str] = None
    is_recurring: bool = False
    recurring_period: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_period: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None

# ==================== AI TRANSLATION PIPELINE MODELS ====================

class AIPipelineStage(BaseModel):
    """Individual stage in the AI translation pipeline"""
    stage_name: str  # ai_translator, ai_layout, ai_proofreader, human_review
    status: str = "pending"  # pending, in_progress, completed, failed, skipped
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[str] = None  # The output of this stage
    notes: Optional[str] = None  # AI notes/observations
    changes_made: Optional[List[str]] = None  # List of changes made in this stage
    error_message: Optional[str] = None

class AIPipelineConfig(BaseModel):
    """Configuration for the AI translation pipeline"""
    source_language: str
    target_language: str
    document_type: str
    # Currency conversion settings
    convert_currency: bool = False
    source_currency: Optional[str] = None  # BRL, EUR, etc.
    target_currency: Optional[str] = None  # USD
    exchange_rate: Optional[float] = None  # e.g., 5.42
    rate_date: Optional[str] = None  # e.g., "2024-12-27"
    add_translator_note: bool = False  # Add translator's note with conversion info
    # Format settings
    date_format_source: str = "DD/MM/YYYY"  # Brazilian format
    date_format_target: str = "MM/DD/YYYY"  # US format
    page_format: str = "letter"  # letter or a4
    # Additional options
    preserve_layout: bool = True
    use_glossary: bool = True
    glossary_id: Optional[str] = None
    # Custom instructions
    custom_instructions: Optional[str] = None

class AIPipeline(BaseModel):
    """AI Translation Pipeline tracking model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_number: Optional[str] = None
    # Pipeline configuration
    config: AIPipelineConfig
    # Source content
    original_text: str
    original_document_base64: Optional[str] = None
    original_filename: Optional[str] = None
    # Stages
    stages: Dict[str, AIPipelineStage] = Field(default_factory=lambda: {
        "ai_translator": AIPipelineStage(stage_name="ai_translator").dict(),
        "ai_layout": AIPipelineStage(stage_name="ai_layout").dict(),
        "ai_proofreader": AIPipelineStage(stage_name="ai_proofreader").dict(),
        "human_review": AIPipelineStage(stage_name="human_review").dict()
    })
    # Current state
    current_stage: str = "ai_translator"
    overall_status: str = "pending"  # pending, in_progress, completed, failed, paused
    # Final output
    final_translation: Optional[str] = None
    final_translation_pdf: Optional[str] = None  # Base64 PDF
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    started_by_id: Optional[str] = None
    started_by_name: Optional[str] = None
    reviewed_by_id: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    # AI usage tracking
    total_tokens_used: int = 0
    claude_api_key_used: Optional[str] = None  # Masked for security

class AIPipelineCreate(BaseModel):
    """Request to start AI translation pipeline"""
    order_id: str
    source_language: str
    target_language: str
    document_type: str
    original_text: str = ""  # Can be empty if quick_start=True
    original_document_base64: Optional[str] = None
    original_filename: Optional[str] = None
    claude_api_key: Optional[str] = None  # Optional - will use shared key if not provided
    # Optional settings
    convert_currency: bool = False
    source_currency: Optional[str] = None
    target_currency: Optional[str] = None
    exchange_rate: Optional[float] = None  # e.g., 5.42
    rate_date: Optional[str] = None  # e.g., "2024-12-27"
    add_translator_note: bool = True  # Add translator's note with conversion info on first page
    page_format: str = "letter"
    use_glossary: bool = True
    custom_instructions: Optional[str] = None
    quick_start: bool = False  # If true, fetch documents from order automatically

class AIPipelineStageApproval(BaseModel):
    """Request to approve/reject a stage and move to next"""
    pipeline_id: str
    stage_name: str
    action: str  # approve, reject, edit
    edited_content: Optional[str] = None  # If action is 'edit'
    reviewer_notes: Optional[str] = None

# ==================== PAYMENT PROOF MODELS ====================
class PaymentProof(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: Optional[str] = None  # Related order (if any)
    order_number: Optional[str] = None
    quote_id: Optional[str] = None  # Related quote (if any)
    # Customer info
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    # Payment details
    payment_method: str  # pix, zelle
    amount: float
    currency: str = "USD"  # USD or BRL
    # Proof file
    proof_filename: str
    proof_file_data: str  # Base64 encoded file
    proof_file_type: str  # image/png, image/jpeg, application/pdf
    # Status
    status: str = "pending"  # pending, approved, rejected
    admin_notes: Optional[str] = None
    reviewed_by_id: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentProofCreate(BaseModel):
    order_id: Optional[str] = None
    quote_id: Optional[str] = None
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    payment_method: str  # pix, zelle
    amount: float
    currency: str = "USD"

class PaymentProofResponse(BaseModel):
    id: str
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    customer_name: str
    customer_email: str
    payment_method: str
    amount: float
    currency: str
    status: str
    proof_filename: str
    created_at: datetime

# Expense categories with labels
EXPENSE_CATEGORIES = {
    'fixed': 'Despesas Fixas',
    'translators': 'Tradutores',
    'ai': 'AI & Tecnologia',
    'marketing': 'Marketing',
    'office': 'Escritório',
    'utilities': 'Utilidades',
    'other': 'Outros'
}

# Revenue sources
REVENUE_SOURCES = {
    'website': 'Website',
    'whatsapp': 'WhatsApp',
    'social_media': 'Social Media',
    'referral': 'Indicação',
    'partner': 'Parceiro',
    'other': 'Outros'
}

# New York timezone for deadline calculations and display
NY_TIMEZONE = ZoneInfo("America/New_York")

def get_ny_now():
    """Get current datetime in New York timezone"""
    return datetime.now(NY_TIMEZONE)

def get_ny_date_str(fmt="%m/%d/%Y"):
    """Get current date string in New York timezone"""
    return get_ny_now().strftime(fmt)

def get_ny_datetime_str(fmt="%m/%d/%Y %I:%M %p"):
    """Get current datetime string in New York timezone"""
    return get_ny_now().strftime(fmt)

def format_date_ny(dt, fmt="%m/%d/%Y"):
    """Format a datetime to New York timezone string"""
    if dt is None:
        return "-"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except:
            return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    ny_dt = dt.astimezone(NY_TIMEZONE)
    return ny_dt.strftime(fmt)

def calculate_client_deadline(source_type: str = "website", created_at: datetime = None) -> datetime:
    """
    Calculate client deadline based on source type using business days (excluding weekends).

    Args:
        source_type: "website", "whatsapp", or "partner"
        created_at: Order creation time (UTC). If None, uses current time.

    Returns:
        Deadline datetime in UTC (but calculated based on NY timezone business days)

    Business days:
        - Website/WhatsApp: 3 business days
        - Partner Portal: 2 business days
    """
    if created_at is None:
        created_at = datetime.utcnow()

    # Convert to New York timezone for business day calculation
    ny_time = created_at.replace(tzinfo=ZoneInfo("UTC")).astimezone(NY_TIMEZONE)

    # Determine number of business days based on source
    if source_type == "partner":
        business_days = 2
    else:  # website, whatsapp, or other
        business_days = 3

    # Calculate deadline by adding business days (skip weekends)
    deadline_ny = ny_time
    days_added = 0

    while days_added < business_days:
        deadline_ny += timedelta(days=1)
        # Monday = 0, Sunday = 6; skip Saturday (5) and Sunday (6)
        if deadline_ny.weekday() < 5:  # It's a weekday
            days_added += 1

    # Keep the same time as the original request
    deadline_ny = deadline_ny.replace(
        hour=ny_time.hour,
        minute=ny_time.minute,
        second=ny_time.second,
        microsecond=0
    )

    # Convert back to UTC for storage
    deadline_utc = deadline_ny.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)

    return deadline_utc

# Helper function to create notifications
async def create_notification(user_id: str, notif_type: str, title: str, message: str, order_id: str = None, order_number: str = None):
    """Create a notification for a user"""
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        order_id=order_id,
        order_number=order_number
    )
    await db.notifications.insert_one(notif.dict())
    return notif

# Helper functions for authentication
def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}:{hash_obj.hexdigest()}"

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    try:
        salt, hash_value = password_hash.split(":")
        hash_obj = hashlib.sha256((password + salt).encode())
        return hash_obj.hexdigest() == hash_value
    except:
        return False

def generate_token() -> str:
    """Generate a simple session token"""
    return secrets.token_urlsafe(32)

# In-memory token storage (in production, use Redis or database)
active_tokens: Dict[str, str] = {}  # token -> partner_id
active_admin_tokens: Dict[str, dict] = {}  # token -> {user_id, role}

async def get_current_partner(token: str = None) -> Optional[dict]:
    """Get current partner from token (checks database with expiration)"""
    if not token:
        return None

    # First check memory cache for speed
    if token in active_tokens:
        partner_id = active_tokens[token]
        partner = await db.partners.find_one({"id": partner_id})
        if partner:
            # Verify token hasn't expired
            token_expires = partner.get("token_expires")
            if token_expires and datetime.utcnow() < token_expires:
                return partner
            # Token expired, remove from cache
            del active_tokens[token]

    # Fallback: check database directly (handles server restarts)
    partner = await db.partners.find_one({"token": token})
    if partner:
        # Verify token hasn't expired
        token_expires = partner.get("token_expires")
        if token_expires and datetime.utcnow() < token_expires:
            # Add to memory cache for future requests
            active_tokens[token] = partner["id"]
            return partner

    return None

async def get_current_admin_user(token: str = None) -> Optional[dict]:
    """Get current admin user from token"""
    if not token:
        return None

    # First check in-memory tokens
    if token in active_admin_tokens:
        user_info = active_admin_tokens[token]
        user = await db.admin_users.find_one({"id": user_info["user_id"]})
        return user

    # Fallback: check database for persisted token
    user = await db.admin_users.find_one({"token": token, "is_active": True})
    if user:
        # Restore token to memory cache
        active_admin_tokens[token] = {"user_id": user["id"], "role": user["role"]}
        return user

    return None

def require_admin_role(allowed_roles: List[str]):
    """Decorator helper to check if user has required role"""
    async def check_role(token: str) -> dict:
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")

        user = await get_current_admin_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check_role

async def validate_admin_or_user_token(admin_key: str) -> dict:
    """Validate admin_key (master key) or user token. Returns user info or None for master key."""
    expected_key = os.environ.get("ADMIN_KEY", "legacy_admin_2024")

    # Check master admin key
    if admin_key == expected_key:
        return {"role": "admin", "is_master": True}

    # Check if it's a valid user token in memory
    if admin_key in active_admin_tokens:
        return {"role": active_admin_tokens[admin_key]["role"], "user_id": active_admin_tokens[admin_key]["user_id"], "is_master": False}

    # Check database for valid token
    user = await db.admin_users.find_one({"token": admin_key, "is_active": True})
    if user:
        # Cache the token
        active_admin_tokens[admin_key] = {"user_id": user["id"], "role": user["role"]}
        return {"role": user["role"], "user_id": user["id"], "is_master": False}

    return None

# Utility functions
def count_words(text: str) -> int:
    """Count words in text with improved accuracy"""
    if not text or not text.strip():
        return 0

    # Clean the text: remove extra whitespace, normalize line breaks
    cleaned_text = re.sub(r'\s+', ' ', text.strip())

    # Split by whitespace and filter out empty strings
    words = [word.strip() for word in cleaned_text.split() if word.strip()]

    # Common short words in English and Portuguese (2 chars or less)
    common_short_words = {
        # English
        'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'is', 'as',
        'or', 'if', 'it', 'be', 'we', 'he', 'me', 'my', 'no', 'so', 'up', 'do', 'go',
        'i', 'am', 'us', 'vs',
        # Portuguese
        'de', 'da', 'do', 'em', 'um', 'se', 'ao', 'os', 'as', 'no', 'na', 'ou',
        'eu', 'tu', 'me', 'te', 'lhe', 'nos', 'vos', 'ja', 'e', 'o', 'a', 'que',
        'por', 'para', 'com', 'sem', 'sob', 'mais', 'menos', 'mas', 'nem',
        # Spanish
        'el', 'la', 'en', 'un', 'una', 'es', 'de', 'del', 'al', 'lo', 'los', 'las',
        'y', 'que', 'su', 'sus', 'mi', 'tu', 'se', 'si', 'por', 'para', 'con', 'sin'
    }

    # Filter out PDF artifacts and noise
    filtered_words = []
    for word in words:
        # Remove leading/trailing punctuation for checking
        cleaned_word = re.sub(r'^[^\w]+|[^\w]+$', '', word)

        # Skip empty after cleaning or words that are only punctuation/numbers
        if not cleaned_word:
            continue

        # Skip if it's just numbers (like page numbers, dates, etc.)
        if cleaned_word.isdigit() and len(cleaned_word) < 4:
            continue

        # Keep the word if it's longer than 2 chars OR it's a common short word
        if len(cleaned_word) > 2 or cleaned_word.lower() in common_short_words:
            filtered_words.append(word)

    word_count = len(filtered_words)
    logger.info(f"Word count: {word_count} (original split: {len(words)}, after filter: {len(filtered_words)})")

    return word_count

def calculate_price(word_count: int, service_type: str, urgency: str) -> tuple[float, float, float]:
    """Calculate pricing based on word count, service type, and urgency"""
    
    # Convert words to pages (250 words = 1 page) - round up to next page
    pages = max(1, math.ceil(word_count / 250))
    
    # Base price depending on service type
    if service_type == "standard":
        # Standard/Certified Translation: $24.99 per page (250 words = 1 page)
        base_price = pages * 24.99
    elif service_type == "professional":
        # Professional Translation: $0.075 per word (shows as $0.08/word, gives $15.00 for 200 words)
        base_price = word_count * 0.075
    else:
        # Default to certified pricing
        base_price = pages * 24.99
    
    # Urgency fees based on percentage of base price
    urgency_fee = 0
    if urgency == "priority":
        urgency_fee = base_price * 0.25  # 25% of base price
    elif urgency == "urgent":
        urgency_fee = base_price * 1.00  # 100% of base price
    
    total_price = base_price + urgency_fee
    
    return base_price, urgency_fee, total_price

def get_estimated_delivery(urgency: str) -> str:
    """Calculate estimated delivery date"""
    today = datetime.now()
    
    if urgency == "urgent":
        delivery_date = today + timedelta(hours=12)
        days_text = "12 hours"
    elif urgency == "priority":
        delivery_date = today + timedelta(days=1)
        days_text = "24 hours"
    else:
        delivery_date = today + timedelta(days=2)
        days_text = "2 days"
    
    formatted_date = delivery_date.strftime("%A, %B %d")
    return f"{formatted_date} ({days_text})"

def extract_tables_from_textract(blocks: list) -> list:
    """
    Extract tables from Textract blocks and convert to HTML format.
    Returns a list of HTML table strings with their positions.
    """
    tables = []
    block_map = {block['Id']: block for block in blocks if 'Id' in block}

    for block in blocks:
        if block['BlockType'] == 'TABLE':
            table_id = block['Id']
            bbox = block.get('Geometry', {}).get('BoundingBox', {})

            # Find all cells for this table
            cells = []
            if 'Relationships' in block:
                for rel in block['Relationships']:
                    if rel['Type'] == 'CHILD':
                        for child_id in rel['Ids']:
                            child_block = block_map.get(child_id)
                            if child_block and child_block['BlockType'] == 'CELL':
                                cells.append(child_block)

            if not cells:
                continue

            # Determine table dimensions
            max_row = max(cell.get('RowIndex', 1) for cell in cells)
            max_col = max(cell.get('ColumnIndex', 1) for cell in cells)

            # Create table grid
            table_grid = [['' for _ in range(max_col)] for _ in range(max_row)]

            for cell in cells:
                row_idx = cell.get('RowIndex', 1) - 1
                col_idx = cell.get('ColumnIndex', 1) - 1

                # Get cell text
                cell_text = ''
                if 'Relationships' in cell:
                    for rel in cell['Relationships']:
                        if rel['Type'] == 'CHILD':
                            for child_id in rel['Ids']:
                                child_block = block_map.get(child_id)
                                if child_block and child_block['BlockType'] == 'WORD':
                                    cell_text += child_block.get('Text', '') + ' '

                if row_idx < max_row and col_idx < max_col:
                    table_grid[row_idx][col_idx] = cell_text.strip()

            # Build HTML table
            html = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0;">\n'
            for row_idx, row in enumerate(table_grid):
                html += '  <tr>\n'
                for col_idx, cell_text in enumerate(row):
                    tag = 'th' if row_idx == 0 else 'td'
                    style = 'border: 1px solid #333; padding: 8px; text-align: left;'
                    if row_idx == 0:
                        style += ' background-color: #f0f0f0; font-weight: bold;'
                    html += f'    <{tag} style="{style}">{cell_text}</{tag}>\n'
                html += '  </tr>\n'
            html += '</table>\n'

            tables.append({
                'html': html,
                'top': bbox.get('Top', 0),
                'left': bbox.get('Left', 0)
            })

    return tables


def reconstruct_layout_html_from_textract(blocks: list, page_width: int = 800, page_height: int = 1100) -> str:
    """
    Reconstruct the original page layout from Textract blocks using HTML with CSS positioning.
    This preserves the visual layout of the document by using absolute positioning.

    Returns HTML that visually represents the document layout.
    """
    block_map = {block['Id']: block for block in blocks if 'Id' in block}

    # Collect all elements with their positions
    elements = []
    table_regions = []  # Track table bounding boxes to avoid duplicating text

    # First, identify table regions
    for block in blocks:
        if block['BlockType'] == 'TABLE':
            bbox = block.get('Geometry', {}).get('BoundingBox', {})
            if bbox:
                table_regions.append({
                    'top': bbox.get('Top', 0),
                    'left': bbox.get('Left', 0),
                    'width': bbox.get('Width', 0),
                    'height': bbox.get('Height', 0),
                    'bottom': bbox.get('Top', 0) + bbox.get('Height', 0),
                    'right': bbox.get('Left', 0) + bbox.get('Width', 0)
                })

    def is_in_table_region(top, left):
        """Check if a position is inside any table region"""
        for tr in table_regions:
            if (tr['top'] <= top <= tr['bottom'] and
                tr['left'] <= left <= tr['right']):
                return True
        return False

    # Process LINE blocks for text
    for block in blocks:
        if block['BlockType'] == 'LINE' and 'Geometry' in block:
            bbox = block['Geometry']['BoundingBox']
            top = bbox.get('Top', 0)
            left = bbox.get('Left', 0)

            # Skip lines inside table regions
            if is_in_table_region(top, left):
                continue

            elements.append({
                'type': 'text',
                'text': block.get('Text', ''),
                'top': top,
                'left': left,
                'width': bbox.get('Width', 0),
                'height': bbox.get('Height', 0),
                'confidence': block.get('Confidence', 100)
            })

    # Process TABLE blocks
    for block in blocks:
        if block['BlockType'] == 'TABLE':
            bbox = block.get('Geometry', {}).get('BoundingBox', {})

            # Find all cells for this table
            cells = []
            if 'Relationships' in block:
                for rel in block['Relationships']:
                    if rel['Type'] == 'CHILD':
                        for child_id in rel['Ids']:
                            child_block = block_map.get(child_id)
                            if child_block and child_block['BlockType'] == 'CELL':
                                cells.append(child_block)

            if not cells:
                continue

            # Determine table dimensions
            max_row = max(cell.get('RowIndex', 1) for cell in cells)
            max_col = max(cell.get('ColumnIndex', 1) for cell in cells)

            # Create table grid
            table_grid = [['' for _ in range(max_col)] for _ in range(max_row)]

            for cell in cells:
                row_idx = cell.get('RowIndex', 1) - 1
                col_idx = cell.get('ColumnIndex', 1) - 1

                # Get cell text
                cell_text = ''
                if 'Relationships' in cell:
                    for rel in cell['Relationships']:
                        if rel['Type'] == 'CHILD':
                            for child_id in rel['Ids']:
                                child_block = block_map.get(child_id)
                                if child_block and child_block['BlockType'] == 'WORD':
                                    cell_text += child_block.get('Text', '') + ' '

                if row_idx < max_row and col_idx < max_col:
                    table_grid[row_idx][col_idx] = cell_text.strip()

            # Build HTML table
            table_html = '<table style="border-collapse: collapse; width: 100%; font-size: inherit;">\n'
            for row_idx, row in enumerate(table_grid):
                table_html += '  <tr>\n'
                for col_idx, cell_text in enumerate(row):
                    tag = 'th' if row_idx == 0 else 'td'
                    style = 'border: 1px solid #666; padding: 4px 8px; text-align: left;'
                    if row_idx == 0:
                        style += ' background-color: #e8e8e8; font-weight: bold;'
                    table_html += f'    <{tag} style="{style}">{cell_text}</{tag}>\n'
                table_html += '  </tr>\n'
            table_html += '</table>'

            elements.append({
                'type': 'table',
                'html': table_html,
                'top': bbox.get('Top', 0),
                'left': bbox.get('Left', 0),
                'width': bbox.get('Width', 1),
                'height': bbox.get('Height', 0)
            })

    # Sort elements by vertical position then horizontal
    elements.sort(key=lambda x: (x['top'], x['left']))

    # Build HTML output with visual positioning
    html_parts = []
    html_parts.append(f'''<div style="position: relative; width: 100%; min-height: {page_height}px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; background: white; padding: 20px; box-sizing: border-box;">''')

    for elem in elements:
        top_px = int(elem['top'] * page_height)
        left_px = int(elem['left'] * page_width)
        width_percent = elem['width'] * 100

        if elem['type'] == 'text':
            # Text element with absolute positioning
            html_parts.append(
                f'<div style="position: absolute; top: {top_px}px; left: {left_px}px; '
                f'white-space: nowrap;">{elem["text"]}</div>'
            )
        elif elem['type'] == 'table':
            # Table with calculated width
            table_width_px = int(elem['width'] * page_width)
            html_parts.append(
                f'<div style="position: absolute; top: {top_px}px; left: {left_px}px; '
                f'width: {table_width_px}px;">{elem["html"]}</div>'
            )

    html_parts.append('</div>')

    return '\n'.join(html_parts)


def reconstruct_layout_text_from_textract(blocks: list, page_width_chars: int = 100) -> str:
    """
    Reconstruct the original page layout from Textract blocks as plain text.
    Uses bounding box coordinates to preserve spatial positioning with spaces.
    Better for text-only output with maintained positioning.
    """
    block_map = {block['Id']: block for block in blocks if 'Id' in block}

    # Collect table regions to avoid duplicating text
    table_regions = []
    for block in blocks:
        if block['BlockType'] == 'TABLE':
            bbox = block.get('Geometry', {}).get('BoundingBox', {})
            if bbox:
                table_regions.append({
                    'top': bbox.get('Top', 0),
                    'left': bbox.get('Left', 0),
                    'bottom': bbox.get('Top', 0) + bbox.get('Height', 0),
                    'right': bbox.get('Left', 0) + bbox.get('Width', 0)
                })

    def is_in_table(top, left):
        for tr in table_regions:
            if (tr['top'] - 0.01 <= top <= tr['bottom'] + 0.01 and
                tr['left'] - 0.01 <= left <= tr['right'] + 0.01):
                return True
        return False

    # Collect all lines with positions
    lines = []
    for block in blocks:
        if block['BlockType'] == 'LINE' and 'Geometry' in block:
            bbox = block['Geometry']['BoundingBox']
            top = bbox.get('Top', 0)
            left = bbox.get('Left', 0)

            if not is_in_table(top, left):
                lines.append({
                    'text': block.get('Text', ''),
                    'top': top,
                    'left': left
                })

    # Collect tables
    tables = []
    for block in blocks:
        if block['BlockType'] == 'TABLE':
            bbox = block.get('Geometry', {}).get('BoundingBox', {})

            cells = []
            if 'Relationships' in block:
                for rel in block['Relationships']:
                    if rel['Type'] == 'CHILD':
                        for child_id in rel['Ids']:
                            child_block = block_map.get(child_id)
                            if child_block and child_block['BlockType'] == 'CELL':
                                cells.append(child_block)

            if cells:
                max_row = max(cell.get('RowIndex', 1) for cell in cells)
                max_col = max(cell.get('ColumnIndex', 1) for cell in cells)

                # Calculate column widths
                col_widths = [15] * max_col  # Default width
                table_grid = [['' for _ in range(max_col)] for _ in range(max_row)]

                for cell in cells:
                    row_idx = cell.get('RowIndex', 1) - 1
                    col_idx = cell.get('ColumnIndex', 1) - 1

                    cell_text = ''
                    if 'Relationships' in cell:
                        for rel in cell['Relationships']:
                            if rel['Type'] == 'CHILD':
                                for child_id in rel['Ids']:
                                    child_block = block_map.get(child_id)
                                    if child_block and child_block['BlockType'] == 'WORD':
                                        cell_text += child_block.get('Text', '') + ' '

                    cell_text = cell_text.strip()
                    if row_idx < max_row and col_idx < max_col:
                        table_grid[row_idx][col_idx] = cell_text
                        col_widths[col_idx] = max(col_widths[col_idx], len(cell_text) + 2)

                # Build text table
                table_lines = []
                separator = '+' + '+'.join(['-' * w for w in col_widths]) + '+'
                table_lines.append(separator)

                for row_idx, row in enumerate(table_grid):
                    row_text = '|'
                    for col_idx, cell_text in enumerate(row):
                        row_text += cell_text.ljust(col_widths[col_idx]) + '|'
                    table_lines.append(row_text)
                    if row_idx == 0:
                        table_lines.append(separator)

                table_lines.append(separator)

                tables.append({
                    'text': '\n'.join(table_lines),
                    'top': bbox.get('Top', 0)
                })

    # Sort all elements by position
    all_elements = []
    for line in lines:
        all_elements.append({'type': 'line', 'top': line['top'], 'left': line['left'], 'text': line['text']})
    for table in tables:
        all_elements.append({'type': 'table', 'top': table['top'], 'left': 0, 'text': table['text']})

    all_elements.sort(key=lambda x: (round(x['top'], 2), x['left']))

    # Group by rows (similar Y position)
    row_threshold = 0.015
    output_rows = []
    current_row_elements = []
    current_top = None

    for elem in all_elements:
        if elem['type'] == 'table':
            # Tables are added as their own "row"
            if current_row_elements:
                output_rows.append({'elements': current_row_elements, 'is_table': False})
                current_row_elements = []
                current_top = None
            output_rows.append({'elements': [elem], 'is_table': True})
        else:
            if current_top is None:
                current_top = elem['top']
                current_row_elements = [elem]
            elif abs(elem['top'] - current_top) <= row_threshold:
                current_row_elements.append(elem)
            else:
                if current_row_elements:
                    output_rows.append({'elements': current_row_elements, 'is_table': False})
                current_row_elements = [elem]
                current_top = elem['top']

    if current_row_elements:
        output_rows.append({'elements': current_row_elements, 'is_table': False})

    # Build output
    output_lines = []
    for row in output_rows:
        if row['is_table']:
            output_lines.append(row['elements'][0]['text'])
        else:
            elements = sorted(row['elements'], key=lambda x: x['left'])
            if len(elements) == 1:
                indent = int(elements[0]['left'] * page_width_chars)
                indent = min(indent, 50)
                output_lines.append(' ' * indent + elements[0]['text'])
            else:
                line_chars = [' '] * page_width_chars
                for elem in elements:
                    start_pos = int(elem['left'] * page_width_chars)
                    for i, char in enumerate(elem['text']):
                        pos = start_pos + i
                        if pos < page_width_chars:
                            line_chars[pos] = char
                output_lines.append(''.join(line_chars).rstrip())

    return '\n'.join(output_lines)


def reconstruct_layout_from_textract(blocks: list, page_width_chars: int = 120, include_tables: bool = True) -> str:
    """
    Reconstruct the original page layout from Textract blocks using geometry.
    Uses bounding box coordinates to preserve spatial positioning.
    Now also supports tables when include_tables is True.
    """
    # Extract tables first if enabled
    tables_html = []
    table_positions = set()
    if include_tables:
        tables = extract_tables_from_textract(blocks)
        for table in tables:
            tables_html.append(table)
            # Mark the vertical position of tables to avoid duplicating text
            table_positions.add(round(table['top'], 2))

    # Extract LINE blocks with their geometry (excluding lines inside tables)
    lines = []
    for block in blocks:
        if block['BlockType'] == 'LINE' and 'Geometry' in block:
            bbox = block['Geometry']['BoundingBox']
            line_top = round(bbox['Top'], 2)

            # Skip lines that are inside table regions
            is_in_table = False
            for table in tables_html:
                table_top = table['top']
                if abs(line_top - round(table_top, 2)) < 0.1:  # Within table region
                    is_in_table = True
                    break

            if not is_in_table:
                lines.append({
                    'text': block['Text'],
                    'left': bbox['Left'],
                    'top': bbox['Top'],
                    'width': bbox['Width'],
                    'height': bbox['Height']
                })

    # Sort lines by vertical position (top), then by horizontal position (left)
    lines.sort(key=lambda x: (round(x['top'], 2), x['left']))

    # Group lines that are on the same visual row (similar Y position)
    # Lines with top values within 1.5% of page height are considered same row
    row_threshold = 0.015
    rows = []
    current_row = []
    current_top = None

    for line in lines:
        if current_top is None:
            current_top = line['top']
            current_row = [line]
        elif abs(line['top'] - current_top) <= row_threshold:
            current_row.append(line)
        else:
            if current_row:
                rows.append({'lines': current_row, 'top': current_top})
            current_row = [line]
            current_top = line['top']

    if current_row:
        rows.append({'lines': current_row, 'top': current_top})

    # Build the output with proper spacing, inserting tables at their positions
    output_parts = []
    table_idx = 0
    sorted_tables = sorted(tables_html, key=lambda x: x['top'])

    for row in rows:
        row_top = row['top']

        # Insert any tables that come before this row
        while table_idx < len(sorted_tables) and sorted_tables[table_idx]['top'] < row_top:
            output_parts.append('\n' + sorted_tables[table_idx]['html'] + '\n')
            table_idx += 1

        # Process the text row
        row_lines = row['lines']
        row_lines.sort(key=lambda x: x['left'])

        if len(row_lines) == 1:
            # Single item in row - add indentation based on left position
            item = row_lines[0]
            indent = int(item['left'] * page_width_chars)
            # Cap indent at reasonable value
            indent = min(indent, 60)
            output_parts.append(' ' * indent + item['text'])
        else:
            # Multiple items in row - space them according to position
            line_chars = [' '] * page_width_chars

            for item in row_lines:
                start_pos = int(item['left'] * page_width_chars)
                text = item['text']

                # Place text at calculated position
                for i, char in enumerate(text):
                    pos = start_pos + i
                    if pos < page_width_chars:
                        line_chars[pos] = char

            # Convert to string and strip trailing spaces
            output_parts.append(''.join(line_chars).rstrip())

    # Add any remaining tables at the end
    while table_idx < len(sorted_tables):
        output_parts.append('\n' + sorted_tables[table_idx]['html'] + '\n')
        table_idx += 1

    return '\n'.join(output_parts)


def extract_text_with_textract(content: bytes, file_extension: str, preserve_layout: bool = True, detect_tables: bool = True) -> dict:
    """
    Extract text using AWS Textract (best quality OCR) with layout preservation and table support.

    Args:
        content: File content as bytes
        file_extension: File extension (jpg, png, pdf, etc.)
        preserve_layout: Whether to preserve document layout
        detect_tables: Whether to detect and format tables (uses analyze_document instead of detect_document_text)

    Returns:
        dict with 'text' (plain text) and 'html' (HTML with visual layout) or None if Textract unavailable
    """
    if not textract_client:
        return None

    try:
        # For images, use analyze_document with TABLES feature for table detection
        if file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            if detect_tables:
                # Use analyze_document for table detection
                response = textract_client.analyze_document(
                    Document={'Bytes': content},
                    FeatureTypes=['TABLES', 'LAYOUT']
                )
                logger.info("AWS Textract: Using analyze_document with TABLES feature")
            else:
                # Use detect_document_text for faster text-only extraction
                response = textract_client.detect_document_text(
                    Document={'Bytes': content}
                )

            blocks = response.get('Blocks', [])

            # Generate HTML with visual layout (best for preserving document appearance)
            html = reconstruct_layout_html_from_textract(blocks)

            # Generate plain text with layout preservation
            text = ""
            if preserve_layout:
                text = reconstruct_layout_text_from_textract(blocks)

            # Fallback to simple extraction if layout reconstruction returned empty
            if not text or len(text.strip()) < 10:
                text_parts = []
                for block in blocks:
                    if block['BlockType'] == 'LINE':
                        text_parts.append(block['Text'])
                text = '\n'.join(text_parts)
                logger.info(f"AWS Textract: layout reconstruction empty, using simple extraction")

            logger.info(f"AWS Textract extracted {len(text)} characters from image (tables: {detect_tables})")
            return {'text': text, 'html': html}

        # For PDFs, convert pages to images first
        elif file_extension == 'pdf':
            all_pages_text = []
            all_pages_html = []
            TEXTRACT_MAX_SIZE = 5 * 1024 * 1024  # 5MB max for Textract
            try:
                pdf_document = fitz.open(stream=content, filetype="pdf")

                for page_num in range(min(pdf_document.page_count, 15)):  # Limit to 15 pages
                    page = pdf_document[page_num]

                    # Try different zoom levels to stay under 5MB limit
                    img_data = None
                    for zoom in [2.0, 1.5, 1.0, 0.75]:
                        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
                        img_data = pix.tobytes("png")

                        # If PNG is too large, try JPEG (much smaller)
                        if len(img_data) > TEXTRACT_MAX_SIZE:
                            # Convert to JPEG using PIL
                            img = Image.open(io.BytesIO(img_data))
                            jpeg_buffer = io.BytesIO()
                            img.convert('RGB').save(jpeg_buffer, format='JPEG', quality=85)
                            img_data = jpeg_buffer.getvalue()

                        if len(img_data) <= TEXTRACT_MAX_SIZE:
                            break

                    if len(img_data) > TEXTRACT_MAX_SIZE:
                        logger.warning(f"Page {page_num + 1} image too large ({len(img_data)} bytes), skipping")
                        continue

                    # Send to Textract - use analyze_document for table detection
                    if detect_tables:
                        response = textract_client.analyze_document(
                            Document={'Bytes': img_data},
                            FeatureTypes=['TABLES', 'LAYOUT']
                        )
                    else:
                        response = textract_client.detect_document_text(
                            Document={'Bytes': img_data}
                        )

                    blocks = response.get('Blocks', [])

                    # Generate HTML for this page
                    page_html = reconstruct_layout_html_from_textract(blocks)
                    all_pages_html.append(f'<div style="margin-bottom: 20px; border-bottom: 2px dashed #ccc; padding-bottom: 20px;"><h4 style="color: #666; margin-bottom: 10px;">--- Page {page_num + 1} ---</h4>{page_html}</div>')

                    # Generate plain text for this page
                    page_text = ""
                    if preserve_layout:
                        page_text = reconstruct_layout_text_from_textract(blocks)

                    # Fallback to simple extraction if layout reconstruction returned empty
                    if not page_text or len(page_text.strip()) < 5:
                        page_text = ""
                        for block in blocks:
                            if block['BlockType'] == 'LINE':
                                page_text += block['Text'] + '\n'

                    if page_text.strip():
                        all_pages_text.append(f"--- Page {page_num + 1} ---\n{page_text}")

                num_pages = pdf_document.page_count
                pdf_document.close()

                text = '\n\n'.join(all_pages_text)
                html = '\n'.join(all_pages_html)
                logger.info(f"AWS Textract extracted {len(text)} characters from PDF ({num_pages} pages, layout: {preserve_layout}, tables: {detect_tables})")
                return {'text': text, 'html': html}

            except Exception as e:
                logger.warning(f"Textract PDF processing failed: {e}")
                return None

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        logger.error(f"AWS Textract ClientError: Code={error_code}, Message={error_msg}")
        return None
    except Exception as e:
        logger.error(f"Textract extraction failed: {type(e).__name__}: {e}")
        return None

    return None


async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text from uploaded file using AWS Textract (primary) or Tesseract (fallback)"""
    content = await file.read()
    file_extension = file.filename.split('.')[-1].lower()

    def tesseract_ocr_multi_config(image):
        """Try multiple Tesseract configurations and return best result"""
        configs = [
            r'--oem 3 --psm 6',   # Uniform text block (default)
            r'--oem 3 --psm 3',   # Fully automatic
            r'--oem 3 --psm 4',   # Single column
            r'--oem 3 --psm 1',   # Auto with OSD
            r'--oem 3 --psm 12',  # Sparse text
        ]

        best_text = ""
        for config in configs:
            try:
                text = pytesseract.image_to_string(image, config=config)
                if len(text.strip()) > len(best_text.strip()):
                    best_text = text
                    logger.info(f"Tesseract config {config} extracted {len(text)} chars")
            except Exception as e:
                logger.warning(f"Tesseract config {config} failed: {str(e)}")
                continue

        return best_text

    def preprocess_image_for_ocr(image):
        """Preprocess image for better OCR results"""
        if image.mode != 'RGB':
            image = image.convert('RGB')

        from PIL import ImageEnhance, ImageFilter

        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)

        # Sharpen
        image = image.filter(ImageFilter.SHARPEN)

        # Resize if too small
        width, height = image.size
        if width < 1000 or height < 1000:
            scale_factor = max(1000/width, 1000/height)
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        return image

    try:
        # For images - try Textract first, then Tesseract
        if file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'gif']:
            logger.info(f"Processing image file: {file_extension}, size: {len(content)} bytes")

            # Try AWS Textract first (best quality)
            if textract_client:
                logger.info("Using AWS Textract for image OCR...")
                text = extract_text_with_textract(content, file_extension)
                if text and len(text.strip()) > 10:
                    return text
                logger.info("Textract returned insufficient text, trying Tesseract...")
            else:
                logger.info("AWS Textract not configured, using Tesseract directly...")

            # Fallback to Tesseract with multiple configs
            try:
                logger.info("Opening image with PIL...")
                image = Image.open(io.BytesIO(content))
                logger.info(f"Image opened: mode={image.mode}, size={image.size}")
                image = preprocess_image_for_ocr(image)
                logger.info(f"Image preprocessed: mode={image.mode}, size={image.size}")

                # Try multiple OCR configurations and pick best result
                text = tesseract_ocr_multi_config(image)
                logger.info(f"Tesseract extracted {len(text)} characters from image (best result)")

                if not text or len(text.strip()) == 0:
                    logger.warning("Tesseract returned empty text - OCR may have failed")

                return text

            except Exception as e:
                logger.error(f"Image OCR failed: {str(e)}", exc_info=True)
                return ""

        elif file_extension == 'pdf':
            text = ""

            # Method 1: Try pdfplumber first (for text-based PDFs - fastest)
            try:
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"

                if text.strip() and len(text.strip()) > 50:
                    logger.info(f"pdfplumber extracted {len(text)} characters (text-based PDF)")
                    return text
            except Exception as e:
                logger.warning(f"pdfplumber extraction failed: {str(e)}")

            # Method 2: Try PyMuPDF for text
            try:
                pdf_document = fitz.open(stream=content, filetype="pdf")
                for page_num in range(pdf_document.page_count):
                    page = pdf_document[page_num]
                    page_text = page.get_text()
                    if page_text:
                        text += page_text + "\n"
                pdf_document.close()

                if text.strip() and len(text.strip()) > 50:
                    logger.info(f"PyMuPDF extracted {len(text)} characters")
                    return text
            except Exception as e:
                logger.warning(f"PyMuPDF extraction failed: {str(e)}")

            # Method 3: PDF is likely image-based - use AWS Textract (best quality)
            if textract_client:
                logger.info("PDF appears to be image-based. Using AWS Textract...")
                textract_text = extract_text_with_textract(content, file_extension)
                if textract_text and len(textract_text.strip()) > 10:
                    return textract_text
                logger.info("Textract returned insufficient text, trying Tesseract...")

            # Method 4: Fallback to Tesseract OCR with multi-config
            logger.info("Using Tesseract OCR for image-based PDF...")
            try:
                pdf_document = fitz.open(stream=content, filetype="pdf")

                for page_num in range(min(pdf_document.page_count, 10)):
                    page = pdf_document[page_num]
                    # Higher resolution for better OCR (2x zoom)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img_data = pix.tobytes("png")

                    image = Image.open(io.BytesIO(img_data))
                    # Preprocess image for better OCR
                    image = preprocess_image_for_ocr(image)
                    # Try multiple configs and get best result
                    page_text = tesseract_ocr_multi_config(image)

                    if page_text.strip():
                        text += page_text + "\n"

                pdf_document.close()

                if text.strip():
                    logger.info(f"Tesseract extracted {len(text)} characters from image-based PDF")
                    return text

            except Exception as e:
                logger.warning(f"PDF OCR extraction failed: {str(e)}")

            return text

        elif file_extension in ['docx', 'doc']:
            doc = Document(io.BytesIO(content))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text

        elif file_extension == 'txt':
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            for encoding in encodings:
                try:
                    text = content.decode(encoding)
                    return text
                except UnicodeDecodeError:
                    continue
            raise HTTPException(status_code=400, detail="Unable to decode text file")

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting text from file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Legacy Translations Partner Portal API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...), token: Optional[str] = None):
    """Upload and process document for word count extraction - also stores the document"""

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Check file size (limit to 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Reset file pointer
    await file.seek(0)

    try:
        # Extract text from file
        extracted_text = await extract_text_from_file(file)

        # Count words
        word_count = count_words(extracted_text)

        # Get partner_id if token provided
        partner_id = None
        if token:
            partner = await db.partners.find_one({"token": token})
            if partner:
                partner_id = partner["id"]

        # Store document in MongoDB
        document_id = str(uuid.uuid4())
        document_data = {
            "id": document_id,
            "filename": file.filename,
            "content_type": file.content_type or "application/octet-stream",
            "file_data": base64.b64encode(content).decode('utf-8'),
            "file_size": len(content),
            "word_count": word_count,
            "extracted_text": extracted_text[:10000] if extracted_text else "",  # Store first 10k chars
            "partner_id": partner_id,
            "order_id": None,  # Will be updated when order is created
            "created_at": datetime.utcnow()
        }
        await db.documents.insert_one(document_data)

        return DocumentUploadResponse(
            filename=file.filename,
            word_count=word_count,
            file_size=len(content),
            message=f"Successfully extracted {word_count} words from {file.filename}",
            document_id=document_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail="Unexpected error processing file")

@api_router.post("/calculate-quote", response_model=TranslationQuote)
async def calculate_quote(quote_data: TranslationQuoteCreate):
    """Calculate translation quote based on provided data"""

    try:
        # Calculate pricing
        base_price, urgency_fee, subtotal = calculate_price(
            quote_data.word_count,
            quote_data.service_type,
            quote_data.urgency
        )

        # Add shipping fee and apply discount
        shipping_fee = quote_data.shipping_fee or 0.0
        discount_amount = quote_data.discount_amount or 0.0
        total_price = max(0, subtotal + shipping_fee - discount_amount)

        # Get estimated delivery
        estimated_delivery = get_estimated_delivery(quote_data.urgency)

        # Create quote object
        quote = TranslationQuote(
            reference=quote_data.reference,
            service_type=quote_data.service_type,
            translate_from=quote_data.translate_from,
            translate_to=quote_data.translate_to,
            word_count=quote_data.word_count,
            urgency=quote_data.urgency,
            base_price=base_price,
            urgency_fee=urgency_fee,
            shipping_fee=shipping_fee,
            discount_amount=discount_amount,
            discount_code=quote_data.discount_code,
            total_price=total_price,
            estimated_delivery=estimated_delivery,
            customer_email=quote_data.customer_email,
            customer_name=quote_data.customer_name,
            notes=quote_data.notes,
            document_ids=quote_data.document_ids
        )

        # Save quote to database
        await db.translation_quotes.insert_one(quote.dict())

        return quote

    except Exception as e:
        logger.error(f"Error calculating quote: {str(e)}")
        raise HTTPException(status_code=500, detail="Error calculating quote")

@api_router.get("/quotes", response_model=List[TranslationQuote])
async def get_quotes():
    """Get all translation quotes"""
    quotes = await db.translation_quotes.find().sort("created_at", -1).to_list(100)
    return [TranslationQuote(**quote) for quote in quotes]

@api_router.get("/quotes/{quote_id}", response_model=TranslationQuote)
async def get_quote(quote_id: str):
    """Get specific translation quote"""
    quote = await db.translation_quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return TranslationQuote(**quote)

@api_router.post("/word-count")
async def get_word_count(text: str = Form(...)):
    """Get word count from provided text"""
    word_count = count_words(text)
    return {"word_count": word_count, "text_length": len(text)}

# Stripe Payment Integration
@api_router.post("/create-payment-checkout")
async def create_payment_checkout(request: PaymentCheckoutRequest):
    """Create a Stripe checkout session"""
    
    try:
        # Get quote
        quote = await db.translation_quotes.find_one({"id": request.quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            session_id="",  # Will be updated with Stripe session ID
            quote_id=request.quote_id,
            amount=quote["total_price"],
            currency="usd",
            payment_status="pending",
            status="initiated"
        )
        
        # Get customer email from request or quote
        customer_email = request.customer_email or quote.get("customer_email")

        # Create Stripe checkout session
        checkout_params = {
            'payment_method_types': ['card'],
            'line_items': [{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Translation Service - {quote["service_type"].title()}',
                        'description': f'From {quote["translate_from"]} to {quote["translate_to"]} - {quote["word_count"]} words',
                    },
                    'unit_amount': int(quote["total_price"] * 100),  # Stripe expects cents
                },
                'quantity': 1,
            }],
            'mode': 'payment',
            'success_url': f"{request.origin_url}?payment_success=true&session_id={{CHECKOUT_SESSION_ID}}#/customer",
            'cancel_url': f"{request.origin_url}?payment_cancelled=true#/customer",
            'metadata': {
                'quote_id': request.quote_id,
                'transaction_id': transaction.id,
                'customer_email': customer_email or '',
                'customer_name': request.customer_name or quote.get("customer_name", '')
            }
        }

        # Add customer email to pre-fill in Stripe checkout
        if customer_email:
            checkout_params['customer_email'] = customer_email

        checkout_session = stripe.checkout.Session.create(**checkout_params)
        
        # Update transaction with session ID
        transaction.session_id = checkout_session.id
        await db.payment_transactions.insert_one(transaction.dict())
        
        return {
            "status": "success",
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
            "transaction_id": transaction.id
        }
        
    except Exception as e:
        logger.error(f"Error creating payment checkout: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create payment checkout")

# Zelle Payment Integration
@api_router.post("/create-zelle-order")
async def create_zelle_order(request: ZelleOrderRequest, background_tasks: BackgroundTasks):
    """Create an order with Zelle payment (pending verification)"""

    try:
        # Get quote
        quote = await db.translation_quotes.find_one({"id": request.quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")

        # Generate order number
        order_count = await db.orders.count_documents({})
        order_number = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{order_count + 1:04d}"

        # Get receipt URL if available
        receipt_url = None
        if request.zelle_receipt_id:
            # Get the document/file URL
            doc = await db.documents.find_one({"id": request.zelle_receipt_id})
            if doc:
                backend_url = os.environ.get("BACKEND_URL", "https://legacy-portal-backend.onrender.com")
                receipt_url = f"{backend_url}/api/download-document/{request.zelle_receipt_id}"

        # Create order with pending_zelle status
        order = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "quote_id": request.quote_id,
            "reference": quote.get("reference", "N/A"),
            "customer_email": request.customer_email,
            "customer_name": request.customer_name,
            "client_name": request.customer_name,
            "service_type": quote.get("service_type", "translation"),
            "translate_from": quote.get("translate_from", ""),
            "translate_to": quote.get("translate_to", ""),
            "word_count": quote.get("word_count", 0),
            "urgency": quote.get("urgency", "no"),
            "total_price": request.total_price,
            "payment_method": "zelle",
            "payment_status": "pending_zelle",
            "zelle_receipt_id": request.zelle_receipt_id,
            "zelle_receipt_url": receipt_url,
            "status": "pending_payment",
            "notes": request.notes,
            "shipping_address": request.shipping_address,
            "document_ids": quote.get("document_ids", []),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_guest_order": True
        }

        await db.orders.insert_one(order)

        # Update quote status
        await db.translation_quotes.update_one(
            {"id": request.quote_id},
            {"$set": {"status": "pending_zelle", "order_id": order["id"], "updated_at": datetime.utcnow()}}
        )

        # Prepare order details for emails
        order_details = {
            "reference": order_number,
            "service_type": order["service_type"],
            "translate_from": order["translate_from"],
            "translate_to": order["translate_to"],
            "total_price": order["total_price"],
            "customer_name": request.customer_name,
            "customer_email": request.customer_email
        }

        # Send pending confirmation email to customer
        try:
            email_html = get_zelle_pending_email_template(request.customer_name, order_details)
            await email_service.send_email(
                request.customer_email,
                f"Order Received - Zelle Payment Pending Verification - {order_number}",
                email_html,
                "html"
            )
            logger.info(f"Zelle pending email sent to customer: {request.customer_email}")
        except Exception as e:
            logger.error(f"Failed to send Zelle pending email to customer: {str(e)}")

        # Send notification email to admin
        try:
            admin_email = os.environ.get("ADMIN_EMAIL", "contact@legacytranslations.com")
            admin_html = get_zelle_admin_notification_template(order_details, receipt_url)
            await email_service.send_email(
                admin_email,
                f"🔔 New Zelle Payment - {order_number} - ${request.total_price:.2f}",
                admin_html,
                "html"
            )
            logger.info(f"Zelle admin notification sent to: {admin_email}")
        except Exception as e:
            logger.error(f"Failed to send Zelle admin notification: {str(e)}")

        return {
            "status": "success",
            "message": "Order submitted with Zelle payment pending verification",
            "order_id": order["id"],
            "order_number": order_number
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Zelle order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create Zelle order")

@api_router.post("/confirm-zelle-payment/{order_id}")
async def confirm_zelle_payment(order_id: str, background_tasks: BackgroundTasks):
    """Admin endpoint to confirm a Zelle payment and start the translation"""

    try:
        # Get order
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.get("payment_status") != "pending_zelle":
            raise HTTPException(status_code=400, detail="Order is not pending Zelle payment")

        # Update order status
        await db.orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "payment_status": "paid",
                    "status": "in_progress",
                    "payment_confirmed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Update quote status
        if order.get("quote_id"):
            await db.translation_quotes.update_one(
                {"id": order["quote_id"]},
                {"$set": {"status": "paid", "updated_at": datetime.utcnow()}}
            )

        # Prepare order details for email
        order_details = {
            "reference": order.get("order_number", order.get("reference", "N/A")),
            "service_type": order.get("service_type", "translation"),
            "translate_from": order.get("translate_from", ""),
            "translate_to": order.get("translate_to", ""),
            "total_price": order.get("total_price", 0)
        }

        # Send confirmation email to customer
        try:
            customer_email = order.get("customer_email")
            customer_name = order.get("customer_name", order.get("client_name", "Valued Customer"))
            if customer_email:
                email_html = get_zelle_confirmed_email_template(customer_name, order_details)
                await email_service.send_email(
                    customer_email,
                    f"Payment Confirmed - Translation Started - {order_details['reference']}",
                    email_html,
                    "html"
                )
                logger.info(f"Zelle confirmation email sent to customer: {customer_email}")
        except Exception as e:
            logger.error(f"Failed to send Zelle confirmation email: {str(e)}")

        return {
            "status": "success",
            "message": "Zelle payment confirmed and translation started",
            "order_id": order_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming Zelle payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to confirm Zelle payment")

@api_router.get("/payment-status/{session_id}")
async def get_payment_status(session_id: str):
    """Get payment status from Stripe and database"""
    
    try:
        # Get transaction from database
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Payment session not found")
        
        # Get session from Stripe
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Update transaction status based on Stripe session
        stripe_status = checkout_session.payment_status
        status_mapping = {
            'paid': 'completed',
            'unpaid': 'pending',
            'no_payment_required': 'completed'
        }
        
        new_status = status_mapping.get(stripe_status, 'pending')
        
        # Update database if status changed
        if transaction['status'] != new_status:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "status": new_status,
                        "payment_status": stripe_status,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Handle successful payment
            if new_status == 'completed':
                await handle_successful_payment(session_id, transaction)
        
        return {
            "session_id": session_id,
            "status": new_status,
            "payment_status": stripe_status,
            "amount": transaction['amount'],
            "currency": transaction['currency']
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting payment status: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting payment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

@api_router.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks with proper signature verification"""

    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')

        # Verify webhook signature
        if STRIPE_WEBHOOK_SECRET:
            # Production mode: verify webhook signature
            if not sig_header:
                logger.warning("Missing Stripe signature header")
                raise HTTPException(status_code=400, detail="Missing Stripe signature")

            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, STRIPE_WEBHOOK_SECRET
                )
                logger.info(f"Webhook signature verified for event: {event['type']}")
            except stripe.error.SignatureVerificationError as e:
                logger.error(f"Webhook signature verification failed: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid signature")
        else:
            # Test mode without webhook secret: parse event without verification
            # Log warning to encourage setting up webhook secret even in test mode
            if STRIPE_TEST_MODE:
                logger.warning("Webhook secret not configured - processing without signature verification (test mode)")
            else:
                logger.error("Webhook secret not configured in production mode - rejecting request")
                raise HTTPException(status_code=400, detail="Webhook secret not configured")

            try:
                event = stripe.Event.construct_from(
                    json.loads(payload.decode('utf-8')), stripe.api_key
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse webhook payload: {str(e)}")
                raise HTTPException(status_code=400, detail="Invalid payload")

        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            session_id = session['id']

            logger.info(f"Processing checkout.session.completed for session: {session_id}")

            # Update payment status
            result = await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            if result.matched_count == 0:
                logger.warning(f"No transaction found for session_id: {session_id}")

            # Get transaction and handle success
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                await handle_successful_payment(session_id, transaction)
                logger.info(f"Successfully processed payment for session: {session_id}")
        else:
            logger.info(f"Received unhandled webhook event type: {event['type']}")

        # Return 200 OK to acknowledge receipt of the event
        return {"status": "success", "received": True}

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error handling webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error handling webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def handle_successful_payment(session_id: str, payment_transaction: dict):
    """Handle successful payment by sending confirmation emails and creating Protemos project"""
    
    try:
        # Get quote details
        quote_id = payment_transaction.get("quote_id")
        quote = await db.translation_quotes.find_one({"id": quote_id})
        
        if not quote:
            logger.error(f"Quote not found for payment session: {session_id}")
            return
        
        # Prepare order details for email
        order_details = {
            "reference": quote.get("reference"),
            "service_type": quote.get("service_type"),
            "translate_from": quote.get("translate_from"),
            "translate_to": quote.get("translate_to"),
            "word_count": quote.get("word_count"),
            "urgency": quote.get("urgency"),
            "estimated_delivery": quote.get("estimated_delivery"),
            "base_price": quote.get("base_price"),
            "urgency_fee": quote.get("urgency_fee"),
            "total_price": quote.get("total_price"),
            "client_email": "partner@legacytranslations.com"  # Default for partner portal
        }
        
        # Create project in Protemos
        try:
            protemos_response = await protemos_client.create_project(order_details)
            logger.info(f"Created Protemos project for session {session_id}: {protemos_response.get('id')}")
            
            # Update payment transaction with Protemos project ID
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "protemos_project_id": protemos_response.get("id"),
                        "protemos_status": protemos_response.get("status", "created")
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to create Protemos project for session {session_id}: {str(e)}")
            # Don't fail the entire process if Protemos fails
        
        # Send confirmation email to company
        try:
            await email_service.send_order_confirmation_email(
                "contact@legacytranslations.com",
                order_details,
                is_partner=False
            )
            logger.info(f"Sent order confirmation to company for session: {session_id}")
        except Exception as e:
            logger.error(f"Failed to send company confirmation email: {str(e)}")
        
        logger.info(f"Successfully processed payment for session: {session_id}")
        
    except Exception as e:
        logger.error(f"Error handling successful payment for session {session_id}: {str(e)}")

# Protemos Integration Endpoints
class ProtemosProjectRequest(BaseModel):
    quote_id: str

@api_router.post("/protemos/create-project")
async def create_protemos_project(request: ProtemosProjectRequest):
    """Manually create a Protemos project from a quote"""
    
    try:
        # Get quote details
        quote = await db.translation_quotes.find_one({"id": request.quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Prepare order details for Protemos
        order_details = {
            "reference": quote.get("reference"),
            "service_type": quote.get("service_type"),
            "translate_from": quote.get("translate_from"),
            "translate_to": quote.get("translate_to"),
            "word_count": quote.get("word_count"),
            "urgency": quote.get("urgency"),
            "estimated_delivery": quote.get("estimated_delivery"),
            "base_price": quote.get("base_price"),
            "urgency_fee": quote.get("urgency_fee"),
            "total_price": quote.get("total_price"),
            "client_email": "partner@legacytranslations.com"
        }
        
        # Create project in Protemos
        protemos_response = await protemos_client.create_project(order_details)
        
        # Save Protemos project details to database
        protemos_project = {
            "id": str(uuid.uuid4()),
            "quote_id": request.quote_id,
            "protemos_project_id": protemos_response.get("id"),
            "protemos_status": protemos_response.get("status", "created"),
            "project_name": protemos_response.get("name"),
            "created_at": datetime.utcnow(),
            "order_details": order_details
        }
        
        await db.protemos_projects.insert_one(protemos_project)
        
        logger.info(f"Created Protemos project: {protemos_response.get('id')} for quote: {request.quote_id}")
        
        return {
            "status": "success",
            "message": "Protemos project created successfully",
            "protemos_project_id": protemos_response.get("id"),
            "protemos_response": protemos_response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Protemos project: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create Protemos project")

@api_router.get("/protemos/projects")
async def get_protemos_projects():
    """Get all Protemos projects"""
    projects = await db.protemos_projects.find().sort("created_at", -1).to_list(100)
    
    # Remove MongoDB ObjectId fields to avoid serialization issues
    for project in projects:
        if '_id' in project:
            del project['_id']
    
    return {"projects": projects}

@api_router.get("/protemos/projects/{quote_id}")
async def get_protemos_project_by_quote(quote_id: str):
    """Get Protemos project by quote ID"""
    project = await db.protemos_projects.find_one({"quote_id": quote_id})
    if not project:
        raise HTTPException(status_code=404, detail="Protemos project not found for this quote")
    
    # Remove MongoDB ObjectId field to avoid serialization issues
    if '_id' in project:
        del project['_id']
    
    return project

# Email notification endpoint
@api_router.post("/send-email-notification")
async def send_email_notification(request: EmailNotificationRequest, background_tasks: BackgroundTasks):
    """Send email notification for quote"""
    
    try:
        # Get quote details
        quote = await db.translation_quotes.find_one({"id": request.quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Prepare order details
        order_details = {
            "reference": quote.get("reference"),
            "service_type": quote.get("service_type"),
            "translate_from": quote.get("translate_from"),
            "translate_to": quote.get("translate_to"),
            "word_count": quote.get("word_count"),
            "urgency": quote.get("urgency"),
            "estimated_delivery": quote.get("estimated_delivery"),
            "base_price": quote.get("base_price"),
            "urgency_fee": quote.get("urgency_fee"),
            "total_price": quote.get("total_price")
        }
        
        # Send email to partner
        background_tasks.add_task(
            email_service.send_order_confirmation_email,
            request.partner_email,
            order_details,
            is_partner=True
        )
        
        # Send email to company if requested
        if request.send_to_company:
            background_tasks.add_task(
                email_service.send_order_confirmation_email,
                "contact@legacytranslations.com",
                order_details,
                is_partner=False
            )
        
        return {"status": "success", "message": "Email notifications queued for delivery"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending email notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email notification")

# Support request endpoint
@api_router.post("/send-support-request")
async def send_support_request(request: SupportRequest):
    """Send support request email to contact@legacytranslations.com"""
    try:
        # Map issue types to readable names
        issue_type_labels = {
            "upload": "Problems with Upload",
            "translation_type": "Not Sure What Type of Translation to Order",
            "other": "Other"
        }

        issue_label = issue_type_labels.get(request.issue_type, request.issue_type)

        # Build email content
        subject = f"Customer Support Request: {issue_label}"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">
                Customer Support Request
            </h2>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Issue Type:</strong> {issue_label}</p>
                <p><strong>Customer Name:</strong> {request.customer_name}</p>
                <p><strong>Customer Email:</strong> {request.customer_email}</p>
                <p><strong>Attachments:</strong> {request.files_count} file(s)</p>
            </div>

            <div style="background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
                <h3 style="color: #374151; margin-top: 0;">Description:</h3>
                <p style="white-space: pre-wrap; color: #4b5563;">{request.description}</p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #9ca3af; font-size: 12px;">
                This support request was submitted from the Legacy Translations Customer Portal.
            </p>
        </div>
        """

        # Send email to support
        await email_service.send_email(
            to="contact@legacytranslations.com",
            subject=subject,
            content=html_content,
            content_type="html"
        )

        # Also save to database for tracking
        support_ticket = {
            "id": str(uuid.uuid4()),
            "issue_type": request.issue_type,
            "description": request.description,
            "customer_email": request.customer_email,
            "customer_name": request.customer_name,
            "files_count": request.files_count,
            "status": "new",
            "created_at": datetime.utcnow()
        }
        await db.support_tickets.insert_one(support_ticket)

        logger.info(f"Support request received from {request.customer_email}: {issue_label}")

        return {"status": "success", "message": "Support request sent successfully"}

    except Exception as e:
        logger.error(f"Error sending support request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send support request")

# B2B Partnership Interest endpoint
class B2BInterestRequest(BaseModel):
    company_name: str
    contact_name: str
    email: str
    phone: str = ""
    estimated_volume: str = ""
    message: str = ""

@api_router.post("/b2b-interest")
async def submit_b2b_interest(request: B2BInterestRequest):
    """Handle B2B partnership interest form submissions"""
    try:
        # Build email content
        subject = f"New B2B Partnership Interest: {request.company_name}"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px;">
                🤝 New B2B Partnership Interest
            </h2>

            <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a5f;">
                <h3 style="color: #1e3a5f; margin-top: 0;">Company Information</h3>
                <p><strong>Company Name:</strong> {request.company_name}</p>
                <p><strong>Contact Name:</strong> {request.contact_name}</p>
                <p><strong>Email:</strong> <a href="mailto:{request.email}">{request.email}</a></p>
                <p><strong>Phone:</strong> {request.phone or 'Not provided'}</p>
            </div>

            <div style="background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Business Details</h3>
                <p><strong>Estimated Monthly Volume:</strong> {request.estimated_volume or 'Not specified'}</p>
            </div>

            <div style="background: #fafafa; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
                <h3 style="color: #374151; margin-top: 0;">Message</h3>
                <p style="white-space: pre-wrap; color: #4b5563;">{request.message or 'No additional message provided.'}</p>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #2e7d32; margin: 0;">
                    <strong>📋 Next Steps:</strong> Please respond to this inquiry within 24 hours to discuss partnership opportunities.
                </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #9ca3af; font-size: 12px;">
                This B2B partnership inquiry was submitted from the Legacy Translations Partner Portal.
            </p>
        </div>
        """

        # Send email to sales/admin
        await email_service.send_email(
            to="contact@legacytranslations.com",
            subject=subject,
            content=html_content,
            content_type="html"
        )

        # Send welcome email to prospect with registration link
        registration_url = f"https://portal.legacytranslations.com/#/partner?register=true&email={request.email}&company={request.company_name}&name={request.contact_name}&phone={request.phone or ''}"

        prospect_email_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #1a2a4a 0%, #2c3e5c 100%); padding: 35px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Welcome to Legacy Translations!</h1>
            </div>
            <div style="background: linear-gradient(90deg, #c9a227 0%, #e6c547 50%, #c9a227 100%); height: 4px;"></div>

            <div style="padding: 40px 30px;">
                <p style="font-size: 18px; color: #333;">Hi {request.contact_name},</p>

                <p style="color: #555; line-height: 1.6;">
                    Thank you for your interest in becoming a Legacy Translations Partner! We received your inquiry and our team will contact you within 24 hours.
                </p>

                <p style="color: #555; line-height: 1.6;">
                    In the meantime, you can complete your partner account registration by clicking the button below:
                </p>

                <div style="text-align: center; margin: 35px 0;">
                    <a href="{registration_url}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(30, 58, 95, 0.3);">
                        Complete Your Registration
                    </a>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0;">
                    <h3 style="color: #1e3a5f; margin-top: 0; margin-bottom: 15px;">Partner Benefits Include:</h3>
                    <ul style="color: #555; line-height: 2; padding-left: 20px; margin: 0;">
                        <li>Net 30 payment terms for approved partners</li>
                        <li>Volume discounts on translations</li>
                        <li>Priority order processing</li>
                        <li>Dedicated account support</li>
                        <li>Online dashboard to track all orders</li>
                    </ul>
                </div>

                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; margin: 0; font-weight: 500;">
                        <strong>First Certified Translation FREE!</strong> 1 page - No commitment required
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6;">
                    If you have any questions, feel free to reply to this email or contact us at
                    <a href="mailto:contact@legacytranslations.com" style="color: #1e3a5f;">contact@legacytranslations.com</a>
                </p>

                <p style="color: #555; margin-top: 30px;">
                    Best regards,<br>
                    <strong style="color: #1e3a5f;">The Legacy Translations Team</strong>
                </p>
            </div>

            <div style="background: #f1f5f9; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                    © 2024 Legacy Translations. All rights reserved.<br>
                    <a href="https://legacytranslations.com" style="color: #1e3a5f;">legacytranslations.com</a>
                </p>
            </div>
        </div>
        """

        try:
            await email_service.send_email(
                to=request.email,
                subject="Welcome to Legacy Translations - Complete Your Partner Registration",
                content=prospect_email_content,
                content_type="html"
            )
            logger.info(f"Welcome email sent to prospect: {request.email}")
        except Exception as email_err:
            logger.error(f"Failed to send welcome email to prospect: {str(email_err)}")

        # Save to database for tracking
        b2b_inquiry = {
            "id": str(uuid.uuid4()),
            "company_name": request.company_name,
            "contact_name": request.contact_name,
            "email": request.email,
            "phone": request.phone,
            "estimated_volume": request.estimated_volume,
            "message": request.message,
            "status": "new",
            "created_at": datetime.utcnow()
        }
        await db.b2b_inquiries.insert_one(b2b_inquiry)

        logger.info(f"B2B interest received from {request.company_name} ({request.email})")

        return {"status": "success", "message": "Thank you for your interest! We will contact you within 24 hours."}

    except Exception as e:
        logger.error(f"Error processing B2B interest: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit partnership interest")

# ==================== PARTNER AUTHENTICATION ====================

@api_router.post("/auth/register")
async def register_partner(partner_data: PartnerCreate):
    """Register a new partner"""
    try:
        # Check if email already exists
        existing = await db.partners.find_one({"email": partner_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Determine if invoice plan needs approval
        needs_approval = partner_data.payment_plan in ['biweekly', 'monthly']

        # Create partner with all fields
        partner = Partner(
            company_name=partner_data.company_name,
            email=partner_data.email,
            password_hash=hash_password(partner_data.password),
            contact_name=partner_data.contact_name,
            phone=partner_data.phone,
            # Address
            address_street=partner_data.address_street,
            address_city=partner_data.address_city,
            address_state=partner_data.address_state,
            address_zip=partner_data.address_zip,
            address_country=partner_data.address_country,
            tax_id=partner_data.tax_id,
            # Payment settings
            payment_plan=partner_data.payment_plan,
            default_payment_method=partner_data.default_payment_method,
            # For invoice plans, start with approval pending
            payment_plan_approved=not needs_approval,  # Auto-approve pay_per_order
            # Agreement
            agreed_to_terms=partner_data.agreed_to_terms,
            agreed_at=datetime.utcnow() if partner_data.agreed_to_terms else None
        )

        await db.partners.insert_one(partner.dict())

        # Generate token
        token = generate_token()
        active_tokens[token] = partner.id

        # Send notification email to admin if invoice plan requested
        if needs_approval:
            try:
                admin_subject = f"New Partner Registration - Invoice Plan Approval Needed: {partner.company_name}"
                admin_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e40af;">New Partner Registration - Approval Required</h2>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 10px;">
                        <p><strong>Company:</strong> {partner.company_name}</p>
                        <p><strong>Contact:</strong> {partner.contact_name}</p>
                        <p><strong>Email:</strong> {partner.email}</p>
                        <p><strong>Phone:</strong> {partner.phone or 'Not provided'}</p>
                        <p><strong>Payment Plan Requested:</strong> <span style="color: #dc2626; font-weight: bold;">{partner.payment_plan.replace('_', ' ').title()}</span></p>
                        <p><strong>Preferred Payment Method:</strong> {partner.default_payment_method.title()}</p>
                        {f'<p><strong>Address:</strong> {partner.address_street}, {partner.address_city}, {partner.address_state} {partner.address_zip}</p>' if partner.address_street else ''}
                        {f'<p><strong>Tax ID:</strong> {partner.tax_id}</p>' if partner.tax_id else ''}
                    </div>
                    <p style="margin-top: 20px; color: #6b7280;">
                        This partner has requested an invoice-based payment plan. Please review and approve/deny in the admin panel.
                    </p>
                </div>
                """
                await send_email("contact@legacytranslations.com", admin_subject, admin_content)
            except Exception as email_error:
                logger.error(f"Failed to send admin notification: {email_error}")

        return PartnerResponse(
            id=partner.id,
            company_name=partner.company_name,
            email=partner.email,
            contact_name=partner.contact_name,
            phone=partner.phone,
            token=token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering partner: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register partner")

@api_router.post("/auth/login")
async def login_partner(login_data: PartnerLogin):
    """Login partner and return token"""
    try:
        # Find partner by email
        partner = await db.partners.find_one({"email": login_data.email})
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not verify_password(login_data.password, partner["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Check if active
        if not partner.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")

        # Generate token with 24 hour expiration
        token = generate_token()
        token_expires = datetime.utcnow() + timedelta(hours=24)

        # Store token in database (persists across deploys)
        await db.partners.update_one(
            {"id": partner["id"]},
            {"$set": {"token": token, "token_expires": token_expires}}
        )

        # Also keep in memory for faster lookups
        active_tokens[token] = partner["id"]

        return PartnerResponse(
            id=partner["id"],
            company_name=partner["company_name"],
            email=partner["email"],
            contact_name=partner["contact_name"],
            phone=partner.get("phone"),
            token=token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in partner: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to login")

@api_router.post("/auth/logout")
async def logout_partner(token: str):
    """Logout partner"""
    if token in active_tokens:
        del active_tokens[token]
    return {"status": "success", "message": "Logged out successfully"}

# Store for password reset tokens (token -> {email, expires})
password_reset_tokens = {}
admin_invitation_tokens = {}  # For admin user invitations
admin_reset_tokens = {}  # For admin user password resets

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    try:
        # Find partner by email
        partner = await db.partners.find_one({"email": request.email})

        # Always return success for security (don't reveal if email exists)
        if partner:
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expires = datetime.utcnow() + timedelta(hours=1)

            # Store token
            password_reset_tokens[reset_token] = {
                "email": request.email,
                "expires": expires
            }

            # Get frontend URL
            frontend_url = os.environ.get('FRONTEND_URL', 'https://legacy-portal-frontend.onrender.com')
            reset_link = f"{frontend_url}?reset_token={reset_token}"

            # Send email
            subject = "Reset Your Password - Legacy Translations"
            content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px; margin-bottom: 20px;">
                <h2 style="color: #0d9488;">Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password for your Legacy Translations Business Portal account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: linear-gradient(to right, #0d9488, #0891b2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                </p>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">Legacy Translations - Professional Translation Services</p>
            </div>
            """

            try:
                await email_service.send_email(request.email, subject, content)
                logger.info(f"Password reset email sent to {request.email}")
            except Exception as e:
                logger.error(f"Failed to send password reset email: {str(e)}")

        return {"status": "success", "message": "If an account exists with this email, a reset link has been sent"}

    except Exception as e:
        logger.error(f"Error in forgot password: {str(e)}")
        return {"status": "success", "message": "If an account exists with this email, a reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    try:
        # Check if token exists and is valid
        token_data = password_reset_tokens.get(request.token)

        if not token_data:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link")

        if datetime.utcnow() > token_data["expires"]:
            del password_reset_tokens[request.token]
            raise HTTPException(status_code=400, detail="Reset link has expired")

        # Update password
        email = token_data["email"]
        new_hash = hash_password(request.new_password)

        result = await db.partners.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update password")

        # Remove used token
        del password_reset_tokens[request.token]

        logger.info(f"Password reset successful for {email}")
        return {"status": "success", "message": "Password has been reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")

@api_router.get("/auth/me")
async def get_current_partner_info(token: str):
    """Get current partner info from token"""
    partner = await get_current_partner(token)
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "id": partner["id"],
        "company_name": partner["company_name"],
        "email": partner["email"],
        "contact_name": partner["contact_name"],
        "phone": partner.get("phone")
    }

# ==================== ADMIN USER AUTHENTICATION ====================

@api_router.get("/admin/auth/verify")
async def verify_admin_key(admin_key: str):
    """Verify if admin key is valid - for debugging"""
    expected_key = os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    is_valid = admin_key == expected_key

    # Log for debugging
    logger.info(f"Admin key verification: provided_len={len(admin_key)}, expected_len={len(expected_key)}, valid={is_valid}")

    if is_valid:
        return {"status": "valid", "message": "Admin key is correct"}
    else:
        # Show hint about what's expected (masked)
        raise HTTPException(status_code=401, detail=f"Invalid admin key. Expected key starts with: {expected_key[:3]}...")

@api_router.post("/admin/auth/register")
async def register_admin_user(user_data: AdminUserCreate, admin_key: str):
    """Register a new admin user and send invitation email to set password"""
    # Verify admin key OR valid admin/PM token
    is_valid = False
    creator_role = 'admin'

    # Check if it's the master admin key
    if admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        is_valid = True
        creator_role = 'admin'
    else:
        # Check if it's a valid token (in-memory or database)
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
            creator_role = user.get("role", "admin")

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Validate role
    valid_roles = ['admin', 'pm', 'translator', 'sales']
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be: {', '.join(valid_roles)}")

    # PM can only create translators
    if creator_role == 'pm' and user_data.role != 'translator':
        raise HTTPException(status_code=403, detail="Project Managers can only register translators")

    try:
        # Check if email already exists
        existing = await db.admin_users.find_one({"email": user_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user without password (pending invitation)
        user = AdminUser(
            email=user_data.email,
            password_hash="",  # No password yet - user will set via invitation
            name=user_data.name,
            role=user_data.role,
            is_active=False  # Inactive until password is set
        )

        # Build user dict with additional translator fields
        user_dict = user.dict()
        user_dict['invitation_pending'] = True  # Flag for pending invitation
        if user_data.role == 'translator':
            user_dict['rate_per_page'] = user_data.rate_per_page
            user_dict['rate_per_word'] = user_data.rate_per_word
            user_dict['language_pairs'] = user_data.language_pairs
            user_dict['translator_type'] = user_data.translator_type or 'contractor'  # 'in_house' or 'contractor'

        await db.admin_users.insert_one(user_dict)
        logger.info(f"Admin user created: {user.email} with role {user.role} by {creator_role}")

        # Generate invitation token
        invite_token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(days=7)  # 7 days to accept invitation

        admin_invitation_tokens[invite_token] = {
            "email": user_data.email,
            "user_id": user.id,
            "expires": expires
        }

        # Send invitation email
        frontend_url = os.environ.get('FRONTEND_URL', 'https://legacy-portal-frontend.onrender.com')
        invite_link = f"{frontend_url}?invite_token={invite_token}#/admin"

        role_display = {
            'admin': 'Administrator',
            'pm': 'Project Manager',
            'translator': 'Translator',
            'sales': 'Sales'
        }.get(user_data.role, user_data.role)

        subject = f"Welcome to Legacy Translations - Set Up Your {role_display} Account"
        content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px; margin-bottom: 20px;">
            <h2 style="color: #0d9488;">Welcome to Legacy Translations!</h2>
            <p>Hello {user_data.name},</p>
            <p>You have been invited to join Legacy Translations as a <strong>{role_display}</strong>.</p>
            <p>Click the button below to set up your password and access your account:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" style="background: linear-gradient(to right, #0d9488, #0891b2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Set Up My Account</a>
            </p>
            <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Legacy Translations - Professional Translation Services</p>
        </div>
        """

        email_sent = False
        try:
            await email_service.send_email(user_data.email, subject, content)
            logger.info(f"Invitation email sent to {user_data.email}")
            email_sent = True
        except Exception as e:
            logger.error(f"Failed to send invitation email: {str(e)}")

        # Always return the invitation link so admin can copy and send manually if email fails
        return {
            "status": "success",
            "message": f"User {user.name} created." + (" Invitation email sent." if email_sent else " Email failed - use link below."),
            "user_id": user.id,
            "invitation_link": invite_link,  # Always include link for manual sharing
            "email_sent": email_sent
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@api_router.post("/admin/auth/login")
async def login_admin_user(login_data: AdminUserLogin, request: Request):
    """Login admin user and return token with role"""
    try:
        # Get client IP address
        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.client.host
        user_agent = request.headers.get("User-Agent", "Unknown")

        # Find user by email
        user = await db.admin_users.find_one({"email": login_data.email})
        if not user:
            # Log failed attempt
            await db.login_attempts.insert_one({
                "email": login_data.email,
                "ip_address": client_ip,
                "user_agent": user_agent,
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": "invalid_email"
            })
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            # Log failed attempt
            await db.login_attempts.insert_one({
                "email": login_data.email,
                "user_id": user["id"],
                "ip_address": client_ip,
                "user_agent": user_agent,
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": "invalid_password"
            })
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Check if invitation is pending
        if user.get("invitation_pending", False):
            raise HTTPException(status_code=401, detail="Please complete your registration using the invitation link sent to your email")

        # Check if active
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")

        # Log successful login with IP tracking
        login_record = {
            "ip_address": client_ip,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow()
        }

        # Track IP history for the user (for detecting link sharing)
        await db.admin_users.update_one(
            {"id": user["id"]},
            {
                "$push": {"ip_history": {"$each": [login_record], "$slice": -50}},
                "$set": {"last_login_ip": client_ip, "last_login_at": datetime.utcnow()}
            }
        )

        # Also log to login_attempts for admin monitoring
        await db.login_attempts.insert_one({
            "email": login_data.email,
            "user_id": user["id"],
            "user_name": user.get("name", ""),
            "role": user.get("role", ""),
            "ip_address": client_ip,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow(),
            "success": True
        })

        # Generate token
        token = generate_token()
        active_admin_tokens[token] = {"user_id": user["id"], "role": user["role"]}

        # Also save token to database for persistence across server restarts
        await db.admin_users.update_one(
            {"id": user["id"]},
            {"$set": {"token": token, "token_created": datetime.utcnow()}}
        )

        return AdminUserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            is_active=user.get("is_active", True),
            token=token,
            pages_translated=user.get("pages_translated", 0),
            pages_pending_payment=user.get("pages_pending_payment", 0),
            translator_type=user.get("translator_type", "contractor")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in admin user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to login")

@api_router.post("/admin/auth/logout")
async def logout_admin_user(token: str):
    """Logout admin user"""
    if token in active_admin_tokens:
        del active_admin_tokens[token]
    return {"status": "success", "message": "Logged out successfully"}

@api_router.post("/admin/auth/forgot-password")
async def admin_forgot_password(request: AdminForgotPassword):
    """Send password reset email for admin users"""
    try:
        # Find admin user by email
        user = await db.admin_users.find_one({"email": request.email})

        # Always return success for security (don't reveal if email exists)
        if user:
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expires = datetime.utcnow() + timedelta(hours=1)

            # Store token
            admin_reset_tokens[reset_token] = {
                "email": request.email,
                "user_id": user["id"],
                "expires": expires
            }

            # Get frontend URL
            frontend_url = os.environ.get('FRONTEND_URL', 'https://legacy-portal-frontend.onrender.com')
            reset_link = f"{frontend_url}?reset_token={reset_token}#/admin"

            # Send email
            subject = "Reset Your Password - Legacy Translations Admin"
            content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px; margin-bottom: 20px;">
                <h2 style="color: #0d9488;">Password Reset Request</h2>
                <p>Hello {user.get('name', 'User')},</p>
                <p>We received a request to reset your password for your Legacy Translations Admin account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: linear-gradient(to right, #0d9488, #0891b2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                </p>
                <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">Legacy Translations - Professional Translation Services</p>
            </div>
            """

            try:
                await email_service.send_email(request.email, subject, content)
                logger.info(f"Admin password reset email sent to {request.email}")
            except Exception as e:
                logger.error(f"Failed to send admin password reset email: {str(e)}")

        return {"status": "success", "message": "If an account exists with this email, a reset link has been sent"}

    except Exception as e:
        logger.error(f"Error in admin forgot password: {str(e)}")
        return {"status": "success", "message": "If an account exists with this email, a reset link has been sent"}

@api_router.post("/admin/auth/reset-password")
async def admin_reset_password(request: AdminResetPassword):
    """Reset password using token for admin users"""
    try:
        # Check if token exists and is valid
        token_data = admin_reset_tokens.get(request.token)

        if not token_data:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link")

        if datetime.utcnow() > token_data["expires"]:
            del admin_reset_tokens[request.token]
            raise HTTPException(status_code=400, detail="Reset link has expired")

        # Update password
        email = token_data["email"]
        new_hash = hash_password(request.new_password)

        result = await db.admin_users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash, "is_active": True}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update password")

        # Remove used token
        del admin_reset_tokens[request.token]

        logger.info(f"Admin password reset successful for {email}")
        return {"status": "success", "message": "Password has been reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting admin password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")

@api_router.post("/admin/auth/accept-invitation")
async def accept_admin_invitation(request: AdminInvitationAccept):
    """Accept invitation and set password for new admin user"""
    try:
        # Check if token exists and is valid
        token_data = admin_invitation_tokens.get(request.token)

        if not token_data:
            raise HTTPException(status_code=400, detail="Invalid or expired invitation link")

        if datetime.utcnow() > token_data["expires"]:
            del admin_invitation_tokens[request.token]
            raise HTTPException(status_code=400, detail="Invitation link has expired")

        # Get user to check role
        email = token_data["email"]
        existing_user = await db.admin_users.find_one({"email": email})

        if not existing_user:
            raise HTTPException(status_code=400, detail="User not found")

        # Check if translator needs to accept terms and ethics
        if existing_user.get("role") == "translator":
            if not request.accepted_terms:
                raise HTTPException(status_code=400, detail="You must accept the terms and conditions")
            if not request.accepted_ethics:
                raise HTTPException(status_code=400, detail="You must accept the translator ethics guidelines")

        # Update user password and activate account
        new_hash = hash_password(request.password)

        update_data = {
            "password_hash": new_hash,
            "is_active": True,
            "invitation_pending": False,
            "onboarding_completed": True,
            "onboarding_date": datetime.utcnow()
        }

        # Add translator-specific fields
        if existing_user.get("role") == "translator":
            if request.language_pairs:
                update_data["language_pairs"] = request.language_pairs
            if request.rate_per_page:
                update_data["rate_per_page"] = request.rate_per_page
            if request.rate_per_word:
                update_data["rate_per_word"] = request.rate_per_word
            update_data["accepted_terms"] = request.accepted_terms
            update_data["accepted_ethics"] = request.accepted_ethics
            update_data["terms_accepted_date"] = datetime.utcnow()

            # Payment information
            if request.payment_method:
                update_data["payment_method"] = request.payment_method
            if request.bank_name:
                update_data["bank_name"] = request.bank_name
            if request.account_holder:
                update_data["account_holder"] = request.account_holder
            if request.account_number:
                update_data["account_number"] = request.account_number
            if request.routing_number:
                update_data["routing_number"] = request.routing_number
            if request.paypal_email:
                update_data["paypal_email"] = request.paypal_email
            if request.zelle_email:
                update_data["zelle_email"] = request.zelle_email

        result = await db.admin_users.update_one(
            {"email": email},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to set up account")

        # Remove used token
        del admin_invitation_tokens[request.token]

        # Get user info for response
        user = await db.admin_users.find_one({"email": email})

        logger.info(f"Invitation accepted for {email}")
        return {
            "status": "success",
            "message": "Account set up successfully. You can now log in.",
            "user": {
                "name": user.get("name"),
                "email": user.get("email"),
                "role": user.get("role")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting invitation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to set up account")

@api_router.get("/admin/auth/verify-invitation")
async def verify_invitation_token(token: str):
    """Verify if an invitation token is valid"""
    token_data = admin_invitation_tokens.get(token)

    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid invitation link")

    if datetime.utcnow() > token_data["expires"]:
        del admin_invitation_tokens[token]
        raise HTTPException(status_code=400, detail="Invitation link has expired")

    # Get user info
    user = await db.admin_users.find_one({"email": token_data["email"]})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    return {
        "valid": True,
        "user": {
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role")
        }
    }

class ResendInvitationRequest(BaseModel):
    user_id: str

@api_router.post("/admin/auth/resend-invitation")
async def resend_invitation(request: ResendInvitationRequest, admin_key: str):
    """Resend invitation email to a user with pending invitation"""
    # Verify admin key OR valid admin/PM token
    is_valid = False

    if admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        is_valid = True
    else:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Find the user
        target_user = await db.admin_users.find_one({"id": request.user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if user has pending invitation
        if not target_user.get("invitation_pending", False):
            raise HTTPException(status_code=400, detail="User has already accepted their invitation")

        # Remove any existing invitation tokens for this email
        tokens_to_remove = [k for k, v in admin_invitation_tokens.items() if v.get("email") == target_user["email"]]
        for token in tokens_to_remove:
            del admin_invitation_tokens[token]

        # Generate new invitation token
        invite_token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(days=7)

        admin_invitation_tokens[invite_token] = {
            "email": target_user["email"],
            "user_id": target_user["id"],
            "expires": expires
        }

        # Send invitation email
        frontend_url = os.environ.get('FRONTEND_URL', 'https://legacy-portal-frontend.onrender.com')
        invite_link = f"{frontend_url}?invite_token={invite_token}#/admin"

        role_display = {
            'admin': 'Administrator',
            'pm': 'Project Manager',
            'translator': 'Translator',
            'sales': 'Sales'
        }.get(target_user.get("role", ""), target_user.get("role", ""))

        subject = f"Reminder: Set Up Your Legacy Translations {role_display} Account"
        content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px; margin-bottom: 20px;">
            <h2 style="color: #0d9488;">Welcome to Legacy Translations!</h2>
            <p>Hello {target_user.get("name", "")},</p>
            <p>This is a reminder that you have been invited to join Legacy Translations as a <strong>{role_display}</strong>.</p>
            <p>Click the button below to set up your password and access your account:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{invite_link}" style="background: linear-gradient(to right, #0d9488, #0891b2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Set Up My Account</a>
            </p>
            <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Legacy Translations - Professional Translation Services</p>
        </div>
        """

        email_sent = False
        try:
            await email_service.send_email(target_user["email"], subject, content)
            logger.info(f"Invitation email resent to {target_user['email']}")
            email_sent = True
        except Exception as e:
            logger.error(f"Failed to resend invitation email: {str(e)}")

        # Always return the link for manual sharing
        return {
            "status": "success",
            "message": f"Convite reenviado para {target_user['email']}" if email_sent else "Email falhou - use o link abaixo",
            "invitation_link": invite_link,
            "email_sent": email_sent
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending invitation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resend invitation")

@api_router.get("/admin/auth/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    token_data = admin_reset_tokens.get(token)

    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid reset link")

    if datetime.utcnow() > token_data["expires"]:
        del admin_reset_tokens[token]
        raise HTTPException(status_code=400, detail="Reset link has expired")

    return {"valid": True}

@api_router.get("/admin/auth/me")
async def get_current_admin_user_info(token: str):
    """Get current admin user info from token"""
    user = await get_current_admin_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "is_active": user.get("is_active", True),
        "pages_translated": user.get("pages_translated", 0),
        "pages_pending_payment": user.get("pages_pending_payment", 0)
    }

@api_router.get("/admin/users")
async def list_admin_users(token: str, admin_key: str):
    """List all admin users (admin and PM can access)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        users = await db.admin_users.find().to_list(100)
        return [{
            "id": u["id"],
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "is_active": u.get("is_active", True),
            "invitation_pending": u.get("invitation_pending", False),
            "rate_per_page": u.get("rate_per_page"),
            "rate_per_word": u.get("rate_per_word"),
            "language_pairs": u.get("language_pairs"),
            "pages_translated": u.get("pages_translated", 0),
            "pages_pending_payment": u.get("pages_pending_payment", 0),
            "created_at": u.get("created_at"),
            "translator_type": u.get("translator_type", "contractor")
        } for u in users]
    except Exception as e:
        logger.error(f"Error listing admin users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list users")

@api_router.put("/admin/users/{user_id}/toggle-active")
async def toggle_admin_user_active(user_id: str, admin_key: str):
    """Toggle admin user active status (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        user = await db.admin_users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_status = not user.get("is_active", True)
        await db.admin_users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})

        return {"status": "success", "is_active": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling user status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@api_router.put("/admin/users/{user_id}")
async def update_admin_user(user_id: str, user_data: AdminUserUpdate, admin_key: str):
    """Update admin user profile (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Find user first
        existing_user = await db.admin_users.find_one({"id": user_id})
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Build update dict from provided fields
        update_data = {}
        if user_data.name is not None:
            update_data["name"] = user_data.name
        if user_data.email is not None:
            # Check if email already exists for another user
            email_check = await db.admin_users.find_one({"email": user_data.email, "id": {"$ne": user_id}})
            if email_check:
                raise HTTPException(status_code=400, detail="Email already in use")
            update_data["email"] = user_data.email
        if user_data.role is not None:
            update_data["role"] = user_data.role
        if user_data.rate_per_page is not None:
            update_data["rate_per_page"] = user_data.rate_per_page
        if user_data.rate_per_word is not None:
            update_data["rate_per_word"] = user_data.rate_per_word
        if user_data.language_pairs is not None:
            update_data["language_pairs"] = user_data.language_pairs
        if user_data.is_active is not None:
            update_data["is_active"] = user_data.is_active
        if user_data.translator_type is not None:
            update_data["translator_type"] = user_data.translator_type

        if not update_data:
            return {"status": "success", "message": "No changes to update"}

        update_data["updated_at"] = datetime.now()

        await db.admin_users.update_one({"id": user_id}, {"$set": update_data})

        # Return updated user
        updated_user = await db.admin_users.find_one({"id": user_id})
        return {
            "status": "success",
            "message": "User updated successfully",
            "user": {
                "id": updated_user["id"],
                "name": updated_user["name"],
                "email": updated_user["email"],
                "role": updated_user["role"],
                "is_active": updated_user.get("is_active", True),
                "rate_per_page": updated_user.get("rate_per_page"),
                "rate_per_word": updated_user.get("rate_per_word"),
                "language_pairs": updated_user.get("language_pairs"),
                "translator_type": updated_user.get("translator_type", "contractor")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@api_router.delete("/admin/users/{user_id}")
async def delete_admin_user(user_id: str, admin_key: str):
    """Delete admin user (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        result = await db.admin_users.delete_one({"id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        return {"status": "success", "message": "User deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

class QuickVendorCreate(BaseModel):
    name: str
    email: str
    role: str = "translator"
    rate_per_page: Optional[float] = 0

@api_router.post("/admin/users/create")
async def quick_create_vendor(vendor_data: QuickVendorCreate, admin_key: str):
    """Quick create or update a vendor without email invitation (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Check if email already exists
        existing = await db.admin_users.find_one({"email": vendor_data.email})
        if existing:
            # Update existing vendor instead of error
            update_data = {
                "name": vendor_data.name,
                "role": vendor_data.role.lower(),
                "rate_per_page": vendor_data.rate_per_page or existing.get("rate_per_page", 0),
                "is_active": True,  # Ensure vendor is active
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.admin_users.update_one(
                {"email": vendor_data.email},
                {"$set": update_data}
            )
            logger.info(f"Vendor updated: {vendor_data.email} as {vendor_data.role}")
            return {"success": True, "id": existing["id"], "message": "Vendor updated successfully"}

        # Create vendor directly as active
        vendor = {
            "id": str(uuid.uuid4()),
            "email": vendor_data.email,
            "name": vendor_data.name,
            "role": vendor_data.role.lower(),
            "is_active": True,
            "password_hash": "",  # No password - vendor only
            "rate_per_page": vendor_data.rate_per_page or 0,
            "pages_pending_payment": 0,
            "created_at": datetime.utcnow().isoformat()
        }

        await db.admin_users.insert_one(vendor)
        logger.info(f"Quick vendor created: {vendor_data.email} as {vendor_data.role}")

        return {"success": True, "id": vendor["id"], "message": "Vendor created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating vendor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create vendor")

# ==================== SHARED ASSETS (Logos, Stamp, Signature - Global for all users) ====================

class SharedAssets(BaseModel):
    logo_left: Optional[str] = None
    logo_right: Optional[str] = None
    logo_stamp: Optional[str] = None
    signature_image: Optional[str] = None

@api_router.put("/admin/shared-assets")
async def save_shared_assets(assets: SharedAssets, admin_key: str):
    """Save shared assets (logos, stamp, signature) - Admin only"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin can save shared assets
    if user_info.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can save shared assets")

    try:
        update_data = {"id": "shared_assets"}
        if assets.logo_left is not None:
            update_data["logo_left"] = assets.logo_left
        if assets.logo_right is not None:
            update_data["logo_right"] = assets.logo_right
        if assets.logo_stamp is not None:
            update_data["logo_stamp"] = assets.logo_stamp
        if assets.signature_image is not None:
            update_data["signature_image"] = assets.signature_image

        # Upsert the shared assets document
        await db.settings.update_one(
            {"id": "shared_assets"},
            {"$set": update_data},
            upsert=True
        )

        return {"status": "success", "message": "Shared assets saved successfully"}
    except Exception as e:
        logger.error(f"Error saving shared assets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save assets")

@api_router.get("/admin/shared-assets")
async def get_shared_assets(admin_key: str):
    """Get shared assets (logos, stamp, signature) - All authenticated users"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        assets = await db.settings.find_one({"id": "shared_assets"})
        if not assets:
            return {
                "logo_left": "",
                "logo_right": "",
                "logo_stamp": "",
                "signature_image": ""
            }

        return {
            "logo_left": assets.get("logo_left", ""),
            "logo_right": assets.get("logo_right", ""),
            "logo_stamp": assets.get("logo_stamp", ""),
            "signature_image": assets.get("signature_image", "")
        }
    except Exception as e:
        logger.error(f"Error getting shared assets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get assets")

# ==================== USER DOCUMENTS MANAGEMENT ====================

@api_router.get("/admin/users/{user_id}/documents")
async def get_user_documents(user_id: str, admin_key: str):
    """Get all documents for a user"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        documents = await db.user_documents.find({"user_id": user_id}).to_list(100)
        return {
            "documents": [{
                "id": doc["id"],
                "filename": doc["filename"],
                "document_type": doc["document_type"],
                "content_type": doc.get("content_type", "application/octet-stream"),
                "file_size": doc.get("file_size", 0),
                "uploaded_at": doc.get("uploaded_at"),
                "uploaded_by": doc.get("uploaded_by")
            } for doc in documents]
        }
    except Exception as e:
        logger.error(f"Error fetching user documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch documents")

@api_router.post("/admin/users/{user_id}/documents")
async def upload_user_document(user_id: str, admin_key: str, file: UploadFile = File(...), document_type: str = Form(...)):
    """Upload a document for a user"""
    # Validate admin access
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Check user exists
        target_user = await db.admin_users.find_one({"id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size (max 10MB)
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        # Create document record
        doc_id = str(uuid.uuid4())
        document = {
            "id": doc_id,
            "user_id": user_id,
            "filename": file.filename,
            "document_type": document_type,
            "content_type": file.content_type,
            "file_data": base64.b64encode(file_content).decode('utf-8'),
            "file_size": file_size,
            "uploaded_at": datetime.utcnow().isoformat(),
            "uploaded_by": admin_key[:10] + "..."
        }

        await db.user_documents.insert_one(document)

        return {
            "status": "success",
            "document_id": doc_id,
            "filename": file.filename,
            "message": "Document uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading user document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload document")

@api_router.get("/admin/users/{user_id}/documents/{doc_id}/download")
async def download_user_document(user_id: str, doc_id: str, admin_key: str):
    """Download a user document"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        document = await db.user_documents.find_one({"id": doc_id, "user_id": user_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "filename": document["filename"],
            "content_type": document.get("content_type", "application/octet-stream"),
            "file_data": document.get("file_data", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading user document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download document")

@api_router.delete("/admin/users/{user_id}/documents/{doc_id}")
async def delete_user_document(user_id: str, doc_id: str, admin_key: str):
    """Delete a user document (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        result = await db.user_documents.delete_one({"id": doc_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")

        return {"status": "success", "message": "Document deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete document")

# ==================== IP TRACKING & SECURITY ====================

@api_router.get("/admin/users/{user_id}/ip-history")
async def get_user_ip_history(user_id: str, admin_key: str):
    """Get IP history for a specific user (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        user = await db.admin_users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        ip_history = user.get("ip_history", [])
        unique_ips = set()
        for record in ip_history:
            if record.get("ip_address"):
                unique_ips.add(record["ip_address"])

        return {
            "user_id": user_id,
            "user_name": user.get("name", ""),
            "user_email": user.get("email", ""),
            "last_login_ip": user.get("last_login_ip", ""),
            "last_login_at": user.get("last_login_at", ""),
            "unique_ip_count": len(unique_ips),
            "unique_ips": list(unique_ips),
            "ip_history": ip_history,
            "suspicious": len(unique_ips) > 3
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting IP history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get IP history")

@api_router.get("/admin/login-attempts")
async def get_login_attempts(admin_key: str, limit: int = 100, user_id: str = None):
    """Get login attempts log (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        query = {}
        if user_id:
            query["user_id"] = user_id

        attempts = await db.login_attempts.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
        for attempt in attempts:
            if "_id" in attempt:
                attempt["_id"] = str(attempt["_id"])
            if "timestamp" in attempt and attempt["timestamp"]:
                attempt["timestamp"] = attempt["timestamp"].isoformat()

        return {"attempts": attempts, "total": len(attempts)}
    except Exception as e:
        logger.error(f"Error getting login attempts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get login attempts")

@api_router.get("/admin/security/suspicious-users")
async def get_suspicious_users(admin_key: str):
    """Get list of users with suspicious IP activity (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        users = await db.admin_users.find({"role": "translator"}).to_list(100)
        suspicious = []
        for user in users:
            ip_history = user.get("ip_history", [])
            unique_ips = set()
            for record in ip_history:
                if record.get("ip_address"):
                    unique_ips.add(record["ip_address"])
            if len(unique_ips) > 3:
                suspicious.append({
                    "user_id": user["id"],
                    "name": user.get("name", ""),
                    "email": user.get("email", ""),
                    "role": user.get("role", ""),
                    "unique_ip_count": len(unique_ips),
                    "unique_ips": list(unique_ips),
                    "last_login_ip": user.get("last_login_ip", ""),
                    "last_login_at": user.get("last_login_at", "").isoformat() if user.get("last_login_at") else ""
                })
        return {"suspicious_users": suspicious, "total": len(suspicious)}
    except Exception as e:
        logger.error(f"Error getting suspicious users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get suspicious users")

# ==================== TRANSLATOR SUBMISSIONS ====================

@api_router.post("/admin/translations/submit")
async def submit_translation(
    request: Request,
    token: str = Form(...),
    order_id: str = Form(...),
    translation_html: str = Form(None),
    notes: str = Form(None),
    translation_file: UploadFile = File(None),
    original_file: UploadFile = File(None)
):
    """Submit completed translation for PM/Admin review"""
    user = await get_current_admin_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.client.host
        submission_id = str(uuid.uuid4())
        submission = {
            "id": submission_id,
            "order_id": order_id,
            "translator_id": user["id"],
            "translator_name": user.get("name", ""),
            "translator_email": user.get("email", ""),
            "submitted_at": datetime.utcnow(),
            "status": "pending_review",
            "translation_html": translation_html,
            "notes": notes,
            "ip_address": client_ip
        }
        if translation_file:
            file_content = await translation_file.read()
            submission["translation_file"] = {
                "filename": translation_file.filename,
                "content_type": translation_file.content_type,
                "data": base64.b64encode(file_content).decode('utf-8'),
                "size": len(file_content)
            }
        if original_file:
            file_content = await original_file.read()
            submission["original_file"] = {
                "filename": original_file.filename,
                "content_type": original_file.content_type,
                "data": base64.b64encode(file_content).decode('utf-8'),
                "size": len(file_content)
            }
        await db.translation_submissions.insert_one(submission)
        await db.translation_orders.update_one(
            {"id": order_id},
            {"$set": {"translation_status": "ready_for_review", "submission_id": submission_id, "submitted_at": datetime.utcnow(), "submitted_by": user["id"]}}
        )
        logger.info(f"Translation submitted: {submission_id} by {user.get('name', user['id'])}")
        return {"status": "success", "submission_id": submission_id, "message": "Translation submitted for review"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting translation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit translation")

@api_router.get("/admin/translations/pending-review")
async def get_pending_translations(admin_key: str):
    """Get translations pending PM/Admin review"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        submissions = await db.translation_submissions.find({"status": "pending_review"}).sort("submitted_at", -1).to_list(100)
        result = []
        for sub in submissions:
            order = await db.translation_orders.find_one({"id": sub["order_id"]})
            result.append({
                "submission_id": sub["id"],
                "order_id": sub["order_id"],
                "order_number": order.get("order_number", "") if order else "",
                "client_name": order.get("client_name", "") if order else "",
                "translator_name": sub.get("translator_name", ""),
                "translator_email": sub.get("translator_email", ""),
                "submitted_at": sub["submitted_at"].isoformat() if sub.get("submitted_at") else "",
                "has_translation_file": "translation_file" in sub,
                "has_original_file": "original_file" in sub,
                "notes": sub.get("notes", ""),
                "ip_address": sub.get("ip_address", "")
            })
        return {"submissions": result, "total": len(result)}
    except Exception as e:
        logger.error(f"Error getting pending translations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get pending translations")

@api_router.get("/admin/translations/submission/{submission_id}")
async def get_submission_details(submission_id: str, admin_key: str):
    """Get full details of a translation submission"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        submission = await db.translation_submissions.find_one({"id": submission_id})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        order = await db.translation_orders.find_one({"id": submission["order_id"]})
        if "_id" in submission:
            submission["_id"] = str(submission["_id"])
        if submission.get("submitted_at"):
            submission["submitted_at"] = submission["submitted_at"].isoformat()
        submission["order_info"] = {
            "order_number": order.get("order_number", "") if order else "",
            "client_name": order.get("client_name", "") if order else "",
            "client_email": order.get("client_email", "") if order else "",
            "translate_from": order.get("translate_from", "") if order else "",
            "translate_to": order.get("translate_to", "") if order else ""
        }
        return submission
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting submission: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get submission")

@api_router.post("/admin/translations/submission/{submission_id}/approve")
async def approve_submission(submission_id: str, admin_key: str):
    """Approve a translation submission"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        submission = await db.translation_submissions.find_one({"id": submission_id})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        await db.translation_submissions.update_one({"id": submission_id}, {"$set": {"status": "approved", "approved_at": datetime.utcnow()}})
        await db.translation_orders.update_one({"id": submission["order_id"]}, {"$set": {"translation_status": "approved", "approved_at": datetime.utcnow()}})
        return {"status": "success", "message": "Submission approved"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving submission: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to approve submission")

@api_router.post("/admin/translations/submission/{submission_id}/request-revision")
async def request_revision(submission_id: str, admin_key: str, reason: str = ""):
    """Request revision for a translation submission"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        submission = await db.translation_submissions.find_one({"id": submission_id})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        await db.translation_submissions.update_one({"id": submission_id}, {"$set": {"status": "revision_requested", "revision_requested_at": datetime.utcnow(), "revision_reason": reason}})
        await db.translation_orders.update_one({"id": submission["order_id"]}, {"$set": {"translation_status": "revision_requested"}})
        return {"status": "success", "message": "Revision requested"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting revision: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to request revision")

# ==================== TRANSLATOR PAYMENTS ====================

@api_router.get("/admin/payments/translators")
async def get_translators_payment_summary(admin_key: str):
    """Get payment summary for all translators (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") == "admin":
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Get ALL users - show everyone regardless of is_active status
        # This ensures vendors registered via Translators tab appear in Pay Vendors
        all_users = await db.admin_users.find({}).to_list(200)

        logger.info(f"Found {len(all_users)} total users/vendors")

        result = []
        for translator in all_users:
            payments = await db.translator_payments.find({"translator_id": translator["id"]}).sort("payment_date", -1).to_list(100)
            total_paid = sum(p.get("amount", 0) for p in payments)
            rate_per_page = translator.get("rate_per_page", 0) or 0
            pages_pending = translator.get("pages_pending_payment", 0) or 0
            pending_amount = rate_per_page * pages_pending
            result.append({
                "translator_id": translator["id"],
                "name": translator.get("name", ""),
                "email": translator.get("email", ""),
                "role": translator.get("role", "translator"),
                "rate_per_page": rate_per_page,
                "rate_per_word": translator.get("rate_per_word", 0) or 0,
                "pages_translated": translator.get("pages_translated", 0) or 0,
                "pages_pending_payment": pages_pending,
                "pending_amount": round(pending_amount, 2),
                "total_paid": round(total_paid, 2),
                "payment_method": translator.get("payment_method", ""),
                "bank_name": translator.get("bank_name", ""),
                "paypal_email": translator.get("paypal_email", ""),
                "zelle_email": translator.get("zelle_email", ""),
                "last_payment": payments[0] if payments else None,
                "is_active": translator.get("is_active", True)
            })
        return {"translators": result, "total": len(result)}
    except Exception as e:
        logger.error(f"Error getting translator payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment data")

@api_router.get("/admin/payments/translator/{translator_id}")
async def get_translator_payment_history(translator_id: str, admin_key: str):
    """Get payment history for a specific translator (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") == "admin":
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Include all vendor roles: translator, admin, pm, sales
        translator = await db.admin_users.find_one({"id": translator_id, "role": {"$in": ["translator", "admin", "pm", "sales"]}})
        if not translator:
            raise HTTPException(status_code=404, detail="Vendor not found")
        payments = await db.translator_payments.find({"translator_id": translator_id}).sort("payment_date", -1).to_list(100)
        for payment in payments:
            if "_id" in payment:
                payment["_id"] = str(payment["_id"])
            if payment.get("payment_date"):
                payment["payment_date"] = payment["payment_date"].isoformat()
            if payment.get("created_at"):
                payment["created_at"] = payment["created_at"].isoformat()
            if payment.get("paid_at"):
                payment["paid_at"] = payment["paid_at"].isoformat()
        return {
            "translator": {
                "id": translator["id"],
                "name": translator.get("name", ""),
                "email": translator.get("email", ""),
                "role": translator.get("role", "translator"),
                "rate_per_page": translator.get("rate_per_page", 0),
                "pages_translated": translator.get("pages_translated", 0),
                "pages_pending_payment": translator.get("pages_pending_payment", 0),
                "payment_method": translator.get("payment_method", ""),
                "bank_name": translator.get("bank_name", ""),
                "account_holder": translator.get("account_holder", ""),
                "account_number": translator.get("account_number", ""),
                "routing_number": translator.get("routing_number", ""),
                "paypal_email": translator.get("paypal_email", ""),
                "zelle_email": translator.get("zelle_email", "")
            },
            "payments": payments,
            "total_paid": sum(p.get("amount", 0) for p in payments)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting translator payment history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment history")

@api_router.post("/admin/payments/register")
async def register_payment(
    admin_key: str,
    translator_id: str = Form(...),
    amount: float = Form(...),
    pages_paid: int = Form(0),
    payment_method: str = Form(""),
    reference: str = Form(""),
    notes: str = Form(""),
    note: str = Form(""),  # Alternative field name
    payment_type: str = Form("translation"),  # translation, sales_commission, bonus, reimbursement, other
    commission_rate: float = Form(None),
    receipt_file: UploadFile = File(None)
):
    """Register a payment made to a vendor/contractor (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") == "admin":
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Find user (translator, sales, or any role)
        translator = await db.admin_users.find_one({"id": translator_id})
        if not translator:
            # Try by _id
            translator = await db.admin_users.find_one({"_id": translator_id})
        if not translator:
            raise HTTPException(status_code=404, detail="Vendor not found")

        payment_id = str(uuid.uuid4())
        payment = {
            "id": payment_id,
            "translator_id": translator_id,
            "translator_name": translator.get("name", ""),
            "amount": amount,
            "pages_paid": pages_paid,
            "payment_method": payment_method or translator.get("payment_method", ""),
            "payment_type": payment_type,
            "commission_rate": commission_rate,
            "reference": reference,
            "notes": notes or note,  # Support both field names
            "paid_at": datetime.utcnow(),
            "payment_date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "status": "completed"
        }

        # Handle receipt file upload
        if receipt_file and receipt_file.filename:
            allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf']
            if receipt_file.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="Invalid file type. Only images and PDFs are allowed.")
            file_content = await receipt_file.read()
            if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
                raise HTTPException(status_code=400, detail="File size must be less than 10MB")
            payment["receipt_filename"] = receipt_file.filename
            payment["receipt_file_data"] = base64.b64encode(file_content).decode('utf-8')
            payment["receipt_file_type"] = receipt_file.content_type

        await db.translator_payments.insert_one(payment)

        # Only update pending pages for translation payments
        new_pending = None
        if payment_type == "translation" and pages_paid > 0:
            current_pending = translator.get("pages_pending_payment", 0) or 0
            new_pending = max(0, current_pending - pages_paid)
            await db.admin_users.update_one({"id": translator_id}, {"$set": {"pages_pending_payment": new_pending}})

        logger.info(f"Payment registered: ${amount} ({payment_type}) to {translator.get('name')} via {payment_method}")
        return {
            "status": "success",
            "payment_id": payment_id,
            "message": f"Payment of ${amount:.2f} registered successfully",
            "new_pending_pages": new_pending
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register payment")

@api_router.post("/admin/payments/add-pages")
async def add_translator_pages(admin_key: str, translator_id: str = Body(...), pages: int = Body(...), order_id: str = Body(""), notes: str = Body("")):
    """Add pages to a translator's pending payment count (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") == "admin":
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Include all vendor roles: translator, admin, pm, sales
        translator = await db.admin_users.find_one({"id": translator_id, "role": {"$in": ["translator", "admin", "pm", "sales"]}})
        if not translator:
            raise HTTPException(status_code=404, detail="Vendor not found")
        current_translated = translator.get("pages_translated", 0) or 0
        current_pending = translator.get("pages_pending_payment", 0) or 0
        await db.admin_users.update_one({"id": translator_id}, {"$set": {"pages_translated": current_translated + pages, "pages_pending_payment": current_pending + pages}})
        await db.translator_page_log.insert_one({"translator_id": translator_id, "pages": pages, "order_id": order_id, "notes": notes, "created_at": datetime.utcnow()})
        return {"status": "success", "message": f"Added {pages} pages to {translator.get('name')}", "new_total_translated": current_translated + pages, "new_pending_payment": current_pending + pages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding pages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add pages")

@api_router.get("/admin/payments/report")
async def get_payment_report(admin_key: str, start_date: str = None, end_date: str = None):
    """Get payment report with totals (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") == "admin":
            is_valid = True
    if not is_valid:
        raise HTTPException(status_code=401, detail="Admin access required")

    try:
        query = {}
        if start_date:
            query["payment_date"] = {"$gte": datetime.fromisoformat(start_date)}
        if end_date:
            if "payment_date" in query:
                query["payment_date"]["$lte"] = datetime.fromisoformat(end_date)
            else:
                query["payment_date"] = {"$lte": datetime.fromisoformat(end_date)}
        payments = await db.translator_payments.find(query).sort("payment_date", -1).to_list(500)
        total_paid = sum(p.get("amount", 0) for p in payments)
        total_pages = sum(p.get("pages_paid", 0) for p in payments)
        by_translator = {}
        for p in payments:
            tid = p.get("translator_id", "unknown")
            if tid not in by_translator:
                by_translator[tid] = {"name": p.get("translator_name", "Unknown"), "total_paid": 0, "total_pages": 0, "payment_count": 0}
            by_translator[tid]["total_paid"] += p.get("amount", 0)
            by_translator[tid]["total_pages"] += p.get("pages_paid", 0)
            by_translator[tid]["payment_count"] += 1
        # Include all vendor roles: translator, admin, pm, sales
        translators = await db.admin_users.find({"role": {"$in": ["translator", "admin", "pm", "sales"]}}).to_list(100)
        total_pending = 0
        for t in translators:
            rate = t.get("rate_per_page", 0) or 0
            pending_pages = t.get("pages_pending_payment", 0) or 0
            total_pending += rate * pending_pages
        return {"total_paid": round(total_paid, 2), "total_pages_paid": total_pages, "total_pending": round(total_pending, 2), "payment_count": len(payments), "by_translator": by_translator}
    except Exception as e:
        logger.error(f"Error getting payment report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get report")

# ==================== TRANSLATOR PAGES TRACKING ====================

class PagesLogCreate(BaseModel):
    translator_id: str
    pages: int
    date: str
    note: Optional[str] = ""

@api_router.get("/admin/translator-pages")
async def get_translator_pages(admin_key: str, period: str = "month"):
    """Get translator pages logs"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    try:
        # Calculate date range based on period
        now = datetime.utcnow()
        if period == "day":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == "year":
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start_date = now - timedelta(days=365)

        # Get all pages logs within the date range
        logs = await db.translator_pages.find({
            "date": {"$gte": start_date.isoformat()}
        }).sort("date", -1).to_list(1000)

        # Convert ObjectId to string
        for log in logs:
            log["_id"] = str(log["_id"])

        return {"logs": logs}
    except Exception as e:
        logger.error(f"Error getting pages logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get pages logs")

@api_router.post("/admin/translator-pages")
async def add_translator_pages(pages_data: PagesLogCreate, admin_key: str):
    """Add translator pages log"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    try:
        # Get translator name
        from bson import ObjectId
        translator = await db.admin_users.find_one({"_id": pages_data.translator_id})
        if not translator:
            # Try with ObjectId
            try:
                translator = await db.admin_users.find_one({"_id": ObjectId(pages_data.translator_id)})
            except Exception as e:
                logger.warning(f"Could not find translator by ObjectId: {str(e)}")

        translator_name = translator.get("name", "Unknown") if translator else "Unknown"

        # Create log entry
        log_entry = {
            "translator_id": pages_data.translator_id,
            "translator_name": translator_name,
            "pages": pages_data.pages,
            "date": pages_data.date,
            "note": pages_data.note or "",
            "created_at": datetime.utcnow().isoformat()
        }

        result = await db.translator_pages.insert_one(log_entry)

        # Update translator's pending pages
        if translator:
            current_pending = translator.get("pages_pending_payment", 0) or 0
            await db.admin_users.update_one(
                {"_id": translator["_id"]},
                {"$set": {"pages_pending_payment": current_pending + pages_data.pages}}
            )

        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Error adding pages log: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add pages log")

@api_router.delete("/admin/translator-pages/{log_id}")
async def delete_translator_pages(log_id: str, admin_key: str):
    """Delete a translator pages log entry"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    try:
        from bson import ObjectId

        # Get the log entry first to update translator's pending pages
        log = await db.translator_pages.find_one({"_id": ObjectId(log_id)})
        if not log:
            raise HTTPException(status_code=404, detail="Log entry not found")

        # Delete the log entry
        await db.translator_pages.delete_one({"_id": ObjectId(log_id)})

        # Update translator's pending pages (decrease)
        translator_id = log.get("translator_id")
        if translator_id:
            translator = await db.admin_users.find_one({"_id": translator_id})
            if not translator:
                try:
                    translator = await db.admin_users.find_one({"_id": ObjectId(translator_id)})
                except Exception as e:
                    logger.warning(f"Could not find translator by ObjectId for delete: {str(e)}")

            if translator:
                current_pending = translator.get("pages_pending_payment", 0) or 0
                new_pending = max(0, current_pending - (log.get("pages", 0) or 0))
                await db.admin_users.update_one(
                    {"_id": translator["_id"]},
                    {"$set": {"pages_pending_payment": new_pending}}
                )

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pages log: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete pages log")

class PagesLogUpdate(BaseModel):
    pages: Optional[int] = None
    date: Optional[str] = None
    note: Optional[str] = None

@api_router.put("/admin/translator-pages/{log_id}")
async def update_translator_pages(log_id: str, update_data: PagesLogUpdate, admin_key: str):
    """Update a translator pages log entry"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    try:
        from bson import ObjectId

        # Get the existing log entry
        log = await db.translator_pages.find_one({"_id": ObjectId(log_id)})
        if not log:
            raise HTTPException(status_code=404, detail="Log entry not found")

        old_pages = log.get("pages", 0) or 0

        # Build update dict
        update_dict = {"updated_at": datetime.utcnow().isoformat()}
        if update_data.pages is not None:
            update_dict["pages"] = update_data.pages
        if update_data.date is not None:
            update_dict["date"] = update_data.date
        if update_data.note is not None:
            update_dict["note"] = update_data.note

        # Update the log entry
        await db.translator_pages.update_one({"_id": ObjectId(log_id)}, {"$set": update_dict})

        # If pages changed, update translator's pending pages
        if update_data.pages is not None and update_data.pages != old_pages:
            translator_id = log.get("translator_id")
            if translator_id:
                translator = await db.admin_users.find_one({"id": translator_id})
                if not translator:
                    try:
                        translator = await db.admin_users.find_one({"_id": ObjectId(translator_id)})
                    except Exception as e:
                        logger.warning(f"Could not find translator by ObjectId for update: {str(e)}")

                if translator:
                    current_pending = translator.get("pages_pending_payment", 0) or 0
                    # Adjust: remove old pages, add new pages
                    new_pending = max(0, current_pending - old_pages + update_data.pages)
                    await db.admin_users.update_one(
                        {"_id": translator["_id"]},
                        {"$set": {"pages_pending_payment": new_pending}}
                    )

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pages log: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update pages log")

# ==================== TRANSLATION ORDERS ====================

@api_router.post("/orders/create")
async def create_order(order_data: TranslationOrderCreate, token: str):
    """Create a new translation order"""
    try:
        # Verify partner
        partner = await get_current_partner(token)
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Calculate pricing
        base_price, urgency_fee, total_price = calculate_price(
            order_data.word_count,
            order_data.service_type,
            order_data.urgency
        )

        # Calculate page count
        page_count = max(1, math.ceil(order_data.word_count / 250))

        # Set due date (30 days from now for payment)
        due_date = datetime.utcnow() + timedelta(days=30)

        # Determine payment status based on payment method
        payment_status = "pending"
        if order_data.payment_method == "zelle":
            payment_status = "pending_zelle"

        # Get Zelle receipt URL if available
        zelle_receipt_url = None
        if order_data.zelle_receipt_id:
            backend_url = os.environ.get("BACKEND_URL", "https://legacy-portal-backend.onrender.com")
            zelle_receipt_url = f"{backend_url}/api/download-document/{order_data.zelle_receipt_id}"

        # Create order with automatic client deadline (2 business days for partner portal)
        created_at = datetime.utcnow()
        client_deadline = calculate_client_deadline("partner", created_at)

        order = TranslationOrder(
            partner_id=partner["id"],
            partner_company=partner["company_name"],
            partner_email=partner.get("email"),  # Store partner email for receipts
            partner_name=partner.get("contact_name", partner.get("name")),
            client_name=order_data.client_name,
            client_email=order_data.client_email,
            service_type=order_data.service_type,
            translate_from=order_data.translate_from,
            translate_to=order_data.translate_to,
            word_count=order_data.word_count,
            page_count=page_count,
            urgency=order_data.urgency,
            reference=order_data.reference,
            notes=order_data.notes,
            base_price=base_price,
            urgency_fee=urgency_fee,
            total_price=total_price,
            due_date=due_date,
            deadline=client_deadline,  # 2 business days for partner portal
            revenue_source="partner",
            document_filename=order_data.document_filename,
            payment_method=order_data.payment_method,
            payment_status=payment_status,
            zelle_receipt_id=order_data.zelle_receipt_id,
            zelle_receipt_url=zelle_receipt_url,
            shipping_address=order_data.shipping_address
        )

        await db.translation_orders.insert_one(order.dict())

        # Associate uploaded documents with this order
        if order_data.document_ids:
            await db.documents.update_many(
                {"id": {"$in": order_data.document_ids}},
                {"$set": {"order_id": order.id, "order_number": order.order_number}}
            )

        # Send to Protemos
        try:
            protemos_data = {
                "reference": order.order_number,
                "client_email": order.client_email,
                "translate_from": order.translate_from,
                "translate_to": order.translate_to,
                "word_count": order.word_count,
                "service_type": order.service_type,
                "urgency": order.urgency,
                "total_price": order.total_price,
                "estimated_delivery": get_estimated_delivery(order.urgency)
            }
            protemos_response = await protemos_client.create_project(protemos_data)

            # Update order with Protemos ID
            await db.translation_orders.update_one(
                {"id": order.id},
                {"$set": {"protemos_project_id": protemos_response.get("id")}}
            )
            order.protemos_project_id = protemos_response.get("id")

        except Exception as e:
            logger.error(f"Failed to create Protemos project: {str(e)}")

        # Send email notifications
        try:
            order_details = {
                "reference": order.order_number,
                "service_type": order.service_type,
                "translate_from": order.translate_from,
                "translate_to": order.translate_to,
                "word_count": order.word_count,
                "urgency": order.urgency,
                "estimated_delivery": get_estimated_delivery(order.urgency),
                "base_price": order.base_price,
                "urgency_fee": order.urgency_fee,
                "total_price": order.total_price,
                "client_name": order.client_name,
                "client_email": order.client_email
            }

            # If Zelle payment, send Zelle-specific emails
            if order_data.payment_method == "zelle":
                # Send Zelle pending email to partner
                try:
                    zelle_order_details = {
                        **order_details,
                        "customer_name": partner.get("company_name", partner.get("contact_name", "Partner")),
                        "customer_email": partner["email"]
                    }
                    email_html = get_zelle_pending_email_template(
                        partner.get("company_name", partner.get("contact_name", "Partner")),
                        zelle_order_details
                    )
                    await email_service.send_email(
                        partner["email"],
                        f"Order Received - Zelle Payment Pending Verification - {order.order_number}",
                        email_html,
                        "html"
                    )
                    logger.info(f"Zelle pending email sent to partner: {partner['email']}")
                except Exception as ze:
                    logger.error(f"Failed to send Zelle pending email to partner: {str(ze)}")

                # Send Zelle admin notification
                try:
                    admin_html = get_zelle_admin_notification_template(zelle_order_details, zelle_receipt_url)
                    await email_service.send_email(
                        "contact@legacytranslations.com",
                        f"🔔 Partner Zelle Payment - {order.order_number} - ${order.total_price:.2f}",
                        admin_html,
                        "html"
                    )
                    logger.info("Zelle admin notification sent")
                except Exception as ae:
                    logger.error(f"Failed to send Zelle admin notification: {str(ae)}")
            else:
                # Standard order confirmation emails
                # Notify partner
                await email_service.send_order_confirmation_email(
                    partner["email"],
                    order_details,
                    is_partner=True
                )

                # Notify company
                await email_service.send_order_confirmation_email(
                    "contact@legacytranslations.com",
                    order_details,
                    is_partner=False
                )

        except Exception as e:
            logger.error(f"Failed to send order emails: {str(e)}")

        # Create QuickBooks invoice automatically
        quickbooks_invoice_id = None
        quickbooks_invoice_number = None
        try:
            settings = await db.settings.find_one({"key": "quickbooks"})
            if settings and settings.get("quickbooks_connected"):
                qb_client = get_quickbooks_client(settings)

                # Use partner info as customer (B2B portal)
                customer_name = partner.get("company_name", partner.get("name", "Partner"))
                customer_email = partner.get("email")

                # Find or create customer in QuickBooks
                qb_customer_id = None
                if customer_email:
                    existing = qb_client.find_customer_by_email(customer_email)
                    if existing.get("success"):
                        customers = existing.get("data", {}).get("QueryResponse", {}).get("Customer", [])
                        if customers:
                            qb_customer_id = customers[0].get("Id")

                if not qb_customer_id:
                    cust_result = qb_client.create_customer(
                        display_name=customer_name,
                        email=customer_email
                    )
                    if cust_result.get("success"):
                        qb_customer_id = cust_result.get("data", {}).get("Customer", {}).get("Id")

                if qb_customer_id:
                    # Create line items
                    service_desc = f"Translation Service - {order.service_type.capitalize()}"
                    if order.translate_from and order.translate_to:
                        service_desc += f" ({order.translate_from} to {order.translate_to})"

                    line_items = [{
                        "description": service_desc,
                        "amount": order.total_price,
                        "quantity": 1
                    }]

                    # Add urgency fee as separate line if applicable
                    if order.urgency_fee and order.urgency_fee > 0:
                        line_items.append({
                            "description": f"Urgency Fee ({order.urgency.capitalize()})",
                            "amount": order.urgency_fee,
                            "quantity": 1
                        })
                        # Adjust the main line item to be base price only
                        line_items[0]["amount"] = order.base_price

                    # Create invoice
                    invoice_result = qb_client.create_invoice(
                        customer_id=qb_customer_id,
                        line_items=line_items,
                        memo=f"Order #{order.order_number} - {order.client_name}"
                    )

                    if invoice_result.get("success"):
                        invoice = invoice_result.get("data", {}).get("Invoice", {})
                        quickbooks_invoice_id = invoice.get("Id")
                        quickbooks_invoice_number = invoice.get("DocNumber")

                        # Update order with QuickBooks info
                        await db.translation_orders.update_one(
                            {"id": order.id},
                            {"$set": {
                                "quickbooks_invoice_id": quickbooks_invoice_id,
                                "quickbooks_invoice_number": quickbooks_invoice_number,
                                "quickbooks_synced_at": datetime.utcnow()
                            }}
                        )

                        # Send invoice email
                        try:
                            qb_client.send_invoice(quickbooks_invoice_id, customer_email)
                        except Exception as send_err:
                            logger.warning(f"Failed to send QuickBooks invoice email: {str(send_err)}")

                        logger.info(f"Created QuickBooks invoice {quickbooks_invoice_number} for order {order.order_number}")
                    else:
                        logger.warning(f"Failed to create QuickBooks invoice: {invoice_result.get('error')}")
                else:
                    logger.warning("Could not find or create QuickBooks customer")
        except Exception as e:
            logger.error(f"Failed to create QuickBooks invoice: {str(e)}")

        # Update the order object with QuickBooks info for the response
        order_dict = order.dict()
        if quickbooks_invoice_id:
            order_dict["quickbooks_invoice_id"] = quickbooks_invoice_id
            order_dict["quickbooks_invoice_number"] = quickbooks_invoice_number

        return {
            "status": "success",
            "order": order_dict,
            "message": "Order created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create order")

@api_router.get("/orders")
async def get_orders(token: str, status: Optional[str] = None):
    """Get all orders for a partner"""
    try:
        partner = await get_current_partner(token)
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Build query
        query = {"partner_id": partner["id"]}
        if status:
            query["payment_status"] = status

        orders = await db.translation_orders.find(query).sort("created_at", -1).to_list(100)

        # Clean up MongoDB fields
        for order in orders:
            if '_id' in order:
                del order['_id']

        return {"orders": orders}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting orders: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get orders")

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, token: str):
    """Get specific order"""
    try:
        partner = await get_current_partner(token)
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        order = await db.translation_orders.find_one({
            "id": order_id,
            "partner_id": partner["id"]
        })

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if '_id' in order:
            del order['_id']

        return order

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get order")

# ==================== ADMIN ENDPOINTS (for you to manage orders) ====================

@api_router.get("/admin/orders")
async def admin_get_all_orders(
    admin_key: str,
    page: int = 1,
    limit: int = 50,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all orders with pagination (admin only)"""
    # Check if it's master admin key OR a valid user token
    is_valid = False
    expected_key = os.environ.get("ADMIN_KEY", "legacy_admin_2024")

    # Check master admin key
    if admin_key == expected_key:
        is_valid = True
    else:
        # Check if it's a valid user token (from login)
        if admin_key in active_admin_tokens:
            is_valid = True
        else:
            # Check database for valid token
            user = await db.admin_users.find_one({"token": admin_key, "is_active": True})
            if user:
                is_valid = True
                # Cache the token
                active_admin_tokens[admin_key] = {"user_id": user["id"], "role": user["role"]}

    if not is_valid:
        logger.warning(f"Invalid admin key attempt: key_len={len(admin_key)}, expected_len={len(expected_key)}")
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get user info for role-based filtering
    user_role = None
    user_id = None
    if admin_key != expected_key:
        # It's a user token, get their role
        if admin_key in active_admin_tokens:
            user_role = active_admin_tokens[admin_key].get("role")
            user_id = active_admin_tokens[admin_key].get("user_id")
        else:
            user = await db.admin_users.find_one({"token": admin_key, "is_active": True})
            if user:
                user_role = user.get("role")
                user_id = user.get("id")

    # Build query filter
    query = {}

    # PM only sees their assigned projects
    if user_role == "pm" and user_id:
        query["assigned_pm_id"] = user_id

    if status and status != "all":
        # Map status groups for filtering (include all case variations)
        status_mappings = {
            'in_translation': ['in_translation', 'In Translation', 'IN_TRANSLATION', 'pending', 'Pending', 'PENDING', 'In Progress', 'in progress', 'IN PROGRESS', 'in_progress', 'In_Progress'],
            'review': ['review', 'Review', 'REVIEW', 'pending_pm_review', 'Pending PM Review', 'pending_review', 'PM Review', 'pm review', 'PM_Review'],
            'ready': ['ready', 'Ready', 'READY', 'pending_admin_approval', 'Pending Admin Approval'],
            'received': ['received', 'Received', 'RECEIVED', 'Quote', 'quote', 'QUOTE'],
            'client_review': ['client_review', 'Client Review', 'CLIENT_REVIEW', 'client review'],
            'delivered': ['delivered', 'Delivered', 'DELIVERED'],
            'final': ['final', 'Final', 'FINAL']
        }
        if status in status_mappings:
            query["translation_status"] = {"$in": status_mappings[status]}
        else:
            query["translation_status"] = status
    if search:
        query["$or"] = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"client_name": {"$regex": search, "$options": "i"}},
            {"client_email": {"$regex": search, "$options": "i"}}
        ]

    # Get total count for pagination
    total_count = await db.translation_orders.count_documents(query)

    # Calculate skip value
    skip = (page - 1) * limit

    # Fetch orders with pagination
    orders = await db.translation_orders.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Calculate summary in single pass for better performance
    total_pending = 0
    total_paid = 0
    total_overdue = 0
    total_value = 0
    pending_value = 0

    for order in orders:
        if '_id' in order:
            del order['_id']

        payment_status = order.get("payment_status", "")
        price = order.get("total_price", 0) or 0

        total_value += price

        if payment_status == "pending":
            total_pending += 1
            pending_value += price
        elif payment_status == "paid":
            total_paid += 1
        elif payment_status == "overdue":
            total_overdue += 1

    # Calculate total pages
    total_pages = (total_count + limit - 1) // limit

    return {
        "orders": orders,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        },
        "summary": {
            "total_orders": total_count,
            "pending": total_pending,
            "paid": total_paid,
            "overdue": total_overdue,
            "total_value": total_value,
            "pending_value": pending_value
        }
    }

@api_router.get("/admin/orders/my-projects")
async def get_my_projects(token: str, admin_key: str):
    """Get projects based on user role - PM sees their projects, Translator sees assigned projects"""
    # Allow admin key or valid user tokens
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get user from token
    user = await get_current_admin_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_role = user.get("role", "")
    user_id = user.get("id", "")

    # Build query based on role
    if user_role == "admin":
        # Admin sees all
        orders = await db.translation_orders.find().sort("created_at", -1).to_list(500)
    elif user_role == "pm":
        # PM sees projects assigned to them
        orders = await db.translation_orders.find({"assigned_pm_id": user_id}).sort("created_at", -1).to_list(500)
    elif user_role == "translator":
        # Translator sees projects assigned to them
        orders = await db.translation_orders.find({"assigned_translator_id": user_id}).sort("created_at", -1).to_list(500)

        # Auto-accept: When translator accesses their projects, auto-accept any pending assignments
        # This fixes the issue where translator can work but status is stuck on "pending"
        for order in orders:
            if order.get("translator_assignment_status") == "pending":
                await db.translation_orders.update_one(
                    {"id": order["id"]},
                    {"$set": {"translator_assignment_status": "accepted", "translator_accepted_at": datetime.utcnow().isoformat()}}
                )
                order["translator_assignment_status"] = "accepted"
                logger.info(f"Auto-accepted assignment for translator {user_id} on order {order.get('order_number', order['id'])}")
    else:
        orders = []

    for order in orders:
        if '_id' in order:
            del order['_id']

    # Calculate summary
    total_pending = sum(1 for o in orders if o.get("payment_status") == "pending")
    total_paid = sum(1 for o in orders if o.get("payment_status") == "paid")
    in_translation = sum(1 for o in orders if o.get("translation_status") == "in_translation")
    completed = sum(1 for o in orders if o.get("translation_status") in ["ready", "delivered"])

    return {
        "orders": orders,
        "user_role": user_role,
        "summary": {
            "total_projects": len(orders),
            "pending_payment": total_pending,
            "paid": total_paid,
            "in_translation": in_translation,
            "completed": completed
        }
    }

@api_router.post("/admin/orders/manual")
async def admin_create_manual_order(project_data: ManualProjectCreate, admin_key: str):
    """Create a new project manually (admin/pm)"""
    # Check if it's the master admin key
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")

    # If not master key, check if it's a valid user token with admin/pm role
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Generate sequential order number starting from P6339
        # Look in translation_orders collection where orders are stored
        last_order = await db.translation_orders.find_one(
            {"order_number": {"$regex": "^P\\d+$"}},
            sort=[("order_number", -1)]
        )

        # Also check the numeric value to get the highest number
        if last_order and last_order.get("order_number"):
            try:
                last_num = int(last_order["order_number"][1:])
                next_num = last_num + 1
            except:
                next_num = 6339
        else:
            next_num = 6339

        # Ensure we don't create duplicates - check if this number already exists
        while True:
            order_number = f"P{next_num}"
            existing = await db.translation_orders.find_one({"order_number": order_number})
            if not existing:
                break
            next_num += 1

        order_number = f"P{next_num}"

        # Get PM and Translator names if assigned
        pm_name = None
        translator_name = None

        if project_data.assigned_pm_id:
            pm = await db.admin_users.find_one({"id": project_data.assigned_pm_id})
            if pm:
                pm_name = pm.get("name", "")

        if project_data.assigned_translator_id:
            translator = await db.admin_users.find_one({"id": project_data.assigned_translator_id})
            if translator:
                translator_name = translator.get("name", "")

        # Parse deadline if provided, otherwise auto-calculate based on revenue source
        deadline = None
        created_at = datetime.utcnow()
        if project_data.deadline:
            try:
                deadline = datetime.fromisoformat(project_data.deadline.replace('Z', '+00:00'))
            except:
                pass
        # Auto-calculate deadline if not provided
        if deadline is None:
            source_type = project_data.revenue_source or "website"
            if source_type == "partner":
                deadline = calculate_client_deadline("partner", created_at)  # 2 business days
            elif source_type == "whatsapp":
                deadline = calculate_client_deadline("whatsapp", created_at)  # 3 business days
            else:
                deadline = calculate_client_deadline("website", created_at)  # 3 business days

        # Calculate price if not provided
        base_price = project_data.base_price or 0.0
        urgency_fee = project_data.urgency_fee or 0.0
        total_price = project_data.total_price or (base_price + urgency_fee)

        # Determine payment status
        payment_status = "paid" if project_data.payment_received else "pending"

        # Create the order
        order = TranslationOrder(
            order_number=order_number,
            partner_id="manual",
            partner_company="Manual Entry",
            client_name=project_data.client_name,
            client_email=project_data.client_email,
            service_type=project_data.service_type,
            translate_from=project_data.translate_from,
            translate_to=project_data.translate_to,
            word_count=project_data.word_count,
            page_count=project_data.page_count,
            urgency=project_data.urgency,
            reference=project_data.reference,
            notes=project_data.notes,
            base_price=base_price,
            urgency_fee=urgency_fee,
            total_price=total_price,
            translation_status="received",
            payment_status=payment_status,
            due_date=datetime.utcnow() + timedelta(days=30),
            document_filename=project_data.document_filename,
            # New fields
            source_type="manual",
            assigned_pm_id=project_data.assigned_pm_id,
            assigned_pm_name=pm_name,
            assigned_translator_id=project_data.assigned_translator_id,
            assigned_translator_name=translator_name,
            deadline=deadline,
            internal_notes=project_data.internal_notes,
            revenue_source=project_data.revenue_source,
            payment_method=project_data.payment_method,
            document_type=project_data.document_type,
            document_category=project_data.document_category
        )

        # Store additional fields in order dict
        order_dict = order.dict()
        order_dict["payment_tag"] = project_data.payment_tag
        order_dict["create_invoice"] = project_data.create_invoice
        order_dict["invoice_terms"] = project_data.invoice_terms

        await db.translation_orders.insert_one(order_dict)
        logger.info(f"Manual order created: {order.order_number}")

        # Remove MongoDB _id from response (it's not JSON serializable)
        if "_id" in order_dict:
            del order_dict["_id"]

        # Save multiple documents if provided
        if project_data.documents and len(project_data.documents) > 0:
            for doc in project_data.documents:
                doc_record = {
                    "id": str(uuid.uuid4()),
                    "order_id": order.id,
                    "filename": doc.get("filename", "document.pdf"),
                    "data": doc.get("data"),
                    "content_type": doc.get("content_type", "application/pdf"),
                    "uploaded_at": datetime.utcnow()
                }
                await db.order_documents.insert_one(doc_record)
            logger.info(f"Saved {len(project_data.documents)} documents for order {order.order_number}")
        # Fallback: If single document data provided (backwards compatibility)
        elif project_data.document_data and project_data.document_filename:
            doc_record = {
                "id": str(uuid.uuid4()),
                "order_id": order.id,
                "filename": project_data.document_filename,
                "data": project_data.document_data,
                "uploaded_at": datetime.utcnow()
            }
            await db.order_documents.insert_one(doc_record)

        # Send to Make webhook for QuickBooks invoice if requested
        if project_data.create_invoice and not project_data.payment_received:
            invoice_data = {
                "invoice_terms": project_data.invoice_terms,
                "invoice_custom_date": project_data.invoice_custom_date,
                "payment_tag": project_data.payment_tag
            }
            webhook_success = await send_to_make_webhook(order_dict, invoice_data)
            if webhook_success:
                logger.info(f"Invoice sent to QuickBooks via Make for order {order.order_number}")

        return {
            "status": "success",
            "message": f"Project {order.order_number} created successfully",
            "order": order_dict,
            "invoice_created": project_data.create_invoice and not project_data.payment_received
        }

    except Exception as e:
        logger.error(f"Error creating manual order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

class CreateQuoteRequest(BaseModel):
    client_name: str
    client_email: str
    client_phone: Optional[str] = None
    translate_from: str = "Portuguese"
    translate_to: str = "English"
    service_type: str = "certified"
    turnaround: str = "standard"
    special_instructions: Optional[str] = None
    pages: int = 1
    total_price: float = 0.0
    created_by: Optional[str] = "Admin"
    files: Optional[List[dict]] = []

@api_router.post("/admin/create-quote")
async def admin_create_quote(quote_data: CreateQuoteRequest, admin_key: str):
    """Create a quote and send it to the client via email"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        # Generate order number
        order_number = f"Q{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:4].upper()}"

        # Turnaround: 2-3 business days
        turnaround_days = 3
        created_at = datetime.utcnow()

        # Create the order as a quote with auto-calculated deadline (3 business days for website)
        order_data = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "partner_id": "admin_quote",
            "partner_company": "Admin Created",
            "client_name": quote_data.client_name,
            "client_email": quote_data.client_email,
            "client_phone": quote_data.client_phone,
            "service_type": quote_data.service_type,
            "translate_from": quote_data.translate_from,
            "translate_to": quote_data.translate_to,
            "page_count": quote_data.pages,
            "turnaround": quote_data.turnaround,
            "special_instructions": quote_data.special_instructions,
            "total_price": quote_data.total_price,
            "base_price": quote_data.total_price,
            "translation_status": "Quote",
            "payment_status": "pending",
            "source_type": "admin_quote",
            "revenue_source": "website",
            "created_by": quote_data.created_by,
            "created_at": created_at,
            "updated_at": created_at,
            "due_date": created_at + timedelta(days=turnaround_days),
            "deadline": calculate_client_deadline("website", created_at)  # 3 business days
        }

        # Insert order
        await db.translation_orders.insert_one(order_data)
        logger.info(f"Quote created: {order_number}")

        # Save documents if provided
        if quote_data.files:
            for file_data in quote_data.files:
                doc_record = {
                    "id": str(uuid.uuid4()),
                    "order_id": order_data["id"],
                    "filename": file_data.get("filename", "document.pdf"),
                    "data": file_data.get("data"),
                    "content_type": file_data.get("content_type", "application/pdf"),
                    "uploaded_at": datetime.utcnow()
                }
                await db.order_documents.insert_one(doc_record)
            logger.info(f"Saved {len(quote_data.files)} documents for quote {order_number}")

        # Send quote email to client
        # Use main website domain for better email deliverability
        website_url = "https://legacytranslations.com"
        # Client portal URL - can be configured via environment variable
        client_portal_url = os.environ.get('CLIENT_PORTAL_URL', 'https://legacytranslations.com/client-portal')
        turnaround_display = "2-3 business days"

        service_display = "Certified Translation" if quote_data.service_type == "certified" else "Standard Translation"

        subject = f"Your Translation Quote - {order_number}"
        content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 25px; background: linear-gradient(135deg, #0d9488, #14b8a6); border-radius: 10px 10px 0 0;">
                <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 180px;">
            </div>
            <div style="padding: 30px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <h1 style="color: #0d9488; margin: 0 0 20px 0; font-size: 24px;">Your Translation Quote 📋</h1>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello {quote_data.client_name},</p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thank you for your interest in our translation services. Here is your quote:</p>

                <div style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #6b7280;">Quote Number:</td><td style="padding: 8px 0; font-weight: bold; color: #0d9488;">{order_number}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Service:</td><td style="padding: 8px 0; font-weight: 600; color: #374151;">{service_display}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Languages:</td><td style="padding: 8px 0; font-weight: 600; color: #374151;">{quote_data.translate_from} → {quote_data.translate_to}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Pages:</td><td style="padding: 8px 0; font-weight: 600; color: #374151;">{quote_data.pages}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Turnaround:</td><td style="padding: 8px 0; font-weight: 600; color: #374151;">{turnaround_display}</td></tr>
                    </table>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #0d9488; text-align: center;">
                        <span style="font-size: 28px; color: #0d9488; font-weight: bold;">Total: ${quote_data.total_price:.2f}</span>
                    </div>
                </div>

                <h3 style="color: #0d9488; margin: 25px 0 15px 0;">💳 Payment Options</h3>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                    <div style="flex: 1; min-width: 180px; background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <p style="margin: 0 0 8px 0; font-weight: bold; color: #166534;">Zelle (Preferred)</p>
                        <p style="margin: 0; color: #666; font-size: 14px;">857-208-1139</p>
                        <p style="margin: 0; color: #666; font-size: 12px;">Legacy Translations Inc</p>
                    </div>
                    <div style="flex: 1; min-width: 180px; background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e40af;">Venmo</p>
                        <p style="margin: 0; color: #666; font-size: 14px;">@legacytranslations</p>
                    </div>
                </div>

                <p style="color: #6b7280; font-size: 14px; background: #fef3c7; padding: 12px; border-radius: 6px; margin: 15px 0;">
                    <strong>⚠️ Important:</strong> Please include quote number <strong style="color: #0d9488;">{order_number}</strong> in the payment memo.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #6b7280; margin-bottom: 15px;">Pay by card or see all payment options:</p>
                    <a href="{client_portal_url}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Access Client Portal</a>
                </div>

                <p style="color: #6b7280; font-size: 14px;">This quote is valid for 30 days. If you have any questions, feel free to reply to this email or contact us at <a href="mailto:contact@legacytranslations.com" style="color: #0d9488;">contact@legacytranslations.com</a></p>

                <p style="color: #374151; margin-top: 25px;">Best regards,<br><strong>Legacy Translations Team</strong></p>
            </div>
            <div style="padding: 20px; background: #f9fafb; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">Legacy Translations Inc | +1(857)316-7770</p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">© 2024 Legacy Translations. All rights reserved.</p>
            </div>
        </div>
        """

        try:
            await email_service.send_email(quote_data.client_email, subject, content)
            logger.info(f"Quote email sent to {quote_data.client_email}")
        except Exception as email_err:
            logger.error(f"Failed to send quote email: {email_err}")

        return {
            "success": True,
            "id": order_data["id"],
            "order_number": order_number,
            "message": f"Quote {order_number} created and sent to {quote_data.client_email}"
        }

    except Exception as e:
        logger.error(f"Error creating quote: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create quote: {str(e)}")

class SendQuoteEmailRequest(BaseModel):
    to_email: str
    client_name: str
    quote_number: str
    language: str = "en"
    quote_data: dict

@api_router.post("/admin/send-quote-email")
async def admin_send_quote_email(request: SendQuoteEmailRequest, admin_key: str):
    """Send a quote email to a client from PM Dashboard"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        qd = request.quote_data
        lang = request.language

        # Build email content based on language
        if lang == "pt":
            subject = f"Seu Orçamento de Tradução - {request.quote_number}"
            greeting = f"Olá {request.client_name},"
            intro = "Obrigado por escolher a Legacy Translation Services. Segue seu orçamento:"
            service_label = "Serviço"
            languages_label = "Idiomas"
            pages_label = "Páginas"
            price_label = "Preço por Página"
            total_label = "TOTAL"
            valid_text = "Este orçamento é válido por 30 dias."
            payment_title = "Formas de Pagamento"
            thanks = "Obrigado por escolher Legacy Translation Services!"
            portal_text = "Pague com cartão ou veja todas as opções:"
            portal_button = "Acessar Portal do Cliente"
        elif lang == "es":
            subject = f"Su Presupuesto de Traducción - {request.quote_number}"
            greeting = f"Hola {request.client_name},"
            intro = "Gracias por elegir Legacy Translation Services. Aquí está su presupuesto:"
            service_label = "Servicio"
            languages_label = "Idiomas"
            pages_label = "Páginas"
            price_label = "Precio por Página"
            total_label = "TOTAL"
            valid_text = "Este presupuesto es válido por 30 días."
            payment_title = "Opciones de Pago"
            thanks = "¡Gracias por elegir Legacy Translation Services!"
            portal_text = "Pague con tarjeta o vea todas las opciones:"
            portal_button = "Acceder al Portal del Cliente"
        else:  # English default
            subject = f"Your Translation Quote - {request.quote_number}"
            greeting = f"Hello {request.client_name},"
            intro = "Thank you for choosing Legacy Translation Services. Here is your quote:"
            service_label = "Service"
            languages_label = "Languages"
            pages_label = "Pages"
            price_label = "Price per Page"
            total_label = "TOTAL"
            valid_text = "This quote is valid for 30 days."
            payment_title = "Payment Options"
            thanks = "Thank you for choosing Legacy Translation Services!"
            portal_text = "Pay by card or see all payment options:"
            portal_button = "Access Client Portal"

        # Client Portal URL
        portal_url = os.environ.get('CLIENT_PORTAL_URL', 'https://legacytranslations.com/client-portal')

        # Get values from quote_data
        doc_type = qd.get("documentType", qd.get("docType", "Translation"))
        source_lang = qd.get("sourceLanguage", qd.get("sourceLang", "Portuguese"))
        target_lang = qd.get("targetLanguage", qd.get("targetLang", "English"))
        pages = qd.get("pages", qd.get("numPages", 1))
        price_per_page = qd.get("pricePerPage", qd.get("basePrice", 24.99))
        total = qd.get("total", qd.get("totalPrice", 24.99))
        service_type = qd.get("serviceType", "Certified Translation")
        notes = qd.get("notes", qd.get("observations", ""))

        content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px;">
            </div>

            <div style="padding: 30px;">
                <h2 style="color: #0d9488; margin-top: 0;">{subject}</h2>
                <p>{greeting}</p>
                <p>{intro}</p>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>{service_label}</strong></td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">{service_type} - {doc_type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>{languages_label}</strong></td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">{source_lang} → {target_lang}</td>
                    </tr>
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>{pages_label}</strong></td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">{pages}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>{price_label}</strong></td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">${price_per_page:.2f}</td>
                    </tr>
                    <tr style="background: #0d9488; color: white;">
                        <td style="padding: 15px; border: 1px solid #0d9488;"><strong>{total_label}</strong></td>
                        <td style="padding: 15px; border: 1px solid #0d9488; font-size: 20px;"><strong>${total:.2f}</strong></td>
                    </tr>
                </table>

                {"<div style='background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;'><strong>Notes:</strong> " + notes + "</div>" if notes else ""}

                <p style="color: #666; font-size: 14px;">{valid_text}</p>

                <h3 style="color: #0d9488; margin-top: 30px;">{payment_title}</h3>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <p style="margin: 0 0 10px 0;"><strong>Zelle</strong></p>
                        <p style="margin: 0; color: #666; font-size: 14px;">857-208-1139</p>
                        <p style="margin: 0; color: #666; font-size: 14px;">Legacy Translations Inc</p>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <p style="margin: 0 0 10px 0;"><strong>Venmo</strong></p>
                        <p style="margin: 0; color: #666; font-size: 14px;">@legacytranslations</p>
                    </div>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                    <p style="color: #666; margin-bottom: 12px; font-size: 14px;">{portal_text}</p>
                    <a href="{portal_url}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">{portal_button}</a>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="color: #0d9488; font-weight: bold;">{thanks}</p>
                    <p style="color: #666; font-size: 14px;">
                        Legacy Translation Services<br>
                        legacytranslations.com | +1(857)316-7770
                    </p>
                </div>
            </div>
        </div>
        """

        # Send the email
        await email_service.send_email(request.to_email, subject, content)
        logger.info(f"Quote email sent to {request.to_email} - {request.quote_number}")

        return {
            "success": True,
            "message": f"Quote sent to {request.to_email}"
        }

    except Exception as e:
        logger.error(f"Error sending quote email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send quote: {str(e)}")

@api_router.get("/admin/users/by-role/{role}")
async def get_users_by_role(role: str, admin_key: str, include_pending: bool = True):
    """Get users by role (for dropdown selectors and user management)"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        # Include users with pending invitations if requested
        if include_pending:
            users = await db.admin_users.find({"role": role}).to_list(100)
        else:
            users = await db.admin_users.find({"role": role, "is_active": True}).to_list(100)

        return [{
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "role": u.get("role", role),
            "is_active": u.get("is_active", True),
            "invitation_pending": u.get("invitation_pending", False),
            "language_pairs": u.get("language_pairs"),
            "rate_per_page": u.get("rate_per_page"),
            "rate_per_word": u.get("rate_per_word"),
            "created_at": u.get("created_at")
        } for u in users]
    except Exception as e:
        logger.error(f"Error fetching users by role: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@api_router.get("/admin/translators/status")
async def get_translators_with_status(admin_key: str):
    """Get all translators with their current project status and deadlines"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        # Get all translators
        translators = await db.admin_users.find({"role": "translator", "is_active": True}).to_list(100)

        result = []
        for translator in translators:
            translator_name = translator["name"]

            # Find active projects assigned to this translator
            active_projects = await db.translation_orders.find({
                "assigned_translator": translator_name,
                "translation_status": {"$in": ["in_translation", "review", "pending"]}
            }).sort("deadline", 1).to_list(10)

            # Determine status
            if len(active_projects) > 0:
                status = "busy"
                # Get the earliest deadline
                current_project = active_projects[0]
                deadline = current_project.get("deadline")
                project_code = current_project.get("id", "")[:13]  # Get code like P251220-4F2D
                project_status = current_project.get("translation_status", "")
            else:
                status = "available"
                deadline = None
                project_code = None
                project_status = None

            result.append({
                "id": translator["id"],
                "name": translator_name,
                "email": translator["email"],
                "status": status,
                "active_projects_count": len(active_projects),
                "current_deadline": deadline,
                "current_project_code": project_code,
                "current_project_status": project_status,
                "projects": [{
                    "code": p.get("id", "")[:13],
                    "client": p.get("client_name", ""),
                    "deadline": p.get("deadline"),
                    "status": p.get("translation_status")
                } for p in active_projects[:3]]  # Show up to 3 projects
            })

        # Sort: available first, then by name
        result.sort(key=lambda x: (0 if x["status"] == "available" else 1, x["name"]))

        available_count = sum(1 for t in result if t["status"] == "available")
        busy_count = sum(1 for t in result if t["status"] == "busy")

        return {
            "translators": result,
            "summary": {
                "total": len(result),
                "available": available_count,
                "busy": busy_count
            }
        }
    except Exception as e:
        logger.error(f"Error fetching translators status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch translators")

# ==================== NOTIFICATIONS ====================

@api_router.get("/admin/notifications")
async def get_user_notifications(token: str, admin_key: str, unread_only: bool = False):
    """Get notifications for current user"""
    # Allow admin key or valid user tokens
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    user = await get_current_admin_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    query = {"user_id": user["id"]}
    if unread_only:
        query["is_read"] = False

    notifications = await db.notifications.find(query).sort("created_at", -1).to_list(50)

    for notif in notifications:
        if '_id' in notif:
            del notif['_id']

    unread_count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})

    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@api_router.put("/admin/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, token: str, admin_key: str):
    """Mark a notification as read"""
    # Allow admin key or valid user tokens
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    user = await get_current_admin_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )

    return {"status": "success"}

@api_router.put("/admin/notifications/read-all")
async def mark_all_notifications_read(token: str, admin_key: str):
    """Mark all notifications as read for current user"""
    # Allow admin key or valid user tokens
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    user = await get_current_admin_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )

    return {"status": "success"}

# ==================== PRODUCTION & PAYMENTS ====================

@api_router.get("/admin/production/stats")
async def get_production_stats(admin_key: str, translator_id: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get production statistics for translators"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get all translators
    translators = await db.admin_users.find({"role": "translator", "is_active": True}).to_list(100)

    stats = []
    for translator in translators:
        if translator_id and translator["id"] != translator_id:
            continue

        # Build query for orders assigned to this translator
        query = {"assigned_translator_id": translator["id"]}

        # Add date filters if provided
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if end_date:
                query["created_at"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

        # Get orders
        orders = await db.orders.find(query).to_list(1000)

        # Calculate stats
        total_pages = 0
        completed_pages = 0
        pending_pages = 0

        for order in orders:
            pages = order.get("page_count", 0) or 0
            total_pages += pages
            if order.get("translation_status") == "completed":
                completed_pages += pages
            else:
                pending_pages += pages

        # Get paid pages from payments
        paid_query = {"translator_id": translator["id"], "status": "paid"}
        paid_payments = await db.translator_payments.find(paid_query).to_list(100)
        paid_pages = sum(p.get("pages_count", 0) for p in paid_payments)

        # Pending payment = completed but not yet paid
        pending_payment_pages = completed_pages - paid_pages
        if pending_payment_pages < 0:
            pending_payment_pages = 0

        stats.append({
            "translator_id": translator["id"],
            "translator_name": translator.get("name", "Unknown"),
            "translator_email": translator.get("email", ""),
            "total_pages": total_pages,
            "completed_pages": completed_pages,
            "pending_pages": pending_pages,
            "paid_pages": paid_pages,
            "pending_payment_pages": pending_payment_pages,
            "orders_count": len(orders),
            "completed_orders": len([o for o in orders if o.get("translation_status") == "completed"])
        })

    return {"stats": stats}

@api_router.get("/admin/production/translator/{translator_id}/orders")
async def get_translator_orders(translator_id: str, admin_key: str, status: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get orders for a specific translator"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    query = {"assigned_translator_id": translator_id}

    if status:
        query["translation_status"] = status

    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

    orders = await db.orders.find(query).sort("created_at", -1).to_list(500)

    for order in orders:
        if '_id' in order:
            del order['_id']

    return {"orders": orders}

@api_router.post("/admin/payments")
async def create_payment(payment_data: PaymentCreate, admin_key: str, token: Optional[str] = None):
    """Create a payment record for a translator"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get translator info
    translator = await db.admin_users.find_one({"id": payment_data.translator_id})
    if not translator:
        raise HTTPException(status_code=404, detail="Translator not found")

    # Get current user if token provided
    current_user = None
    if token:
        current_user = await get_current_admin_user(token)

    payment = TranslatorPayment(
        translator_id=payment_data.translator_id,
        translator_name=translator.get("name", "Unknown"),
        period_start=datetime.fromisoformat(payment_data.period_start.replace('Z', '+00:00')),
        period_end=datetime.fromisoformat(payment_data.period_end.replace('Z', '+00:00')),
        pages_count=payment_data.pages_count,
        rate_per_page=payment_data.rate_per_page,
        total_amount=payment_data.total_amount,
        payment_method=payment_data.payment_method,
        payment_reference=payment_data.payment_reference,
        notes=payment_data.notes,
        order_ids=payment_data.order_ids,
        created_by_id=current_user["id"] if current_user else None,
        created_by_name=current_user.get("name") if current_user else None
    )

    await db.translator_payments.insert_one(payment.dict())

    # Create notification for translator
    await create_notification(
        user_id=payment_data.translator_id,
        notif_type="payment_registered",
        title="Pagamento Registrado",
        message=f"Um pagamento de ${payment_data.total_amount:.2f} foi registrado para {payment_data.pages_count} páginas."
    )

    return {"status": "success", "payment": payment.dict()}

@api_router.get("/admin/payments")
async def get_payments(admin_key: str, translator_id: Optional[str] = None, status: Optional[str] = None):
    """Get all payments with optional filters"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    query = {}
    if translator_id:
        query["translator_id"] = translator_id
    if status:
        query["status"] = status

    payments = await db.translator_payments.find(query).sort("created_at", -1).to_list(500)

    for payment in payments:
        if '_id' in payment:
            del payment['_id']

    return {"payments": payments}

@api_router.put("/admin/payments/{payment_id}")
async def update_payment(payment_id: str, update_data: PaymentUpdate, admin_key: str):
    """Update a payment record"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        update_dict = {}
        if update_data.status:
            update_dict["status"] = update_data.status
            if update_data.status == "paid" and not update_data.payment_date:
                update_dict["payment_date"] = datetime.utcnow()
        if update_data.payment_date:
            update_dict["payment_date"] = datetime.fromisoformat(update_data.payment_date.replace('Z', '+00:00'))
        if update_data.payment_method:
            update_dict["payment_method"] = update_data.payment_method
        if update_data.payment_reference:
            update_dict["payment_reference"] = update_data.payment_reference
        if update_data.notes is not None:
            update_dict["notes"] = update_data.notes

        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = await db.translator_payments.update_one(
            {"id": payment_id},
            {"$set": update_dict}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Payment not found")

        # Get updated payment
        payment = await db.translator_payments.find_one({"id": payment_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found after update")
        if '_id' in payment:
            del payment['_id']

        # Notify translator if marked as paid (don't fail the request if notification fails)
        if update_data.status == "paid":
            try:
                await create_notification(
                    user_id=payment["translator_id"],
                    notif_type="payment_completed",
                    title="Pagamento Confirmado",
                    message=f"Seu pagamento de ${payment['total_amount']:.2f} foi confirmado."
                )
            except Exception as notif_error:
                logger.warning(f"Failed to send payment notification: {str(notif_error)}")

        return {"status": "success", "payment": payment}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment {payment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update payment: {str(e)}")

@api_router.delete("/admin/payments/{payment_id}")
async def delete_payment(payment_id: str, admin_key: str):
    """Delete a payment record"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.translator_payments.delete_one({"id": payment_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")

    return {"status": "success"}

# ==================== EXPENSES ====================

@api_router.post("/admin/expenses")
async def create_expense(expense_data: ExpenseCreate, admin_key: str, token: Optional[str] = None):
    """Create a new expense record"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    current_user = None
    if token:
        current_user = await get_current_admin_user(token)

    expense = Expense(
        category=expense_data.category,
        subcategory=expense_data.subcategory,
        description=expense_data.description,
        amount=expense_data.amount,
        date=datetime.fromisoformat(expense_data.date.replace('Z', '+00:00')) if expense_data.date else datetime.utcnow(),
        is_recurring=expense_data.is_recurring,
        recurring_period=expense_data.recurring_period,
        vendor=expense_data.vendor,
        notes=expense_data.notes,
        created_by_id=current_user["id"] if current_user else None,
        created_by_name=current_user.get("name") if current_user else None
    )

    await db.expenses.insert_one(expense.dict())
    return {"status": "success", "expense": expense.dict()}

@api_router.get("/admin/expenses")
async def get_expenses(admin_key: str, category: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get all expenses with optional filters"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    query = {}
    if category:
        query["category"] = category

    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            query["date"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))

    expenses = await db.expenses.find(query).sort("date", -1).to_list(500)

    for expense in expenses:
        if '_id' in expense:
            del expense['_id']

    return {"expenses": expenses}

@api_router.put("/admin/expenses/{expense_id}")
async def update_expense(expense_id: str, update_data: ExpenseUpdate, admin_key: str):
    """Update an expense record"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        update_dict = {}
        if update_data.category:
            update_dict["category"] = update_data.category
        if update_data.subcategory is not None:
            update_dict["subcategory"] = update_data.subcategory
        if update_data.description:
            update_dict["description"] = update_data.description
        if update_data.amount is not None:
            update_dict["amount"] = update_data.amount
        if update_data.date:
            update_dict["date"] = datetime.fromisoformat(update_data.date.replace('Z', '+00:00'))
        if update_data.is_recurring is not None:
            update_dict["is_recurring"] = update_data.is_recurring
        if update_data.recurring_period is not None:
            update_dict["recurring_period"] = update_data.recurring_period
        if update_data.vendor is not None:
            update_dict["vendor"] = update_data.vendor
        if update_data.notes is not None:
            update_dict["notes"] = update_data.notes

        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = await db.expenses.update_one({"id": expense_id}, {"$set": update_dict})

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")

        expense = await db.expenses.find_one({"id": expense_id})
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found after update")
        if '_id' in expense:
            del expense['_id']

        return {"status": "success", "expense": expense}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating expense {expense_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update expense: {str(e)}")

@api_router.delete("/admin/expenses/{expense_id}")
async def delete_expense(expense_id: str, admin_key: str):
    """Delete an expense record"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.expenses.delete_one({"id": expense_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")

    return {"status": "success"}

# ==================== FINANCIAL SUMMARY ====================

@api_router.get("/admin/finances/summary")
async def get_financial_summary(admin_key: str, period: str = "month"):
    """Get financial summary with income, expenses, profit/loss"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    now = datetime.utcnow()

    # Determine date range based on period
    if period == "month":
        start_date = datetime(now.year, now.month, 1)
        if now.month == 12:
            end_date = datetime(now.year + 1, 1, 1)
        else:
            end_date = datetime(now.year, now.month + 1, 1)
    elif period == "year":
        start_date = datetime(now.year, 1, 1)
        end_date = datetime(now.year + 1, 1, 1)
    elif period == "last30":
        start_date = now - timedelta(days=30)
        end_date = now
    elif period == "last365":
        start_date = now - timedelta(days=365)
        end_date = now
    else:
        start_date = datetime(now.year, now.month, 1)
        end_date = now

    # Get revenue (paid orders) from translation_orders collection
    orders = await db.translation_orders.find({
        "payment_status": "paid",
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)

    total_revenue = sum(o.get("total_price", 0) for o in orders)

    # Revenue by source
    # Handle both revenue_source field and legacy source field (for whatsapp_bot)
    def get_order_source(order):
        # First check revenue_source field
        revenue_source = order.get("revenue_source")
        if revenue_source and revenue_source in REVENUE_SOURCES:
            return revenue_source
        # Check legacy source field for whatsapp_bot
        source = order.get("source", "")
        if source == "whatsapp_bot":
            return "whatsapp"
        # Check partner_id for whatsapp_bot
        partner_id = order.get("partner_id", "")
        if partner_id == "whatsapp_bot":
            return "whatsapp"
        # Default to website
        return "website"

    revenue_by_source = {}
    for source in REVENUE_SOURCES.keys():
        source_orders = [o for o in orders if get_order_source(o) == source]
        revenue_by_source[source] = {
            "label": REVENUE_SOURCES[source],
            "amount": sum(o.get("total_price", 0) for o in source_orders),
            "count": len(source_orders)
        }

    # Revenue by language pair
    revenue_by_language = {}
    for order in orders:
        lang_pair = f"{order.get('translate_from', 'Unknown')} → {order.get('translate_to', 'Unknown')}"
        if lang_pair not in revenue_by_language:
            revenue_by_language[lang_pair] = {"amount": 0, "count": 0}
        revenue_by_language[lang_pair]["amount"] += order.get("total_price", 0)
        revenue_by_language[lang_pair]["count"] += 1

    # Get expenses
    expenses = await db.expenses.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)

    total_expenses = sum(e.get("amount", 0) for e in expenses)

    # Expenses by category
    expenses_by_category = {}
    for cat_key, cat_label in EXPENSE_CATEGORIES.items():
        cat_expenses = [e for e in expenses if e.get("category") == cat_key]
        expenses_by_category[cat_key] = {
            "label": cat_label,
            "amount": sum(e.get("amount", 0) for e in cat_expenses),
            "count": len(cat_expenses)
        }

    # Get translator payments in period
    translator_payments = await db.translator_payments.find({
        "status": "paid",
        "payment_date": {"$gte": start_date, "$lt": end_date}
    }).to_list(500)
    translator_payments_total = sum(p.get("total_amount", 0) for p in translator_payments)

    # Add translator payments to expenses
    expenses_by_category["translators"]["amount"] += translator_payments_total
    total_expenses += translator_payments_total

    # Invoices summary
    all_orders = await db.translation_orders.find({
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)

    paid_invoices = sum(o.get("total_price", 0) for o in all_orders if o.get("payment_status") == "paid")
    pending_invoices = sum(o.get("total_price", 0) for o in all_orders if o.get("payment_status") == "pending")
    overdue_invoices = sum(o.get("total_price", 0) for o in all_orders if o.get("payment_status") == "overdue")

    # Profit/Loss
    net_profit = total_revenue - total_expenses

    # Previous period for comparison
    if period == "month":
        prev_start = datetime(now.year, now.month - 1, 1) if now.month > 1 else datetime(now.year - 1, 12, 1)
        prev_end = start_date
    else:
        prev_start = start_date - (end_date - start_date)
        prev_end = start_date

    prev_orders = await db.translation_orders.find({
        "payment_status": "paid",
        "created_at": {"$gte": prev_start, "$lt": prev_end}
    }).to_list(1000)
    prev_revenue = sum(o.get("total_price", 0) for o in prev_orders)

    prev_expenses = await db.expenses.find({
        "date": {"$gte": prev_start, "$lt": prev_end}
    }).to_list(1000)
    prev_expenses_total = sum(e.get("amount", 0) for e in prev_expenses)

    revenue_change = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    expenses_change = ((total_expenses - prev_expenses_total) / prev_expenses_total * 100) if prev_expenses_total > 0 else 0

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "profit_loss": {
            "net_profit": net_profit,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "revenue_change_percent": round(revenue_change, 1),
            "expenses_change_percent": round(expenses_change, 1)
        },
        "revenue": {
            "total": total_revenue,
            "by_source": revenue_by_source,
            "by_language": dict(sorted(revenue_by_language.items(), key=lambda x: x[1]["amount"], reverse=True)[:10])
        },
        "expenses": {
            "total": total_expenses,
            "by_category": expenses_by_category
        },
        "invoices": {
            "paid": paid_invoices,
            "pending": pending_invoices,
            "overdue": overdue_invoices,
            "paid_count": len([o for o in all_orders if o.get("payment_status") == "paid"]),
            "pending_count": len([o for o in all_orders if o.get("payment_status") == "pending"]),
            "overdue_count": len([o for o in all_orders if o.get("payment_status") == "overdue"])
        }
    }

@api_router.get("/admin/finances/partners")
async def get_partner_statistics(admin_key: str):
    """Get partner statistics: total received and pending amounts by company"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get all partner orders
    partner_orders = await db.translation_orders.find({
        "partner_id": {"$exists": True, "$ne": None}
    }).to_list(10000)

    # Group by partner company
    partner_stats = {}
    for order in partner_orders:
        company = order.get("partner_company", "Unknown")
        partner_id = order.get("partner_id")

        if company not in partner_stats:
            partner_stats[company] = {
                "partner_id": partner_id,
                "company_name": company,
                "total_received": 0,
                "total_pending": 0,
                "orders_paid": 0,
                "orders_pending": 0
            }

        total_price = order.get("total_price", 0)
        payment_status = order.get("payment_status", "pending")

        if payment_status == "paid":
            partner_stats[company]["total_received"] += total_price
            partner_stats[company]["orders_paid"] += 1
        else:
            partner_stats[company]["total_pending"] += total_price
            partner_stats[company]["orders_pending"] += 1

    # Convert to list and sort by total (received + pending) descending
    result = sorted(
        partner_stats.values(),
        key=lambda x: x["total_received"] + x["total_pending"],
        reverse=True
    )

    return {
        "partners": result,
        "summary": {
            "total_partners": len(result),
            "total_received": sum(p["total_received"] for p in result),
            "total_pending": sum(p["total_pending"] for p in result)
        }
    }


@api_router.delete("/admin/partners/{partner_id}")
async def delete_partner(partner_id: str, admin_key: str):
    """Delete a partner and optionally their orders (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        user = await get_current_admin_user(admin_key)
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Find the partner
        partner = await db.partners.find_one({"id": partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")

        partner_name = partner.get("company_name", partner.get("name", "Unknown"))

        # Delete the partner
        await db.partners.delete_one({"id": partner_id})

        # Optionally mark their orders as orphaned (don't delete orders, just remove partner reference)
        await db.translation_orders.update_many(
            {"partner_id": partner_id},
            {"$set": {"partner_deleted": True, "partner_deleted_at": datetime.utcnow()}}
        )

        logger.info(f"Partner deleted: {partner_name} (ID: {partner_id})")

        return {
            "status": "success",
            "message": f"Partner '{partner_name}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting partner: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete partner")


@api_router.delete("/admin/partners/by-email/{email}")
async def delete_partner_by_email(email: str, admin_key: str):
    """Delete a partner by email (admin only) - useful for testing"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        user = await get_current_admin_user(admin_key)
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Find the partner by email
        partner = await db.partners.find_one({"email": email})
        if not partner:
            raise HTTPException(status_code=404, detail=f"Partner with email '{email}' not found")

        partner_id = partner.get("id")
        partner_name = partner.get("company_name", partner.get("name", "Unknown"))

        # Delete the partner
        await db.partners.delete_one({"email": email})

        # Mark their orders as orphaned
        await db.translation_orders.update_many(
            {"partner_id": partner_id},
            {"$set": {"partner_deleted": True, "partner_deleted_at": datetime.utcnow()}}
        )

        logger.info(f"Partner deleted by email: {partner_name} ({email})")

        return {
            "status": "success",
            "message": f"Partner '{partner_name}' ({email}) deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting partner by email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete partner")


@api_router.get("/admin/orders/{order_id}")
async def admin_get_single_order(order_id: str, admin_key: str):
    """Get a single order by ID (admin or PM)"""
    # Validate admin key OR valid token from admin/PM
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Find order by id
        order = await db.translation_orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Remove MongoDB _id
        if '_id' in order:
            del order['_id']

        return {"order": order}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, update_data: TranslationOrderUpdate, admin_key: str):
    """Update order status (admin or PM)"""
    # Validate admin key OR valid token from admin/PM
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Build update dict
        update_dict = {}
        if update_data.translation_status:
            update_dict["translation_status"] = update_data.translation_status
        if update_data.payment_status:
            update_dict["payment_status"] = update_data.payment_status
        if update_data.payment_date:
            update_dict["payment_date"] = update_data.payment_date
        if update_data.delivered_at:
            update_dict["delivered_at"] = update_data.delivered_at
        if update_data.notes:
            update_dict["notes"] = update_data.notes
        # NEW: Assignment fields
        # Handle PM assignment by ID
        if update_data.assigned_pm_id is not None:
            update_dict["assigned_pm_id"] = update_data.assigned_pm_id
            # Get PM name
            if update_data.assigned_pm_id:
                pm = await db.admin_users.find_one({"id": update_data.assigned_pm_id})
                if pm:
                    update_dict["assigned_pm_name"] = pm.get("name", "")
            else:
                update_dict["assigned_pm_name"] = None
        # Handle PM assignment by name (from dropdown)
        if update_data.assigned_pm is not None:
            update_dict["assigned_pm_name"] = update_data.assigned_pm
            # Try to find PM by name to get ID
            pm = await db.admin_users.find_one({"name": update_data.assigned_pm, "role": "pm"})
            if pm:
                update_dict["assigned_pm_id"] = pm.get("id", "")
        # Handle Translator assignment by name (from dropdown)
        if update_data.assigned_translator is not None:
            update_dict["assigned_translator_name"] = update_data.assigned_translator
            # Try to find translator by name to get ID
            translator = await db.admin_users.find_one({"name": update_data.assigned_translator, "role": "translator"})
            if translator:
                update_dict["assigned_translator_id"] = translator.get("id", "")
        # Handle Translator assignment by ID
        if update_data.assigned_translator_id is not None:
            update_dict["assigned_translator_id"] = update_data.assigned_translator_id
            # Get translator name
            if update_data.assigned_translator_id:
                translator = await db.admin_users.find_one({"id": update_data.assigned_translator_id})
                if translator:
                    update_dict["assigned_translator_name"] = translator.get("name", "")

                    # Generate assignment token for accept/decline
                    assignment_token = str(uuid.uuid4())
                    update_dict["translator_assignment_token"] = assignment_token
                    update_dict["translator_assignment_status"] = "pending"
                    update_dict["translator_assignment_responded_at"] = None

                    # Get current order for email
                    current_order = await db.translation_orders.find_one({"id": order_id})
                    if current_order:
                        # Create notification for assigned translator
                        await create_notification(
                            user_id=update_data.assigned_translator_id,
                            notif_type="project_assigned",
                            title="New Project Assigned",
                            message=f"You have been assigned to project {current_order.get('order_number', order_id)}. Client: {current_order.get('client_name', 'N/A')}. Language: {current_order.get('translate_from', '')} → {current_order.get('translate_to', '')}",
                            order_id=order_id,
                            order_number=current_order.get('order_number')
                        )

                        # Send email to translator with accept/decline links
                        # Skip if using dedicated project email endpoint (skip_email=True)
                        if translator.get("email") and not update_data.skip_email:
                            try:
                                # Build accept/decline URLs - point to frontend for better UX (no cold start screen)
                                frontend_url = os.environ.get("FRONTEND_URL", "https://legacy-portal-frontend.onrender.com")
                                accept_url = f"{frontend_url}/#/assignment/{assignment_token}/accept"
                                decline_url = f"{frontend_url}/#/assignment/{assignment_token}/decline"

                                # Prepare order details for email
                                deadline_str = "To be confirmed"
                                if current_order.get("deadline"):
                                    deadline = current_order.get("deadline")
                                    if isinstance(deadline, datetime):
                                        deadline_str = deadline.strftime("%B %d, %Y at %I:%M %p")
                                    else:
                                        deadline_str = str(deadline)

                                order_details = {
                                    "order_number": current_order.get("order_number", order_id),
                                    "client_name": current_order.get("client_name", "N/A"),
                                    "translate_from": current_order.get("translate_from", ""),
                                    "translate_to": current_order.get("translate_to", ""),
                                    "word_count": current_order.get("word_count", 0),
                                    "deadline": deadline_str
                                }

                                # Send assignment email
                                email_html = get_translator_assignment_email_template(
                                    translator.get("name", "Translator"),
                                    order_details,
                                    accept_url,
                                    decline_url
                                )
                                await email_service.send_email(
                                    translator["email"],
                                    f"New Translation Assignment - {order_details['order_number']}",
                                    email_html
                                )
                                logger.info(f"Sent assignment email to translator {translator.get('name')} for order {order_id}")
                            except Exception as e:
                                logger.error(f"Failed to send assignment email: {str(e)}")
            else:
                update_dict["assigned_translator_name"] = None
                update_dict["translator_assignment_token"] = None
                update_dict["translator_assignment_status"] = "none"
        if update_data.deadline:
            update_dict["deadline"] = update_data.deadline
        if update_data.translator_deadline is not None:
            update_dict["translator_deadline"] = update_data.translator_deadline
        if update_data.internal_notes is not None:
            update_dict["internal_notes"] = update_data.internal_notes

        # NEW: Handle additional editable fields from project modal
        if update_data.client_name is not None:
            update_dict["client_name"] = update_data.client_name
        if update_data.client_email is not None:
            update_dict["client_email"] = update_data.client_email
        if update_data.translate_from is not None:
            update_dict["translate_from"] = update_data.translate_from
        if update_data.translate_to is not None:
            update_dict["translate_to"] = update_data.translate_to
        if update_data.service_type is not None:
            update_dict["service_type"] = update_data.service_type
        if update_data.page_count is not None:
            update_dict["page_count"] = update_data.page_count
        if update_data.urgency is not None:
            update_dict["urgency"] = update_data.urgency
        if update_data.document_type is not None:
            update_dict["document_type"] = update_data.document_type
        if update_data.total_price is not None:
            update_dict["total_price"] = update_data.total_price
        if update_data.base_price is not None:
            update_dict["base_price"] = update_data.base_price

        # Add updated_at timestamp
        update_dict["updated_at"] = datetime.utcnow()

        if not update_dict:
            raise HTTPException(status_code=400, detail="No update data provided")

        result = await db.translation_orders.update_one(
            {"id": order_id},
            {"$set": update_dict}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")

        # Get updated order
        order = await db.translation_orders.find_one({"id": order_id})
        if '_id' in order:
            del order['_id']

        # Send notification if delivered
        if update_data.translation_status == "delivered":
            try:
                # Get partner email
                partner = await db.partners.find_one({"id": order["partner_id"]})
                if partner:
                    # Send delivery notification to partner (simple notification)
                    partner_message = f"Order {order['order_number']} for client {order['client_name']} has been delivered. The translation was sent to {order['client_email']}."
                    await email_service.send_email(
                        partner["email"],
                        f"Translation Delivered - {order['order_number']}",
                        get_simple_client_email_template(partner.get("name", "Partner"), partner_message)
                    )

                    # Send to client with professional template
                    await email_service.send_email(
                        order["client_email"],
                        f"Your Translation is Ready - {order['order_number']}",
                        get_delivery_email_template(order['client_name'])
                    )
            except Exception as e:
                logger.error(f"Failed to send delivery notification: {str(e)}")

        # AUTO-LOG PAGES: When status changes to "final" or "delivered", automatically log pages for translator
        if update_data.translation_status in ["final", "Final", "delivered", "Delivered"]:
            try:
                # Check if pages were already logged for this order
                existing_log = await db.translator_pages.find_one({"order_id": order_id})
                if not existing_log:
                    # Get page count from original document
                    page_count = order.get("page_count", 0) or order.get("word_count", 0) // 250 or 1
                    translator_id = order.get("assigned_translator_id")
                    translator_name = order.get("assigned_translator_name", "Unknown")

                    if translator_id and page_count > 0:
                        # Create automatic page log entry
                        log_entry = {
                            "translator_id": translator_id,
                            "translator_name": translator_name,
                            "pages": page_count,
                            "date": datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d"),
                            "note": f"Auto: Project {order.get('order_number', order_id)} - {order.get('document_type', 'Document')}",
                            "order_id": order_id,
                            "order_number": order.get("order_number"),
                            "auto_generated": True,
                            "created_at": datetime.utcnow().isoformat()
                        }
                        await db.translator_pages.insert_one(log_entry)

                        # Update translator's pending pages
                        translator = await db.admin_users.find_one({"id": translator_id})
                        if translator:
                            current_pending = translator.get("pages_pending_payment", 0) or 0
                            await db.admin_users.update_one(
                                {"id": translator_id},
                                {"$set": {"pages_pending_payment": current_pending + page_count}}
                            )
                        logger.info(f"Auto-logged {page_count} pages for translator {translator_name} from order {order.get('order_number')}")
            except Exception as e:
                logger.error(f"Failed to auto-log pages: {str(e)}")

        return {"status": "success", "order": order}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update order")

@api_router.delete("/admin/orders/{order_id}")
async def admin_delete_order(order_id: str, admin_key: str):
    """Delete an order (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Find order first to check it exists
    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Delete the order
    result = await db.translation_orders.delete_one({"id": order_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    return {"status": "success", "message": f"Order {order.get('order_number', order_id)} deleted"}

@api_router.post("/admin/orders/{order_id}/mark-paid")
async def admin_mark_order_paid(order_id: str, admin_key: str):
    """Mark order as paid (admin only). Also changes status to 'in_translation' (In Progress) if in early stage."""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # First, fetch the order to check its current status
    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Build the update fields
    update_fields = {"payment_status": "paid", "payment_date": datetime.utcnow()}

    # If the order status is in an early stage, change it to 'in_translation' (In Progress)
    # This allows work to begin once payment is received
    early_stage_statuses = ["quote", "Quote", "received", "pending"]
    if order.get("translation_status") in early_stage_statuses:
        update_fields["translation_status"] = "in_translation"

    result = await db.translation_orders.update_one(
        {"id": order_id},
        {"$set": update_fields}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not updated")

    return {"status": "success", "message": "Order marked as paid"}

@api_router.post("/admin/orders/{order_id}/upload-translation")
async def admin_upload_translation(order_id: str, admin_key: str, file: UploadFile = File(...)):
    """Upload translated file for an order (admin/PM only)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Find the order
    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Read and encode file
    file_content = await file.read()
    file_base64 = base64.b64encode(file_content).decode('utf-8')

    # Determine file type
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'pdf'
    file_types = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain'
    }
    file_type = file_types.get(file_extension, 'application/octet-stream')

    # Update order with translated file
    await db.translation_orders.update_one(
        {"id": order_id},
        {"$set": {
            "translated_file": file_base64,
            "translated_filename": file.filename,
            "translated_file_type": file_type
        }}
    )

    return {"status": "success", "message": f"Translation file '{file.filename}' uploaded successfully"}

# ==================== PAYMENT PROOF ENDPOINTS ====================
@api_router.post("/payment-proofs/upload")
async def upload_payment_proof(
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    payment_method: str = Form(...),
    amount: float = Form(...),
    currency: str = Form("USD"),
    order_id: Optional[str] = Form(None),
    quote_id: Optional[str] = Form(None),
    customer_phone: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Upload payment proof (PIX/Zelle receipt) from customer"""
    try:
        # Validate file type
        allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images and PDFs are allowed.")

        # Read and encode file
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')

        # Get order number if order_id provided
        order_number = None
        if order_id:
            order = await db.translation_orders.find_one({"id": order_id})
            if order:
                order_number = order.get("order_number")

        # Create payment proof record
        payment_proof = PaymentProof(
            order_id=order_id,
            order_number=order_number,
            quote_id=quote_id,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            payment_method=payment_method,
            amount=amount,
            currency=currency,
            proof_filename=file.filename,
            proof_file_data=file_base64,
            proof_file_type=file.content_type,
            status="pending"
        )

        await db.payment_proofs.insert_one(payment_proof.dict())

        # Send notification to admins
        admin_users = await db.admin_users.find({"role": "admin"}).to_list(100)
        for admin in admin_users:
            notification = Notification(
                user_id=admin["id"],
                type="payment_proof_received",
                title="New Payment Proof Received",
                message=f"Payment proof from {customer_name} - {payment_method.upper()} ${amount:.2f}",
                order_id=order_id,
                order_number=order_number
            )
            await db.notifications.insert_one(notification.dict())

        # Send email notification to contact with View Receipt link
        try:
            api_url = os.environ.get("API_URL", "https://legacy-portal-backend.onrender.com")
            admin_url = os.environ.get("ADMIN_URL", "https://legacy-portal-frontend.onrender.com/#/admin")
            view_receipt_url = f"{api_url}/api/payment-proofs/view/{payment_proof.id}"

            email_html = f'''
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🔔 New {payment_method.upper()} Payment Received</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <p style="color: #374151;">A new order has been submitted with {payment_method.upper()} payment. Please verify the payment and confirm it in the admin panel.</p>

                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <p style="color: #92400e; font-weight: bold; font-size: 18px; margin: 0 0 15px 0;">
                            💰 {payment_method.upper()} Payment Details
                        </p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: bold;">Order Number:</td>
                                <td style="padding: 8px 0; color: #374151;">{order_number or 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: bold;">Customer Name:</td>
                                <td style="padding: 8px 0; color: #374151;">{customer_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: bold;">Customer Email:</td>
                                <td style="padding: 8px 0; color: #374151;"><a href="mailto:{customer_email}">{customer_email}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: bold;">Total Amount:</td>
                                <td style="padding: 8px 0; color: #374151; font-size: 18px; font-weight: bold;">${amount:.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #78350f; font-weight: bold;">Receipt:</td>
                                <td style="padding: 8px 0;"><a href="{view_receipt_url}" style="color: #2563eb; font-weight: bold;">View Receipt</a></td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 20px;">
                        <a href="{admin_url}" style="display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Open Admin Panel
                        </a>
                    </div>
                </div>
                <div style="background: #1f2937; padding: 15px; text-align: center;">
                    <p style="color: #9ca3af; margin: 0; font-size: 12px;">© 2025 Legacy Translations. All rights reserved.</p>
                </div>
            </div>
            '''

            await email_service.send_email(
                "contact@legacytranslations.com",
                f"🔔 New {payment_method.upper()} Payment - {customer_name} - ${amount:.2f}",
                email_html
            )
            logger.info(f"Payment notification email sent to contact@legacytranslations.com")
        except Exception as e:
            logger.error(f"Failed to send payment notification email: {str(e)}")

        logger.info(f"Payment proof uploaded: {payment_proof.id} from {customer_email}")

        return {
            "success": True,
            "proof_id": payment_proof.id,
            "message": "Payment proof uploaded successfully. Our team will review it shortly."
        }

    except Exception as e:
        logger.error(f"Error uploading payment proof: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload payment proof: {str(e)}")

@api_router.get("/admin/payment-proofs")
async def get_payment_proofs(
    admin_key: str,
    status: Optional[str] = None,
    token: Optional[str] = None
):
    """Get all payment proofs for admin review"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        # Check if it's a valid admin token
        if token:
            user = await db.admin_users.find_one({"token": token, "role": "admin"})
            if not user:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        else:
            raise HTTPException(status_code=401, detail="Invalid admin key")

    query = {}
    if status:
        query["status"] = status

    proofs = await db.payment_proofs.find(query).sort("created_at", -1).to_list(500)

    # Remove MongoDB _id and prepare response
    result = []
    for proof in proofs:
        if '_id' in proof:
            del proof['_id']
        # Don't send the full file data in list, just metadata
        proof_data = {
            "id": proof["id"],
            "order_id": proof.get("order_id"),
            "order_number": proof.get("order_number"),
            "quote_id": proof.get("quote_id"),
            "customer_name": proof["customer_name"],
            "customer_email": proof["customer_email"],
            "customer_phone": proof.get("customer_phone"),
            "payment_method": proof["payment_method"],
            "amount": proof["amount"],
            "currency": proof.get("currency", "USD"),
            "proof_filename": proof["proof_filename"],
            "proof_file_type": proof.get("proof_file_type"),
            "status": proof["status"],
            "admin_notes": proof.get("admin_notes"),
            "reviewed_by_name": proof.get("reviewed_by_name"),
            "reviewed_at": proof.get("reviewed_at"),
            "created_at": proof["created_at"]
        }
        result.append(proof_data)

    return {"payment_proofs": result}

@api_router.get("/admin/payment-proofs/{proof_id}")
async def get_payment_proof_detail(proof_id: str, admin_key: str, token: Optional[str] = None):
    """Get full payment proof detail including file data"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        if token:
            user = await db.admin_users.find_one({"token": token, "role": "admin"})
            if not user:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        else:
            raise HTTPException(status_code=401, detail="Invalid admin key")

    proof = await db.payment_proofs.find_one({"id": proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    if '_id' in proof:
        del proof['_id']

    return {"payment_proof": proof}


@api_router.get("/payment-proofs/view/{proof_id}")
async def view_payment_proof_file(proof_id: str):
    """Public endpoint to view payment proof file (for email links)"""
    from fastapi.responses import Response

    proof = await db.payment_proofs.find_one({"id": proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    file_data = proof.get("proof_file_data")
    file_type = proof.get("proof_file_type", "image/png")

    if not file_data:
        raise HTTPException(status_code=404, detail="No file data found")

    # Decode base64 data
    try:
        file_bytes = base64.b64decode(file_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decode file data")

    return Response(content=file_bytes, media_type=file_type)


@api_router.get("/receipt/view/{order_number}")
async def view_receipt_by_order(order_number: str):
    """View payment receipt by order number - redirects to admin panel or returns proof"""
    from fastapi.responses import RedirectResponse

    # Try to find payment proof by order number
    proof = await db.payment_proofs.find_one({"order_number": order_number})
    if proof:
        # Return the file directly
        file_data = proof.get("proof_file_data")
        file_type = proof.get("proof_file_type", "image/png")

        if file_data:
            from fastapi.responses import Response
            file_bytes = base64.b64decode(file_data)
            return Response(content=file_bytes, media_type=file_type)

    # Try to find in translation_orders or customer_orders
    order = await db.translation_orders.find_one({"order_number": order_number})
    if not order:
        order = await db.customer_orders.find_one({"order_number": order_number})

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Redirect to admin panel
    admin_url = os.environ.get("ADMIN_URL", "https://legacy-portal-frontend.onrender.com/#/admin")
    return RedirectResponse(url=f"{admin_url}?view_order={order_number}")

@api_router.put("/admin/payment-proofs/{proof_id}/review")
async def review_payment_proof(
    proof_id: str,
    admin_key: str,
    status: str,  # approved, rejected
    admin_notes: Optional[str] = None,
    token: Optional[str] = None
):
    """Approve or reject a payment proof"""
    admin_user = None
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        if token:
            admin_user = await db.admin_users.find_one({"token": token, "role": "admin"})
            if not admin_user:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        else:
            raise HTTPException(status_code=401, detail="Invalid admin key")

    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    proof = await db.payment_proofs.find_one({"id": proof_id})
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    update_data = {
        "status": status,
        "reviewed_at": datetime.utcnow(),
        "admin_notes": admin_notes
    }

    if admin_user:
        update_data["reviewed_by_id"] = admin_user["id"]
        update_data["reviewed_by_name"] = admin_user["name"]
    else:
        update_data["reviewed_by_name"] = "Admin"

    await db.payment_proofs.update_one(
        {"id": proof_id},
        {"$set": update_data}
    )

    # If approved and linked to an order, update order payment status and set to In Progress if applicable
    if status == "approved" and proof.get("order_id"):
        # First get the order to check its current status
        order = await db.translation_orders.find_one({"id": proof["order_id"]})
        update_fields = {
            "payment_status": "paid",
            "payment_date": datetime.utcnow(),
            "payment_method": proof["payment_method"]
        }

        # If the order is in an early stage, change to in_translation (In Progress)
        early_stage_statuses = ["quote", "received"]
        if order and order.get("translation_status") in early_stage_statuses:
            update_fields["translation_status"] = "in_translation"

        await db.translation_orders.update_one(
            {"id": proof["order_id"]},
            {"$set": update_fields}
        )
        logger.info(f"Order {proof['order_id']} marked as paid via {proof['payment_method']}")

    # Send email notification to customer
    try:
        email_service = EmailService()
        if status == "approved":
            subject = "Payment Confirmed - Legacy Translations"
            content = f"""
            <html>
                <body style="font-family: Arial, sans-serif;">
                    <h2 style="color: #059669;">Payment Confirmed!</h2>
                    <p>Dear {proof['customer_name']},</p>
                    <p>Your payment of <strong>${proof['amount']:.2f}</strong> via <strong>{proof['payment_method'].upper()}</strong> has been confirmed.</p>
                    <p>We will start processing your translation order immediately.</p>
                    <p>Thank you for choosing Legacy Translations!</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">Legacy Translations - Professional Translation Services</p>
                </body>
            </html>
            """
        else:
            subject = "Payment Verification Required - Legacy Translations"
            content = f"""
            <html>
                <body style="font-family: Arial, sans-serif;">
                    <h2 style="color: #dc2626;">Payment Verification Issue</h2>
                    <p>Dear {proof['customer_name']},</p>
                    <p>Unfortunately, we were unable to verify your payment of <strong>${proof['amount']:.2f}</strong> via <strong>{proof['payment_method'].upper()}</strong>.</p>
                    {f'<p><strong>Notes:</strong> {admin_notes}</p>' if admin_notes else ''}
                    <p>Please contact us for assistance or submit a new payment proof.</p>
                    <p>Contact: info@legacytranslations.com</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">Legacy Translations - Professional Translation Services</p>
                </body>
            </html>
            """

        await email_service.send_email(proof['customer_email'], subject, content)
    except Exception as e:
        logger.error(f"Failed to send payment notification email: {str(e)}")

    logger.info(f"Payment proof {proof_id} {status} by {update_data.get('reviewed_by_name', 'Admin')}")

    return {"success": True, "message": f"Payment proof {status}"}

class TranslationData(BaseModel):
    translation_html: str
    translation_original_text: Optional[str] = None  # Original text for proofreading
    source_language: str
    target_language: str
    document_type: str
    translator_name: str
    translation_date: str
    include_cover: bool = True
    page_format: str = "letter"
    translation_type: str = "certified"
    original_images: List[dict] = []
    logo_left: Optional[str] = None
    logo_right: Optional[str] = None
    logo_stamp: Optional[str] = None
    signature_image: Optional[str] = None  # Preserve signature image with order
    send_to: str = "admin"  # 'pm', 'admin', or 'review'
    submitted_by: Optional[str] = None
    submitted_by_role: Optional[str] = None
    translator_notes: Optional[str] = None  # Notes from translator to PM

@api_router.post("/admin/orders/{order_id}/translation")
async def admin_save_translation(order_id: str, data: TranslationData, admin_key: str):
    """Save translation from workspace to an order (admin/PM/translator)"""
    # Allow admin key or valid user tokens
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    current_user = None
    if not is_valid:
        current_user = await get_current_admin_user(admin_key)
        if current_user and current_user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Find the order
    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Determine status based on destination
    destination = data.send_to or "admin"
    if destination == "save":
        # Just saving - keep current status or set to 'in_progress' (draft)
        new_status = order.get("translation_status") or "in_progress"
        status_message = "Translation saved successfully"
        translation_ready = False  # Not ready yet, just saved
    elif destination == "pm":
        new_status = "pending_pm_review"
        status_message = "Translation saved and sent to PM for review"
        translation_ready = False  # Not ready for client yet - PM needs to review first
    elif destination == "review":
        new_status = "pending_review"
        status_message = "Translation submitted for Admin/PM review"
        translation_ready = False  # Not ready for client yet - needs review
    elif destination == "pending_admin_approval":
        new_status = "pending_admin_approval"
        status_message = "Translation sent to Admin for approval"
        translation_ready = True  # PM approved - ready for Admin to send to client
    elif destination == "finalize_admin":
        new_status = "finalized_pending_admin"
        status_message = "Translation finalized and sent to Admin for client delivery"
        translation_ready = True  # In-house translator finalized - ready for Admin to send to client
    elif destination == "admin":
        new_status = "pending_admin_review"
        status_message = "Translation sent to Admin for review"
        translation_ready = False  # Needs Admin review first
    else:
        new_status = "review"
        status_message = "Translation saved and sent to Admin for review"
        translation_ready = True

    # Update order with translation data
    await db.translation_orders.update_one(
        {"id": order_id},
        {"$set": {
            "translation_html": data.translation_html,
            "translation_original_text": data.translation_original_text or "",
            "translation_source_language": data.source_language,
            "translation_target_language": data.target_language,
            "translation_document_type": data.document_type,
            "translation_translator_name": data.translator_name,
            "translation_date": data.translation_date,
            "translation_include_cover": data.include_cover,
            "translation_page_format": data.page_format,
            "translation_type_setting": data.translation_type,
            "translation_original_images": data.original_images,
            "translation_logo_left": data.logo_left,
            "translation_logo_right": data.logo_right,
            "translation_logo_stamp": data.logo_stamp,
            "translation_signature_image": data.signature_image,
            "translation_status": new_status,
            "translation_sent_to": destination,
            "translation_ready": translation_ready,
            "translation_ready_at": datetime.utcnow().isoformat(),
            "translation_submitted_by": data.submitted_by or (current_user.get("name") if current_user else "Admin"),
            "translation_submitted_by_role": data.submitted_by_role or (current_user.get("role") if current_user else "admin"),
            "translator_notes": data.translator_notes or ""
        }}
    )

    logger.info(f"Translation saved for order {order_id}, sent to {destination}, status: {new_status}")

    # Send notification to PM when translator sends translation for PM review
    if destination == "pm":
        # Get the assigned PM for this order
        assigned_pm_id = order.get("assigned_pm_id")
        translator_name = data.submitted_by or (current_user.get("name") if current_user else "Translator")
        order_number = order.get("order_number", order_id)
        if assigned_pm_id:
            # Create notification for the assigned PM
            await create_notification(
                user_id=assigned_pm_id,
                notif_type="translation_submitted",
                title="Translation Ready for Review",
                message=f"Translator {translator_name} has submitted a translation for order {order_number}. Please review and approve.",
                order_id=order_id,
                order_number=order_number
            )
            logger.info(f"Notification sent to PM {assigned_pm_id} for order {order_id}")
        else:
            # No PM assigned - notify all PMs and admins so someone can review
            logger.info(f"No PM assigned to order {order_id}, notifying all PMs and admins")
            pm_and_admin_users = await db.admin_users.find({"role": {"$in": ["pm", "admin"]}}).to_list(length=100)
            for user in pm_and_admin_users:
                await create_notification(
                    user_id=user.get("id"),
                    notif_type="translation_submitted",
                    title="Translation Ready for Review",
                    message=f"Translator {translator_name} has submitted a translation for order {order_number}. Please review and approve.",
                    order_id=order_id,
                    order_number=order_number
                )
            logger.info(f"Notification sent to {len(pm_and_admin_users)} PMs/admins for order {order_id}")

    # Send notification to Admin when PM approves and sends translation
    if destination == "pending_admin_approval":
        # Get all admin users and notify them
        admin_users = await db.admin_users.find({"role": "admin"}).to_list(length=100)
        pm_name = data.submitted_by or (current_user.get("name") if current_user else "PM")
        order_number = order.get("order_number", order_id)
        for admin_user in admin_users:
            await create_notification(
                user_id=admin_user.get("id"),
                notif_type="translation_approved",
                title="Translation Approved by PM",
                message=f"PM {pm_name} has approved the translation for order {order_number}. Ready for client delivery.",
                order_id=order_id,
                order_number=order_number
            )
        logger.info(f"Notification sent to admins for PM-approved order {order_id}")

    # Send notification to Admin when in-house translator finalizes and sends directly
    if destination == "finalize_admin":
        # Get all admin users and notify them
        admin_users = await db.admin_users.find({"role": "admin"}).to_list(length=100)
        translator_name = data.submitted_by or (current_user.get("name") if current_user else "Translator")
        order_number = order.get("order_number", order_id)
        for admin_user in admin_users:
            await create_notification(
                user_id=admin_user.get("id"),
                notif_type="translation_finalized",
                title="Translation Finalized by Translator",
                message=f"Translator {translator_name} has finalized translation for order {order_number}. Ready for client delivery.",
                order_id=order_id,
                order_number=order_number
            )
        logger.info(f"Notification sent to admins for finalized order {order_id}")

    return {"success": True, "message": status_message}

class AttachmentsSelection(BaseModel):
    include_workspace: bool = True
    additional_document_ids: List[str] = []

class DeliverOrderRequest(BaseModel):
    bcc_email: Optional[str] = None
    notify_pm: bool = False
    attachments: Optional[AttachmentsSelection] = None
    include_verification_page: bool = False
    certifier_name: Optional[str] = None

@api_router.post("/admin/orders/{order_id}/deliver")
async def admin_deliver_order(order_id: str, admin_key: str, request: DeliverOrderRequest = None):
    """Mark order as delivered and send translation to client (admin/PM only)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Handle both with and without request body
    bcc_email = request.bcc_email if request else None
    notify_pm = request.notify_pm if request else False
    attachments_selection = request.attachments if request else None
    include_verification_page = request.include_verification_page if request else False
    certifier_name = request.certifier_name if request else None

    # Find the order
    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get partner
    partner = await db.partners.find_one({"id": order["partner_id"]})

    # Update order status
    await db.translation_orders.update_one(
        {"id": order_id},
        {"$set": {
            "translation_status": "delivered",
            "delivered_at": datetime.utcnow()
        }}
    )

    # Track what was sent
    pm_notified = False
    bcc_sent = False
    all_attachments = []
    attachment_filenames = []

    # Send emails
    try:
        # Check if translated file exists (uploaded PDF) or translation_html (from workspace)
        has_file_attachment = order.get("translated_file") and order.get("translated_filename")
        has_html_translation = order.get("translation_html")

        # Debug logging
        logger.info(f"Delivering order {order.get('order_number')}: has_file={has_file_attachment}, has_html={bool(has_html_translation)}")

        # Determine what to include based on selection (or default behavior)
        include_workspace = True
        additional_doc_ids = []

        if attachments_selection:
            include_workspace = attachments_selection.include_workspace
            additional_doc_ids = attachments_selection.additional_document_ids or []

        # Add workspace translation if selected
        if include_workspace and has_html_translation:
            translation_html_content = generate_translation_html_for_email(order)
            all_attachments.append({
                "content": base64.b64encode(translation_html_content.encode('utf-8')).decode('utf-8'),
                "filename": f"Translation_{order['order_number']}.html",
                "content_type": "text/html"
            })
            attachment_filenames.append(f"Translation_{order['order_number']}.html")
            logger.info(f"Added workspace translation to attachments")

        # Get ALL documents from the project and include them as attachments
        # Fetch from both order_documents and documents collections
        project_docs = await db.order_documents.find({"order_id": order_id}).to_list(100)
        project_docs_main = await db.documents.find({"order_id": order_id}).to_list(100)

        # Add all project documents as attachments
        for doc in project_docs + project_docs_main:
            doc_data = doc.get("file_data") or doc.get("data")
            if doc_data:
                filename = doc.get("filename", "document.pdf")
                # Avoid duplicates
                if filename not in attachment_filenames:
                    all_attachments.append({
                        "content": doc_data,
                        "filename": filename,
                        "content_type": doc.get("content_type", "application/pdf")
                    })
                    attachment_filenames.append(filename)
                    logger.info(f"Added project document to attachments: {filename}")

        # Also add any additional documents explicitly selected (for backwards compatibility)
        if additional_doc_ids:
            for doc_id in additional_doc_ids:
                # Check if it's a string ID for order documents
                if isinstance(doc_id, str) and not doc_id.startswith('temp-'):
                    doc = await db.order_documents.find_one({"id": doc_id})
                    if doc and (doc.get("file_data") or doc.get("data")):
                        doc_data = doc.get("file_data") or doc.get("data")
                        filename = doc.get("filename", f"document_{doc_id}.pdf")
                        # Avoid duplicates
                        if filename not in attachment_filenames:
                            all_attachments.append({
                                "content": doc_data,
                                "filename": filename,
                                "content_type": doc.get("content_type", "application/pdf")
                            })
                            attachment_filenames.append(filename)
                            logger.info(f"Added additional document {doc_id} to attachments: {filename}")

        # Fallback: if no attachments selected but order has translated_file, use that
        if not all_attachments and has_file_attachment:
            all_attachments.append({
                "content": order["translated_file"],
                "filename": order["translated_filename"],
                "content_type": order.get("translated_file_type", "application/pdf")
            })
            attachment_filenames.append(order["translated_filename"])
            logger.info(f"Using fallback uploaded file: {order['translated_filename']}")

        has_attachments = len(all_attachments) > 0

        # Create certification and verification page if requested
        certification_data = None
        if include_verification_page:
            try:
                # Generate certification ID
                cert_id = f"LT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

                # Create document hash from translation content
                translation_content = order.get('translation_html', '') or 'Translation Content'
                document_hash = hashlib.sha256(translation_content.encode('utf-8')).hexdigest()

                # Generate verification URL
                base_url = os.environ.get("FRONTEND_URL", "https://portal.legacytranslations.com")
                verification_url = f"{base_url}/#/verify/{cert_id}"

                # Generate QR code
                qr_code_data = generate_qr_code(verification_url)

                # Create certification record
                certification = {
                    "certification_id": cert_id,
                    "order_id": order_id,
                    "order_number": order.get("order_number"),
                    "document_type": order.get("document_type", "Document"),
                    "source_language": order.get("source_language", ""),
                    "target_language": order.get("target_language", ""),
                    "page_count": 1,
                    "document_hash": document_hash,
                    "certifier_name": certifier_name or "Beatriz Paiva",
                    "certifier_title": "Legal Representative",
                    "certifier_credentials": "ATA Member # 275993",
                    "company_name": "Legacy Translations Inc.",
                    "company_address": "867 Boylston Street, 5th Floor, #2073, Boston, MA 02116",
                    "company_phone": "(857) 316-7770",
                    "company_email": "contact@legacytranslations.com",
                    "client_name": order.get("client_name", ""),
                    "certified_at": datetime.utcnow(),
                    "is_valid": True,
                    "verification_url": verification_url,
                    "qr_code_data": qr_code_data
                }

                # Store in database
                await db.certifications.insert_one(certification)
                certification_data = certification

                logger.info(f"Created certification for delivery: {cert_id}")

                # Generate verification page HTML
                certified_date = datetime.utcnow().strftime('%B %d, %Y')
                verification_page_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Document Verification - {cert_id}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }}
        .container {{
            max-width: 650px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            overflow: hidden;
        }}
        .header-banner {{
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            padding: 30px;
            text-align: center;
            position: relative;
        }}
        .header-banner::after {{
            content: '';
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 25px solid transparent;
            border-right: 25px solid transparent;
            border-top: 20px solid #3b82f6;
        }}
        .logo {{ max-height: 55px; margin-bottom: 15px; filter: brightness(0) invert(1); }}
        .header-title {{ color: white; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }}
        .header-subtitle {{ color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 8px; }}

        .content {{ padding: 50px 40px 40px; }}

        .badge-container {{ text-align: center; margin-bottom: 30px; }}
        .valid-badge {{
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            color: #166534;
            padding: 12px 24px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 4px 15px rgba(22, 163, 74, 0.2);
            border: 2px solid #86efac;
        }}
        .valid-icon {{
            width: 24px;
            height: 24px;
            background: #166534;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
        }}

        .cert-card {{
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 25px;
            margin: 25px 0;
        }}
        .cert-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }}
        .cert-row:last-child {{ border-bottom: none; }}
        .cert-label {{ color: #64748b; font-size: 13px; font-weight: 500; }}
        .cert-value {{ font-weight: 600; color: #1e293b; font-size: 14px; text-align: right; }}
        .cert-id-badge {{
            font-family: 'Consolas', 'Monaco', monospace;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 13px;
            border: 1px solid #fcd34d;
        }}

        .qr-section {{
            text-align: center;
            margin: 35px 0;
            padding: 30px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 16px;
            border: 2px dashed #93c5fd;
        }}
        .qr-code {{
            width: 180px;
            height: 180px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border: 4px solid white;
        }}
        .qr-title {{
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 15px;
        }}
        .qr-instruction {{
            font-size: 13px;
            color: #64748b;
            margin-top: 15px;
            line-height: 1.5;
        }}

        .verify-url-box {{
            text-align: center;
            padding: 15px 20px;
            background: #f8fafc;
            border-radius: 10px;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
        }}
        .verify-label {{ font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }}
        .verify-url {{
            font-size: 14px;
            color: #3b82f6;
            word-break: break-all;
            font-weight: 600;
        }}

        .footer {{
            text-align: center;
            padding: 25px 40px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }}
        .footer-notice {{
            font-size: 12px;
            color: #64748b;
            margin-bottom: 15px;
            line-height: 1.6;
        }}
        .footer-notice strong {{ color: #1e293b; }}
        .footer-company {{
            font-size: 11px;
            color: #94a3b8;
            line-height: 1.8;
        }}
        .divider {{
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            margin: 15px auto;
            border-radius: 2px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header-banner">
            <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" class="logo" />
            <h1 class="header-title">Document Verification</h1>
            <p class="header-subtitle">Official Certification for Translated Documents</p>
        </div>

        <div class="content">
            <div class="badge-container">
                <span class="valid-badge">
                    <span class="valid-icon">✓</span>
                    Certified & Verified Document
                </span>
            </div>

            <div class="cert-card">
                <div class="cert-row">
                    <span class="cert-label">Certification ID</span>
                    <span class="cert-value cert-id-badge">{cert_id}</span>
                </div>
                <div class="cert-row">
                    <span class="cert-label">Order Number</span>
                    <span class="cert-value">{order.get('order_number', 'N/A')}</span>
                </div>
                <div class="cert-row">
                    <span class="cert-label">Document Type</span>
                    <span class="cert-value">{order.get('document_type', 'Document')}</span>
                </div>
                <div class="cert-row">
                    <span class="cert-label">Translation</span>
                    <span class="cert-value">{order.get('source_language', '')} → {order.get('target_language', '')}</span>
                </div>
                <div class="cert-row">
                    <span class="cert-label">Certified Date</span>
                    <span class="cert-value">{certified_date}</span>
                </div>
                <div class="cert-row">
                    <span class="cert-label">Certified By</span>
                    <span class="cert-value">{certifier_name or 'Beatriz Paiva'}</span>
                </div>
                <div class="cert-row">
                    <span class="cert-label">Document Hash</span>
                    <span class="cert-value" style="font-family: monospace; font-size: 11px; color: #64748b;">{document_hash[:20]}...</span>
                </div>
            </div>

            <div class="qr-section">
                <p class="qr-title">📱 Scan to Verify Online</p>
                {f'<img src="data:image/png;base64,{qr_code_data}" alt="QR Code" class="qr-code" />' if qr_code_data else '<div style="width:180px;height:180px;background:#e2e8f0;display:inline-block;border-radius:12px;"></div>'}
                <p class="qr-instruction">
                    Point your phone's camera at this QR code<br/>
                    to instantly verify the authenticity of this document
                </p>
            </div>

            <div class="verify-url-box">
                <p class="verify-label">Manual Verification URL</p>
                <p class="verify-url">{verification_url}</p>
            </div>
        </div>

        <div class="footer">
            <p class="footer-notice">
                <strong>⚠️ Important Notice:</strong> This document has been digitally certified by Legacy Translations Inc.<br/>
                Any alterations to this document will invalidate this certification.
            </p>
            <div class="divider"></div>
            <p class="footer-company">
                <strong>Legacy Translations Inc.</strong><br/>
                867 Boylston Street, 5th Floor, #2073 • Boston, MA 02116<br/>
                (857) 316-7770 • contact@legacytranslations.com<br/>
                ATA Member #275993
            </p>
        </div>
    </div>
</body>
</html>
"""

                # Add verification page as attachment
                all_attachments.append({
                    "content": base64.b64encode(verification_page_html.encode('utf-8')).decode('utf-8'),
                    "filename": f"Verification_{order['order_number']}_{cert_id}.html",
                    "content_type": "text/html"
                })
                attachment_filenames.append(f"Verification_{order['order_number']}_{cert_id}.html")
                has_attachments = True
                logger.info(f"Added verification page to delivery attachments")

            except Exception as e:
                logger.error(f"Failed to create certification for delivery: {str(e)}")
                import traceback
                traceback.print_exc()

        # Use professional email template
        email_html = get_delivery_email_template(order['client_name'])

        if has_attachments:
            # Send to client WITH attachment(s)
            await email_service.send_email_with_multiple_attachments(
                order["client_email"],
                f"Your Translation is Ready - {order['order_number']}",
                email_html,
                all_attachments
            )
        else:
            # Send to client WITHOUT attachment
            await email_service.send_email(
                order["client_email"],
                f"Your Translation is Ready - {order['order_number']}",
                email_html
            )

        # Send BCC if provided
        if bcc_email:
            try:
                bcc_subject = f"[BCC] Translation Delivered - {order['order_number']}"
                bcc_html = f"""
                <div style="background: #fef3c7; padding: 10px; margin-bottom: 15px; border-radius: 5px;">
                    <strong>BCC Copy</strong> - This email was sent to: {order['client_email']}
                </div>
                {email_html}
                """
                if has_attachments:
                    await email_service.send_email_with_multiple_attachments(
                        bcc_email,
                        bcc_subject,
                        bcc_html,
                        all_attachments
                    )
                else:
                    await email_service.send_email(bcc_email, bcc_subject, bcc_html)
                bcc_sent = True
            except Exception as e:
                logger.error(f"Failed to send BCC: {str(e)}")

        # Notify PM if requested
        if notify_pm and order.get("assigned_pm_id"):
            try:
                pm_user = await db.admin_users.find_one({"id": order["assigned_pm_id"]})
                if pm_user and pm_user.get("email"):
                    pm_subject = f"[PM Notification] Translation Delivered - {order['order_number']}"
                    pm_html = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #8b5cf6; color: white; padding: 20px; text-align: center;">
                            <h2 style="margin: 0;">Translation Delivered</h2>
                        </div>
                        <div style="padding: 20px; background: #f9fafb;">
                            <p>Hello {pm_user.get('name', 'Project Manager')},</p>
                            <p>The translation for order <strong>#{order['order_number']}</strong> has been delivered to the client.</p>
                            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p><strong>Client:</strong> {order['client_name']}</p>
                                <p><strong>Email:</strong> {order['client_email']}</p>
                                <p><strong>Document:</strong> {order.get('document_type', 'N/A')}</p>
                                <p><strong>Attachment:</strong> {'Yes' if has_attachment else 'No'}</p>
                            </div>
                            <p style="color: #6b7280; font-size: 12px;">This is an automated notification from Legacy Translations.</p>
                        </div>
                    </div>
                    """
                    await email_service.send_email(pm_user["email"], pm_subject, pm_html)
                    pm_notified = True
            except Exception as e:
                logger.error(f"Failed to notify PM: {str(e)}")

        # Send notification to partner
        if partner:
            partner_message = f"Order {order['order_number']} for client {order['client_name']} has been delivered. The translation was sent to {order['client_email']}."
            await email_service.send_email(
                partner["email"],
                f"Translation Delivered - {order['order_number']}",
                get_simple_client_email_template(partner.get("name", "Partner"), partner_message)
            )

        # Create internal message for partner
        if partner:
            message = {
                "id": str(uuid.uuid4()),
                "partner_id": partner["id"],
                "order_id": order_id,
                "order_number": order["order_number"],
                "type": "delivery",
                "title": f"Translation Delivered - #{order['order_number']}",
                "content": f"Your translation for client {order['client_name']} ({order['client_email']}) has been completed and delivered.",
                "read": False,
                "created_at": datetime.utcnow()
            }
            await db.messages.insert_one(message)

        return {
            "status": "success",
            "message": "Order delivered and emails sent",
            "attachment_sent": has_attachments,
            "attachments_sent": len(all_attachments),
            "attachment_filenames": attachment_filenames,
            "pm_notified": pm_notified,
            "bcc_sent": bcc_sent,
            "certification": {
                "included": bool(certification_data),
                "certification_id": certification_data.get("certification_id") if certification_data else None,
                "verification_url": certification_data.get("verification_url") if certification_data else None
            } if include_verification_page else None,
            "debug": {
                "had_file": has_file_attachment,
                "had_html": bool(has_html_translation),
                "total_attachments": len(all_attachments)
            }
        }

    except Exception as e:
        logger.error(f"Failed to send delivery emails: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "partial", "message": "Order marked as delivered but email sending failed", "error": str(e)}

@api_router.get("/admin/orders/{order_id}/translated-document")
async def get_translated_document(order_id: str, admin_key: str):
    """Get translated document info and content for an order (admin/PM only)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    has_file = bool(order.get("translated_file"))
    has_html = bool(order.get("translation_html"))

    response = {
        "has_translated_document": has_file or has_html,
        "translated_filename": order.get("translated_filename"),
        "translated_file_type": order.get("translated_file_type"),
        "translation_ready": order.get("translation_ready", False),
        "translation_ready_at": order.get("translation_ready_at"),
        "has_file_attachment": has_file,
        "has_html_translation": has_html,
        "translation_status": order.get("translation_status"),
        "client_name": order.get("client_name"),
        "client_email": order.get("client_email"),
        "order_number": order.get("order_number")
    }

    # Include translation content for review
    if has_html:
        response["translation_html"] = order.get("translation_html")
        response["translation_settings"] = {
            "source_language": order.get("translation_source_language"),
            "target_language": order.get("translation_target_language"),
            "document_type": order.get("translation_document_type"),
            "translator_name": order.get("translation_translator_name"),
            "translation_date": order.get("translation_date"),
            "submitted_by": order.get("translation_submitted_by"),
            "submitted_by_role": order.get("translation_submitted_by_role")
        }
    elif has_file:
        response["file_data"] = order.get("translated_file")
        response["content_type"] = order.get("translated_file_type", "application/pdf")

    return response

@api_router.get("/admin/orders/{order_id}/download-translation")
async def download_translated_document(order_id: str, admin_key: str):
    """Download the translated document for an order (admin/PM only)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("translated_file"):
        return {
            "type": "file",
            "filename": order.get("translated_filename", "translation.pdf"),
            "content_type": order.get("translated_file_type", "application/pdf"),
            "file_data": order.get("translated_file")
        }
    elif order.get("translation_html"):
        return {
            "type": "html",
            "html_content": order.get("translation_html"),
            "translator_name": order.get("translation_translator_name"),
            "translation_date": order.get("translation_date")
        }
    else:
        raise HTTPException(status_code=404, detail="No translated document found")

# ==================== TRANSLATOR ASSIGNMENT RESPONSE ENDPOINTS ====================

@api_router.get("/translator/assignment/{token}/accept")
async def accept_translator_assignment(token: str):
    """Accept a translator assignment via email link"""
    # Find order by assignment token
    order = await db.translation_orders.find_one({"translator_assignment_token": token})
    if not order:
        return HTMLResponse(content=get_assignment_response_page("error", "Invalid or expired link. This assignment token was not found."), status_code=404)

    # Check if already responded
    if order.get("translator_assignment_status") in ["accepted", "declined"]:
        status = order.get("translator_assignment_status")
        return HTMLResponse(content=get_assignment_response_page("already_responded", f"You have already {status} this assignment."))

    # Update assignment status
    await db.translation_orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "translator_assignment_status": "accepted",
            "translator_assignment_responded_at": datetime.utcnow()
        }}
    )

    # Create notification for admin/PM
    await create_notification(
        user_id=order.get("assigned_pm_id") or "admin",
        notif_type="assignment_accepted",
        title="Translator Accepted Assignment",
        message=f"Translator {order.get('assigned_translator_name', 'Unknown')} has ACCEPTED the assignment for project {order.get('order_number', order['id'])}.",
        order_id=order["id"],
        order_number=order.get("order_number")
    )

    return HTMLResponse(content=get_assignment_response_page("accepted", f"Thank you! You have accepted the assignment for project {order.get('order_number', '')}. You can now access it in your translator portal."))

@api_router.get("/translator/assignment/{token}/decline")
async def decline_translator_assignment(token: str):
    """Decline a translator assignment via email link"""
    # Find order by assignment token
    order = await db.translation_orders.find_one({"translator_assignment_token": token})
    if not order:
        return HTMLResponse(content=get_assignment_response_page("error", "Invalid or expired link. This assignment token was not found."), status_code=404)

    # Check if already responded
    if order.get("translator_assignment_status") in ["accepted", "declined"]:
        status = order.get("translator_assignment_status")
        return HTMLResponse(content=get_assignment_response_page("already_responded", f"You have already {status} this assignment."))

    # Update assignment status - clear the translator assignment since they declined
    await db.translation_orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "translator_assignment_status": "declined",
            "translator_assignment_responded_at": datetime.utcnow()
        }}
    )

    # Create notification for admin/PM
    await create_notification(
        user_id=order.get("assigned_pm_id") or "admin",
        notif_type="assignment_declined",
        title="Translator Declined Assignment",
        message=f"Translator {order.get('assigned_translator_name', 'Unknown')} has DECLINED the assignment for project {order.get('order_number', order['id'])}. Please assign another translator.",
        order_id=order["id"],
        order_number=order.get("order_number")
    )

    return HTMLResponse(content=get_assignment_response_page("declined", f"You have declined the assignment for project {order.get('order_number', '')}. The team will be notified to assign another translator."))

# POST endpoints for frontend to call (returns JSON)
@api_router.post("/translator/assignment/{token}/accept")
async def accept_translator_assignment_api(token: str):
    """Accept a translator assignment via frontend (returns JSON)"""
    order = await db.translation_orders.find_one({"translator_assignment_token": token})
    if not order:
        raise HTTPException(status_code=404, detail="Invalid or expired link. This assignment token was not found.")

    if order.get("translator_assignment_status") in ["accepted", "declined"]:
        status = order.get("translator_assignment_status")
        raise HTTPException(status_code=400, detail=f"You have already {status} this assignment.")

    await db.translation_orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "translator_assignment_status": "accepted",
            "translator_assignment_responded_at": datetime.utcnow()
        }}
    )

    await create_notification(
        user_id=order.get("assigned_pm_id") or "admin",
        notif_type="assignment_accepted",
        title="Translator Accepted Assignment",
        message=f"Translator {order.get('assigned_translator_name', 'Unknown')} has ACCEPTED the assignment for project {order.get('order_number', order['id'])}.",
        order_id=order["id"],
        order_number=order.get("order_number")
    )

    return {"status": "accepted", "message": "Assignment accepted successfully", "order_number": order.get("order_number", "")}

@api_router.post("/translator/assignment/{token}/decline")
async def decline_translator_assignment_api(token: str):
    """Decline a translator assignment via frontend (returns JSON)"""
    order = await db.translation_orders.find_one({"translator_assignment_token": token})
    if not order:
        raise HTTPException(status_code=404, detail="Invalid or expired link. This assignment token was not found.")

    if order.get("translator_assignment_status") in ["accepted", "declined"]:
        status = order.get("translator_assignment_status")
        raise HTTPException(status_code=400, detail=f"You have already {status} this assignment.")

    await db.translation_orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "translator_assignment_status": "declined",
            "translator_assignment_responded_at": datetime.utcnow()
        }}
    )

    await create_notification(
        user_id=order.get("assigned_pm_id") or "admin",
        notif_type="assignment_declined",
        title="Translator Declined Assignment",
        message=f"Translator {order.get('assigned_translator_name', 'Unknown')} has DECLINED the assignment for project {order.get('order_number', order['id'])}. Please assign another translator.",
        order_id=order["id"],
        order_number=order.get("order_number")
    )

    return {"status": "declined", "message": "Assignment declined successfully", "order_number": order.get("order_number", "")}

def get_assignment_response_page(status: str, message: str) -> str:
    """Generate HTML page for assignment response"""
    portal_url = os.environ.get("FRONTEND_URL", "https://portal.legacytranslations.com")

    if status == "accepted":
        icon = "✓"
        color = "#28a745"
        title = "Assignment Accepted"
        # Auto-redirect to admin panel after 3 seconds (translator will login there)
        redirect_url = f"{portal_url}/#/admin"
        redirect_script = f'''
        <script>
            setTimeout(function() {{
                window.location.href = "{redirect_url}";
            }}, 3000);
        </script>
        '''
        button_html = f'''
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Você será redirecionado automaticamente em 3 segundos...</p>
        <a href="{redirect_url}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 50px; font-size: 15px; font-weight: 600; margin-top: 10px; box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);">
            🔐 Acessar Painel Admin
        </a>
        '''
    elif status == "declined":
        icon = "✗"
        color = "#dc3545"
        title = "Assignment Declined"
        button_html = ""
        redirect_script = ""
    elif status == "already_responded":
        icon = "ℹ"
        color = "#6c757d"
        title = "Already Responded"
        button_html = f'''
        <a href="{portal_url}/#/admin" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 50px; font-size: 15px; font-weight: 600; margin-top: 20px; box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);">
            🔐 Acessar Painel Admin
        </a>
        '''
        redirect_script = ""
    else:
        icon = "⚠"
        color = "#ffc107"
        title = "Error"
        button_html = ""
        redirect_script = ""

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Legacy Translations</title>
    {redirect_script if status == "accepted" else ""}
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a2a4a 0%, #2c3e5c 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            background: white;
            border-radius: 16px;
            padding: 50px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }}
        .icon {{
            font-size: 80px;
            color: {color};
            margin-bottom: 20px;
        }}
        h1 {{
            color: #1a2a4a;
            margin-bottom: 20px;
            font-size: 28px;
        }}
        p {{
            color: #4a5568;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
        }}
        .logo {{
            color: #1a2a4a;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 30px;
        }}
        .gold-bar {{
            height: 4px;
            background: linear-gradient(90deg, #c9a227 0%, #e6c547 50%, #c9a227 100%);
            margin-bottom: 30px;
            border-radius: 2px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Legacy Translations</div>
        <div class="gold-bar"></div>
        <div class="icon">{icon}</div>
        <h1>{title}</h1>
        <p>{message}</p>
        {button_html}
    </div>
</body>
</html>'''

# ==================== MESSAGES ENDPOINTS ====================

@api_router.get("/messages")
async def get_partner_messages(token: str):
    """Get all messages for the logged-in partner"""
    # Verify token
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Get messages for this partner
    messages = await db.messages.find(
        {"partner_id": partner["id"]}
    ).sort("created_at", -1).to_list(100)

    # Convert datetime to string for JSON serialization
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        if msg.get("created_at"):
            msg["created_at"] = msg["created_at"].isoformat()

    return {"messages": messages}


@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, token: str):
    """Mark a message as read and notify admin"""
    # Verify token
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Get the message first
    message = await db.messages.find_one({"id": message_id, "partner_id": partner["id"]})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Update message with read timestamp
    read_at = datetime.utcnow()
    result = await db.messages.update_one(
        {"id": message_id, "partner_id": partner["id"]},
        {"$set": {"read": True, "read_at": read_at}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")

    # Create read receipt for admin
    read_receipt = {
        "id": str(uuid.uuid4()),
        "message_id": message_id,
        "order_number": message.get("order_number", ""),
        "partner_id": partner["id"],
        "partner_name": partner.get("company_name", partner.get("contact_name", "Partner")),
        "message_title": message.get("title", ""),
        "read_at": read_at,
        "created_at": read_at
    }
    await db.read_receipts.insert_one(read_receipt)

    return {"status": "success", "read_at": read_at.isoformat()}


class PartnerMessageRequest(BaseModel):
    token: str
    recipient: str
    content: str
    partner_name: Optional[str] = None
    partner_email: Optional[str] = None
    order_number: Optional[str] = None


@api_router.post("/partner/messages")
async def send_partner_message(request: PartnerMessageRequest):
    """Partner sends a message to PM or Admin"""
    # Verify token
    partner = await db.partners.find_one({"token": request.token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Create the message
    message_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Determine recipient type
    recipient_type = "admin"
    recipient_name = "Admin"
    if request.recipient.startswith("pm:"):
        recipient_type = "pm"
        recipient_name = request.recipient.replace("pm:", "")

    partner_message = {
        "id": message_id,
        "type": "partner_message",
        "from_partner_id": partner["id"],
        "from_partner_name": request.partner_name or partner.get("company_name", partner.get("contact_name", "Partner")),
        "from_partner_email": request.partner_email or partner.get("email"),
        "recipient_type": recipient_type,
        "recipient_name": recipient_name,
        "order_number": request.order_number,
        "content": request.content,
        "read": False,
        "created_at": now
    }

    await db.partner_messages.insert_one(partner_message)

    # Create notification for admin
    notification = {
        "id": str(uuid.uuid4()),
        "type": "partner_message",
        "title": f"New message from {partner_message['from_partner_name']}",
        "message": request.content[:100] + ("..." if len(request.content) > 100 else ""),
        "partner_id": partner["id"],
        "partner_name": partner_message['from_partner_name'],
        "recipient_type": recipient_type,
        "recipient_name": recipient_name,
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)

    return {"status": "success", "message_id": message_id}


@api_router.get("/partner/conversations")
async def get_partner_conversations(token: str):
    """Get partner's message conversations with admin replies"""
    # Verify token
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    partner_id = partner["id"]

    # Get sent messages by partner
    sent_messages = await db.partner_messages.find(
        {"from_partner_id": partner_id}
    ).sort("created_at", -1).to_list(100)

    # Get admin replies to partner
    admin_replies = await db.partner_conversations.find(
        {"partner_id": partner_id}
    ).sort("created_at", -1).to_list(100)

    # Combine and organize into conversation threads
    conversations = []

    # Add sent messages
    for msg in sent_messages:
        msg["_id"] = str(msg["_id"])
        msg["direction"] = "sent"
        if msg.get("created_at"):
            msg["created_at"] = msg["created_at"].isoformat()
        if msg.get("read_at"):
            msg["read_at"] = msg["read_at"].isoformat()
        if msg.get("replied_at"):
            msg["replied_at"] = msg["replied_at"].isoformat()
        conversations.append(msg)

    # Add admin replies
    for reply in admin_replies:
        reply["_id"] = str(reply["_id"])
        reply["direction"] = "received"
        if reply.get("created_at"):
            reply["created_at"] = reply["created_at"].isoformat()
        if reply.get("read_at"):
            reply["read_at"] = reply["read_at"].isoformat()
        conversations.append(reply)

    # Sort by created_at descending
    conversations.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {"conversations": conversations}


@api_router.put("/partner/conversations/{conversation_id}/read")
async def mark_conversation_read(conversation_id: str, token: str):
    """Mark a conversation item as read"""
    # Verify token
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Try to update in partner_conversations collection
    result = await db.partner_conversations.update_one(
        {"id": conversation_id, "partner_id": partner["id"]},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {"status": "success"}


@api_router.get("/admin/partner-messages")
async def get_admin_partner_messages(admin_key: str, limit: int = 50):
    """Get messages sent by partners for admin view"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    messages = await db.partner_messages.find().sort("created_at", -1).limit(limit).to_list(limit)

    for msg in messages:
        msg["_id"] = str(msg["_id"])
        if msg.get("created_at"):
            msg["created_at"] = msg["created_at"].isoformat()

    return {"messages": messages}


@api_router.put("/admin/partner-messages/{message_id}/read")
async def mark_partner_message_read(message_id: str, admin_key: str):
    """Mark a partner message as read by admin"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.partner_messages.update_one(
        {"id": message_id},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"status": "success"}


class ReplyToPartnerRequest(BaseModel):
    content: str
    partner_email: str
    partner_name: str
    admin_name: Optional[str] = "Admin"


@api_router.post("/admin/partner-messages/{message_id}/reply")
async def reply_to_partner_message(message_id: str, request: ReplyToPartnerRequest, admin_key: str):
    """Admin replies to a partner message via email and stores in portal"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get the original message
    message = await db.partner_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    now = datetime.utcnow()
    reply_id = str(uuid.uuid4())

    # Mark message as read and store reply reference
    await db.partner_messages.update_one(
        {"id": message_id},
        {"$set": {"read": True, "read_at": now, "replied": True, "replied_at": now, "reply_id": reply_id}}
    )

    # Store the reply in partner_conversations collection for the partner to see
    conversation_reply = {
        "id": reply_id,
        "type": "admin_reply",
        "partner_id": message.get("from_partner_id"),
        "partner_name": request.partner_name,
        "partner_email": request.partner_email,
        "original_message_id": message_id,
        "original_message_content": message.get("content", ""),
        "order_number": message.get("order_number"),
        "from_admin_name": request.admin_name or "Admin",
        "content": request.content,
        "read": False,
        "created_at": now
    }
    await db.partner_conversations.insert_one(conversation_reply)

    # Send email reply to partner
    try:
        email_html = f'''
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Legacy Translations</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p style="color: #374151;">Dear {request.partner_name},</p>
                <p style="color: #374151;">You have received a reply to your message:</p>

                <div style="background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
                    <p style="color: #4338ca; font-style: italic; margin: 0;">Your message:</p>
                    <p style="color: #374151; margin: 10px 0 0 0;">{message.get('content', '')}</p>
                </div>

                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="color: #7c3aed; font-weight: bold; margin: 0 0 10px 0;">Reply from {request.admin_name}:</p>
                    <p style="color: #374151; margin: 0; white-space: pre-wrap;">{request.content}</p>
                </div>

                <p style="color: #374151;">If you have any further questions, please feel free to reply to this email or send a new message through the portal.</p>

                <p style="color: #374151; margin-top: 30px;">Best regards,<br><strong>Legacy Translations Team</strong></p>
            </div>
            <div style="background: #1f2937; padding: 15px; text-align: center;">
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">© 2024 Legacy Translations. All rights reserved.</p>
            </div>
        </div>
        '''

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Reply from Legacy Translations - {request.admin_name}"
        msg['From'] = os.environ.get("SMTP_EMAIL", "noreply@legacytranslations.com")
        msg['To'] = request.partner_email
        msg.attach(MIMEText(email_html, 'html'))

        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_email = os.environ.get("SMTP_EMAIL")
        smtp_password = os.environ.get("SMTP_PASSWORD")

        if smtp_email and smtp_password:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
    except Exception as e:
        print(f"Failed to send reply email: {e}")
        # Don't fail the request even if email fails

    return {"status": "success", "message": "Reply sent"}


@api_router.get("/admin/partner-response-times")
async def get_partner_response_times(admin_key: str):
    """Get response time statistics for partner messages"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Get all partner messages
    messages = await db.partner_messages.find().sort("created_at", -1).to_list(1000)

    # Group by partner and calculate stats
    partner_stats = {}
    for msg in messages:
        partner_id = msg.get("from_partner_id", "unknown")
        partner_name = msg.get("from_partner_name", "Unknown Partner")

        if partner_id not in partner_stats:
            partner_stats[partner_id] = {
                "partner_id": partner_id,
                "partner_name": partner_name,
                "partner_email": msg.get("from_partner_email", ""),
                "total_messages": 0,
                "replied_messages": 0,
                "pending_messages": 0,
                "response_times": [],
                "messages": []
            }

        partner_stats[partner_id]["total_messages"] += 1

        msg_data = {
            "id": msg.get("id"),
            "content": msg.get("content", "")[:100] + ("..." if len(msg.get("content", "")) > 100 else ""),
            "order_number": msg.get("order_number"),
            "created_at": msg.get("created_at").isoformat() if msg.get("created_at") else None,
            "replied": msg.get("replied", False),
            "replied_at": msg.get("replied_at").isoformat() if msg.get("replied_at") else None,
            "response_time_hours": None
        }

        if msg.get("replied") and msg.get("replied_at") and msg.get("created_at"):
            response_time = (msg["replied_at"] - msg["created_at"]).total_seconds() / 3600
            msg_data["response_time_hours"] = round(response_time, 2)
            partner_stats[partner_id]["response_times"].append(response_time)
            partner_stats[partner_id]["replied_messages"] += 1
        else:
            partner_stats[partner_id]["pending_messages"] += 1

        partner_stats[partner_id]["messages"].append(msg_data)

    # Calculate averages
    result = []
    for partner_id, stats in partner_stats.items():
        avg_response_time = None
        if stats["response_times"]:
            avg_response_time = round(sum(stats["response_times"]) / len(stats["response_times"]), 2)

        result.append({
            "partner_id": stats["partner_id"],
            "partner_name": stats["partner_name"],
            "partner_email": stats["partner_email"],
            "total_messages": stats["total_messages"],
            "replied_messages": stats["replied_messages"],
            "pending_messages": stats["pending_messages"],
            "avg_response_time_hours": avg_response_time,
            "messages": stats["messages"][:10]  # Last 10 messages
        })

    # Sort by pending messages first, then by avg response time
    result.sort(key=lambda x: (-x["pending_messages"], x["avg_response_time_hours"] or 999))

    return {"partner_stats": result}


class PartnerNotificationRequest(BaseModel):
    partner_id: str
    partner_email: str
    partner_name: str
    subject: Optional[str] = "Message from Legacy Translations"
    content: str
    admin_name: Optional[str] = "Admin"


@api_router.post("/admin/send-partner-notification")
async def send_partner_notification(request: PartnerNotificationRequest, admin_key: str):
    """Admin sends a notification/message to a partner"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Create a message record
    message_id = str(uuid.uuid4())
    now = datetime.utcnow()

    admin_message = {
        "id": message_id,
        "type": "admin_to_partner",
        "to_partner_id": request.partner_id,
        "to_partner_name": request.partner_name,
        "to_partner_email": request.partner_email,
        "from_admin_name": request.admin_name,
        "subject": request.subject,
        "content": request.content,
        "read": False,
        "created_at": now
    }

    await db.partner_notifications.insert_one(admin_message)

    # Send email to partner
    try:
        email_html = f'''
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Legacy Translations</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p style="color: #374151;">Dear {request.partner_name},</p>
                <p style="color: #374151;">You have received a new message:</p>

                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="color: #0284c7; font-weight: bold; margin: 0 0 10px 0;">Message from {request.admin_name}:</p>
                    <p style="color: #374151; margin: 0; white-space: pre-wrap;">{request.content}</p>
                </div>

                <p style="color: #374151;">You can reply to this message through your partner portal.</p>

                <p style="color: #374151; margin-top: 30px;">Best regards,<br><strong>Legacy Translations Team</strong></p>
            </div>
        </div>
        '''

        msg = MIMEMultipart('alternative')
        msg['Subject'] = request.subject
        msg['From'] = os.environ.get("SMTP_EMAIL", "noreply@legacytranslations.com")
        msg['To'] = request.partner_email
        msg.attach(MIMEText(email_html, 'html'))

        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_email = os.environ.get("SMTP_EMAIL")
        smtp_password = os.environ.get("SMTP_PASSWORD")

        if smtp_email and smtp_password:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
    except Exception as e:
        print(f"Failed to send partner notification email: {e}")

    return {"status": "success", "message_id": message_id}


@api_router.get("/partner/notifications")
async def get_partner_notifications(token: str):
    """Get notifications for a partner"""
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    notifications = await db.partner_notifications.find(
        {"to_partner_id": partner["id"]}
    ).sort("created_at", -1).limit(50).to_list(50)

    for notif in notifications:
        notif["_id"] = str(notif["_id"])
        if notif.get("created_at"):
            notif["created_at"] = notif["created_at"].isoformat()

    return {"notifications": notifications}


@api_router.put("/partner/notifications/{notification_id}/read")
async def mark_partner_notification_read(notification_id: str, token: str):
    """Mark a partner notification as read"""
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.partner_notifications.update_one(
        {"id": notification_id, "to_partner_id": partner["id"]},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )

    return {"status": "success"}


@api_router.get("/admin/read-receipts")
async def get_read_receipts(admin_key: str, limit: int = 50):
    """Get read receipts for admin - shows when partners read messages"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    receipts = await db.read_receipts.find().sort("read_at", -1).limit(limit).to_list(limit)

    for receipt in receipts:
        receipt["_id"] = str(receipt["_id"])
        if receipt.get("read_at"):
            receipt["read_at"] = receipt["read_at"].isoformat()
        if receipt.get("created_at"):
            receipt["created_at"] = receipt["created_at"].isoformat()

    return {"receipts": receipts}


# ==================== TRANSLATOR MESSAGES ====================

class TranslatorMessageRequest(BaseModel):
    translator_id: str
    translator_name: str
    translator_email: Optional[str] = None
    content: str
    order_number: Optional[str] = None
    admin_name: Optional[str] = "Admin"


@api_router.post("/admin/send-file-assignment-email")
async def send_file_assignment_email(admin_key: str, request: dict = Body(...)):
    """Send email invitation to translator for a specific file assignment"""
    # Validate admin key or user token
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await db.admin_users.find_one({"token": admin_key, "is_active": True})
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    translator_email = request.get("translator_email")
    translator_name = request.get("translator_name", "Translator")
    document_name = request.get("document_name", "Document")
    order_number = request.get("order_number", "")
    language_pair = request.get("language_pair", "")
    pm_name = request.get("pm_name", "Project Manager")

    if not translator_email:
        raise HTTPException(status_code=400, detail="Translator email is required")

    # Create email content
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">📄 New Document Assignment</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px;">Hello <strong>{translator_name}</strong>,</p>
            <p>You have been assigned a new document to translate:</p>

            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>📋 Order:</strong> {order_number}</p>
                <p style="margin: 5px 0;"><strong>📄 Document:</strong> {document_name}</p>
                <p style="margin: 5px 0;"><strong>🌐 Language:</strong> {language_pair}</p>
                <p style="margin: 5px 0;"><strong>👤 Assigned by:</strong> {pm_name}</p>
            </div>

            <p>Please log in to your translator portal to view and work on this document.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{os.environ.get('FRONTEND_URL', 'https://legacy-portal-frontend.onrender.com')}/#/admin"
                   style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Open Translator Portal
                </a>
            </div>

            <p style="color: #64748b; font-size: 14px;">If you have any questions, please contact your project manager.</p>
        </div>
        <div style="background: #1e293b; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">Legacy Translations - Professional Translation Services</p>
        </div>
    </div>
    """

    try:
        await email_service.send_email(
            translator_email,
            f"📄 New Document Assignment - {order_number}",
            email_html
        )
        logger.info(f"Sent file assignment email to {translator_name} ({translator_email}) for {document_name}")
        return {"status": "success", "message": f"Email sent to {translator_name}"}
    except Exception as e:
        logger.error(f"Failed to send file assignment email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


def get_project_assignment_email_template(translator_name: str, order_details: dict, files_list: list, accept_url: str, decline_url: str) -> str:
    """Generate professional email template for complete project assignment with accept/decline buttons"""

    # Build files list HTML
    files_html = ""
    for idx, doc in enumerate(files_list, 1):
        filename = doc.get("filename", "Document")
        files_html += f'''
                                            <tr>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{idx}. {filename}</td>
                                            </tr>'''

    total_files = len(files_list)

    content = f'''
                            <p style="color: #1a2a4a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                                Hello, {translator_name}
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                You have been assigned a new translation project with {total_files} file(s). Please review the details below and accept or decline this assignment.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #1a2a4a; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                                            Project Details
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0; width: 40%;"><strong>Project Number:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0; font-weight: 600;">{order_details.get('order_number', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Languages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('translate_from', 'N/A').title()} &rarr; {order_details.get('translate_to', 'N/A').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Total Files:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{total_files} file(s)</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Deadline:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('deadline', 'To be confirmed')}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #1a2a4a; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                                            Files in this Project ({total_files})
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            {files_html}
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 10px;">
                                        <a href="{accept_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #218838 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); margin: 5px;">
                                            ACCEPT PROJECT
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 10px;">
                                        <a href="{decline_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); margin: 5px;">
                                            DECLINE PROJECT
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #64748b; font-size: 13px; line-height: 1.7; margin: 20px 0; text-align: center;">
                                Please respond as soon as possible so we can proceed with the project.
                            </p>
                            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                                Regards,
                            </p>'''
    return get_email_header() + content + get_email_footer(include_review_button=False)


@api_router.post("/admin/send-project-assignment-email")
async def send_project_assignment_email(admin_key: str, request: dict = Body(...)):
    """Send email invitation to translator for complete project assignment (all files at once)"""
    # Validate admin key or user token
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await db.admin_users.find_one({"token": admin_key, "is_active": True})
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    translator_email = request.get("translator_email")
    translator_name = request.get("translator_name", "Translator")
    translator_id = request.get("translator_id")
    order_id = request.get("order_id")
    order_number = request.get("order_number", "")
    language_pair = request.get("language_pair", "")
    documents = request.get("documents", [])
    total_files = request.get("total_files", len(documents))
    deadline = request.get("deadline")

    if not translator_email:
        raise HTTPException(status_code=400, detail="Translator email is required")

    if not documents:
        raise HTTPException(status_code=400, detail="No documents provided")

    if not order_id:
        raise HTTPException(status_code=400, detail="Order ID is required")

    # Format deadline if provided
    deadline_text = "To be confirmed"
    if deadline:
        try:
            deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            deadline_text = deadline_dt.strftime("%B %d, %Y at %I:%M %p")
        except:
            deadline_text = deadline

    # Parse language pair
    translate_from = ""
    translate_to = ""
    if language_pair and " → " in language_pair:
        parts = language_pair.split(" → ")
        translate_from = parts[0].strip() if len(parts) > 0 else ""
        translate_to = parts[1].strip() if len(parts) > 1 else ""
    elif language_pair and " -> " in language_pair:
        parts = language_pair.split(" -> ")
        translate_from = parts[0].strip() if len(parts) > 0 else ""
        translate_to = parts[1].strip() if len(parts) > 1 else ""

    # Generate assignment token and update order
    assignment_token = str(uuid.uuid4())
    await db.translation_orders.update_one(
        {"id": order_id},
        {"$set": {
            "translator_assignment_token": assignment_token,
            "translator_assignment_status": "pending",
            "translator_assignment_responded_at": None
        }}
    )

    # Build accept/decline URLs
    frontend_url = os.environ.get("FRONTEND_URL", "https://legacy-portal-frontend.onrender.com")
    accept_url = f"{frontend_url}/#/assignment/{assignment_token}/accept"
    decline_url = f"{frontend_url}/#/assignment/{assignment_token}/decline"

    # Prepare order details for email template
    order_details = {
        "order_number": order_number,
        "translate_from": translate_from,
        "translate_to": translate_to,
        "deadline": deadline_text
    }

    # Generate email HTML using professional template
    email_html = get_project_assignment_email_template(
        translator_name,
        order_details,
        documents,
        accept_url,
        decline_url
    )

    try:
        await email_service.send_email(
            translator_email,
            f"New Project Assignment - {order_number} ({total_files} files)",
            email_html
        )
        logger.info(f"Sent project assignment email to {translator_name} ({translator_email}) for order {order_number} with {total_files} files")
        return {"status": "success", "message": f"Project email sent to {translator_name} with {total_files} files"}
    except Exception as e:
        logger.error(f"Failed to send project assignment email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@api_router.post("/admin/translator-messages")
async def send_translator_message(request: TranslatorMessageRequest, admin_key: str):
    """Admin/PM sends a message to a translator"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    message_id = str(uuid.uuid4())
    now = datetime.utcnow()

    translator_message = {
        "id": message_id,
        "type": "admin_to_translator",
        "to_translator_id": request.translator_id,
        "to_translator_name": request.translator_name,
        "to_translator_email": request.translator_email,
        "from_admin_name": request.admin_name,
        "order_number": request.order_number,
        "content": request.content,
        "read": False,
        "created_at": now
    }

    await db.translator_messages.insert_one(translator_message)

    return {"status": "success", "message_id": message_id}


@api_router.get("/translator/messages")
async def get_translator_messages(admin_key: str, translator_id: str = None, token: str = None):
    """Get messages for a translator"""
    # Can be accessed by admin or by translator with token
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    if not translator_id:
        raise HTTPException(status_code=400, detail="translator_id required")

    messages = await db.translator_messages.find(
        {"to_translator_id": translator_id}
    ).sort("created_at", -1).limit(50).to_list(50)

    for msg in messages:
        msg["_id"] = str(msg["_id"])
        if msg.get("created_at"):
            msg["created_at"] = msg["created_at"].isoformat()

    return {"messages": messages}


@api_router.put("/translator/messages/{message_id}/read")
async def mark_translator_message_read(message_id: str, admin_key: str):
    """Mark a translator message as read"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.translator_messages.update_one(
        {"id": message_id},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )

    return {"status": "success"}


@api_router.post("/translator/send-message")
async def translator_send_message_to_admin(admin_key: str, request: dict = Body(...)):
    """Translator sends a message to Admin/PM"""
    # Allow translator token or admin key
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await db.admin_users.find_one({"token": admin_key, "is_active": True})
        if user:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    message_id = str(uuid.uuid4())
    now = datetime.utcnow()

    translator_message = {
        "id": message_id,
        "type": "translator_to_admin",
        "from_translator_id": request.get("translator_id"),
        "from_translator_name": request.get("translator_name", "Translator"),
        "to_recipient_id": request.get("recipient_id"),
        "to_recipient_name": request.get("recipient_name", "Admin"),
        "to_recipient_role": request.get("recipient_role", "admin"),
        "content": request.get("content", ""),
        "read": False,
        "created_at": now
    }

    await db.translator_messages.insert_one(translator_message)

    # Also create a notification for the recipient
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": request.get("recipient_id"),
        "type": "translator_message",
        "title": f"Message from {request.get('translator_name', 'Translator')}",
        "message": request.get("content", "")[:100] + ("..." if len(request.get("content", "")) > 100 else ""),
        "read": False,
        "created_at": now
    })

    return {"status": "success", "message_id": message_id}


@api_router.get("/messages/unread-count")
async def get_unread_count(token: str):
    """Get count of unread messages"""
    # Verify token
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    count = await db.messages.count_documents({"partner_id": partner["id"], "read": False})
    return {"unread_count": count}


# ==================== DOCUMENTS ENDPOINTS ====================

@api_router.get("/documents")
async def get_partner_documents(token: str):
    """Get all documents uploaded by the partner"""
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    documents = await db.documents.find(
        {"partner_id": partner["id"]}
    ).sort("created_at", -1).to_list(100)

    # Remove file_data from response (too large)
    for doc in documents:
        doc["_id"] = str(doc["_id"])
        doc.pop("file_data", None)
        doc.pop("extracted_text", None)
        if doc.get("created_at"):
            doc["created_at"] = doc["created_at"].isoformat()

    return {"documents": documents}


@api_router.get("/documents/{document_id}")
async def get_document(document_id: str, token: str):
    """Get a specific document (without file data)"""
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    document = await db.documents.find_one({"id": document_id, "partner_id": partner["id"]})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document["_id"] = str(document["_id"])
    document.pop("file_data", None)  # Don't send file data in this endpoint
    if document.get("created_at"):
        document["created_at"] = document["created_at"].isoformat()

    return document


@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str, token: str):
    """Download a document file"""
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    document = await db.documents.find_one({"id": document_id, "partner_id": partner["id"]})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "filename": document["filename"],
        "content_type": document["content_type"],
        "file_data": document["file_data"]  # Base64 encoded
    }


@api_router.get("/orders/{order_id}/documents")
async def get_order_documents(order_id: str, token: str):
    """Get all documents for a specific order"""
    partner = await db.partners.find_one({"token": token})
    if not partner:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Verify order belongs to partner
    order = await db.translation_orders.find_one({"id": order_id, "partner_id": partner["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    documents = await db.documents.find({"order_id": order_id}).to_list(50)

    for doc in documents:
        doc["_id"] = str(doc["_id"])
        doc.pop("file_data", None)
        doc.pop("extracted_text", None)
        if doc.get("created_at"):
            doc["created_at"] = doc["created_at"].isoformat()

    return {"documents": documents}


@api_router.get("/admin/documents")
async def admin_get_documents(admin_key: str, order_id: Optional[str] = None):
    """Admin: Get documents, optionally filtered by order"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    query = {"order_id": order_id} if order_id else {}
    documents = await db.documents.find(query).sort("created_at", -1).to_list(100)

    for doc in documents:
        doc["_id"] = str(doc["_id"])
        doc.pop("file_data", None)  # Don't send in list
        if doc.get("created_at"):
            doc["created_at"] = doc["created_at"].isoformat()

    return {"documents": documents}


@api_router.get("/admin/documents/{document_id}/download")
async def admin_download_document(document_id: str, admin_key: str):
    """Admin: Download a document file"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "filename": document["filename"],
        "content_type": document["content_type"],
        "file_data": document["file_data"],
        "extracted_text": document.get("extracted_text", "")
    }

@api_router.get("/admin/orders/{order_id}/documents")
async def admin_get_order_documents(order_id: str, admin_key: str):
    """Admin/PM/Translator: Get all documents for an order (from both collections)"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Get documents from main documents collection
    docs_main = await db.documents.find({"order_id": order_id}).to_list(50)

    # Get documents from order_documents collection (manual uploads)
    docs_manual = await db.order_documents.find({"order_id": order_id}).to_list(50)

    all_docs = []

    for doc in docs_main:
        doc["_id"] = str(doc["_id"])
        all_docs.append({
            "id": doc.get("id"),
            "filename": doc.get("filename"),
            "content_type": doc.get("content_type", "application/pdf"),
            "has_data": bool(doc.get("file_data")),
            "source": "partner_upload"
        })

    for doc in docs_manual:
        doc["_id"] = str(doc["_id"])
        all_docs.append({
            "id": doc.get("id"),
            "filename": doc.get("filename"),
            "content_type": doc.get("content_type", "application/pdf"),
            "has_data": bool(doc.get("data")),
            "source": doc.get("source", "manual_upload"),
            "uploaded_at": doc.get("uploaded_at").isoformat() if doc.get("uploaded_at") else None
        })

    return {"documents": all_docs, "count": len(all_docs)}

class OrderDocumentUpload(BaseModel):
    filename: str
    file_data: str  # Base64 encoded
    content_type: Optional[str] = "application/pdf"
    source: Optional[str] = "manual_upload"

@api_router.post("/admin/orders/{order_id}/documents")
async def admin_upload_order_document(order_id: str, doc_data: OrderDocumentUpload, admin_key: str):
    """Admin/PM: Upload a document to an existing order"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Verify order exists
    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        doc_record = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "filename": doc_data.filename,
            "data": doc_data.file_data,
            "content_type": doc_data.content_type,
            "source": doc_data.source,
            "uploaded_at": datetime.utcnow()
        }
        await db.order_documents.insert_one(doc_record)
        logger.info(f"Document '{doc_data.filename}' uploaded to order {order_id}")

        return {
            "status": "success",
            "message": f"Document '{doc_data.filename}' uploaded successfully",
            "document_id": doc_record["id"]
        }
    except Exception as e:
        logger.error(f"Error uploading document to order {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@api_router.get("/admin/order-documents/{doc_id}/download")
async def admin_download_order_document(doc_id: str, admin_key: str):
    """Admin/PM/Translator: Download a document from order_documents collection"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Try order_documents first (manual uploads)
    document = await db.order_documents.find_one({"id": doc_id})
    if document:
        return {
            "filename": document.get("filename", "document.pdf"),
            "content_type": "application/pdf",
            "file_data": document.get("data", "")
        }

    # Try main documents collection
    document = await db.documents.find_one({"id": doc_id})
    if document:
        return {
            "filename": document.get("filename", "document.pdf"),
            "content_type": document.get("content_type", "application/pdf"),
            "file_data": document.get("file_data", "")
        }

    raise HTTPException(status_code=404, detail="Document not found")

@api_router.patch("/admin/order-documents/{doc_id}")
async def admin_update_order_document(doc_id: str, admin_key: str, update_data: dict = Body(...)):
    """Admin/PM: Update document metadata (e.g., assign translator to specific document)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only allow admin or PM to update
    if user_info.get("role") not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Only admin or PM can update document assignments")

    # Fields that can be updated
    allowed_fields = ["assigned_translator_id", "assigned_translator_name", "notes", "status"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}

    if not update_dict:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    # Try order_documents first
    result = await db.order_documents.update_one(
        {"id": doc_id},
        {"$set": update_dict}
    )

    if result.modified_count == 0:
        # Try main documents collection
        result = await db.documents.update_one(
            {"id": doc_id},
            {"$set": update_dict}
        )

    # Also check if matched but not modified (same values)
    if result.matched_count > 0:
        return {"success": True, "message": "Document updated successfully"}

    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"success": True, "message": "Document updated successfully"}

@api_router.put("/admin/order-documents/{doc_id}")
async def admin_replace_order_document(doc_id: str, admin_key: str, document_data: dict):
    """Replace document content (file_data, filename, content_type)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    filename = document_data.get("filename")
    file_data = document_data.get("file_data")
    content_type = document_data.get("content_type", "application/pdf")

    if not file_data:
        raise HTTPException(status_code=400, detail="file_data is required")

    update_dict = {
        "data": file_data,
        "filename": filename,
        "content_type": content_type,
        "replaced_at": datetime.utcnow().isoformat(),
        "replaced_by": user_info.get("name", "Unknown")
    }

    # Try order_documents first
    result = await db.order_documents.update_one(
        {"id": doc_id},
        {"$set": update_dict}
    )

    if result.modified_count == 0:
        # Try main documents collection
        update_dict["file_data"] = file_data  # Different field name in documents collection
        del update_dict["data"]
        result = await db.documents.update_one(
            {"id": doc_id},
            {"$set": update_dict}
        )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"success": True, "message": "Document replaced successfully", "filename": filename}

@api_router.delete("/admin/order-documents/{doc_id}")
async def admin_delete_order_document(doc_id: str, admin_key: str):
    """Admin/PM: Delete a document from an order"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only allow admin or PM to delete
    if user_info.get("role") not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Only admin or PM can delete documents")

    # Try order_documents first
    result = await db.order_documents.delete_one({"id": doc_id})

    if result.deleted_count == 0:
        # Try main documents collection
        result = await db.documents.delete_one({"id": doc_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")

    logger.info(f"Document {doc_id} deleted by {user_info.get('name', 'Unknown')}")
    return {"success": True, "message": "Document deleted successfully"}


# ==================== TRANSLATION WORKSPACE ENDPOINTS ====================

class OCRRequest(BaseModel):
    file_base64: str
    file_type: str
    filename: str
    use_claude: Optional[bool] = False
    claude_api_key: Optional[str] = None
    special_commands: Optional[str] = None
    preserve_layout: Optional[bool] = True

class TranslatorNoteSettings(BaseModel):
    enabled: bool = False
    source_currency: Optional[str] = None  # e.g., 'BRL', 'NOK'
    target_currency: Optional[str] = None  # e.g., 'USD', 'CAD'
    exchange_rate: Optional[float] = None  # e.g., 5.42 (BRL per 1 USD)
    rate_date: Optional[str] = None  # e.g., '2024-12-26'
    rate_source: Optional[str] = None  # e.g., 'https://www.xe.com/currencyconverter/'
    convert_values: Optional[bool] = True  # Whether to convert monetary values
    source_currency_symbol: Optional[str] = None  # e.g., 'R$'
    target_currency_symbol: Optional[str] = None  # e.g., '$'

class TranslateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str
    document_type: str
    claude_api_key: str
    action: str  # 'translate' or correction commands
    current_translation: Optional[str] = None
    general_instructions: Optional[str] = None  # Additional user instructions
    preserve_layout: Optional[bool] = True  # Maintain original document layout
    page_format: Optional[str] = 'letter'  # 'letter' or 'a4'
    original_image: Optional[str] = None  # Base64 image for visual layout reference
    translator_note: Optional[TranslatorNoteSettings] = None  # For financial document currency conversion

@api_router.post("/admin/ocr")
async def admin_ocr(request: OCRRequest, admin_key: str):
    """Perform OCR on uploaded document (admin translation workspace)"""
    # Validate admin key OR valid token
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        # Check if it's a valid user token
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Decode base64 file
        file_content = base64.b64decode(request.file_base64)
        file_extension = request.filename.split('.')[-1].lower() if '.' in request.filename else ''

        logger.info(f"OCR request for file: {request.filename}, type: {request.file_type}, size: {len(file_content)} bytes, use_claude: {request.use_claude}")

        # Determine file type
        is_image = request.file_type.startswith('image/') or file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif', 'webp']
        is_pdf = request.file_type == 'application/pdf' or file_extension == 'pdf'

        text = ""

        # Use Claude for OCR if requested
        if request.use_claude and request.claude_api_key:
            logger.info("Using Claude AI for OCR with layout preservation...")
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=request.claude_api_key)

                # Build the OCR prompt
                ocr_prompt = """Extract ALL text from this document image.

CRITICAL INSTRUCTIONS:
1. Maintain the EXACT original layout, structure, and formatting
2. Preserve all line breaks, spacing, and indentation
3. Keep tables in their original format using markdown table syntax or ASCII art
4. Preserve headers, titles, and sections exactly as they appear
5. Include ALL text, even small print, stamps, and signatures
6. Use ** for bold text and * for italic text where visible
7. Maintain the visual hierarchy of the document

"""
                if request.special_commands:
                    ocr_prompt += f"\nAdditional instructions: {request.special_commands}\n"

                ocr_prompt += "\nExtract the complete text now, preserving the original layout:"

                # Handle PDFs by converting to images first
                if is_pdf:
                    logger.info("Converting PDF to images for Claude OCR...")
                    try:
                        pdf_document = fitz.open(stream=file_content, filetype="pdf")
                        all_text = []

                        for page_num in range(min(pdf_document.page_count, 15)):
                            page = pdf_document[page_num]
                            # Convert page to PNG image at 2x resolution
                            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                            img_data = pix.tobytes("png")
                            image_data = base64.b64encode(img_data).decode('utf-8')

                            message = client.messages.create(
                                model="claude-sonnet-4-5-20250929",
                                max_tokens=4096,
                                messages=[
                                    {
                                        "role": "user",
                                        "content": [
                                            {
                                                "type": "image",
                                                "source": {
                                                    "type": "base64",
                                                    "media_type": "image/png",
                                                    "data": image_data,
                                                },
                                            },
                                            {
                                                "type": "text",
                                                "text": ocr_prompt
                                            }
                                        ],
                                    }
                                ],
                            )

                            page_text = message.content[0].text
                            if page_text and page_text.strip():
                                all_text.append(f"--- Page {page_num + 1} ---\n{page_text}")

                        num_pages = pdf_document.page_count
                        pdf_document.close()
                        text = "\n\n".join(all_text)
                        logger.info(f"Claude OCR extracted {len(text)} characters from {num_pages} PDF pages")

                        if text and len(text.strip()) > 10:
                            return {"status": "success", "text": text, "method": "claude"}
                    except Exception as pdf_err:
                        logger.error(f"Claude PDF OCR failed: {str(pdf_err)}, falling back to standard OCR")
                else:
                    # For images, send directly to Claude
                    image_data = base64.b64encode(file_content).decode('utf-8')
                    media_type = request.file_type if request.file_type.startswith('image/') else 'image/png'

                    message = client.messages.create(
                        model="claude-sonnet-4-5-20250929",
                        max_tokens=4096,
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image",
                                        "source": {
                                            "type": "base64",
                                            "media_type": media_type,
                                            "data": image_data,
                                        },
                                    },
                                    {
                                        "type": "text",
                                        "text": ocr_prompt
                                    }
                                ],
                            }
                        ],
                    )

                    text = message.content[0].text
                    logger.info(f"Claude OCR extracted {len(text)} characters with layout preservation")

                    if text and len(text.strip()) > 10:
                        return {"status": "success", "text": text, "method": "claude"}

            except Exception as e:
                logger.error(f"Claude OCR failed: {str(e)}, falling back to standard OCR")
                # Fall through to standard OCR methods

        html_content = ""  # Will store HTML version for visual layout

        if is_image:
            # Try AWS Textract first for images
            if textract_client:
                logger.info("Using AWS Textract for image OCR...")
                textract_result = extract_text_with_textract(file_content, file_extension)
                if textract_result:
                    text = textract_result.get('text', '')
                    html_content = textract_result.get('html', '')
                    if text and len(text.strip()) > 10:
                        logger.info(f"Textract extracted {len(text)} characters")
                    else:
                        text = ""

            # Fallback to Tesseract if Textract didn't work
            if not text:
                logger.info("Using Tesseract for image OCR with multiple configs...")
                try:
                    image = Image.open(io.BytesIO(file_content))
                    if image.mode != 'RGB':
                        image = image.convert('RGB')

                    # Enhance image for better OCR
                    from PIL import ImageEnhance, ImageFilter
                    enhancer = ImageEnhance.Contrast(image)
                    image = enhancer.enhance(2.0)
                    image = image.filter(ImageFilter.SHARPEN)

                    # Resize if too small
                    width, height = image.size
                    if width < 1000 or height < 1000:
                        scale_factor = max(1000/width, 1000/height)
                        new_width = int(width * scale_factor)
                        new_height = int(height * scale_factor)
                        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

                    # Try multiple Tesseract configurations for best result
                    configs = [
                        r'--oem 3 --psm 6',   # Uniform text block
                        r'--oem 3 --psm 3',   # Fully automatic
                        r'--oem 3 --psm 4',   # Single column
                        r'--oem 3 --psm 1',   # Auto with OSD
                        r'--oem 3 --psm 12',  # Sparse text
                    ]

                    best_text = ""
                    for config in configs:
                        try:
                            result = pytesseract.image_to_string(image, config=config)
                            if len(result.strip()) > len(best_text.strip()):
                                best_text = result
                                logger.info(f"Tesseract config {config} extracted {len(result)} chars")
                        except Exception as cfg_error:
                            logger.warning(f"Tesseract config {config} failed: {str(cfg_error)}")
                            continue

                    text = best_text
                    logger.info(f"Tesseract extracted {len(text)} characters (best result)")
                except Exception as e:
                    logger.error(f"Tesseract OCR failed: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

        elif is_pdf:
            # Try text extraction first
            try:
                with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"

                if text.strip() and len(text.strip()) > 50:
                    logger.info(f"pdfplumber extracted {len(text)} characters (text-based PDF)")
            except Exception as e:
                logger.warning(f"pdfplumber failed: {str(e)}")

            # If text extraction failed, use OCR
            if not text or len(text.strip()) < 50:
                logger.info("PDF appears to be image-based, using OCR...")

                # Try Textract first
                if textract_client:
                    logger.info("Using AWS Textract for PDF OCR...")
                    textract_result = extract_text_with_textract(file_content, 'pdf')
                    if textract_result:
                        text = textract_result.get('text', '')
                        html_content = textract_result.get('html', '')
                        if text and len(text.strip()) > 10:
                            logger.info(f"Textract extracted {len(text)} characters from PDF")

                # Fallback to Tesseract with multiple configs
                if not text or len(text.strip()) < 10:
                    logger.info("Using Tesseract for PDF OCR with multiple configs...")
                    try:
                        pdf_document = fitz.open(stream=file_content, filetype="pdf")
                        text = ""

                        # OCR configurations to try
                        configs = [
                            r'--oem 3 --psm 6',   # Uniform text block
                            r'--oem 3 --psm 3',   # Fully automatic
                            r'--oem 3 --psm 4',   # Single column
                            r'--oem 3 --psm 1',   # Auto with OSD
                            r'--oem 3 --psm 12',  # Sparse text
                        ]

                        for page_num in range(min(pdf_document.page_count, 15)):
                            page = pdf_document[page_num]
                            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                            img_data = pix.tobytes("png")

                            image = Image.open(io.BytesIO(img_data))

                            # Preprocess image
                            if image.mode != 'RGB':
                                image = image.convert('RGB')
                            from PIL import ImageEnhance, ImageFilter
                            enhancer = ImageEnhance.Contrast(image)
                            image = enhancer.enhance(2.0)
                            image = image.filter(ImageFilter.SHARPEN)

                            # Try multiple configs for best result
                            best_page_text = ""
                            for config in configs:
                                try:
                                    result = pytesseract.image_to_string(image, config=config)
                                    if len(result.strip()) > len(best_page_text.strip()):
                                        best_page_text = result
                                except:
                                    continue

                            if best_page_text.strip():
                                text += best_page_text + "\n"

                        pdf_document.close()
                        logger.info(f"Tesseract extracted {len(text)} characters from PDF (multi-config)")
                    except Exception as e:
                        logger.error(f"PDF OCR failed: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {request.file_type}")

        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from document")

        # Count words
        word_count = count_words(text)

        response = {
            "status": "success",
            "text": text.strip(),
            "word_count": word_count,
            "filename": request.filename
        }

        # Include HTML if available (for visual layout preservation)
        if html_content:
            response["html"] = html_content

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


async def fetch_matching_instructions(source_lang: str, target_lang: str, document_type: str = None) -> str:
    """Fetch translation instructions that match the language pair and document type.

    Matches instructions where:
    - sourceLang matches source_lang OR is "All Languages"
    - targetLang matches target_lang OR is "All Languages"
    - documentType matches document_type OR is "All Documents"
    """
    try:
        # Build query to match instructions
        instructions = await db.translation_instructions.find().to_list(100)

        matching_instructions = []
        for instr in instructions:
            # Check source language match
            instr_source = instr.get("sourceLang", "All Languages")
            source_match = instr_source == "All Languages" or instr_source == source_lang

            # Check target language match
            instr_target = instr.get("targetLang", "All Languages")
            target_match = instr_target == "All Languages" or instr_target == target_lang

            # Check document type match
            instr_doc_type = instr.get("documentType", "All Documents")
            doc_match = instr_doc_type == "All Documents" or (document_type and instr_doc_type.lower() in document_type.lower())

            if source_match and target_match and doc_match:
                matching_instructions.append(instr)

        if not matching_instructions:
            return ""

        # Build instruction text
        instruction_text = "\n\n═══════════════════════════════════════════════════════════════════\n"
        instruction_text += "              CUSTOM TRANSLATION INSTRUCTIONS\n"
        instruction_text += "═══════════════════════════════════════════════════════════════════\n\n"

        for instr in matching_instructions:
            title = instr.get("title", "Instruction")
            content = instr.get("content", "")
            field = instr.get("field", "")

            instruction_text += f"📋 {title}"
            if field and field != "All Fields":
                instruction_text += f" [{field}]"
            instruction_text += f"\n{content}\n\n"

        return instruction_text

    except Exception as e:
        logger.error(f"Error fetching instructions: {str(e)}")
        return ""


@api_router.post("/admin/translate")
async def admin_translate(request: TranslateRequest, admin_key: str):
    """Translate text using Claude API (admin translation workspace)"""
    # Validate admin key OR valid token
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        # Check if it's a valid user token
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm", "translator"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    if not request.claude_api_key:
        raise HTTPException(status_code=400, detail="Claude API key is required")

    try:
        # Build the prompt based on action
        if request.action == 'translate':
            # Fetch saved instructions from database that match this translation
            saved_instructions = await fetch_matching_instructions(
                source_lang=request.source_language,
                target_lang=request.target_language,
                document_type=request.document_type
            )

            # Build additional instructions (user-provided + saved)
            additional_instructions = saved_instructions
            if request.general_instructions:
                additional_instructions += f"\n\nADDITIONAL USER INSTRUCTIONS:\n{request.general_instructions}"

            # Build currency conversion instructions if translator_note is enabled
            currency_conversion_instructions = ""
            if request.translator_note and request.translator_note.enabled and request.translator_note.convert_values:
                src_symbol = request.translator_note.source_currency_symbol or request.translator_note.source_currency
                tgt_symbol = request.translator_note.target_currency_symbol or request.translator_note.target_currency
                rate = request.translator_note.exchange_rate or 1

                currency_conversion_instructions = f"""
═══════════════════════════════════════════════════════════════════
                    CURRENCY CONVERSION (FINANCIAL DOCUMENTS)
═══════════════════════════════════════════════════════════════════

⚠️ IMPORTANT: This is a FINANCIAL DOCUMENT with currency conversion enabled.

CONVERSION SETTINGS:
- Source Currency: {request.translator_note.source_currency} ({src_symbol})
- Target Currency: {request.translator_note.target_currency} ({tgt_symbol})
- Exchange Rate: {src_symbol}{rate} = {tgt_symbol}1.00
- Rate Date: {request.translator_note.rate_date}

VALUE CONVERSION RULES:
For MAIN financial values (totals, subtotals, balances, loans, credits, debits, amounts due, net worth):
1. Keep the original value in the source currency format
2. Add the converted value in brackets with BOLD formatting
3. Format: original_value [<strong>CONVERTED_VALUE</strong>]

EXAMPLES:
- R$5,420.00 → R$5,420.00 [<strong>$1,000.00</strong>]
- NOK 10,190.00 → NOK 10,190.00 [<strong>$1,000.00</strong>]
- CA$807,126.92 → 3,113,492.10 [<strong>CA$807,126.92</strong>]

HOW TO CONVERT:
1. Parse the numeric value from the original amount (ignore currency symbols and thousands separators)
2. Divide by the exchange rate ({rate}) to get the target currency value
3. Format with proper thousands separators and 2 decimal places
4. Add {tgt_symbol} symbol before the converted amount
5. Wrap in [<strong>...</strong>]

WHAT TO CONVERT (only main financial values):
✅ Total / Grand Total / Subtotal
✅ Balance / Available Balance / Current Balance
✅ Loan Amount / Credit Limit / Debt
✅ Income / Net Income / Gross Income
✅ Tax Amount / Tax Due / Refund Amount
✅ Payment Amount / Amount Due
✅ Net Worth / Assets / Liabilities

WHAT NOT TO CONVERT (minor values):
❌ Interest rates (percentages)
❌ Transaction fees (unless significant)
❌ Individual small transactions
❌ Reference numbers that look like amounts
"""

            # Determine page format
            page_format = getattr(request, 'page_format', 'letter')
            if page_format == 'a4':
                page_size = "A4 (210mm × 297mm)"
            else:
                page_size = "Letter (8.5\" × 11\" / 215.9mm × 279.4mm)"

            system_prompt = f"""You are a CERTIFIED PROFESSIONAL TRANSLATOR specializing in {request.document_type} documents.
Translate from {request.source_language} to {request.target_language}.

⚠️ IMPORTANT: The source language is EXPLICITLY specified as {request.source_language}.
DO NOT attempt to auto-detect the language. Use {request.source_language} as the source language regardless of what you observe in the text.

═══════════════════════════════════════════════════════════════════
                    FUNDAMENTAL PRINCIPLES
═══════════════════════════════════════════════════════════════════

🎯 GOLDEN RULE: COMPLETENESS
✅ TRANSLATE 100% OF THE CONTENT
❌ ZERO OMISSIONS
❌ ZERO UNREQUESTED ADDITIONS

═══════════════════════════════════════════════════════════════════
                    OUTPUT FORMAT - CRITICAL
═══════════════════════════════════════════════════════════════════

You MUST output ONLY clean, professional HTML ready for PDF conversion.

HTML STRUCTURE REQUIREMENTS:
1. Start with a complete HTML document structure
2. Include embedded CSS for professional formatting
3. Use tables with borders for structured data (birth certificates, invoices, etc.)
4. Apply print-optimized CSS (@media print)
5. Target page size: {page_size}
6. OPTIMIZE TO FIT ONE PAGE

CSS STYLING GUIDELINES:
- Font: Professional serif (Georgia, Times New Roman) or sans-serif (Arial)
- Title: 14-16pt, bold, centered
- Body text: 10-11pt
- Tables: 8-10pt with visible borders
- Margins: 15-20mm
- Line height: 1.3-1.5
- Table borders: 1px solid black
- Cell padding: 4-8px

═══════════════════════════════════════════════════════════════════
                    TRANSLATION RULES
═══════════════════════════════════════════════════════════════════

ELEMENTS TO TRANSLATE:
✅ Main text and all headers
✅ Complete tables with all cells
✅ Numbers and codes (preserve exactly)
✅ Marginal texts (all sides)
✅ Footnotes and captions
✅ Stamps text with dates

STANDARD NOTATION FOR NON-TEXTUAL ELEMENTS:
[Coat of Arms of Brazil] - for emblems
[signature: Name or "illegible"]
[stamp: text, dated DD/MM/YYYY]
[seal: description]
[QR code]
[handwritten: text or "illegible"]

REGIONAL ADAPTATIONS FOR {request.target_language}:
- USA dates: MM/DD/YYYY or Month DD, YYYY
- USA numbers: 8,116.50 (comma for thousands, dot for decimal)
- Keep metric units (convert only if specifically requested)
- Use official terminology for destination country

PROPER NAMES:
- Keep ALL proper names in original form (do not translate names of people, places)
- Translate titles and descriptions around names

═══════════════════════════════════════════════════════════════════
                    DOCUMENT-SPECIFIC FORMATTING
═══════════════════════════════════════════════════════════════════

For BIRTH CERTIFICATES / VITAL RECORDS:
- Create a formal document header with country name centered
- Use bordered tables for registration data
- Format: Registration Number, Date of Birth, Parents, etc. in labeled rows
- Include official seal/emblem notation at top
- Bold important names and dates

For INVOICES / COMMERCIAL DOCUMENTS:
- Preserve exact alphanumeric codes
- Format currency with proper separators
- Maintain table structure for line items
- Include all tax/VAT information

For DIPLOMAS / EDUCATIONAL:
- Preserve ceremonial/formal tone
- Apply official equivalencies when applicable
- Maintain decorative structure

═══════════════════════════════════════════════════════════════════
                    NEVER INCLUDE
═══════════════════════════════════════════════════════════════════

❌ Translator's Certificate of Accuracy (prepared separately)
❌ Usage instructions or explanatory text
❌ Information about the translation process
❌ Download buttons or interface elements
❌ Comments about the translation
❌ Markdown formatting (use HTML only)

═══════════════════════════════════════════════════════════════════
                    FINAL OUTPUT
═══════════════════════════════════════════════════════════════════

Output ONLY the HTML document. Start with <!DOCTYPE html> and end with </html>.
The document must be:
✅ Complete translation (100% content)
✅ Professional HTML layout with CSS
✅ Ready for print/PDF conversion
✅ Optimized to fit ONE page
✅ Clean with no extra elements

═══════════════════════════════════════════════════════════════════
                    END OF TRANSLATION MARKER
═══════════════════════════════════════════════════════════════════

At the very end of the translation content (but inside the HTML body), add the following marker in BOLD:
<p style="text-align: center; font-weight: bold; margin-top: 20px;">[END OF TRANSLATION]</p>

This marker must appear AFTER all translated content but BEFORE the closing body/html tags.
{currency_conversion_instructions}{additional_instructions}"""

            user_message = f"Translate this {request.document_type} document to professional HTML format:\n\n{request.text}"

        elif request.action == 'improve_formality':
            system_prompt = f"""You are a professional translator. The user has a translation that needs to be more formal.
Rewrite the translation to use more formal, professional language appropriate for {request.document_type} documents.
Maintain the same meaning but use more sophisticated vocabulary and formal sentence structures."""
            user_message = f"Original text ({request.source_language}):\n{request.text}\n\nCurrent translation ({request.target_language}):\n{request.current_translation}\n\nPlease make this translation more formal and professional."

        elif request.action == 'simplify':
            system_prompt = f"""You are a professional translator. The user has a translation that needs to be simplified.
Rewrite the translation to use clearer, simpler language while maintaining accuracy.
Make it easier to understand without losing the essential meaning."""
            user_message = f"Original text ({request.source_language}):\n{request.text}\n\nCurrent translation ({request.target_language}):\n{request.current_translation}\n\nPlease simplify this translation while keeping it accurate."

        elif request.action == 'check_accuracy':
            system_prompt = f"""You are a professional translation reviewer. Compare the original text with its translation and identify any errors or inaccuracies.
Provide a corrected version of the translation if needed, and briefly note what was corrected."""
            user_message = f"Original text ({request.source_language}):\n{request.text}\n\nTranslation ({request.target_language}):\n{request.current_translation}\n\nPlease check for accuracy and provide corrections if needed."

        else:
            # Custom command
            system_prompt = f"""You are a professional translator working with {request.document_type} documents.
Follow the user's instructions to modify or improve the translation.

CRITICAL OUTPUT RULES:
- Output ONLY the corrected/modified HTML translation
- Do NOT include any notes, comments, or explanations about what you changed
- Do NOT add text like "Changes made:", "I corrected:", "Here are the modifications:"
- The output must be clean HTML ready for printing - no meta-commentary
- Start with <!DOCTYPE html> or <html> and end with </html>"""
            user_message = f"Original text ({request.source_language}):\n{request.text}\n\nCurrent translation ({request.target_language}):\n{request.current_translation}\n\nInstruction: {request.action}\n\nIMPORTANT: Output ONLY the corrected HTML. No explanations or notes."

        # Call Claude API - with image if available for layout preservation
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Build message content - include image if provided for visual layout reference
            if request.original_image and request.action == 'translate':
                # Clean base64 string (remove data:image/pdf prefix if present)
                image_data = request.original_image
                media_type = "image/jpeg"

                if ',' in image_data:
                    # Extract media type from data URL
                    header = image_data.split(',')[0]
                    image_data = image_data.split(',')[1]

                    # Check if it's a PDF and convert to image
                    if 'pdf' in header.lower():
                        logger.info("Converting PDF to images for Claude...")
                        try:
                            import fitz  # PyMuPDF
                            pdf_bytes = base64.b64decode(image_data)
                            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                            total_pages = len(doc)
                            logger.info(f"PDF has {total_pages} pages")

                            # Extract ALL pages as images
                            page_images = []
                            for page_num in range(total_pages):
                                page = doc[page_num]
                                pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))  # 2x zoom for better quality
                                img_bytes = pix.tobytes("jpeg")
                                page_b64 = base64.b64encode(img_bytes).decode('utf-8')
                                page_images.append({
                                    "page_num": page_num + 1,
                                    "data": page_b64
                                })

                            doc.close()
                            logger.info(f"PDF converted to {len(page_images)} images successfully")

                            # Store all page images for multi-page translation
                            all_page_images = page_images
                            media_type = "image/jpeg"

                        except Exception as e:
                            logger.error(f"PDF conversion failed: {e}")
                            # Fall back to text-only translation
                            all_page_images = []
                    elif 'png' in header.lower():
                        media_type = "image/png"
                        all_page_images = [{"page_num": 1, "data": image_data}]
                    elif 'gif' in header.lower():
                        media_type = "image/gif"
                        all_page_images = [{"page_num": 1, "data": image_data}]
                    elif 'webp' in header.lower():
                        media_type = "image/webp"
                        all_page_images = [{"page_num": 1, "data": image_data}]
                    else:
                        # Default to jpeg
                        all_page_images = [{"page_num": 1, "data": image_data}]
                else:
                    # No header, assume single image
                    all_page_images = [{"page_num": 1, "data": image_data}] if image_data else []

                # Build message content with ALL page images
                if all_page_images:
                    message_content = []

                    # Add ALL page images to the message
                    for page_info in all_page_images:
                        message_content.append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": page_info["data"],
                            },
                        })

                    # Add the text instruction after all images
                    total_pages = len(all_page_images)
                    pages_text = f"This document has {total_pages} page(s). You MUST translate ALL {total_pages} pages." if total_pages > 1 else "This is a single-page document."

                    message_content.append({
                        "type": "text",
                        "text": f"""Look at these document images carefully. These are ALL the pages of the original document.

{pages_text}

The OCR text extracted from this document is:
---
{request.text}
---

{user_message}

CRITICAL INSTRUCTIONS:
1. Your HTML output MUST include translations for ALL {total_pages} PAGE(S)
2. Use clear page separators between pages (e.g., <div class="page-break" style="page-break-after: always;"></div>)
3. Match the visual layout of EACH original page
4. If you see tables in any image, create HTML tables with the same structure
5. If you see bordered sections, use CSS borders
6. Replicate the exact visual appearance of EACH page in HTML format
7. DO NOT skip any pages - all pages must be translated"""
                    })
                else:
                    message_content = user_message
            else:
                message_content = user_message

            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": request.claude_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-sonnet-4-5-20250929",
                    "max_tokens": 8192,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": message_content}
                    ]
                }
            )

            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"Claude API error: {response.status_code} - {error_detail}")
                raise HTTPException(status_code=response.status_code, detail=f"Claude API error: {error_detail}")

            result = response.json()
            translation = result.get("content", [{}])[0].get("text", "")

            if not translation:
                raise HTTPException(status_code=500, detail="No translation returned from Claude")

            return {
                "status": "success",
                "translation": translation,
                "action": request.action,
                "model": "claude-sonnet-4-5-20250929"
            }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Translation request timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# ==================== PROOFREADING ENDPOINT ====================

class ProofreadRequest(BaseModel):
    original_text: str
    translated_text: str
    source_language: str = "Portuguese (Brazil)"
    target_language: str = "English"
    document_type: str = "General Document"
    claude_api_key: str
    original_image: Optional[str] = None  # Base64 encoded image for vision-based proofreading

# Special characters by language
LANGUAGE_SPECIAL_CHARS = {
    "Portuguese": "ç ã õ á é í ó ú â ê ô à Ç Ã Õ",
    "Portuguese (Brazil)": "ç ã õ á é í ó ú â ê ô à Ç Ã Õ",
    "Norwegian": "ø å æ Ø Å Æ",
    "Swedish": "å ä ö Å Ä Ö",
    "Danish": "æ ø å Æ Ø Å",
    "German": "ä ö ü ß Ä Ö Ü",
    "French": "é è ê ë à â ù û ô î ï ç œ æ",
    "Spanish": "ñ á é í ó ú ü ¿ ¡ Ñ",
    "Italian": "à è é ì ò ù",
    "Polish": "ą ć ę ł ń ó ś ź ż",
    "Turkish": "ç ğ ı ö ş ü",
    "English": "",
}

# Document-type specific terminology
DOCUMENT_TERMINOLOGY = {
    "bank_statement": """
TERMINOLOGIA BANCÁRIA:
- Brukskonto = Checking Account
- Sparekonto = Savings Account
- Bufferspar = Buffer Savings
- Avtalegiro = Direct Debit
- Saldo = Balance
- Rente = Interest
- Gebyr = Fee/Charge
- Extrato Bancário = Bank Statement
- Crédito/Débito = Credit/Debit
- Titular = Account Holder
- Agência = Branch
""",
    "academic": """
TERMINOLOGIA ACADÊMICA:
- Histórico Escolar = Academic Transcript
- Diploma = Diploma / Degree Certificate
- Bacharel / Bacharelado = Bachelor's Degree
- Licenciatura = Teaching Degree / Licentiate
- Mestrado = Master's Degree
- Doutorado = Doctorate / Ph.D.
- Carga Horária = Course Load / Credit Hours
- Disciplina = Course / Subject
- Aprovado = Passed / Approved
- Reprovado = Failed
- Colação de Grau = Graduation Ceremony
""",
    "certificate": """
TERMINOLOGIA DE CERTIDÕES:
- Certidão de Nascimento = Birth Certificate
- Certidão de Casamento = Marriage Certificate
- Certidão de Óbito = Death Certificate
- Certidão de Inteiro Teor = Full Copy Certificate
- Cartório = Notary Office / Registry Office
- Oficial de Registro = Registrar / Notary
- Livro = Book / Register
- Folha = Page / Folio
- Termo = Entry / Record
- Averbação = Annotation / Amendment
- Filiação = Parentage
""",
    "general": """
TERMINOLOGIA GERAL:
- Use terminologia padrão para o tipo de documento
- Mantenha consistência em todo o documento
"""
}

def get_proofreading_prompt(source_lang: str, target_lang: str, doc_type: str) -> str:
    """Generate document-type specific proofreading prompt."""

    special_chars = LANGUAGE_SPECIAL_CHARS.get(source_lang, "")

    # Determine terminology based on document type
    doc_type_lower = doc_type.lower()
    if "bank" in doc_type_lower or "extrato" in doc_type_lower or "statement" in doc_type_lower:
        terminology = DOCUMENT_TERMINOLOGY["bank_statement"]
    elif "academ" in doc_type_lower or "diplom" in doc_type_lower or "histórico" in doc_type_lower or "transcript" in doc_type_lower:
        terminology = DOCUMENT_TERMINOLOGY["academic"]
    elif "certid" in doc_type_lower or "birth" in doc_type_lower or "marriage" in doc_type_lower or "certificate" in doc_type_lower:
        terminology = DOCUMENT_TERMINOLOGY["certificate"]
    else:
        terminology = DOCUMENT_TERMINOLOGY["general"]

    prompt = f"""Você é um revisor de traduções certificado.

IDIOMA FONTE: {source_lang}
IDIOMA ALVO: {target_lang}
TIPO DE DOCUMENTO: {doc_type}

CARACTERES ESPECIAIS DO IDIOMA FONTE (devem ser PRESERVADOS em nomes próprios):
{special_chars}

{terminology}

INSTRUÇÕES DE REVISÃO:

1. Compare CADA elemento dos dois documentos minuciosamente

2. Identifique TODOS os erros, incluindo:
   - Erros de transcrição (typos, letras trocadas)
   - Números incorretos (dígitos errados, faltando ou extras)
   - Caracteres especiais faltando ou incorretos
   - Traduções incorretas de termos técnicos
   - Omissões (conteúdo do original ausente na tradução)
   - Adições indevidas (conteúdo na tradução que não está no original)
   - Formatação inconsistente
   - Datas incorretas

3. ATENÇÃO ESPECIAL para:
   - IBANs, números de conta, referências bancárias
   - Datas (verificar formato e valores)
   - Nomes próprios (pessoas, empresas, lugares)
   - Valores monetários
   - Caracteres especiais em nomes ({special_chars})

4. Para cada erro forneça:
   - Página/localização
   - Texto original
   - Texto errado na tradução
   - Correção sugerida
   - Tipo de erro
   - Gravidade (CRÍTICO/ALTO/MÉDIO/BAIXO)

GRAVIDADE DOS ERROS:
- CRÍTICO: Erros que invalidam o documento (números errados em IBANs, omissões de cláusulas importantes)
- ALTO: Erros significativos (nomes com caracteres errados, datas incorretas)
- MÉDIO: Erros que devem ser corrigidos (terminologia inconsistente)
- BAIXO: Sugestões de melhoria (formatação, estilo)

FORMATO DE SAÍDA (JSON):
{{
    "erros": [
        {{
            "pagina": "1",
            "localizacao": "descrição da localização",
            "original": "texto original exato",
            "traducao_errada": "texto com erro",
            "correcao": "texto corrigido",
            "tipo": "Transcrição|Número|Data|Caractere Especial|Tradução Incorreta|Omissão|Formatação",
            "gravidade": "CRÍTICO|ALTO|MÉDIO|BAIXO"
        }}
    ],
    "resumo": {{
        "total_erros": 0,
        "criticos": 0,
        "altos": 0,
        "medios": 0,
        "baixos": 0,
        "qualidade": "APROVADO|APROVADO_COM_OBSERVACOES|REPROVADO"
    }},
    "observacoes": ["observações gerais sobre a tradução"]
}}

Responda APENAS com o JSON válido."""

    return prompt


# Simple proofreading request model (no claude_api_key required)
class SimpleProofreadRequest(BaseModel):
    text: str
    source_language: str = "Portuguese"
    target_language: str = "English"
    document_type: str = "General Document"


@api_router.post("/ai/proofread")
async def ai_simple_proofread(request: SimpleProofreadRequest, admin_key: str):
    """
    Simple proofreading endpoint - checks translation quality without original text
    Uses server-side Claude API key
    """
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Get Claude API key from environment
    claude_api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY")
    if not claude_api_key:
        raise HTTPException(status_code=500, detail="Claude API key not configured on server")

    try:
        system_prompt = f"""Você é um revisor de traduções certificado especializado em {request.source_language} → {request.target_language}.

TAREFA: Analise a tradução abaixo e verifique:
1. Erros gramaticais no idioma alvo
2. Inconsistências de terminologia
3. Erros de pontuação
4. Problemas de formatação
5. Sugestões de melhoria

RETORNE UM JSON com este formato exato:
{{
    "pontuacao_final": 85,
    "classificacao": "APROVADO" | "APROVADO_COM_OBSERVACOES" | "REPROVADO",
    "total_erros": 3,
    "criticos": 0,
    "altos": 1,
    "medios": 2,
    "baixos": 0,
    "erros": [
        {{
            "tipo": "Gramática" | "Ortografia" | "Pontuação" | "Terminologia" | "Formatação",
            "gravidade": "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO",
            "original": "texto com erro",
            "sugestao": "texto corrigido",
            "explicacao": "explicação do erro"
        }}
    ],
    "observacoes": "Observações gerais sobre a qualidade da tradução",
    "resumo": "Resumo em uma frase"
}}

CRITÉRIOS DE CLASSIFICAÇÃO:
- APROVADO (85-100%): Sem erros críticos, máximo 2 erros menores
- APROVADO_COM_OBSERVACOES (70-84%): Sem erros críticos, alguns erros menores
- REPROVADO (<70%): Erros críticos ou muitos erros

Responda APENAS com o JSON válido, sem texto adicional."""

        user_message = f"""Analise esta tradução ({request.source_language} → {request.target_language}):

{request.text[:15000]}

Retorne o JSON com a análise completa."""

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": claude_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-sonnet-4-5-20250929",
                    "max_tokens": 4096,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_message}
                    ]
                }
            )

            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"Claude API error in simple proofread: {response.status_code} - {error_detail}")
                raise HTTPException(status_code=response.status_code, detail=f"AI analysis failed: {error_detail}")

            result = response.json()
            proofreading_result = result.get("content", [{}])[0].get("text", "")

            # Try to parse as JSON
            try:
                clean_result = proofreading_result.strip()
                if clean_result.startswith("```json"):
                    clean_result = clean_result[7:]
                if clean_result.startswith("```"):
                    clean_result = clean_result[3:]
                if clean_result.endswith("```"):
                    clean_result = clean_result[:-3]
                clean_result = clean_result.strip()

                parsed_result = json.loads(clean_result)
                return parsed_result

            except json.JSONDecodeError:
                # If JSON parsing fails, return a default response
                logger.warning(f"Failed to parse proofreading JSON: {proofreading_result[:200]}")
                return {
                    "pontuacao_final": 75,
                    "classificacao": "APROVADO_COM_OBSERVACOES",
                    "total_erros": 0,
                    "criticos": 0,
                    "altos": 0,
                    "medios": 0,
                    "baixos": 0,
                    "erros": [],
                    "observacoes": proofreading_result[:500],
                    "resumo": "Análise concluída - verifique observações"
                }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Simple proofreading error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Proofreading failed: {str(e)}")


@api_router.post("/admin/proofread")
async def admin_proofread(request: ProofreadRequest, admin_key: str):
    """
    Proofread a translation - Returns JSON with detailed errors
    Admin and PM endpoint for detailed proofreading
    """
    # Validate admin key or user token (admin and PM can use proofreading)
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Only admin and PM can run proofreading
    if user_info.get("role") not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Only admin and PM can run proofreading")

    if not request.claude_api_key:
        raise HTTPException(status_code=400, detail="Claude API key is required")

    try:
        system_prompt = get_proofreading_prompt(
            request.source_language,
            request.target_language,
            request.document_type
        )

        # Build the message content based on whether we have an image or just text
        if request.original_image:
            # Use Claude Vision API with image
            user_content = [
                {
                    "type": "text",
                    "text": f"Este é o DOCUMENTO ORIGINAL em {request.source_language} (veja a imagem anexa):"
                },
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": request.original_image
                    }
                },
                {
                    "type": "text",
                    "text": f"""
=== TRADUÇÃO ({request.target_language}) ===
{request.translated_text}
=== FIM DA TRADUÇÃO ===

Compare a imagem do documento original acima com a tradução fornecida.
Analise minuciosamente e retorne o JSON com todos os erros encontrados."""
                }
            ]
            messages = [{"role": "user", "content": user_content}]
        else:
            # Text-only proofreading
            user_message = f"""=== DOCUMENTO ORIGINAL ({request.source_language}) ===
{request.original_text}
=== FIM DO DOCUMENTO ORIGINAL ===

=== TRADUÇÃO ({request.target_language}) ===
{request.translated_text}
=== FIM DA TRADUÇÃO ===

Analise minuciosamente e retorne o JSON com todos os erros encontrados."""
            messages = [{"role": "user", "content": user_message}]

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": request.claude_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-sonnet-4-5-20250929",
                    "max_tokens": 8192,
                    "system": system_prompt,
                    "messages": messages
                }
            )

            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"Claude API error: {response.status_code} - {error_detail}")
                raise HTTPException(status_code=response.status_code, detail=f"Claude API error: {error_detail}")

            result = response.json()
            proofreading_result = result.get("content", [{}])[0].get("text", "")

            # Try to parse as JSON
            try:
                # Clean up the response - remove markdown code blocks if present
                clean_result = proofreading_result.strip()
                if clean_result.startswith("```json"):
                    clean_result = clean_result[7:]
                if clean_result.startswith("```"):
                    clean_result = clean_result[3:]
                if clean_result.endswith("```"):
                    clean_result = clean_result[:-3]
                clean_result = clean_result.strip()

                parsed_result = json.loads(clean_result)

                return {
                    "status": "success",
                    "proofreading_result": parsed_result,
                    "raw_response": proofreading_result
                }
            except json.JSONDecodeError:
                # If JSON parsing fails, return raw response
                return {
                    "status": "success",
                    "proofreading_result": None,
                    "raw_response": proofreading_result,
                    "parse_error": "Could not parse response as JSON"
                }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Proofreading request timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Proofreading error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Proofreading failed: {str(e)}")


# ==================== TRANSLATION RESOURCES ENDPOINTS ====================

class TranslationInstructionCreate(BaseModel):
    sourceLang: str
    targetLang: str
    title: str
    content: str
    field: Optional[str] = "All Fields"
    documentType: Optional[str] = "All Documents"

class GlossaryTerm(BaseModel):
    id: Optional[int] = None
    source: str
    target: str
    notes: Optional[str] = ""

class GlossaryCreate(BaseModel):
    name: str
    sourceLang: Optional[str] = "Portuguese (Brazil)"
    targetLang: Optional[str] = "English"
    bidirectional: Optional[bool] = True
    language: Optional[str] = None  # Legacy field, kept for compatibility
    field: str = "All Fields"
    terms: List[GlossaryTerm] = []

# Translation Instructions CRUD
@api_router.get("/admin/translation-instructions")
async def get_translation_instructions(admin_key: str):
    """Get all translation instructions - accessible by admin, pm, and translator"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    instructions = await db.translation_instructions.find().sort("created_at", -1).to_list(100)
    for instr in instructions:
        if '_id' in instr:
            del instr['_id']
        if instr.get("created_at"):
            instr["created_at"] = instr["created_at"].isoformat()

    return {"instructions": instructions}


@api_router.post("/admin/translation-instructions")
async def create_translation_instruction(data: TranslationInstructionCreate, admin_key: str):
    """Create a new translation instruction - only admin and PM"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin and PM can create instructions
    if user_info.get("role") not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Only admin and PM can create instructions")

    instruction = {
        "id": str(uuid.uuid4()),
        "sourceLang": data.sourceLang,
        "targetLang": data.targetLang,
        "field": data.field,
        "documentType": data.documentType,
        "title": data.title,
        "content": data.content,
        "created_at": datetime.utcnow()
    }

    await db.translation_instructions.insert_one(instruction)

    return {"status": "success", "instruction": instruction, "id": instruction["id"]}


@api_router.put("/admin/translation-instructions/{instruction_id}")
async def update_translation_instruction(instruction_id: str, data: TranslationInstructionCreate, admin_key: str):
    """Update a translation instruction - only admin and PM"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin and PM can update instructions
    if user_info.get("role") not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Only admin and PM can update instructions")

    result = await db.translation_instructions.update_one(
        {"id": instruction_id},
        {"$set": {
            "sourceLang": data.sourceLang,
            "targetLang": data.targetLang,
            "field": data.field,
            "documentType": data.documentType,
            "title": data.title,
            "content": data.content
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Instruction not found")

    return {"status": "success"}


@api_router.delete("/admin/translation-instructions/{instruction_id}")
async def delete_translation_instruction(instruction_id: str, admin_key: str):
    """Delete a translation instruction - only admin and PM"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin and PM can delete instructions
    if user_info.get("role") not in ["admin", "pm"]:
        raise HTTPException(status_code=403, detail="Only admin and PM can delete instructions")

    result = await db.translation_instructions.delete_one({"id": instruction_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Instruction not found")

    return {"status": "success"}


# Glossaries CRUD
@api_router.get("/admin/glossaries")
async def get_glossaries(admin_key: str):
    """Get all glossaries"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    glossaries = await db.glossaries.find().sort("created_at", -1).to_list(100)
    for gloss in glossaries:
        if '_id' in gloss:
            del gloss['_id']
        if gloss.get("created_at"):
            gloss["created_at"] = gloss["created_at"].isoformat()

    return {"glossaries": glossaries}


@api_router.post("/admin/glossaries")
async def create_glossary(data: GlossaryCreate, admin_key: str):
    """Create a new glossary"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    glossary = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "sourceLang": data.sourceLang,
        "targetLang": data.targetLang,
        "bidirectional": data.bidirectional,
        "language": data.language or f"{data.sourceLang} <> {data.targetLang}",  # Legacy compatibility
        "field": data.field,
        "terms": [t.dict() for t in data.terms],
        "created_at": datetime.utcnow()
    }

    await db.glossaries.insert_one(glossary)

    return {"status": "success", "glossary": glossary}


@api_router.put("/admin/glossaries/{glossary_id}")
async def update_glossary(glossary_id: str, data: GlossaryCreate, admin_key: str):
    """Update a glossary"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.glossaries.update_one(
        {"id": glossary_id},
        {"$set": {
            "name": data.name,
            "sourceLang": data.sourceLang,
            "targetLang": data.targetLang,
            "bidirectional": data.bidirectional,
            "language": data.language or f"{data.sourceLang} <> {data.targetLang}",
            "field": data.field,
            "terms": [t.dict() for t in data.terms]
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Glossary not found")

    return {"status": "success"}


@api_router.delete("/admin/glossaries/{glossary_id}")
async def delete_glossary(glossary_id: str, admin_key: str):
    """Delete a glossary"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.glossaries.delete_one({"id": glossary_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Glossary not found")

    return {"status": "success"}


# ==================== PDF TO IMAGE CONVERSION ====================

class PDFToImageRequest(BaseModel):
    file_base64: str
    filename: str

@api_router.post("/admin/pdf-to-images")
async def convert_pdf_to_images(request: PDFToImageRequest, admin_key: str):
    """Convert PDF to images for visualization"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        # Decode PDF
        pdf_bytes = base64.b64decode(request.file_base64)

        # Open PDF with PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        images = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Convert to image with 2x zoom for better quality
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            img_bytes = pix.tobytes("png")
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            images.append({
                "page": page_num + 1,
                "data": f"data:image/png;base64,{img_base64}",
                "width": pix.width,
                "height": pix.height
            })

        doc.close()

        return {"status": "success", "images": images, "total_pages": len(images)}

    except Exception as e:
        logger.error(f"PDF to image conversion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to convert PDF: {str(e)}")


# ==================== TRANSLATION MEMORY ====================

class TranslationMemoryEntry(BaseModel):
    source: str
    target: str
    context: Optional[str] = None
    score: Optional[float] = None  # Proofreading score for quality tracking

class TranslationMemoryCreate(BaseModel):
    sourceLang: str
    targetLang: str
    field: Optional[str] = "General"
    documentType: Optional[str] = None
    score: Optional[float] = None  # Overall proofreading score
    entries: List[TranslationMemoryEntry]

@api_router.get("/admin/translation-memory")
async def get_translation_memory(admin_key: str, sourceLang: Optional[str] = None, targetLang: Optional[str] = None):
    """Get all translation memory entries - ADMIN ONLY"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin can access TM
    if user_info.get("role") != "admin" and not user_info.get("is_master"):
        raise HTTPException(status_code=403, detail="Only admin can access Translation Memory")

    # Build query filter
    query = {}
    if sourceLang:
        query["sourceLang"] = sourceLang
    if targetLang:
        query["targetLang"] = targetLang

    memories = await db.translation_memory.find(query).sort("created_at", -1).to_list(500)
    for mem in memories:
        if '_id' in mem:
            del mem['_id']
        if mem.get("created_at"):
            mem["created_at"] = mem["created_at"].isoformat()

    return {"memories": memories}

@api_router.post("/admin/translation-memory")
async def add_translation_memory(data: TranslationMemoryCreate, admin_key: str):
    """Add translation memory entries after proofreading"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # All roles can add TM entries (from proofreading)
    if not data.entries:
        return {"status": "success", "added": 0}

    added_count = 0
    for entry in data.entries:
        # Skip empty entries
        if not entry.source.strip() or not entry.target.strip():
            continue

        # Check if entry already exists (avoid duplicates)
        existing = await db.translation_memory.find_one({
            "sourceLang": data.sourceLang,
            "targetLang": data.targetLang,
            "source": entry.source.strip()
        })

        # Get the score (from entry or from data)
        new_score = entry.score or data.score or 0

        if existing:
            existing_score = existing.get("score", 0) or 0

            # Only update if new score is higher OR target is different and scores are equal
            if new_score > existing_score:
                await db.translation_memory.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "target": entry.target.strip(),
                        "score": new_score,
                        "updated_at": datetime.utcnow()
                    }}
                )
                added_count += 1  # Count as updated
            elif existing.get("target") != entry.target.strip() and new_score == existing_score:
                # Same score but different translation - keep existing (first wins)
                pass
            continue

        tm_entry = {
            "id": str(uuid.uuid4()),
            "sourceLang": data.sourceLang,
            "targetLang": data.targetLang,
            "field": data.field,
            "documentType": data.documentType,
            "source": entry.source.strip(),
            "target": entry.target.strip(),
            "score": new_score,
            "context": entry.context,
            "created_at": datetime.utcnow(),
            "created_by": user_info.get("user_id", "system")
        }
        await db.translation_memory.insert_one(tm_entry)
        added_count += 1

    return {"status": "success", "added": added_count}

@api_router.delete("/admin/translation-memory/{entry_id}")
async def delete_translation_memory(entry_id: str, admin_key: str):
    """Delete a translation memory entry - ADMIN ONLY"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin can delete TM
    if user_info.get("role") != "admin" and not user_info.get("is_master"):
        raise HTTPException(status_code=403, detail="Only admin can delete Translation Memory")

    result = await db.translation_memory.delete_one({"id": entry_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")

    return {"status": "success"}

@api_router.delete("/admin/translation-memory")
async def clear_translation_memory(admin_key: str, sourceLang: Optional[str] = None, targetLang: Optional[str] = None):
    """Clear translation memory entries - ADMIN ONLY"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin can clear TM
    if user_info.get("role") != "admin" and not user_info.get("is_master"):
        raise HTTPException(status_code=403, detail="Only admin can clear Translation Memory")

    query = {}
    if sourceLang:
        query["sourceLang"] = sourceLang
    if targetLang:
        query["targetLang"] = targetLang

    result = await db.translation_memory.delete_many(query)

    return {"status": "success", "deleted": result.deleted_count}

@api_router.get("/admin/translation-memory/download")
async def download_translation_memory(admin_key: str, format: str = "csv", sourceLang: Optional[str] = None, targetLang: Optional[str] = None):
    """Download translation memory as CSV or TMX - ADMIN ONLY"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    # Only admin can download TM
    if user_info.get("role") != "admin" and not user_info.get("is_master"):
        raise HTTPException(status_code=403, detail="Only admin can download Translation Memory")

    # Build query filter
    query = {}
    if sourceLang:
        query["sourceLang"] = sourceLang
    if targetLang:
        query["targetLang"] = targetLang

    memories = await db.translation_memory.find(query).sort("created_at", -1).to_list(10000)

    if format.lower() == "tmx":
        # Generate TMX (Translation Memory eXchange) format
        tmx_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
        tmx_content += '<!DOCTYPE tmx SYSTEM "tmx14.dtd">\n'
        tmx_content += '<tmx version="1.4">\n'
        tmx_content += '  <header creationtool="Legacy Portal" creationtoolversion="1.0" datatype="plaintext" segtype="sentence" adminlang="en-US" srclang="*all*" o-tmf="Legacy Portal"/>\n'
        tmx_content += '  <body>\n'

        for mem in memories:
            src_lang_code = mem.get("sourceLang", "pt-BR").replace(" ", "-").replace("(", "").replace(")", "")[:5]
            tgt_lang_code = mem.get("targetLang", "en-US").replace(" ", "-").replace("(", "").replace(")", "")[:5]
            source_text = mem.get("source", "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            target_text = mem.get("target", "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

            tmx_content += f'    <tu>\n'
            tmx_content += f'      <tuv xml:lang="{src_lang_code}">\n'
            tmx_content += f'        <seg>{source_text}</seg>\n'
            tmx_content += f'      </tuv>\n'
            tmx_content += f'      <tuv xml:lang="{tgt_lang_code}">\n'
            tmx_content += f'        <seg>{target_text}</seg>\n'
            tmx_content += f'      </tuv>\n'
            tmx_content += f'    </tu>\n'

        tmx_content += '  </body>\n'
        tmx_content += '</tmx>'

        return JSONResponse(content={"format": "tmx", "content": tmx_content, "filename": f"translation_memory_{datetime.now().strftime('%Y%m%d')}.tmx"})

    else:
        # Generate CSV format
        csv_lines = ["Source Language,Target Language,Field,Source Text,Target Text,Created At"]
        for mem in memories:
            src_lang = mem.get("sourceLang", "").replace(",", ";")
            tgt_lang = mem.get("targetLang", "").replace(",", ";")
            field = mem.get("field", "").replace(",", ";")
            source = mem.get("source", "").replace(",", ";").replace("\n", " ")
            target = mem.get("target", "").replace(",", ";").replace("\n", " ")
            created = mem.get("created_at", "").isoformat() if hasattr(mem.get("created_at", ""), 'isoformat') else str(mem.get("created_at", ""))
            csv_lines.append(f'"{src_lang}","{tgt_lang}","{field}","{source}","{target}","{created}"')

        csv_content = "\n".join(csv_lines)
        return JSONResponse(content={"format": "csv", "content": csv_content, "filename": f"translation_memory_{datetime.now().strftime('%Y%m%d')}.csv"})


# ==================== CUSTOMER MODELS ====================

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    password_hash: str
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CustomerCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class CustomerLogin(BaseModel):
    email: EmailStr
    password: str

class CustomerResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    token: str

# Budget (Saved Quote) Models
class SavedBudget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reference: str = Field(default_factory=lambda: f"BUD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}")
    owner_id: str  # Can be partner_id or customer_id
    owner_type: str  # 'partner' or 'customer'
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    base_price: float
    urgency_fee: float
    total_price: float
    notes: Optional[str] = None
    document_ids: Optional[List[str]] = None
    files_info: Optional[List[dict]] = None
    status: str = "active"  # active, converted, expired
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class SavedBudgetCreate(BaseModel):
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    reference: Optional[str] = None
    notes: Optional[str] = None
    document_ids: Optional[List[str]] = None
    files_info: Optional[List[dict]] = None

# Customer Order Model
class CustomerOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"CUST-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}")
    customer_id: str
    customer_name: str
    customer_email: EmailStr
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    page_count: int
    urgency: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    base_price: float
    urgency_fee: float
    total_price: float
    translation_status: str = "received"
    payment_status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    document_filename: Optional[str] = None

class CustomerOrderCreate(BaseModel):
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    reference: Optional[str] = None
    notes: Optional[str] = None
    document_filename: Optional[str] = None
    document_ids: Optional[List[str]] = None

# In-memory token storage for customers
customer_tokens: Dict[str, str] = {}  # token -> customer_id

async def get_current_customer(token: str = None) -> Optional[dict]:
    """Get current customer from token (checks database with expiration)"""
    if not token:
        return None

    # First check memory cache for speed
    if token in customer_tokens:
        customer_id = customer_tokens[token]
        customer = await db.customers.find_one({"id": customer_id})
        if customer:
            # Verify token hasn't expired
            token_expires = customer.get("token_expires")
            if token_expires and datetime.utcnow() < token_expires:
                return customer
            # Token expired, remove from cache
            del customer_tokens[token]

    # Fallback: check database directly (handles server restarts)
    customer = await db.customers.find_one({"token": token})
    if customer:
        # Verify token hasn't expired
        token_expires = customer.get("token_expires")
        if token_expires and datetime.utcnow() < token_expires:
            # Add to memory cache for future requests
            customer_tokens[token] = customer["id"]
            return customer

    return None

# ==================== CUSTOMER AUTHENTICATION ====================

@api_router.post("/customer/auth/register")
async def register_customer(customer_data: CustomerCreate):
    """Register a new customer"""
    try:
        # Check if email already exists
        existing = await db.customers.find_one({"email": customer_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create customer
        customer = Customer(
            full_name=customer_data.full_name,
            email=customer_data.email,
            password_hash=hash_password(customer_data.password),
            phone=customer_data.phone
        )

        await db.customers.insert_one(customer.dict())

        # Generate token with 24 hour expiration
        token = generate_token()
        token_expires = datetime.utcnow() + timedelta(hours=24)

        # Store token in database (persists across deploys)
        await db.customers.update_one(
            {"id": customer.id},
            {"$set": {"token": token, "token_expires": token_expires}}
        )

        # Also keep in memory for faster lookups
        customer_tokens[token] = customer.id

        # Send welcome email
        try:
            welcome_subject = "Welcome to Legacy Translations! 🎉"
            welcome_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #0d9488, #14b8a6); border-radius: 10px 10px 0 0;">
                    <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 180px;">
                </div>
                <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb;">
                    <h1 style="color: #0d9488; margin-bottom: 20px;">Welcome, {customer.full_name}! 👋</h1>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Thank you for creating an account with Legacy Translations. We're excited to have you!
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        With your account, you can:
                    </p>
                    <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
                        <li>📄 Request translation quotes instantly</li>
                        <li>📊 Track your orders in real-time</li>
                        <li>💬 Communicate directly with our team</li>
                        <li>📁 Access all your translated documents</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://legacytranslations.com/customer"
                           style="background: #0d9488; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Start Your First Translation
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        If you have any questions, feel free to reply to this email or contact us at
                        <a href="mailto:contact@legacytranslations.com" style="color: #0d9488;">contact@legacytranslations.com</a>
                    </p>
                </div>
                <div style="padding: 20px; background: #f9fafb; text-align: center; border-radius: 0 0 10px 10px;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        © 2024 Legacy Translations. All rights reserved.
                    </p>
                </div>
            </div>
            """
            await email_service.send_email(customer.email, welcome_subject, welcome_content)
            logger.info(f"Welcome email sent to {customer.email}")
        except Exception as email_error:
            logger.error(f"Failed to send welcome email: {str(email_error)}")
            # Don't fail registration if email fails

        return CustomerResponse(
            id=customer.id,
            full_name=customer.full_name,
            email=customer.email,
            phone=customer.phone,
            token=token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering customer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register customer")

@api_router.post("/customer/auth/login")
async def login_customer(login_data: CustomerLogin):
    """Login customer and return token"""
    try:
        # Find customer by email
        customer = await db.customers.find_one({"email": login_data.email})
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not verify_password(login_data.password, customer["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Check if active
        if not customer.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")

        # Generate token with 24 hour expiration
        token = generate_token()
        token_expires = datetime.utcnow() + timedelta(hours=24)

        # Store token in database (persists across deploys)
        await db.customers.update_one(
            {"id": customer["id"]},
            {"$set": {"token": token, "token_expires": token_expires}}
        )

        # Also keep in memory for faster lookups
        customer_tokens[token] = customer["id"]

        return CustomerResponse(
            id=customer["id"],
            full_name=customer["full_name"],
            email=customer["email"],
            phone=customer.get("phone"),
            token=token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in customer: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to login")

@api_router.post("/customer/auth/logout")
async def logout_customer(token: str):
    """Logout customer"""
    if token in customer_tokens:
        del customer_tokens[token]
    return {"status": "success", "message": "Logged out successfully"}

@api_router.get("/customer/auth/me")
async def get_current_customer_info(token: str):
    """Get current customer info from token"""
    customer = await get_current_customer(token)
    if not customer:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "id": customer["id"],
        "full_name": customer["full_name"],
        "email": customer["email"],
        "phone": customer.get("phone")
    }

# ==================== CUSTOMER ORDERS ====================

@api_router.post("/customer/orders/create")
async def create_customer_order(order_data: CustomerOrderCreate, token: str):
    """Create a new customer order"""
    try:
        # Verify customer
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Calculate pricing
        base_price, urgency_fee, total_price = calculate_price(
            order_data.word_count,
            order_data.service_type,
            order_data.urgency
        )

        # Calculate page count
        page_count = max(1, math.ceil(order_data.word_count / 250))

        # Set due date
        due_date = datetime.utcnow() + timedelta(days=30)

        # Create order
        order = CustomerOrder(
            customer_id=customer["id"],
            customer_name=customer["full_name"],
            customer_email=customer["email"],
            service_type=order_data.service_type,
            translate_from=order_data.translate_from,
            translate_to=order_data.translate_to,
            word_count=order_data.word_count,
            page_count=page_count,
            urgency=order_data.urgency,
            reference=order_data.reference,
            notes=order_data.notes,
            base_price=base_price,
            urgency_fee=urgency_fee,
            total_price=total_price,
            due_date=due_date,
            document_filename=order_data.document_filename
        )

        await db.customer_orders.insert_one(order.dict())

        # Associate uploaded documents with this order
        if order_data.document_ids:
            await db.documents.update_many(
                {"id": {"$in": order_data.document_ids}},
                {"$set": {"order_id": order.id, "order_number": order.order_number}}
            )

        # Send email notifications
        try:
            order_details = {
                "reference": order.order_number,
                "service_type": order.service_type,
                "translate_from": order.translate_from,
                "translate_to": order.translate_to,
                "word_count": order.word_count,
                "urgency": order.urgency,
                "estimated_delivery": get_estimated_delivery(order.urgency),
                "base_price": order.base_price,
                "urgency_fee": order.urgency_fee,
                "total_price": order.total_price
            }

            # Send to customer
            await email_service.send_order_confirmation_email(
                customer["email"],
                order_details,
                is_partner=True
            )

            # Send to company
            await email_service.send_order_confirmation_email(
                "contact@legacytranslations.com",
                order_details,
                is_partner=False
            )
        except Exception as e:
            logger.error(f"Failed to send order emails: {str(e)}")

        return {
            "status": "success",
            "message": "Order created successfully",
            "order": order.dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating customer order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create order")

@api_router.get("/customer/orders")
async def get_customer_orders(token: str, status: Optional[str] = None):
    """Get customer orders"""
    try:
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        query = {"customer_id": customer["id"]}
        if status and status != 'all':
            query["payment_status"] = status

        orders = await db.customer_orders.find(query).sort("created_at", -1).to_list(100)

        # Clean up MongoDB ObjectId
        for order in orders:
            if '_id' in order:
                del order['_id']
            # Convert datetime objects to ISO strings
            if order.get("created_at"):
                order["created_at"] = order["created_at"].isoformat()
            if order.get("due_date"):
                order["due_date"] = order["due_date"].isoformat()

        return {"orders": orders}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer orders: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch orders")

# ==================== CUSTOMER MESSAGES ====================

@api_router.get("/customer/messages")
async def get_customer_messages(token: str):
    """Get customer messages"""
    try:
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        messages = await db.customer_messages.find({"customer_id": customer["id"]}).sort("created_at", -1).to_list(100)

        for msg in messages:
            if '_id' in msg:
                del msg['_id']
            if msg.get("created_at"):
                msg["created_at"] = msg["created_at"].isoformat()

        return {"messages": messages}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch messages")

@api_router.put("/customer/messages/{message_id}/read")
async def mark_customer_message_read(message_id: str, token: str):
    """Mark a customer message as read"""
    try:
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        result = await db.customer_messages.update_one(
            {"id": message_id, "customer_id": customer["id"]},
            {"$set": {"read": True}}
        )

        return {"status": "success"}

    except Exception as e:
        logger.error(f"Error marking message as read: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to mark message as read")

# ==================== BUDGET (SAVED QUOTES) ENDPOINTS ====================

@api_router.post("/customer/budgets/save")
async def save_customer_budget(budget_data: SavedBudgetCreate, token: str):
    """Save a budget/quote for a customer"""
    try:
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Calculate pricing
        base_price, urgency_fee, total_price = calculate_price(
            budget_data.word_count,
            budget_data.service_type,
            budget_data.urgency
        )

        # Create budget
        budget = SavedBudget(
            owner_id=customer["id"],
            owner_type="customer",
            service_type=budget_data.service_type,
            translate_from=budget_data.translate_from,
            translate_to=budget_data.translate_to,
            word_count=budget_data.word_count,
            urgency=budget_data.urgency,
            base_price=base_price,
            urgency_fee=urgency_fee,
            total_price=total_price,
            notes=budget_data.notes,
            document_ids=budget_data.document_ids,
            files_info=budget_data.files_info,
            expires_at=datetime.utcnow() + timedelta(days=30)  # Budget valid for 30 days
        )

        await db.saved_budgets.insert_one(budget.dict())

        return {
            "status": "success",
            "message": "Budget saved successfully",
            "budget": budget.dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving customer budget: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save budget")

@api_router.get("/customer/budgets")
async def get_customer_budgets(token: str):
    """Get all saved budgets for a customer"""
    try:
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        budgets = await db.saved_budgets.find({
            "owner_id": customer["id"],
            "owner_type": "customer",
            "status": "active"
        }).sort("created_at", -1).to_list(100)

        for budget in budgets:
            if '_id' in budget:
                del budget['_id']
            if budget.get("created_at"):
                budget["created_at"] = budget["created_at"].isoformat()
            if budget.get("expires_at"):
                budget["expires_at"] = budget["expires_at"].isoformat()

        return {"budgets": budgets}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer budgets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch budgets")

@api_router.delete("/customer/budgets/{budget_id}")
async def delete_customer_budget(budget_id: str, token: str):
    """Delete a saved budget"""
    try:
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        result = await db.saved_budgets.delete_one({
            "id": budget_id,
            "owner_id": customer["id"],
            "owner_type": "customer"
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Budget not found")

        return {"status": "success", "message": "Budget deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting budget: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete budget")

@api_router.post("/customer/budgets/{budget_id}/convert")
async def convert_customer_budget_to_order(budget_id: str, token: str):
    """Convert a saved budget to an order"""
    try:
        customer = await get_current_customer(token)
        if not customer:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Get budget
        budget = await db.saved_budgets.find_one({
            "id": budget_id,
            "owner_id": customer["id"],
            "owner_type": "customer"
        })

        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")

        # Create order from budget
        page_count = max(1, math.ceil(budget["word_count"] / 250))
        due_date = datetime.utcnow() + timedelta(days=30)

        order = CustomerOrder(
            customer_id=customer["id"],
            customer_name=customer["full_name"],
            customer_email=customer["email"],
            service_type=budget["service_type"],
            translate_from=budget["translate_from"],
            translate_to=budget["translate_to"],
            word_count=budget["word_count"],
            page_count=page_count,
            urgency=budget["urgency"],
            notes=budget.get("notes"),
            base_price=budget["base_price"],
            urgency_fee=budget["urgency_fee"],
            total_price=budget["total_price"],
            due_date=due_date
        )

        await db.customer_orders.insert_one(order.dict())

        # Mark budget as converted
        await db.saved_budgets.update_one(
            {"id": budget_id},
            {"$set": {"status": "converted"}}
        )

        # Associate documents if any
        if budget.get("document_ids"):
            await db.documents.update_many(
                {"id": {"$in": budget["document_ids"]}},
                {"$set": {"order_id": order.id, "order_number": order.order_number}}
            )

        return {
            "status": "success",
            "message": "Budget converted to order",
            "order": order.dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting budget to order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to convert budget")

# ==================== PARTNER BUDGET ENDPOINTS ====================

@api_router.post("/partner/budgets/save")
async def save_partner_budget(budget_data: SavedBudgetCreate, token: str):
    """Save a budget/quote for a partner"""
    try:
        partner = await get_current_partner(token)
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Calculate pricing
        base_price, urgency_fee, total_price = calculate_price(
            budget_data.word_count,
            budget_data.service_type,
            budget_data.urgency
        )

        # Create budget
        budget = SavedBudget(
            owner_id=partner["id"],
            owner_type="partner",
            service_type=budget_data.service_type,
            translate_from=budget_data.translate_from,
            translate_to=budget_data.translate_to,
            word_count=budget_data.word_count,
            urgency=budget_data.urgency,
            base_price=base_price,
            urgency_fee=urgency_fee,
            total_price=total_price,
            notes=budget_data.notes,
            document_ids=budget_data.document_ids,
            files_info=budget_data.files_info,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )

        await db.saved_budgets.insert_one(budget.dict())

        return {
            "status": "success",
            "message": "Budget saved successfully",
            "budget": budget.dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving partner budget: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save budget")

@api_router.get("/partner/budgets")
async def get_partner_budgets(token: str):
    """Get all saved budgets for a partner"""
    try:
        partner = await get_current_partner(token)
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        budgets = await db.saved_budgets.find({
            "owner_id": partner["id"],
            "owner_type": "partner",
            "status": "active"
        }).sort("created_at", -1).to_list(100)

        for budget in budgets:
            if '_id' in budget:
                del budget['_id']
            if budget.get("created_at"):
                budget["created_at"] = budget["created_at"].isoformat()
            if budget.get("expires_at"):
                budget["expires_at"] = budget["expires_at"].isoformat()

        return {"budgets": budgets}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching partner budgets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch budgets")

@api_router.delete("/partner/budgets/{budget_id}")
async def delete_partner_budget(budget_id: str, token: str):
    """Delete a saved partner budget"""
    try:
        partner = await get_current_partner(token)
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        result = await db.saved_budgets.delete_one({
            "id": budget_id,
            "owner_id": partner["id"],
            "owner_type": "partner"
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Budget not found")

        return {"status": "success", "message": "Budget deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting budget: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete budget")

@api_router.post("/partner/budgets/{budget_id}/convert")
async def convert_partner_budget_to_order(budget_id: str, token: str, client_name: str, client_email: str):
    """Convert a saved partner budget to an order"""
    try:
        partner = await get_current_partner(token)
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Get budget
        budget = await db.saved_budgets.find_one({
            "id": budget_id,
            "owner_id": partner["id"],
            "owner_type": "partner"
        })

        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")

        # Create order from budget with automatic client deadline (2 business days for partner portal)
        page_count = max(1, math.ceil(budget["word_count"] / 250))
        created_at = datetime.utcnow()
        due_date = created_at + timedelta(days=30)
        client_deadline = calculate_client_deadline("partner", created_at)

        order = TranslationOrder(
            partner_id=partner["id"],
            partner_company=partner["company_name"],
            client_name=client_name,
            client_email=client_email,
            service_type=budget["service_type"],
            translate_from=budget["translate_from"],
            translate_to=budget["translate_to"],
            word_count=budget["word_count"],
            page_count=page_count,
            urgency=budget["urgency"],
            notes=budget.get("notes"),
            base_price=budget["base_price"],
            urgency_fee=budget["urgency_fee"],
            total_price=budget["total_price"],
            due_date=due_date,
            deadline=client_deadline,  # 2 business days for partner portal
            revenue_source="partner"
        )

        await db.translation_orders.insert_one(order.dict())

        # Mark budget as converted
        await db.saved_budgets.update_one(
            {"id": budget_id},
            {"$set": {"status": "converted"}}
        )

        # Associate documents if any
        if budget.get("document_ids"):
            await db.documents.update_many(
                {"id": {"$in": budget["document_ids"]}},
                {"$set": {"order_id": order.id, "order_number": order.order_number}}
            )

        return {
            "status": "success",
            "message": "Budget converted to order",
            "order": order.dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting budget to order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to convert budget")


# ==================== ABANDONED QUOTES (Cart Abandonment Recovery) ====================

class AbandonedQuote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    total_price: float
    document_ids: Optional[List[str]] = None
    files_info: Optional[List[dict]] = None
    status: str = "abandoned"  # abandoned, recovered, expired
    reminder_sent: int = 0  # Number of reminder emails sent
    discount_code: Optional[str] = None  # Generated discount code for recovery
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_reminder_at: Optional[datetime] = None

class AbandonedQuoteCreate(BaseModel):
    email: EmailStr
    name: str
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    total_price: float
    document_ids: Optional[List[str]] = None
    files_info: Optional[List[dict]] = None

@api_router.post("/abandoned-quotes/save")
async def save_abandoned_quote(quote_data: AbandonedQuoteCreate):
    """Auto-save an abandoned quote when customer sees the price"""
    try:
        # Check if there's already an abandoned quote for this email
        existing = await db.abandoned_quotes.find_one({
            "email": quote_data.email,
            "status": "abandoned"
        })

        if existing:
            # Update existing abandoned quote
            await db.abandoned_quotes.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "service_type": quote_data.service_type,
                    "translate_from": quote_data.translate_from,
                    "translate_to": quote_data.translate_to,
                    "word_count": quote_data.word_count,
                    "urgency": quote_data.urgency,
                    "total_price": quote_data.total_price,
                    "document_ids": quote_data.document_ids,
                    "files_info": quote_data.files_info,
                    "created_at": datetime.utcnow()
                }}
            )
            return {"status": "updated", "quote_id": existing["id"]}

        # Create new abandoned quote
        quote = AbandonedQuote(
            email=quote_data.email,
            name=quote_data.name,
            service_type=quote_data.service_type,
            translate_from=quote_data.translate_from,
            translate_to=quote_data.translate_to,
            word_count=quote_data.word_count,
            urgency=quote_data.urgency,
            total_price=quote_data.total_price,
            document_ids=quote_data.document_ids,
            files_info=quote_data.files_info
        )

        await db.abandoned_quotes.insert_one(quote.dict())

        # Send automatic email with quote details
        try:
            frontend_url = os.environ.get('FRONTEND_URL', 'https://legacy-portal-customer.onrender.com')
            subject = "Your Translation Quote - Legacy Translations"
            content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px; margin-bottom: 20px;">
                <h2 style="color: #0d9488;">Your Quote Has Been Saved!</h2>
                <p>Hello {quote_data.name},</p>
                <p>Thank you for your interest in our translation services. Here's a summary of your quote:</p>

                <div style="background: #f0fdfa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p><strong>Service:</strong> {quote_data.service_type.replace('_', ' ').title()} Translation</p>
                    <p><strong>From:</strong> {quote_data.translate_from.title()} → <strong>To:</strong> {quote_data.translate_to.title()}</p>
                    <p><strong>Word Count:</strong> {quote_data.word_count} words</p>
                    <p style="font-size: 24px; color: #0d9488; font-weight: bold;">Total: ${quote_data.total_price:.2f}</p>
                </div>

                <p>Ready to proceed? Click the button below to complete your order:</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/#/customer" style="background: #0d9488; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Your Order</a>
                </div>

                <p style="color: #666; font-size: 14px;">If you have any questions, please reply to this email or contact us at info@legacytranslations.com</p>

                <p>Best regards,<br>Legacy Translations Team</p>
            </div>
            """
            await email_service.send_email(quote_data.email, subject, content)
            logger.info(f"Quote email sent to {quote_data.email}")
        except Exception as email_error:
            logger.error(f"Failed to send quote email: {str(email_error)}")
            # Don't fail the request if email fails

        return {"status": "created", "quote_id": quote.id}

    except Exception as e:
        logger.error(f"Error saving abandoned quote: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save quote")

@api_router.get("/admin/abandoned-quotes")
async def get_abandoned_quotes(admin_key: str, status: Optional[str] = None):
    """Get all abandoned quotes for admin dashboard"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    query = {}
    if status:
        query["status"] = status

    quotes = await db.abandoned_quotes.find(query).sort("created_at", -1).to_list(500)

    for quote in quotes:
        if '_id' in quote:
            del quote['_id']
        if quote.get("created_at"):
            quote["created_at"] = quote["created_at"].isoformat()
        if quote.get("last_reminder_at"):
            quote["last_reminder_at"] = quote["last_reminder_at"].isoformat()

    return {"quotes": quotes}

@api_router.post("/admin/abandoned-quotes/{quote_id}/send-reminder")
async def send_abandoned_quote_reminder(quote_id: str, admin_key: str, include_discount: bool = False, discount_percent: int = 10):
    """Send reminder email for abandoned quote with optional discount"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        quote = await db.abandoned_quotes.find_one({"id": quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Abandoned quote not found")

        discount_code = None
        if include_discount:
            # Generate unique discount code
            discount_code = f"COMEBACK{discount_percent}-{str(uuid.uuid4())[:6].upper()}"

            # Save discount code to database
            await db.discount_codes.insert_one({
                "id": str(uuid.uuid4()),
                "code": discount_code,
                "type": "percentage",
                "value": discount_percent,
                "max_uses": 1,
                "uses": 0,
                "abandoned_quote_id": quote_id,
                "expires_at": datetime.utcnow() + timedelta(days=7),
                "created_at": datetime.utcnow()
            })

            # Update abandoned quote with discount code
            await db.abandoned_quotes.update_one(
                {"id": quote_id},
                {"$set": {"discount_code": discount_code}}
            )

        # Send reminder email
        try:
            reminder_number = quote.get("reminder_sent", 0) + 1
            await email_service.send_abandoned_quote_reminder(
                quote["email"],
                quote["name"],
                {
                    "service_type": quote["service_type"],
                    "translate_from": quote["translate_from"],
                    "translate_to": quote["translate_to"],
                    "word_count": quote["word_count"],
                    "total_price": quote["total_price"],
                    "files_info": quote.get("files_info", [])
                },
                discount_code=discount_code,
                discount_percent=discount_percent if include_discount else 0,
                reminder_number=reminder_number
            )
        except Exception as e:
            logger.error(f"Failed to send reminder email: {str(e)}")
            # Continue even if email fails

        # Update quote reminder count
        await db.abandoned_quotes.update_one(
            {"id": quote_id},
            {
                "$set": {"last_reminder_at": datetime.utcnow()},
                "$inc": {"reminder_sent": 1}
            }
        )

        return {
            "status": "success",
            "message": "Reminder sent",
            "discount_code": discount_code
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending reminder: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send reminder")

# ==================== AUTOMATED FOLLOW-UP SYSTEM ====================

@api_router.post("/admin/quotes/process-followups")
async def process_quote_followups(admin_key: str):
    """
    Automated follow-up system for unconverted quotes.
    Follow-up schedule:
    - Day 3: First reminder (no discount)
    - Day 7: Second reminder (10% discount)
    - Day 14: Third reminder (15% discount)
    - Day 21: Mark as "lost"
    """
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        now = datetime.utcnow()
        results = {
            "reminders_sent": 0,
            "marked_lost": 0,
            "errors": []
        }

        # Get all abandoned quotes that need follow-up
        abandoned_quotes = await db.abandoned_quotes.find({
            "status": {"$in": ["abandoned", "pending"]}
        }).to_list(1000)

        # Also get quotes from translation_orders with status "Quote" that haven't converted
        quote_orders = await db.translation_orders.find({
            "translation_status": "Quote",
            "payment_status": "pending"
        }).to_list(1000)

        # Process abandoned quotes
        for quote in abandoned_quotes:
            try:
                created_at = quote.get("created_at", now)
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

                days_since = (now - created_at).days
                reminder_count = quote.get("reminder_sent", 0)
                last_reminder = quote.get("last_reminder_at")

                # Determine what action to take
                should_remind = False
                discount_percent = 0

                if days_since >= 21 and quote.get("status") != "lost":
                    # Mark as lost
                    await db.abandoned_quotes.update_one(
                        {"id": quote["id"]},
                        {"$set": {"status": "lost", "marked_lost_at": now}}
                    )
                    results["marked_lost"] += 1
                    continue

                elif days_since >= 14 and reminder_count < 3:
                    # Third reminder with 15% discount
                    should_remind = True
                    discount_percent = 15

                elif days_since >= 7 and reminder_count < 2:
                    # Second reminder with 10% discount
                    should_remind = True
                    discount_percent = 10

                elif days_since >= 3 and reminder_count < 1:
                    # First reminder, no discount
                    should_remind = True
                    discount_percent = 0

                if should_remind:
                    # Check if we sent a reminder recently (within 24 hours)
                    if last_reminder:
                        if isinstance(last_reminder, str):
                            last_reminder = datetime.fromisoformat(last_reminder.replace('Z', '+00:00'))
                        hours_since_last = (now - last_reminder).total_seconds() / 3600
                        if hours_since_last < 24:
                            continue

                    # Generate discount code if needed
                    discount_code = None
                    if discount_percent > 0:
                        discount_code = f"FOLLOWUP{discount_percent}-{quote['id'][:6].upper()}"
                        await db.discount_codes.insert_one({
                            "id": str(uuid.uuid4()),
                            "code": discount_code,
                            "type": "percentage",
                            "value": discount_percent,
                            "max_uses": 1,
                            "uses": 0,
                            "abandoned_quote_id": quote["id"],
                            "expires_at": now + timedelta(days=7),
                            "created_at": now,
                            "is_active": True
                        })

                    # Send reminder email
                    await send_followup_email(
                        quote["email"],
                        quote.get("name", "Customer"),
                        quote,
                        reminder_count + 1,
                        discount_percent,
                        discount_code
                    )

                    # Update quote
                    await db.abandoned_quotes.update_one(
                        {"id": quote["id"]},
                        {
                            "$set": {"last_reminder_at": now},
                            "$inc": {"reminder_sent": 1}
                        }
                    )
                    results["reminders_sent"] += 1

            except Exception as e:
                results["errors"].append(f"Quote {quote.get('id', 'unknown')}: {str(e)}")

        # Process quote orders
        for order in quote_orders:
            try:
                created_at = order.get("created_at", now)
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

                days_since = (now - created_at).days
                reminder_count = order.get("followup_count", 0)
                last_reminder = order.get("last_followup_at")

                should_remind = False
                discount_percent = 0

                if days_since >= 21:
                    # Mark quote as expired/lost
                    await db.translation_orders.update_one(
                        {"id": order["id"]},
                        {"$set": {"translation_status": "Quote - Lost", "updated_at": now}}
                    )
                    results["marked_lost"] += 1
                    continue

                elif days_since >= 14 and reminder_count < 3:
                    should_remind = True
                    discount_percent = 15

                elif days_since >= 7 and reminder_count < 2:
                    should_remind = True
                    discount_percent = 10

                elif days_since >= 3 and reminder_count < 1:
                    should_remind = True
                    discount_percent = 0

                if should_remind:
                    if last_reminder:
                        if isinstance(last_reminder, str):
                            last_reminder = datetime.fromisoformat(last_reminder.replace('Z', '+00:00'))
                        hours_since_last = (now - last_reminder).total_seconds() / 3600
                        if hours_since_last < 24:
                            continue

                    # Generate discount code if needed
                    discount_code = None
                    if discount_percent > 0:
                        discount_code = f"QUOTE{discount_percent}-{order['order_number']}"
                        await db.discount_codes.insert_one({
                            "id": str(uuid.uuid4()),
                            "code": discount_code,
                            "type": "percentage",
                            "value": discount_percent,
                            "max_uses": 1,
                            "uses": 0,
                            "order_id": order["id"],
                            "expires_at": now + timedelta(days=7),
                            "created_at": now,
                            "is_active": True
                        })

                    # Send reminder email for quote order
                    await send_quote_order_followup_email(
                        order.get("client_email"),
                        order.get("client_name", "Customer"),
                        order,
                        reminder_count + 1,
                        discount_percent,
                        discount_code
                    )

                    # Update order
                    await db.translation_orders.update_one(
                        {"id": order["id"]},
                        {
                            "$set": {"last_followup_at": now, "updated_at": now},
                            "$inc": {"followup_count": 1}
                        }
                    )
                    results["reminders_sent"] += 1

            except Exception as e:
                results["errors"].append(f"Order {order.get('order_number', 'unknown')}: {str(e)}")

        logger.info(f"Follow-up processing complete: {results}")
        return results

    except Exception as e:
        logger.error(f"Error processing follow-ups: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process follow-ups: {str(e)}")

async def send_followup_email(email: str, name: str, quote: dict, reminder_number: int, discount_percent: int, discount_code: str = None):
    """Send follow-up email for abandoned quote"""
    frontend_url = os.environ.get('FRONTEND_URL', 'https://portal.legacytranslations.com/#/customer')
    total_price = quote.get("total_price", 0)
    discounted_price = total_price * (1 - discount_percent / 100) if discount_percent > 0 else total_price

    if reminder_number == 1:
        subject = "Don't forget your translation quote! - Legacy Translations"
        intro = "We noticed you started a translation request but didn't complete your order. Your quote is still available!"
        cta_text = "Complete Your Order"
    elif reminder_number == 2:
        subject = f"Special offer: {discount_percent}% off your translation! - Legacy Translations"
        intro = f"We'd love to help with your translation! As a special thank you for your interest, here's {discount_percent}% off your order."
        cta_text = "Claim Your Discount"
    else:
        subject = f"Last chance: {discount_percent}% off - Legacy Translations"
        intro = f"This is your final reminder! Don't miss out on {discount_percent}% off your translation. This offer expires soon!"
        cta_text = "Get Started Now"

    discount_section = ""
    if discount_code and discount_percent > 0:
        discount_section = f"""
        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">Use code at checkout:</p>
            <p style="font-size: 24px; font-weight: bold; color: #d97706; margin: 0;">{discount_code}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">for <strong>{discount_percent}% OFF</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Was: ${total_price:.2f} | Now: ${discounted_price:.2f}</p>
        </div>
        """

    content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px;">
        </div>

        <div style="padding: 30px;">
            <h2 style="color: #0d9488; margin-top: 0;">Hello {name}!</h2>
            <p>{intro}</p>

            <div style="background: #f0fdfa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p><strong>Service:</strong> {quote.get('service_type', 'Translation').replace('_', ' ').title()}</p>
                <p><strong>Languages:</strong> {quote.get('translate_from', 'Source')} → {quote.get('translate_to', 'Target')}</p>
                <p style="font-size: 20px; color: #0d9488; font-weight: bold; margin: 10px 0 0 0;">Total: ${total_price:.2f}</p>
            </div>

            {discount_section}

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}" style="display: inline-block; padding: 15px 40px; background: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">{cta_text}</a>
            </div>

            <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reply to this email or call us at +1(857)316-7770.</p>

            <p>Best regards,<br>Legacy Translations Team</p>
        </div>

        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; color: #666; font-size: 12px;">Legacy Translations | www.legacytranslations.com</p>
        </div>
    </div>
    """

    await email_service.send_email(email, subject, content)
    logger.info(f"Follow-up email #{reminder_number} sent to {email}")

async def send_quote_order_followup_email(email: str, name: str, order: dict, reminder_number: int, discount_percent: int, discount_code: str = None):
    """Send follow-up email for quote order"""
    frontend_url = os.environ.get('FRONTEND_URL', 'https://portal.legacytranslations.com/#/customer')
    total_price = order.get("total_price", order.get("base_price", 0))
    discounted_price = total_price * (1 - discount_percent / 100) if discount_percent > 0 else total_price
    order_number = order.get("order_number", "N/A")

    if reminder_number == 1:
        subject = f"Your quote {order_number} is waiting! - Legacy Translations"
        intro = "We noticed you received a translation quote but haven't completed your order yet. We're ready to help!"
        cta_text = "Complete Your Order"
    elif reminder_number == 2:
        subject = f"Special offer on quote {order_number}: {discount_percent}% off!"
        intro = f"We'd love to work on your translation! Here's {discount_percent}% off as a thank you for your interest."
        cta_text = "Claim Your Discount"
    else:
        subject = f"Final reminder: {discount_percent}% off quote {order_number}"
        intro = f"This is your last chance to get {discount_percent}% off! Don't miss this special offer."
        cta_text = "Get Started Now"

    discount_section = ""
    if discount_code and discount_percent > 0:
        discount_section = f"""
        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">Use code at checkout:</p>
            <p style="font-size: 24px; font-weight: bold; color: #d97706; margin: 0;">{discount_code}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">for <strong>{discount_percent}% OFF</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Was: ${total_price:.2f} | Now: ${discounted_price:.2f}</p>
        </div>
        """

    content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <img src="https://legacytranslations.com/wp-content/themes/legacy/images/logo215x80.png" alt="Legacy Translations" style="max-width: 150px;">
        </div>

        <div style="padding: 30px;">
            <h2 style="color: #0d9488; margin-top: 0;">Hello {name}!</h2>
            <p>{intro}</p>

            <div style="background: #f0fdfa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p><strong>Quote #:</strong> {order_number}</p>
                <p><strong>Service:</strong> {order.get('service_type', 'Translation').replace('_', ' ').title()}</p>
                <p><strong>Languages:</strong> {order.get('translate_from', 'Source')} → {order.get('translate_to', 'Target')}</p>
                <p><strong>Pages:</strong> {order.get('page_count', 1)}</p>
                <p style="font-size: 20px; color: #0d9488; font-weight: bold; margin: 10px 0 0 0;">Total: ${total_price:.2f}</p>
            </div>

            {discount_section}

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}" style="display: inline-block; padding: 15px 40px; background: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">{cta_text}</a>
            </div>

            <h3 style="color: #0d9488;">Payment Options</h3>
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 150px; background: #f0fdf4; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0;"><strong>Zelle</strong></p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">857-208-1139</p>
                </div>
                <div style="flex: 1; min-width: 150px; background: #eff6ff; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0;"><strong>Venmo</strong></p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">@legacytranslations</p>
                </div>
            </div>

            <p style="margin-top: 20px; color: #666; font-size: 14px;">Questions? Reply to this email or call +1(857)316-7770.</p>

            <p>Best regards,<br>Legacy Translations Team</p>
        </div>

        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; color: #666; font-size: 12px;">Legacy Translations | www.legacytranslations.com</p>
        </div>
    </div>
    """

    await email_service.send_email(email, subject, content)
    logger.info(f"Quote order follow-up email #{reminder_number} sent to {email} for {order_number}")

@api_router.get("/admin/quotes/followup-status")
async def get_followup_status(admin_key: str):
    """Get status of all quotes and their follow-up progress"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        now = datetime.utcnow()

        # Get abandoned quotes with follow-up info (exclude those marked as excluded)
        abandoned = await db.abandoned_quotes.find({
            "excluded_from_followup": {"$ne": True},
            "status": {"$nin": ["excluded", "recovered"]}
        }).sort("created_at", -1).to_list(500)

        # Get quote orders (exclude those marked as excluded)
        quote_orders = await db.translation_orders.find({
            "$and": [
                {"translation_status": {"$regex": "^Quote", "$options": "i"}},
                {"translation_status": {"$ne": "Quote - Excluded"}},
                {"excluded_from_followup": {"$ne": True}}
            ]
        }).sort("created_at", -1).to_list(500)

        result = {
            "abandoned_quotes": [],
            "quote_orders": [],
            "summary": {
                "total_pending": 0,
                "needs_first_reminder": 0,
                "needs_second_reminder": 0,
                "needs_third_reminder": 0,
                "marked_lost": 0
            }
        }

        for q in abandoned:
            created_at = q.get("created_at", now)
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            days_since = (now - created_at).days
            reminder_count = q.get("reminder_sent", 0)

            status_info = {
                "id": q.get("id"),
                "email": q.get("email"),
                "name": q.get("name"),
                "total_price": q.get("total_price"),
                "days_since_creation": days_since,
                "reminder_count": reminder_count,
                "status": q.get("status"),
                "next_action": None,
                "followup_stage": None,
                "type": "abandoned"
            }

            if q.get("status") == "lost":
                result["summary"]["marked_lost"] += 1
                status_info["next_action"] = "None - marked as lost"
                status_info["followup_stage"] = "lost"
            elif q.get("status") == "recovered":
                status_info["next_action"] = "None - converted to order"
                status_info["followup_stage"] = "recovered"
            elif days_since >= 21:
                status_info["next_action"] = "Will be marked as lost"
                status_info["followup_stage"] = "lost"
            elif days_since >= 14 and reminder_count < 3:
                result["summary"]["needs_third_reminder"] += 1
                status_info["next_action"] = "Third reminder (15% discount)"
                status_info["followup_stage"] = "third"
            elif days_since >= 7 and reminder_count < 2:
                result["summary"]["needs_second_reminder"] += 1
                status_info["next_action"] = "Second reminder (10% discount)"
                status_info["followup_stage"] = "second"
            elif days_since >= 3 and reminder_count < 1:
                result["summary"]["needs_first_reminder"] += 1
                status_info["next_action"] = "First reminder (no discount)"
                status_info["followup_stage"] = "first"
            else:
                result["summary"]["total_pending"] += 1
                status_info["next_action"] = f"Wait {3 - days_since} more days"
                status_info["followup_stage"] = "pending"

            result["abandoned_quotes"].append(status_info)

        for o in quote_orders:
            created_at = o.get("created_at", now)
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            days_since = (now - created_at).days
            reminder_count = o.get("followup_count", 0)

            status_info = {
                "id": o.get("id"),
                "order_number": o.get("order_number"),
                "client_email": o.get("client_email"),
                "client_name": o.get("client_name"),
                "total_price": o.get("total_price"),
                "days_since_creation": days_since,
                "followup_count": reminder_count,
                "status": o.get("translation_status"),
                "next_action": None,
                "followup_stage": None,
                "type": "order"
            }

            if o.get("translation_status") == "Quote - Lost":
                result["summary"]["marked_lost"] += 1
                status_info["next_action"] = "None - marked as lost"
                status_info["followup_stage"] = "lost"
            elif days_since >= 21:
                status_info["next_action"] = "Will be marked as lost"
                status_info["followup_stage"] = "lost"
            elif days_since >= 14 and reminder_count < 3:
                result["summary"]["needs_third_reminder"] += 1
                status_info["next_action"] = "Third reminder (15% discount)"
                status_info["followup_stage"] = "third"
            elif days_since >= 7 and reminder_count < 2:
                result["summary"]["needs_second_reminder"] += 1
                status_info["next_action"] = "Second reminder (10% discount)"
                status_info["followup_stage"] = "second"
            elif days_since >= 3 and reminder_count < 1:
                result["summary"]["needs_first_reminder"] += 1
                status_info["next_action"] = "First reminder (no discount)"
                status_info["followup_stage"] = "first"
            else:
                result["summary"]["total_pending"] += 1
                status_info["next_action"] = f"Wait {3 - days_since} more days"
                status_info["followup_stage"] = "pending"

            result["quote_orders"].append(status_info)

        return result

    except Exception as e:
        logger.error(f"Error getting follow-up status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get follow-up status")

@api_router.post("/admin/quotes/exclude-from-followup")
async def exclude_from_followup(admin_key: str, quote_id: str, quote_type: str = "abandoned"):
    """Exclude a quote from the follow-up system"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        if quote_type == "abandoned":
            # Mark abandoned quote as excluded from follow-ups
            result = await db.abandoned_quotes.update_one(
                {"id": quote_id},
                {"$set": {"excluded_from_followup": True, "status": "excluded"}}
            )
        else:
            # Mark quote order as excluded from follow-ups
            result = await db.translation_orders.update_one(
                {"id": quote_id},
                {"$set": {"excluded_from_followup": True, "translation_status": "Quote - Excluded"}}
            )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Quote not found")

        return {"success": True, "message": "Quote excluded from follow-ups"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error excluding quote from follow-ups: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to exclude quote")

# ==================== DISCOUNT CODES ====================

class DiscountCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    type: str  # 'percentage' or 'fixed'
    value: float  # percentage (e.g., 10 for 10%) or fixed amount
    max_uses: Optional[int] = None  # None means unlimited
    uses: int = 0
    abandoned_quote_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DiscountCodeCreate(BaseModel):
    code: str
    type: str = "percentage"
    value: float
    max_uses: Optional[int] = None
    expires_in_days: Optional[int] = 30

@api_router.get("/discount-codes/validate")
async def validate_discount_code(code: str):
    """Validate a discount code"""
    try:
        discount = await db.discount_codes.find_one({
            "code": code.upper(),
            "is_active": True
        })

        if not discount:
            return {"valid": False, "message": "Invalid discount code"}

        # Check if expired
        if discount.get("expires_at") and datetime.utcnow() > discount["expires_at"]:
            return {"valid": False, "message": "Discount code has expired"}

        # Check max uses
        if discount.get("max_uses") and discount["uses"] >= discount["max_uses"]:
            return {"valid": False, "message": "Discount code has reached maximum uses"}

        return {
            "valid": True,
            "discount": {
                "type": discount["type"],
                "value": discount["value"]
            }
        }

    except Exception as e:
        logger.error(f"Error validating discount code: {str(e)}")
        return {"valid": False, "message": "Error validating code"}

@api_router.post("/admin/discount-codes")
async def create_discount_code(data: DiscountCodeCreate, admin_key: str):
    """Create a new discount code"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Check if code already exists
        existing = await db.discount_codes.find_one({"code": data.code.upper()})
        if existing:
            raise HTTPException(status_code=400, detail="Discount code already exists")

        expires_at = None
        if data.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

        discount = DiscountCode(
            code=data.code.upper(),
            type=data.type,
            value=data.value,
            max_uses=data.max_uses,
            expires_at=expires_at
        )

        await db.discount_codes.insert_one(discount.dict())

        return {"status": "success", "discount": discount.dict()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating discount code: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create discount code")

@api_router.get("/admin/discount-codes")
async def get_discount_codes(admin_key: str):
    """Get all discount codes"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    codes = await db.discount_codes.find().sort("created_at", -1).to_list(500)

    for code in codes:
        if '_id' in code:
            del code['_id']
        if code.get("created_at"):
            code["created_at"] = code["created_at"].isoformat()
        if code.get("expires_at"):
            code["expires_at"] = code["expires_at"].isoformat()

    return {"codes": codes}

@api_router.delete("/admin/discount-codes/{code_id}")
async def delete_discount_code(code_id: str, admin_key: str):
    """Delete/deactivate a discount code"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.discount_codes.update_one(
        {"id": code_id},
        {"$set": {"is_active": False}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Discount code not found")

    return {"status": "success"}

# ==================== GUEST ORDERS (No authentication required) ====================

class GuestOrderCreate(BaseModel):
    email: EmailStr
    name: str
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    reference: Optional[str] = None
    notes: Optional[str] = None
    document_filename: Optional[str] = None
    document_ids: Optional[List[str]] = None
    discount_code: Optional[str] = None
    abandoned_quote_id: Optional[str] = None

@api_router.post("/guest/orders/create")
async def create_guest_order(order_data: GuestOrderCreate):
    """Create a new order without authentication (for website customers)"""
    try:
        # Calculate pricing
        base_price, urgency_fee, total_price = calculate_price(
            order_data.word_count,
            order_data.service_type,
            order_data.urgency
        )

        # Apply discount if provided
        discount_amount = 0
        if order_data.discount_code:
            discount = await db.discount_codes.find_one({
                "code": order_data.discount_code.upper(),
                "is_active": True
            })

            if discount:
                # Check validity
                valid = True
                if discount.get("expires_at") and datetime.utcnow() > discount["expires_at"]:
                    valid = False
                if discount.get("max_uses") and discount["uses"] >= discount["max_uses"]:
                    valid = False

                if valid:
                    if discount["type"] == "percentage":
                        discount_amount = total_price * (discount["value"] / 100)
                    else:
                        discount_amount = discount["value"]

                    total_price = max(0, total_price - discount_amount)

                    # Increment uses
                    await db.discount_codes.update_one(
                        {"code": order_data.discount_code.upper()},
                        {"$inc": {"uses": 1}}
                    )

        # Calculate page count
        page_count = max(1, math.ceil(order_data.word_count / 250))

        # Set due date
        due_date = datetime.utcnow() + timedelta(days=30)

        # Create order
        order = CustomerOrder(
            customer_id="guest",
            customer_name=order_data.name,
            customer_email=order_data.email,
            service_type=order_data.service_type,
            translate_from=order_data.translate_from,
            translate_to=order_data.translate_to,
            word_count=order_data.word_count,
            page_count=page_count,
            urgency=order_data.urgency,
            reference=order_data.reference,
            notes=order_data.notes,
            base_price=base_price,
            urgency_fee=urgency_fee,
            total_price=total_price,
            due_date=due_date,
            document_filename=order_data.document_filename
        )

        await db.customer_orders.insert_one(order.dict())

        # Associate uploaded documents
        if order_data.document_ids:
            await db.documents.update_many(
                {"id": {"$in": order_data.document_ids}},
                {"$set": {"order_id": order.id, "order_number": order.order_number}}
            )

        # Mark abandoned quote as recovered
        if order_data.abandoned_quote_id:
            await db.abandoned_quotes.update_one(
                {"id": order_data.abandoned_quote_id},
                {"$set": {"status": "recovered"}}
            )

        # Send confirmation email
        try:
            order_details = {
                "reference": order.order_number,
                "service_type": order.service_type,
                "translate_from": order.translate_from,
                "translate_to": order.translate_to,
                "word_count": order.word_count,
                "urgency": order.urgency,
                "estimated_delivery": get_estimated_delivery(order.urgency),
                "base_price": order.base_price,
                "urgency_fee": order.urgency_fee,
                "total_price": order.total_price
            }

            # Send confirmation to customer (friendly message)
            await email_service.send_order_confirmation_email(
                order_data.email,
                order_details,
                is_partner=True  # Customer gets "Thank you for your order!"
            )

            # Also notify company (internal notification)
            await email_service.send_order_confirmation_email(
                "contact@legacytranslations.com",
                order_details,
                is_partner=False  # Company gets "New translation order received."
            )
        except Exception as e:
            logger.error(f"Failed to send order emails: {str(e)}")

        return {
            "status": "success",
            "message": "Order created successfully",
            "order": order.dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating guest order: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create order")


# ============ SHARED API KEY MANAGEMENT ============
# Allows admin to set a shared Claude API key that all translators can use

@api_router.get("/admin/settings/api-key")
async def get_shared_api_key(admin_key: str):
    """Get the shared Claude API key (masked for security)"""
    await validate_admin_or_user_token(admin_key)

    settings = await db.app_settings.find_one({"key": "shared_claude_api_key"})
    if settings and settings.get("value"):
        # Return masked key for display (show only last 8 chars)
        full_key = settings["value"]
        masked = "*" * (len(full_key) - 8) + full_key[-8:] if len(full_key) > 8 else "****"
        return {
            "configured": True,
            "masked_key": masked,
            "updated_at": settings.get("updated_at")
        }
    return {"configured": False, "masked_key": None}

@api_router.post("/admin/settings/api-key")
async def save_shared_api_key(admin_key: str, api_key: str = Body(..., embed=True)):
    """Save a shared Claude API key for all users"""
    await validate_admin_or_user_token(admin_key)

    # Validate key format (basic check)
    if not api_key or not api_key.startswith("sk-"):
        raise HTTPException(status_code=400, detail="Invalid API key format")

    await db.app_settings.update_one(
        {"key": "shared_claude_api_key"},
        {
            "$set": {
                "key": "shared_claude_api_key",
                "value": api_key,
                "updated_at": datetime.utcnow().isoformat()
            }
        },
        upsert=True
    )

    logger.info("Shared Claude API key updated")
    return {"status": "success", "message": "API key saved successfully"}

@api_router.delete("/admin/settings/api-key")
async def delete_shared_api_key(admin_key: str):
    """Remove the shared Claude API key"""
    await validate_admin_or_user_token(admin_key)

    await db.app_settings.delete_one({"key": "shared_claude_api_key"})
    logger.info("Shared Claude API key deleted")
    return {"status": "success", "message": "API key removed"}

@api_router.get("/settings/api-key/check")
async def check_shared_api_key_available():
    """Public endpoint to check if a shared API key is configured (for translators)"""
    settings = await db.app_settings.find_one({"key": "shared_claude_api_key"})
    return {"available": bool(settings and settings.get("value"))}

@api_router.get("/settings/api-key/use")
async def get_api_key_for_translation(token: str = None):
    """Get the actual API key for translation (requires authentication)"""
    # Validate that user is authenticated (either admin or partner/translator)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check if token is valid (either admin token or partner token)
    try:
        # Try admin token first
        await validate_admin_or_user_token(token)
    except:
        # Try partner token
        partner = await db.partners.find_one({"token": token})
        if not partner:
            raise HTTPException(status_code=401, detail="Invalid token")

    settings = await db.app_settings.find_one({"key": "shared_claude_api_key"})
    if settings and settings.get("value"):
        return {"api_key": settings["value"]}

    raise HTTPException(status_code=404, detail="No shared API key configured")


# ==================== AI TRANSLATION PIPELINE ENDPOINTS ====================

# ============ SPECIALIZED AI PROMPTS ============

def get_ai_translator_prompt(config: dict, glossary_terms: str = "") -> str:
    """
    STAGE 1: AI TRANSLATOR - Specialized prompt for professional translation
    Focus: Accuracy, completeness, terminology, formatting
    """

    source_lang = config.get("source_language", "Portuguese")
    target_lang = config.get("target_language", "English")
    doc_type = config.get("document_type", "General Document")
    page_format = config.get("page_format", "letter")

    # Currency conversion
    currency_section = ""
    translator_note_section = ""
    if config.get("convert_currency"):
        src_curr = config.get("source_currency", "BRL")
        tgt_curr = config.get("target_currency", "USD")
        exchange_rate = config.get("exchange_rate", 5.0)
        rate_date = config.get("rate_date", "current date")

        currency_section = f"""
═══════════════════════════════════════════════════════════════════
                    CURRENCY CONVERSION
═══════════════════════════════════════════════════════════════════
Convert monetary values from {src_curr} to {tgt_curr}:
• Exchange Rate: 1 {tgt_curr} = {exchange_rate} {src_curr}
• Rate Date: {rate_date}
• Show BOTH values: Original [CONVERTED in bold]
• Example: R$ 5,420.00 [<strong>$1,000.00 USD</strong>]
• Format according to target country:
  - USD: $1,234.56 (comma for thousands, period for decimals)
  - BRL: R$ 1.234,56 (period for thousands, comma for decimals)
• For bank statements: preserve all transaction codes and dates
"""

        # Add translator's note instruction for financial documents
        if config.get("add_translator_note"):
            translator_note_section = f"""
═══════════════════════════════════════════════════════════════════
              ⚠️ TRANSLATOR'S NOTE - MANDATORY ⚠️
═══════════════════════════════════════════════════════════════════
You MUST add a "TRANSLATOR'S NOTE" box at the TOP of the FIRST PAGE.

Insert this HTML block IMMEDIATELY after the opening <body> tag:

<div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px; background-color: #f9f9f9; font-size: 10pt;">
  <strong>TRANSLATOR'S NOTE:</strong><br>
  Currency values in this document have been converted from {src_curr} to {tgt_curr}
  using the exchange rate of <strong>1 {tgt_curr} = {exchange_rate} {src_curr}</strong>
  as of <strong>{rate_date}</strong>.<br>
  Original values are shown with converted amounts in brackets [<strong>USD value</strong>].
</div>

This note is REQUIRED for all financial documents with currency conversion.
DO NOT omit this note - it is essential for document authenticity.
"""

    # Date format
    date_section = f"""
═══════════════════════════════════════════════════════════════════
                    DATE FORMAT CONVERSION
═══════════════════════════════════════════════════════════════════
• Source format: DD/MM/YYYY (Brazilian: 25/12/2024)
• Target format: {"MM/DD/YYYY or Month DD, YYYY (US: 12/25/2024 or December 25, 2024)" if "english" in target_lang.lower() else "DD/MM/YYYY"}
• Convert ALL dates consistently throughout the document
• Written dates: "25 de dezembro de 2024" → "December 25, 2024"
"""

    # Document-specific instructions
    doc_specific = ""
    doc_type_lower = doc_type.lower()

    if "birth" in doc_type_lower or "certid" in doc_type_lower:
        doc_specific = """
BIRTH CERTIFICATE SPECIFICS:
• Translate all official titles and headers
• Keep registration numbers exactly as shown
• Translate relationship terms accurately (pai=father, mãe=mother, etc.)
• Preserve all dates, places, and registration details
• Include notations for stamps, seals, signatures
"""
    elif "bank" in doc_type_lower or "extrato" in doc_type_lower or "statement" in doc_type_lower:
        doc_specific = """
BANK STATEMENT SPECIFICS:
• Preserve ALL account numbers, transaction codes exactly
• Translate transaction descriptions clearly
• Maintain chronological order of transactions
• Convert currency values with both amounts shown
• Preserve balance calculations and totals
• Format as professional financial document
"""
    elif "diploma" in doc_type_lower or "education" in doc_type_lower or "academic" in doc_type_lower:
        doc_specific = """
ACADEMIC DOCUMENT SPECIFICS:
• Use official academic terminology for target country
• Translate degree names appropriately (Bacharel, Licenciatura, etc.)
• Preserve institution names (translate or keep original as appropriate)
• Include course names and grades exactly
• Maintain formal, ceremonial tone
"""
    elif "passport" in doc_type_lower or "id" in doc_type_lower or "driver" in doc_type_lower:
        doc_specific = """
IDENTITY DOCUMENT SPECIFICS:
• Preserve ALL ID numbers, codes, and dates exactly
• Translate field labels accurately
• Keep personal names in original form
• Note any security features, holograms, etc.
• Include validity dates and issuing authority
"""
    elif "contract" in doc_type_lower or "legal" in doc_type_lower:
        doc_specific = """
LEGAL DOCUMENT SPECIFICS:
• Use precise legal terminology for target jurisdiction
• Preserve clause numbering and structure
• Translate parties' names with original in parentheses
• Maintain formal legal register
• Include all signatures, dates, witness information
"""

    prompt = f"""You are a SENIOR CERTIFIED TRANSLATOR with 20+ years of experience in {doc_type} documents.
Your specialty: {source_lang} → {target_lang} translation for official use in the United States.

═══════════════════════════════════════════════════════════════════
                    YOUR ROLE: AI TRANSLATOR
═══════════════════════════════════════════════════════════════════
You are the FIRST stage in our 3-stage AI translation pipeline.
Your translation will be reviewed by:
1. Proofreader (terminology verification)
2. Human Reviewer (final approval)

⚠️ IMPORTANT: You are responsible for BOTH translation AND layout preservation.
There is NO separate layout stage - your output must be print-ready!

═══════════════════════════════════════════════════════════════════
                    GOLDEN RULES
═══════════════════════════════════════════════════════════════════
🎯 COMPLETENESS: Translate 100% of visible content - ZERO omissions
🎯 ACCURACY: Every word must convey the exact original meaning
🎯 FIDELITY: Preserve the document's structure and hierarchy
🎯 PROFESSIONALISM: Output must be ready for official use

{date_section}

{currency_section}

{translator_note_section}

{doc_specific}

═══════════════════════════════════════════════════════════════════
                    TRANSLATION RULES
═══════════════════════════════════════════════════════════════════

⚠️ CRITICAL - MULTILINGUAL SOURCE DOCUMENTS:
When the original document contains text in MULTIPLE languages (e.g., trilingual fields like "NATIONALITY/NATIONALITY/NACIONALIDAD:" or "NOME/NAME/NOMBRE:"):
• ONLY translate from the SOURCE LANGUAGE ({source_lang})
• IGNORE text that is already in other languages in the original
• The OUTPUT column/field should contain ONLY the {target_lang} translation
• Example: If source is Portuguese and document shows "NACIONALIDADE/NATIONALITY/NACIONALIDAD: BRASILEIRA/BRAZILIAN P"
  → Translate ONLY the Portuguese "NACIONALIDADE: BRASILEIRA"
  → Output: "NATIONALITY: BRAZILIAN"
  → Do NOT show: "NATIONALITY/NATIONALITY/NACIONALIDAD: BRAZILIAN/BRAZILIAN P"

ALWAYS TRANSLATE:
✅ All headers, titles, and section headings
✅ All body text, including fine print
✅ All table contents (headers and data)
✅ All stamps, seals, and official annotations
✅ Handwritten notes (mark as [handwritten: text])
✅ Footer text and page numbers

PRESERVE EXACTLY (DO NOT TRANSLATE):
📌 Personal names (João Silva → João Silva)
📌 Place names (São Paulo → São Paulo)
📌 Registration numbers and codes
📌 Account numbers, document IDs
📌 Dates (convert format, not content)

STANDARD NOTATIONS:
[signature: Name] or [signature: illegible]
[stamp: Official text, dated MM/DD/YYYY]
[seal: Description]
[coat of arms: Country/State]
[QR code]
[handwritten: text or "illegible"]
[blank field]

{glossary_terms}

═══════════════════════════════════════════════════════════════════
                    ⚠️ CRITICAL: LAYOUT PRESERVATION ⚠️
═══════════════════════════════════════════════════════════════════

You MUST replicate the EXACT visual layout of the original document:

📐 STRUCTURE:
• Match the original document's visual structure EXACTLY
• If the original has a header, reproduce it with same proportions
• If the original has columns, use columns
• If the original has tables, use tables with same structure
• If the original has borders/boxes, include them

📄 PAGE LAYOUT:
• Replicate the spacing and positioning of elements
• Match header/footer placement from original
• Preserve margin proportions between elements
• Keep text alignment (left, center, right) as in original

🎨 VISUAL FIDELITY:
• Use similar font sizes (larger for headers, smaller for fine print)
• Bold text that was bold in original
• Underline text that was underlined
• Match any decorative elements (lines, separators)

📊 TABLES & FORMS:
• Reproduce table structure exactly (rows, columns, merged cells)
• Keep cell alignments as in original
• Include all borders and lines shown in original

🔤 TYPOGRAPHY:
• Headers should be visually prominent (larger, bold, centered if original was)
• Body text should be readable (12pt equivalent)
• Fine print should be smaller (10pt or less)

═══════════════════════════════════════════════════════════════════
                    OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

Output CLEAN, PROFESSIONAL HTML:

1. Start with <!DOCTYPE html> and proper structure
2. Include embedded CSS for professional appearance:
   - Font: Georgia, "Times New Roman", serif (12pt body)
   - Tables: 1px solid black borders, 8px padding
   - Margins: 20mm all sides
   - Line-height: 1.5

3. Page size: {'US Letter (8.5" × 11")' if page_format == "letter" else 'A4 (210mm × 297mm)'}

4. Structure:
   - Center main titles
   - Use <table> for structured data
   - Bold important names and dates
   - Preserve original visual hierarchy

5. End with: <p style="text-align: center; font-weight: bold; margin-top: 30px;">[END OF TRANSLATION]</p>

═══════════════════════════════════════════════════════════════════
                    QUALITY CHECKLIST
═══════════════════════════════════════════════════════════════════
Before submitting, verify:
☐ All text translated (compare section by section)
☐ All dates converted to target format
☐ All currencies converted (if applicable)
☐ All notations included ([signature], [stamp], etc.)
☐ HTML is valid and properly formatted
☐ No translator notes or comments in output
"""

    return prompt


def get_ai_layout_prompt(config: dict) -> str:
    """
    STAGE 2: AI LAYOUT REVIEWER - Specialized prompt for layout optimization
    Focus: Visual fidelity, print-ready formatting, page fitting
    """

    page_format = config.get("page_format", "letter")
    if page_format == "a4":
        page_size = "A4 (210mm × 297mm / 8.27\" × 11.69\")"
        margins = "20mm"
        max_width = "170mm"
    else:
        page_size = "US Letter (8.5\" × 11\" / 215.9mm × 279.4mm)"
        margins = "0.75in (19mm)"
        max_width = "7in (178mm)"

    prompt = f"""You are a PROFESSIONAL DOCUMENT LAYOUT SPECIALIST with expertise in print production.
Your role: Optimize translated documents for professional printing and PDF generation.

═══════════════════════════════════════════════════════════════════
                    YOUR ROLE: LAYOUT REVIEWER
═══════════════════════════════════════════════════════════════════
You are the SECOND stage in our 4-stage AI translation pipeline.
Previous: AI Translator (content translation)
Next: Proofreader (terminology check) → Human Review

Your job is NOT to change the translation content, but to:
1. Optimize the HTML/CSS for professional printing
2. Ensure the document fits properly on the target page size
3. Fix any layout issues that would affect print quality

═══════════════════════════════════════════════════════════════════
                    TARGET FORMAT
═══════════════════════════════════════════════════════════════════
Page Size: {page_size}
Margins: {margins}
Content Width: {max_width}
Orientation: Portrait (unless original is landscape)

═══════════════════════════════════════════════════════════════════
                    LAYOUT OPTIMIZATION TASKS
═══════════════════════════════════════════════════════════════════

1️⃣ PAGE FITTING
• Ensure ALL content fits within printable area
• If content overflows:
  - Reduce font sizes proportionally (min 10pt)
  - Adjust table cell padding
  - Reduce margins slightly (min 15mm)
• NEVER cut off or hide content

2️⃣ PAGE BREAKS
• Add page-break-inside: avoid; to important sections
• Keep related content together (names, addresses, tables)
• Avoid orphan/widow lines
• If multi-page: add page numbers

3️⃣ TABLE FORMATTING
• Tables must have visible borders: 1px solid #000
• Cell padding: 6-10px
• Headers should be bold/highlighted
• Tables should not split awkwardly across pages
• Ensure columns are properly aligned

4️⃣ TYPOGRAPHY
• Primary font: Georgia, "Times New Roman", serif
• Secondary font: Arial, Helvetica, sans-serif (for tables)
• Minimum body text: 10pt
• Maximum body text: 12pt
• Headers: 14-18pt, bold
• Line-height: 1.4-1.6

5️⃣ VISUAL ELEMENTS
• Center logos, coats of arms, seals
• Maintain visual hierarchy of original
• Use consistent spacing throughout
• Borders/boxes where appropriate

6️⃣ PRINT CSS
Add these essential print styles:
```css
@media print {{
  body {{
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  @page {{
    size: {page_format};
    margin: {margins};
  }}
  table {{ page-break-inside: avoid; }}
  tr {{ page-break-inside: avoid; }}
  .no-break {{ page-break-inside: avoid; }}
}}
```

═══════════════════════════════════════════════════════════════════
                    OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════

1. Return the COMPLETE HTML document (<!DOCTYPE html> to </html>)
2. Include ALL content from the input (do not remove anything)
3. Make ONLY layout/CSS changes, not content changes
4. Ensure document is print-ready

5. At the very end, add a comment listing your changes:
<!-- LAYOUT_CHANGES: ["change1", "change2", "change3"] -->

═══════════════════════════════════════════════════════════════════
                    DO NOT
═══════════════════════════════════════════════════════════════════
❌ Change translated text or wording
❌ Remove any content
❌ Add content that wasn't in the original
❌ Change the meaning of any text
❌ Add translator notes or comments in visible area
"""

    return prompt


def get_ai_proofreader_prompt(config: dict) -> str:
    """
    STAGE 2: AI PROOFREADER - Comprehensive review based on Translation Memory system
    Returns: Corrected HTML + detailed JSON error report
    """

    target_lang = config.get("target_language", "English")
    source_lang = config.get("source_language", "Portuguese")
    doc_type = config.get("document_type", "General Document")
    glossary = config.get("glossary", {})
    convert_currency = config.get("convert_currency", False)
    source_currency = config.get("source_currency", "BRL")
    target_currency = config.get("target_currency", "USD")

    # Build glossary text if available
    glossario_texto = ""
    if glossary:
        glossario_texto = "\n\nGLOSSÁRIO (termos aprovados - USE EXATAMENTE):\n"
        for termo, info in list(glossary.items())[:50]:
            trad = info.get("target", info) if isinstance(info, dict) else info
            glossario_texto += f"• {termo} → {trad}\n"

    # Currency conversion instructions
    currency_text = ""
    if convert_currency:
        currency_text = f"""

═══════════════════════════════════════════════════════════════════
                    CONVERSÃO DE MOEDAS
═══════════════════════════════════════════════════════════════════

Este documento requer CONVERSÃO de valores monetários:
• Moeda origem: {source_currency}
• Moeda destino: {target_currency}

REGRAS:
• Converta TODOS os valores de {source_currency} para {target_currency}
• Use formato correto: $ 1,234.56 (USD) ou R$ 1.234,56 (BRL)
• Mantenha o valor original entre parênteses: $1,500.00 (R$ 7.500,00)
• Para extratos bancários: converta saldos, créditos e débitos
"""

    prompt = f"""Você é um REVISOR CERTIFICADO especializado em traduções {source_lang} ↔ {target_lang}.

TIPO DE DOCUMENTO: {doc_type}
IDIOMA FONTE: {source_lang}
IDIOMA ALVO: {target_lang}
{glossario_texto}
{currency_text}

═══════════════════════════════════════════════════════════════════
                    INSTRUÇÕES DE REVISÃO
═══════════════════════════════════════════════════════════════════

1. Compare CADA elemento dos dois documentos minuciosamente

2. Identifique TODOS os erros, incluindo:
   • Erros de transcrição (typos, letras trocadas)
   • Números incorretos (dígitos errados, faltando ou extras)
   • Caracteres especiais faltando ou incorretos (ç, ã, ñ, ø, å, æ)
   • Traduções incorretas de termos técnicos
   • Omissões (conteúdo do original ausente na tradução)
   • Adições indevidas
   • Formatação inconsistente
   • Datas incorretas

3. ATENÇÃO ESPECIAL para:
   • IBANs, números de conta, referências bancárias
   • Datas (verificar formato e valores)
   • Nomes próprios (pessoas, empresas, lugares) - NUNCA traduzir
   • Valores monetários
   • Caracteres especiais em nomes

═══════════════════════════════════════════════════════════════════
                    TERMINOLOGIA OBRIGATÓRIA
═══════════════════════════════════════════════════════════════════

📚 EDUCACIONAL (Brasil ↔ EUA):
• Histórico Escolar = Academic Transcript
• Ensino Médio = High School
• Ensino Fundamental = Elementary/Middle School
• Diploma = Diploma
• Carga Horária = Credit Hours / Contact Hours
• Aprovado/Reprovado = Passed/Failed

📋 CIVIL E PESSOAL:
• Certidão de Nascimento = Birth Certificate
• Certidão de Casamento = Marriage Certificate
• Certidão de Óbito = Death Certificate
• Cartório = Notary Office / Registry Office
• Registro Civil = Civil Registry
• Filiação = Parentage
• Averbação = Annotation

🏛️ INSTITUCIONAL:
• Secretaria de Estado = State Department
• Comarca = Judicial District
• Serventia = Registry Office
• Oficial de Registro = Registrar

💰 FINANCEIRO:
• Extrato Bancário = Bank Statement
• Saldo = Balance
• Crédito/Débito = Credit/Debit
• Titular = Account Holder
• Agência = Branch

═══════════════════════════════════════════════════════════════════
                    FORMATO DE SAÍDA (OBRIGATÓRIO)
═══════════════════════════════════════════════════════════════════

VOCÊ DEVE RETORNAR EXATAMENTE NESTE FORMATO:

1. PRIMEIRO: O HTML completo e CORRIGIDO da tradução

2. DEPOIS: O relatório de revisão no formato abaixo:

<!-- REVIEW_REPORT: {{
    "classification": "APROVADO|APROVADO_COM_OBSERVACOES|REPROVADO",
    "total_errors": N,
    "errors": [
        {{
            "page": "1",
            "location": "descrição da localização",
            "original": "texto original exato",
            "wrong_translation": "texto com erro",
            "correction": "texto corrigido",
            "type": "Transcrição|Número|Data|Caractere Especial|Tradução|Omissão|Formatação|Moeda",
            "severity": "CRÍTICO|ALTO|MÉDIO|BAIXO"
        }}
    ],
    "observations": ["observações gerais"],
    "quality_score": "excellent|good|acceptable|needs_work"
}} -->

GRAVIDADE DOS ERROS:
• CRÍTICO: Erros que invalidam o documento (números errados, omissões importantes)
• ALTO: Erros significativos que precisam correção imediata
• MÉDIO: Erros menores que devem ser corrigidos
• BAIXO: Sugestões de melhoria

CLASSIFICAÇÃO:
• APROVADO: Nenhum erro encontrado
• APROVADO_COM_OBSERVACOES: Erros menores, já corrigidos
• REPROVADO: Erros críticos que requerem nova tradução

Se não houver erros, retorne:
<!-- REVIEW_REPORT: {{"classification": "APROVADO", "total_errors": 0, "errors": [], "observations": [], "quality_score": "excellent"}} -->
"""

    return prompt


async def chunk_document_for_translation(original_text: str, original_images: list, max_pages: int = 25) -> list:
    """
    Divide documentos grandes em chunks menores para tradução
    """
    chunks = []

    # Se temos imagens (páginas individuais)
    if original_images and len(original_images) > 0:
        total_pages = len(original_images)

        if total_pages <= max_pages:
            # Documento pequeno, não precisa dividir
            chunks.append({
                "chunk_id": 1,
                "total_chunks": 1,
                "pages": list(range(1, total_pages + 1)),
                "images": original_images,
                "text": original_text
            })
        else:
            # Dividir em chunks
            num_chunks = math.ceil(total_pages / max_pages)

            for i in range(num_chunks):
                start_idx = i * max_pages
                end_idx = min((i + 1) * max_pages, total_pages)

                chunk_images = original_images[start_idx:end_idx]

                # Dividir texto também (se tiver separadores de página)
                if "--- PAGE BREAK ---" in original_text or "---" in original_text:
                    text_pages = original_text.split("---")
                    text_pages = [p.strip() for p in text_pages if p.strip() and "PAGE BREAK" not in p]
                    chunk_text = "\n\n--- PAGE ---\n\n".join(text_pages[start_idx:end_idx]) if len(text_pages) > start_idx else ""
                else:
                    chunk_text = original_text if i == 0 else ""

                chunks.append({
                    "chunk_id": i + 1,
                    "total_chunks": num_chunks,
                    "pages": list(range(start_idx + 1, end_idx + 1)),
                    "images": chunk_images,
                    "text": chunk_text,
                    "page_range": f"{start_idx + 1}-{end_idx}"
                })
    else:
        # Só texto, dividir por tamanho
        if len(original_text) > 50000:  # ~10 páginas de texto
            # Dividir por separadores ou tamanho
            if "---" in original_text:
                sections = original_text.split("---")
                sections = [s.strip() for s in sections if s.strip()]

                chunk_size = 10
                num_chunks = math.ceil(len(sections) / chunk_size)

                for i in range(num_chunks):
                    start = i * chunk_size
                    end = min((i + 1) * chunk_size, len(sections))

                    chunks.append({
                        "chunk_id": i + 1,
                        "total_chunks": num_chunks,
                        "pages": list(range(start + 1, end + 1)),
                        "images": [],
                        "text": "\n\n---\n\n".join(sections[start:end]),
                        "page_range": f"{start + 1}-{end}"
                    })
            else:
                # Dividir por caracteres
                chunk_length = 40000
                num_chunks = math.ceil(len(original_text) / chunk_length)

                for i in range(num_chunks):
                    start = i * chunk_length
                    end = min((i + 1) * chunk_length, len(original_text))

                    chunks.append({
                        "chunk_id": i + 1,
                        "total_chunks": num_chunks,
                        "pages": [i + 1],
                        "images": [],
                        "text": original_text[start:end],
                        "page_range": f"Part {i + 1}"
                    })
        else:
            chunks.append({
                "chunk_id": 1,
                "total_chunks": 1,
                "pages": [1],
                "images": [],
                "text": original_text
            })

    return chunks


def compress_image_for_claude_api(img_bytes: bytes, media_type: str = "image/jpeg", max_size: int = 5 * 1024 * 1024) -> tuple:
    """
    Compress an image to stay under Claude API's 5MB limit.

    Args:
        img_bytes: Raw image bytes
        media_type: MIME type of the image
        max_size: Maximum size in bytes (default 5MB)

    Returns:
        tuple: (compressed_bytes, media_type) - always returns JPEG if compression needed
    """
    # Check if already under limit
    if len(img_bytes) <= max_size:
        return img_bytes, media_type

    try:
        # Load image with PIL
        img = Image.open(io.BytesIO(img_bytes))

        # Convert to RGB if necessary (for JPEG output)
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')

        # Try progressively lower quality settings
        quality_levels = [85, 70, 55, 40]

        for quality in quality_levels:
            jpeg_buffer = io.BytesIO()
            img.save(jpeg_buffer, format='JPEG', quality=quality, optimize=True)
            compressed_bytes = jpeg_buffer.getvalue()

            if len(compressed_bytes) <= max_size:
                logger.info(f"Image compressed from {len(img_bytes)} to {len(compressed_bytes)} bytes (quality={quality})")
                return compressed_bytes, "image/jpeg"

        # If still too large, resize the image progressively
        scale_factors = [0.75, 0.5, 0.35, 0.25]
        original_size = img.size

        for scale in scale_factors:
            new_size = (int(original_size[0] * scale), int(original_size[1] * scale))
            resized_img = img.resize(new_size, Image.LANCZOS)

            # Try quality settings again with resized image
            for quality in [70, 50, 35]:
                jpeg_buffer = io.BytesIO()
                resized_img.save(jpeg_buffer, format='JPEG', quality=quality, optimize=True)
                compressed_bytes = jpeg_buffer.getvalue()

                if len(compressed_bytes) <= max_size:
                    logger.info(f"Image resized to {new_size} and compressed to {len(compressed_bytes)} bytes (quality={quality})")
                    return compressed_bytes, "image/jpeg"

        # Last resort: return the smallest version we could make
        logger.warning(f"Could not compress image below {max_size} bytes, using smallest version ({len(compressed_bytes)} bytes)")
        return compressed_bytes, "image/jpeg"

    except Exception as e:
        logger.error(f"Image compression failed: {e}")
        return img_bytes, media_type


async def run_ai_translator_stage(pipeline: dict, claude_api_key: str) -> dict:
    """
    STAGE 1: AI TRANSLATOR
    - Translates the document using specialized prompts
    - Converts currencies if needed
    - Adapts date formats
    - Applies document-specific formatting
    - Handles large documents by chunking (10+ pages)
    """
    import anthropic

    config = pipeline["config"]
    original_text = pipeline["original_text"] or ""

    # Get glossary terms if enabled
    glossary_terms = ""
    if config.get("use_glossary"):
        source_lang = config["source_language"].lower()[:2]
        target_lang = config["target_language"].lower()[:2]

        glossary = await db.glossaries.find_one({
            "$or": [
                {"source_language": source_lang, "target_language": target_lang},
                {"language_pair": f"{source_lang}-{target_lang}"}
            ]
        })

        if glossary and glossary.get("terms"):
            terms_list = "\n".join([f"• {t['source']} → {t['target']}" for t in glossary["terms"][:100]])
            glossary_terms = f"""
═══════════════════════════════════════════════════════════════════
                    GLOSSARY - MANDATORY TERMS
═══════════════════════════════════════════════════════════════════
Use these EXACT translations for the following terms:
{terms_list}
"""

    # Get specialized prompt
    system_prompt = get_ai_translator_prompt(config, glossary_terms)

    # Add custom instructions if provided
    custom_instructions = config.get("custom_instructions", "") or ""
    if custom_instructions:
        system_prompt += f"""

═══════════════════════════════════════════════════════════════════
                    CUSTOM INSTRUCTIONS
═══════════════════════════════════════════════════════════════════
{custom_instructions}
"""

    try:
        client = anthropic.Anthropic(api_key=claude_api_key)

        # Extract all pages from PDF if present
        all_page_images = []
        total_pages = 1

        if pipeline.get("original_document_base64"):
            image_data = pipeline["original_document_base64"]

            if ',' in image_data:
                header = image_data.split(',')[0]
                raw_data = image_data.split(',')[1]

                # Handle PDF - extract ALL pages
                if 'pdf' in header.lower():
                    try:
                        pdf_bytes = base64.b64decode(raw_data)
                        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                        total_pages = doc.page_count
                        logger.info(f"PDF has {total_pages} pages")

                        for page_num in range(total_pages):
                            page = doc[page_num]
                            # Use higher resolution for better OCR
                            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
                            img_bytes = pix.tobytes("jpeg")

                            # Compress image if needed to stay under Claude's 5MB limit
                            compressed_bytes, final_media_type = compress_image_for_claude_api(
                                img_bytes, "image/jpeg"
                            )

                            page_base64 = base64.b64encode(compressed_bytes).decode('utf-8')
                            all_page_images.append({
                                "page": page_num + 1,
                                "data": page_base64,
                                "media_type": final_media_type
                            })
                        doc.close()
                    except Exception as e:
                        logger.error(f"PDF extraction failed: {e}")
                        # Fallback to single image - still try to compress
                        try:
                            img_bytes = base64.b64decode(raw_data)
                            compressed_bytes, final_media_type = compress_image_for_claude_api(
                                img_bytes, "image/jpeg"
                            )
                            compressed_base64 = base64.b64encode(compressed_bytes).decode('utf-8')
                        except Exception as compress_err:
                            logger.warning(f"Fallback compression failed: {compress_err}")
                            compressed_base64 = raw_data
                            final_media_type = "image/jpeg"

                        all_page_images.append({
                            "page": 1,
                            "data": compressed_base64,
                            "media_type": final_media_type
                        })
                else:
                    # Single image (not PDF)
                    media_type = "image/png" if 'png' in header.lower() else "image/jpeg"

                    # Decode and compress if needed to stay under Claude's 5MB limit
                    try:
                        img_bytes = base64.b64decode(raw_data)
                        compressed_bytes, final_media_type = compress_image_for_claude_api(
                            img_bytes, media_type
                        )
                        compressed_base64 = base64.b64encode(compressed_bytes).decode('utf-8')
                    except Exception as e:
                        logger.warning(f"Image compression failed, using original: {e}")
                        compressed_base64 = raw_data
                        final_media_type = media_type

                    all_page_images.append({
                        "page": 1,
                        "data": compressed_base64,
                        "media_type": final_media_type
                    })
            elif image_data:
                # Raw base64 without header - decode and compress if needed
                try:
                    img_bytes = base64.b64decode(image_data)
                    compressed_bytes, final_media_type = compress_image_for_claude_api(
                        img_bytes, "image/jpeg"
                    )
                    compressed_base64 = base64.b64encode(compressed_bytes).decode('utf-8')
                except Exception as e:
                    logger.warning(f"Image compression failed, using original: {e}")
                    compressed_base64 = image_data
                    final_media_type = "image/jpeg"

                all_page_images.append({
                    "page": 1,
                    "data": compressed_base64,
                    "media_type": final_media_type
                })

        # Determine chunk size based on number of pages
        # Claude can handle ~10-15 images at once reliably
        MAX_PAGES_PER_CHUNK = 10
        total_pages = len(all_page_images) if all_page_images else 1

        # If small document, process in single call
        if total_pages <= MAX_PAGES_PER_CHUNK:
            return await translate_single_chunk(
                client, config, system_prompt, all_page_images, original_text, 1, 1
            )

        # Large document - process in chunks
        logger.info(f"Large document detected: {total_pages} pages. Processing in chunks of {MAX_PAGES_PER_CHUNK}")

        all_translations = []
        total_tokens = 0
        num_chunks = math.ceil(total_pages / MAX_PAGES_PER_CHUNK)

        # Split text by page breaks if available
        text_chunks = []
        if original_text and ("--- PAGE" in original_text or "---" in original_text):
            text_parts = [p.strip() for p in original_text.split("---") if p.strip() and "PAGE" not in p.upper()]
            for i in range(num_chunks):
                start = i * MAX_PAGES_PER_CHUNK
                end = min((i + 1) * MAX_PAGES_PER_CHUNK, len(text_parts))
                text_chunks.append("\n\n".join(text_parts[start:end]) if start < len(text_parts) else "")
        else:
            text_chunks = [original_text if i == 0 else "" for i in range(num_chunks)]

        # Process each chunk
        for chunk_idx in range(num_chunks):
            start_page = chunk_idx * MAX_PAGES_PER_CHUNK
            end_page = min((chunk_idx + 1) * MAX_PAGES_PER_CHUNK, total_pages)
            chunk_images = all_page_images[start_page:end_page]
            chunk_text = text_chunks[chunk_idx] if chunk_idx < len(text_chunks) else ""

            logger.info(f"Processing chunk {chunk_idx + 1}/{num_chunks}: pages {start_page + 1}-{end_page}")

            # Update pipeline status in database
            await db.ai_pipelines.update_one(
                {"id": pipeline["id"]},
                {"$set": {
                    "stages.ai_translator.notes": f"Traduzindo chunk {chunk_idx + 1} de {num_chunks} (páginas {start_page + 1}-{end_page})..."
                }}
            )

            chunk_result = await translate_single_chunk(
                client, config, system_prompt, chunk_images, chunk_text,
                chunk_idx + 1, num_chunks
            )

            if not chunk_result["success"]:
                return {
                    "success": False,
                    "error": f"Chunk {chunk_idx + 1} failed: {chunk_result.get('error', 'Unknown error')}",
                    "result": None
                }

            all_translations.append(chunk_result["result"])
            total_tokens += chunk_result.get("tokens_used", 0)

            # Rate limiting: wait between chunks to avoid API rate limits
            if chunk_idx < num_chunks - 1:
                await asyncio.sleep(45)  # Wait 45 seconds between chunks (8K tokens/min limit)

        # Combine all chunk translations
        combined_translation = combine_chunk_translations(all_translations, total_pages)

        return {
            "success": True,
            "result": combined_translation,
            "tokens_used": total_tokens,
            "notes": f"Translation completed. {total_pages} pages processed in {num_chunks} chunks. Language: {config['source_language']} → {config['target_language']}."
        }

    except Exception as e:
        logger.error(f"AI Translator stage failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "result": None
        }


async def translate_single_chunk(client, config: dict, system_prompt: str, page_images: list, text: str, chunk_num: int, total_chunks: int) -> dict:
    """Translate a single chunk of pages"""
    try:
        message_content = []

        # Add all page images
        for page_info in page_images:
            message_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": page_info["media_type"],
                    "data": page_info["data"],
                },
            })

        # Prepare text prompt
        page_range = f"pages {page_images[0]['page']}-{page_images[-1]['page']}" if len(page_images) > 1 else f"page {page_images[0]['page']}"
        chunk_info = f" (Chunk {chunk_num}/{total_chunks}: {page_range})" if total_chunks > 1 else ""

        if text and text.strip():
            text_prompt = f"""Translate this {config['document_type']} document{chunk_info}:

{text}

Produce a complete HTML translation ready for professional use.
{"Include page breaks between pages using: <div class='page-break' style='page-break-before: always;'></div>" if len(page_images) > 1 else ""}"""
        else:
            text_prompt = f"""Translate this {config['document_type']} document from the images{chunk_info}.

Look at {'all ' + str(len(page_images)) + ' pages' if len(page_images) > 1 else 'the document'} carefully and translate ALL visible text from {config['source_language']} to {config['target_language']}.

Produce a complete HTML translation ready for professional use.
{"Include page breaks between pages using: <div class='page-break' style='page-break-before: always;'></div>" if len(page_images) > 1 else ""}"""

        message_content.append({
            "type": "text",
            "text": text_prompt
        })

        # Retry logic for rate limits
        import anthropic
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=16384,  # Increased for multi-page documents
                    system=system_prompt,
                    messages=[{"role": "user", "content": message_content}]
                )
                break  # Success
            except anthropic.RateLimitError:
                if attempt < max_retries - 1:
                    wait_time = 60 * (attempt + 1)
                    logger.warning(f"Translator chunk {chunk_num} rate limit, waiting {wait_time}s before retry {attempt + 2}/{max_retries}")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Translator chunk {chunk_num} rate limit exceeded after {max_retries} retries")
                    return {
                        "success": False,
                        "error": "API rate limit exceeded after multiple retries",
                        "result": None
                    }

        # Safety check for empty response
        if not response or not response.content or len(response.content) == 0:
            logger.warning(f"Chunk {chunk_num} translation returned empty response")
            return {
                "success": False,
                "error": "API returned empty response (possible rate limit)",
                "result": None
            }

        return {
            "success": True,
            "result": response.content[0].text,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens
        }

    except Exception as e:
        logger.error(f"Chunk translation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "result": None
        }


def combine_chunk_translations(translations: list, total_pages: int) -> str:
    """Combine multiple chunk translations into a single HTML document"""

    # Extract body content from each translation
    body_contents = []

    for i, trans in enumerate(translations):
        # Try to extract content between <body> tags
        if "<body" in trans.lower():
            import re
            body_match = re.search(r'<body[^>]*>(.*?)</body>', trans, re.DOTALL | re.IGNORECASE)
            if body_match:
                body_contents.append(body_match.group(1))
            else:
                body_contents.append(trans)
        else:
            body_contents.append(trans)

    # Combine with page breaks
    combined_body = '\n<div class="page-break" style="page-break-before: always; margin: 30px 0; border-top: 2px dashed #ccc;"></div>\n'.join(body_contents)

    # Create final HTML document
    combined_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Translation - {total_pages} Pages</title>
    <style>
        body {{
            font-family: Georgia, "Times New Roman", serif;
            font-size: 12pt;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        td, th {{
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
        }}
        .page-break {{
            page-break-before: always;
        }}
        @media print {{
            .page-break {{
                page-break-before: always;
            }}
        }}
    </style>
</head>
<body>
    <div style="text-align: center; margin-bottom: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
        <strong>Document Translation</strong> - {total_pages} page(s) | Generated automatically
    </div>
    {combined_body}
    <p style="text-align: center; font-weight: bold; margin-top: 30px;">[END OF TRANSLATION]</p>
</body>
</html>"""

    return combined_html


def split_html_into_chunks(html_content: str, max_chunk_size: int = 50000) -> list:
    """Split HTML content into chunks by page-break divs or by size"""
    import re

    # Try to split by page-break divs first
    page_break_pattern = r'<div[^>]*class="[^"]*page-break[^"]*"[^>]*>.*?</div>'

    # Find all page break positions
    breaks = list(re.finditer(page_break_pattern, html_content, re.DOTALL | re.IGNORECASE))

    if breaks:
        # Split by page breaks
        chunks = []
        last_end = 0
        current_chunk = ""

        for match in breaks:
            section = html_content[last_end:match.end()]

            # If adding this section would make chunk too large, save current and start new
            if len(current_chunk) + len(section) > max_chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = section
            else:
                current_chunk += section

            last_end = match.end()

        # Add remaining content
        remaining = html_content[last_end:]
        if remaining.strip():
            if len(current_chunk) + len(remaining) > max_chunk_size and current_chunk:
                chunks.append(current_chunk)
                chunks.append(remaining)
            else:
                current_chunk += remaining
                chunks.append(current_chunk)
        elif current_chunk:
            chunks.append(current_chunk)

        return chunks if chunks else [html_content]

    # Fallback: split by size at paragraph boundaries
    if len(html_content) <= max_chunk_size:
        return [html_content]

    chunks = []
    current_pos = 0

    while current_pos < len(html_content):
        end_pos = min(current_pos + max_chunk_size, len(html_content))

        # Try to find a good break point (end of paragraph or div)
        if end_pos < len(html_content):
            # Look for </div> or </p> near the end
            search_start = max(current_pos, end_pos - 1000)
            search_text = html_content[search_start:end_pos]

            for pattern in ['</div>', '</p>', '</table>', '<br']:
                last_break = search_text.rfind(pattern)
                if last_break != -1:
                    end_pos = search_start + last_break + len(pattern)
                    break

        chunks.append(html_content[current_pos:end_pos])
        current_pos = end_pos

    return chunks


async def process_layout_chunk(chunk: str, chunk_num: int, total_chunks: int,
                                config: dict, claude_api_key: str) -> dict:
    """Process a single chunk through layout optimization"""
    import anthropic

    page_format = config.get("page_format", "letter")
    page_size = "US Letter (8.5\" × 11\")" if page_format == "letter" else "A4 (210mm × 297mm)"

    system_prompt = get_ai_layout_prompt(config)

    try:
        client = anthropic.Anthropic(api_key=claude_api_key)

        # Retry logic for rate limits
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=16384,
                    system=system_prompt,
                    messages=[{
                        "role": "user",
                        "content": f"""Optimize the layout of this document section (chunk {chunk_num}/{total_chunks}) for professional printing:

{chunk}

TARGET: {page_size}
TASK: Optimize CSS, fix page breaks, ensure print-ready output.
IMPORTANT: Return ONLY the optimized HTML content. Preserve all structure.
OUTPUT: Complete corrected HTML section."""
                    }]
                )
                break  # Success
            except anthropic.RateLimitError:
                if attempt < max_retries - 1:
                    wait_time = 60 * (attempt + 1)
                    logger.warning(f"Layout chunk {chunk_num} rate limit, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                else:
                    logger.warning(f"Layout chunk {chunk_num} rate limit exceeded, using original")
                    return {"success": True, "result": chunk, "tokens_used": 0, "changes": []}

        if not response:
            return {"success": True, "result": chunk, "tokens_used": 0, "changes": []}

        # Safety check for empty response
        if not response.content or len(response.content) == 0:
            logger.warning(f"Layout chunk {chunk_num} returned empty response")
            return {
                "success": True,
                "result": chunk,  # Return original
                "tokens_used": 0,
                "changes": []
            }

        result = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Extract changes if present
        changes = []
        if "<!-- LAYOUT_CHANGES:" in result:
            try:
                changes_match = re.search(r'<!-- LAYOUT_CHANGES: (\[.*?\]) -->', result, re.DOTALL)
                if changes_match:
                    changes = json.loads(changes_match.group(1))
                    result = re.sub(r'<!-- LAYOUT_CHANGES: \[.*?\] -->', '', result, flags=re.DOTALL).strip()
            except:
                pass

        return {
            "success": True,
            "result": result,
            "tokens_used": tokens_used,
            "changes": changes
        }

    except Exception as e:
        logger.warning(f"Layout chunk {chunk_num} failed: {str(e)}, using original")
        return {
            "success": True,  # Don't fail the whole process
            "result": chunk,  # Return original chunk
            "tokens_used": 0,
            "changes": []
        }


def combine_layout_chunks(chunks: list, config: dict) -> str:
    """Combine layout-optimized chunks into a single HTML document"""
    page_format = config.get("page_format", "letter")
    page_size = "US Letter (8.5\" × 11\")" if page_format == "letter" else "A4 (210mm × 297mm)"

    # Extract body content from each chunk
    body_contents = []

    for chunk in chunks:
        # Try to extract content between <body> tags
        if "<body" in chunk.lower():
            body_match = re.search(r'<body[^>]*>(.*?)</body>', chunk, re.DOTALL | re.IGNORECASE)
            if body_match:
                body_contents.append(body_match.group(1))
            else:
                # Remove doctype, html, head tags if present
                clean_chunk = re.sub(r'<!DOCTYPE[^>]*>', '', chunk, flags=re.IGNORECASE)
                clean_chunk = re.sub(r'<html[^>]*>|</html>', '', clean_chunk, flags=re.IGNORECASE)
                clean_chunk = re.sub(r'<head[^>]*>.*?</head>', '', clean_chunk, flags=re.DOTALL | re.IGNORECASE)
                body_contents.append(clean_chunk.strip())
        else:
            body_contents.append(chunk)

    combined_body = '\n'.join(body_contents)

    # Create final optimized HTML document
    combined_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Translated Document - Layout Optimized</title>
    <style>
        @page {{
            size: {page_size};
            margin: 1in;
        }}
        body {{
            font-family: Georgia, "Times New Roman", serif;
            font-size: 12pt;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        td, th {{
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
        }}
        .page-break {{
            page-break-before: always;
        }}
        @media print {{
            .page-break {{
                page-break-before: always;
            }}
            body {{
                padding: 0;
            }}
        }}
    </style>
</head>
<body>
{combined_body}
</body>
</html>"""

    return combined_html


async def run_ai_layout_stage(pipeline: dict, previous_translation: str, claude_api_key: str) -> dict:
    """
    STAGE 2: AI LAYOUT REVIEWER (with chunking support for large documents)
    - Uses specialized layout prompt
    - Checks and fixes page breaks
    - Adjusts format (US Letter vs A4)
    - Ensures proper visual structure
    - Maintains original document appearance
    - Processes large documents in chunks
    """
    import anthropic

    config = pipeline["config"]
    page_format = config.get("page_format", "letter")
    page_size = "US Letter (8.5\" × 11\")" if page_format == "letter" else "A4 (210mm × 297mm)"

    # Validate input
    if not previous_translation:
        logger.error("AI Layout stage: No translation provided")
        return {
            "success": False,
            "error": "No translation content to process",
            "result": ""
        }

    translation_size = len(previous_translation)
    logger.info(f"AI Layout stage: Processing translation of {translation_size} characters")

    # Threshold for chunking (50KB per chunk)
    MAX_CHUNK_SIZE = 50000

    # If document is large, use chunking
    if translation_size > MAX_CHUNK_SIZE:
        logger.info(f"AI Layout stage: Large document detected, using chunking")

        chunks = split_html_into_chunks(previous_translation, MAX_CHUNK_SIZE)
        total_chunks = len(chunks)
        logger.info(f"AI Layout stage: Split into {total_chunks} chunks")

        processed_chunks = []
        total_tokens = 0
        all_changes = []

        for i, chunk in enumerate(chunks, 1):
            logger.info(f"AI Layout stage: Processing chunk {i}/{total_chunks} ({len(chunk)} chars)")

            result = await process_layout_chunk(chunk, i, total_chunks, config, claude_api_key)

            processed_chunks.append(result["result"])
            total_tokens += result.get("tokens_used", 0)
            all_changes.extend(result.get("changes", []))

            # Rate limiting: wait between chunks to avoid API rate limits
            if i < total_chunks:
                await asyncio.sleep(45)  # Wait 45 seconds between chunks (8K tokens/min limit)

        # Combine all chunks
        final_result = combine_layout_chunks(processed_chunks, config)

        return {
            "success": True,
            "result": final_result,
            "tokens_used": total_tokens,
            "changes_made": all_changes,
            "notes": f"Layout optimized for {page_size}. Processed {total_chunks} chunks. {len(all_changes)} adjustments made."
        }

    # For smaller documents, process normally
    system_prompt = get_ai_layout_prompt(config)

    try:
        client = anthropic.Anthropic(api_key=claude_api_key)

        message_content = []

        # Add original image for visual comparison if available
        if pipeline.get("original_document_base64"):
            image_data = pipeline["original_document_base64"]
            if ',' in image_data:
                image_data = image_data.split(',')[1]

            if len(image_data) > 100:
                try:
                    message_content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_data[:100000] if len(image_data) > 100000 else image_data,
                        },
                    })
                except Exception as img_error:
                    logger.warning(f"Failed to add image to layout stage: {img_error}")

        message_content.append({
            "type": "text",
            "text": f"""Review and optimize the layout of this translated document for professional printing:

{previous_translation}

TARGET: {page_size}
TASK: Optimize CSS, fix page breaks, ensure print-ready output.
OUTPUT: Complete corrected HTML document."""
        })

        # Retry logic for rate limits
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=16384,
                    system=system_prompt,
                    messages=[{"role": "user", "content": message_content}]
                )
                break  # Success, exit retry loop
            except anthropic.RateLimitError as rate_error:
                if attempt < max_retries - 1:
                    wait_time = 60 * (attempt + 1)  # 60s, 120s, 180s
                    logger.warning(f"AI Layout rate limit hit, waiting {wait_time}s before retry {attempt + 2}/{max_retries}")
                    await asyncio.sleep(wait_time)
                else:
                    logger.warning(f"AI Layout rate limit exceeded after {max_retries} retries, skipping layout stage")
                    return {
                        "success": True,
                        "result": previous_translation,
                        "tokens_used": 0,
                        "changes_made": [],
                        "notes": "Layout skipped due to API rate limit. Translation preserved."
                    }

        if not response:
            return {
                "success": True,
                "result": previous_translation,
                "tokens_used": 0,
                "changes_made": [],
                "notes": "Layout skipped - no response from API. Translation preserved."
            }

        result = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Validate that we got a proper result
        if not result or len(result) < 100:
            logger.warning(f"AI Layout stage returned short result: {len(result) if result else 0} chars")
            return {
                "success": True,
                "result": previous_translation,  # Fall back to original translation
                "tokens_used": tokens_used,
                "changes_made": [],
                "notes": "Layout stage returned incomplete result, using original translation."
            }

        # Extract changes list from the result
        changes = []
        if "<!-- LAYOUT_CHANGES:" in result:
            try:
                changes_match = re.search(r'<!-- LAYOUT_CHANGES: (\[.*?\]) -->', result, re.DOTALL)
                if changes_match:
                    changes = json.loads(changes_match.group(1))
                    result = re.sub(r'<!-- LAYOUT_CHANGES: \[.*?\] -->', '', result, flags=re.DOTALL).strip()
            except Exception as parse_error:
                logger.warning(f"Failed to parse layout changes: {parse_error}")

        return {
            "success": True,
            "result": result,
            "tokens_used": tokens_used,
            "changes_made": changes,
            "notes": f"Layout optimized for {page_size}. {len(changes)} adjustments made."
        }

    except anthropic.APIError as api_error:
        error_msg = f"Claude API error: {str(api_error)}"
        logger.error(f"AI Layout stage API error: {error_msg}")
        # Return the original translation so the pipeline can continue
        return {
            "success": True,  # Mark as success to continue pipeline
            "result": previous_translation,
            "tokens_used": 0,
            "changes_made": [],
            "notes": f"Layout skipped due to API error. Translation preserved."
        }

    except Exception as e:
        error_msg = str(e) if str(e) else "Unknown error occurred"
        logger.error(f"AI Layout stage failed: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "result": previous_translation
        }


async def process_proofreader_chunk(chunk: str, chunk_num: int, total_chunks: int,
                                     config: dict, claude_api_key: str) -> dict:
    """Process a single chunk through proofreading - CRITICAL, will retry many times"""
    import anthropic

    target_language = config["target_language"]
    document_type = config["document_type"]
    system_prompt = get_ai_proofreader_prompt(config)

    try:
        client = anthropic.Anthropic(api_key=claude_api_key)

        # PROOFREADER IS CRITICAL - retry up to 10 times
        max_retries = 10
        response = None
        for attempt in range(max_retries):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=16384,
                    system=system_prompt,
                    messages=[{
                        "role": "user",
                        "content": f"""Proofread this section (chunk {chunk_num}/{total_chunks}) of a translated {document_type} document:

{chunk}

TASK: Verify terminology, consistency, and natural language flow for {target_language}.
TARGET: United States official use (if English)
IMPORTANT: Return ONLY the proofread HTML content. Preserve all structure.
OUTPUT: Complete corrected HTML section."""
                    }]
                )
                break  # Success
            except anthropic.RateLimitError:
                wait_time = 90 * (attempt + 1)  # 90s, 180s, 270s...
                logger.warning(f"Proofreader chunk {chunk_num} rate limit, waiting {wait_time}s (attempt {attempt + 2}/{max_retries})")
                await asyncio.sleep(wait_time)

        if not response:
            # Even after all retries, return original to not block pipeline
            logger.error(f"Proofreader chunk {chunk_num} failed after {max_retries} attempts")
            return {"success": True, "result": chunk, "tokens_used": 0, "corrections": []}

        # Safety check for empty response
        if not response.content or len(response.content) == 0:
            logger.warning(f"Proofreader chunk {chunk_num} returned empty response")
            return {
                "success": True,
                "result": chunk,  # Return original
                "tokens_used": 0,
                "corrections": []
            }

        result = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Extract corrections if present
        corrections = []
        if "<!-- PROOFREADING_REPORT:" in result:
            try:
                report_match = re.search(r'<!-- PROOFREADING_REPORT: (\{.*?\}) -->', result, re.DOTALL)
                if report_match:
                    report = json.loads(report_match.group(1))
                    corrections = report.get("corrections", [])
                    result = re.sub(r'<!-- PROOFREADING_REPORT: \{.*?\} -->', '', result, flags=re.DOTALL).strip()
            except:
                pass

        return {
            "success": True,
            "result": result,
            "tokens_used": tokens_used,
            "corrections": corrections
        }

    except Exception as e:
        logger.warning(f"Proofreader chunk {chunk_num} failed: {str(e)}, using original")
        return {
            "success": True,
            "result": chunk,
            "tokens_used": 0,
            "corrections": []
        }


async def run_ai_proofreader_stage(pipeline: dict, previous_translation: str, claude_api_key: str) -> dict:
    """
    STAGE 3: AI PROOFREADER (with chunking support for large documents)
    - Uses specialized proofreading prompt
    - Validates terminology for target country
    - Checks consistency of terms
    - Verifies technical/legal terms
    - Ensures natural language flow
    - Processes large documents in chunks
    """
    import anthropic

    config = pipeline["config"]
    target_language = config["target_language"]
    document_type = config["document_type"]

    # Validate input
    if not previous_translation:
        logger.error("AI Proofreader stage: No translation provided")
        return {
            "success": False,
            "error": "No translation content to proofread",
            "result": ""
        }

    translation_size = len(previous_translation)
    logger.info(f"AI Proofreader stage: Processing translation of {translation_size} characters")

    # Threshold for chunking (50KB per chunk)
    MAX_CHUNK_SIZE = 50000

    # If document is large, use chunking
    if translation_size > MAX_CHUNK_SIZE:
        logger.info(f"AI Proofreader stage: Large document detected, using chunking")

        chunks = split_html_into_chunks(previous_translation, MAX_CHUNK_SIZE)
        total_chunks = len(chunks)
        logger.info(f"AI Proofreader stage: Split into {total_chunks} chunks")

        processed_chunks = []
        total_tokens = 0
        all_corrections = []

        for i, chunk in enumerate(chunks, 1):
            logger.info(f"AI Proofreader stage: Processing chunk {i}/{total_chunks} ({len(chunk)} chars)")

            result = await process_proofreader_chunk(chunk, i, total_chunks, config, claude_api_key)

            processed_chunks.append(result["result"])
            total_tokens += result.get("tokens_used", 0)
            all_corrections.extend(result.get("corrections", []))

            # Rate limiting: wait between chunks to avoid API rate limits
            if i < total_chunks:
                await asyncio.sleep(45)  # Wait 45 seconds between chunks (8K tokens/min limit)

        # Combine all chunks using the same function as layout
        final_result = combine_layout_chunks(processed_chunks, config)

        return {
            "success": True,
            "result": final_result,
            "tokens_used": total_tokens,
            "changes_made": all_corrections,
            "notes": f"Proofreading completed for {target_language}. Processed {total_chunks} chunks. {len(all_corrections)} corrections made.",
            "quality_score": "good"
        }

    # For smaller documents, process normally
    system_prompt = get_ai_proofreader_prompt(config)

    try:
        client = anthropic.Anthropic(api_key=claude_api_key)

        # PROOFREADER IS CRITICAL - retry up to 10 times with longer waits
        max_retries = 10
        response = None
        for attempt in range(max_retries):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=16384,
                    system=system_prompt,
                    messages=[{
                        "role": "user",
                        "content": f"""Proofread this translated {document_type} document:

{previous_translation}

TASK: Verify terminology, consistency, and natural language flow for {target_language}.
TARGET: United States official use (if English)
OUTPUT: Complete corrected HTML with proofreading report."""
                    }]
                )
                break  # Success
            except anthropic.RateLimitError as rate_error:
                # Wait longer for proofreader - it's critical
                wait_time = 90 * (attempt + 1)  # 90s, 180s, 270s, etc.
                logger.warning(f"AI Proofreader rate limit hit, waiting {wait_time}s before retry {attempt + 2}/{max_retries}")

                # Update pipeline status to show waiting
                await db.ai_pipelines.update_one(
                    {"id": pipeline["id"]},
                    {"$set": {
                        "stages.ai_proofreader.notes": f"Rate limit - aguardando {wait_time}s (tentativa {attempt + 2}/{max_retries})..."
                    }}
                )
                await asyncio.sleep(wait_time)

        if not response:
            # Last resort - fail the stage so user can retry manually
            return {
                "success": False,
                "error": "Proofreader could not complete after 10 attempts due to API rate limits. Please try again in a few minutes.",
                "result": previous_translation
            }

        result = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Validate result
        if not result or len(result) < 100:
            logger.warning(f"AI Proofreader stage returned short result: {len(result) if result else 0} chars")
            return {
                "success": True,
                "result": previous_translation,
                "tokens_used": tokens_used,
                "changes_made": [],
                "notes": "Proofreading returned incomplete result, using previous translation.",
                "quality_score": "not_evaluated"
            }

        # Extract proofreading report
        corrections = []
        notes = ""
        quality_score = "good"

        if "<!-- PROOFREADING_REPORT:" in result:
            try:
                report_match = re.search(r'<!-- PROOFREADING_REPORT: (\{.*?\}) -->', result, re.DOTALL)
                if report_match:
                    report = json.loads(report_match.group(1))
                    corrections = report.get("corrections", [])
                    quality_score = report.get("quality_score", "good")
                    terminology_notes = report.get("terminology_notes", [])
                    notes = f"Quality: {quality_score}. Found {report.get('issues_found', 0)} issues. " + "; ".join(terminology_notes[:3])
                    result = re.sub(r'<!-- PROOFREADING_REPORT: \{.*?\} -->', '', result, flags=re.DOTALL).strip()
            except Exception as parse_error:
                logger.warning(f"Failed to parse proofreading report: {parse_error}")

        return {
            "success": True,
            "result": result,
            "tokens_used": tokens_used,
            "changes_made": corrections,
            "notes": notes or f"Proofreading completed for {target_language}.",
            "quality_score": quality_score
        }

    except anthropic.APIError as api_error:
        error_msg = f"Claude API error: {str(api_error)}"
        logger.error(f"AI Proofreader stage API error: {error_msg}")
        return {
            "success": True,  # Mark as success to continue pipeline
            "result": previous_translation,
            "tokens_used": 0,
            "changes_made": [],
            "notes": "Proofreading skipped due to API error. Translation preserved.",
            "quality_score": "not_evaluated"
        }

    except Exception as e:
        error_msg = str(e) if str(e) else "Unknown error occurred"
        logger.error(f"AI Proofreader stage failed: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "result": previous_translation
        }


@api_router.post("/admin/ai-pipeline/start")
async def start_ai_pipeline(request: AIPipelineCreate, admin_key: str):
    """Start a new AI translation pipeline for an order"""
    user = await validate_admin_or_user_token(admin_key)

    # Verify order exists
    order = await db.translation_orders.find_one({"id": request.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if pipeline already exists for this order
    existing = await db.ai_pipelines.find_one({"order_id": request.order_id})
    if existing and existing.get("overall_status") not in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Active pipeline already exists for this order")

    # Get Claude API key - use shared key if not provided
    claude_api_key = request.claude_api_key
    if not claude_api_key:
        settings = await db.app_settings.find_one({"key": "shared_claude_api_key"})
        if settings and settings.get("value"):
            claude_api_key = settings["value"]
        else:
            raise HTTPException(status_code=400, detail="No Claude API key provided and no shared key configured. Please configure the shared API key in Settings.")

    # Handle quick_start - fetch documents from order
    original_text = request.original_text
    original_document_base64 = request.original_document_base64
    original_filename = request.original_filename

    if request.quick_start and not original_text:
        # Fetch documents for this order
        order_docs = await db.documents.find({"order_id": request.order_id, "document_type": "original"}).to_list(100)

        if not order_docs:
            raise HTTPException(status_code=400, detail="No documents found for this order. Please upload documents first.")

        # Extract text from documents using Claude Vision
        extracted_texts = []
        for doc in order_docs:
            if doc.get("file_data"):
                # Use Claude to extract text from the document
                try:
                    client = anthropic.Anthropic(api_key=claude_api_key)

                    # Determine media type
                    filename = doc.get("filename", "").lower()
                    if filename.endswith(".pdf"):
                        media_type = "application/pdf"
                    elif filename.endswith(".png"):
                        media_type = "image/png"
                    elif filename.endswith(".jpg") or filename.endswith(".jpeg"):
                        media_type = "image/jpeg"
                    else:
                        media_type = "image/png"  # Default

                    # Clean base64 data
                    file_data = doc["file_data"]
                    if "," in file_data:
                        file_data = file_data.split(",")[1]

                    response = client.messages.create(
                        model="claude-sonnet-4-5-20250929",
                        max_tokens=8000,
                        messages=[{
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": file_data
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": "Extract ALL text from this document exactly as it appears. Preserve the layout and formatting. Include all visible text."
                                }
                            ]
                        }]
                    )

                    extracted_texts.append(f"--- Document: {doc.get('filename', 'unknown')} ---\n{response.content[0].text}")

                    if not original_document_base64:
                        original_document_base64 = file_data
                        original_filename = doc.get("filename")

                except Exception as e:
                    print(f"Error extracting text from document: {e}")
                    extracted_texts.append(f"--- Document: {doc.get('filename', 'unknown')} ---\n[Error extracting text: {str(e)}]")

        if extracted_texts:
            original_text = "\n\n".join(extracted_texts)
        else:
            raise HTTPException(status_code=400, detail="Could not extract text from any documents. Please check document format.")

    # Create pipeline configuration
    config = AIPipelineConfig(
        source_language=request.source_language,
        target_language=request.target_language,
        document_type=request.document_type,
        convert_currency=request.convert_currency,
        source_currency=request.source_currency,
        target_currency=request.target_currency,
        exchange_rate=request.exchange_rate,
        rate_date=request.rate_date or datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d"),
        add_translator_note=request.add_translator_note,
        page_format=request.page_format,
        use_glossary=request.use_glossary,
        custom_instructions=request.custom_instructions
    )

    # Create pipeline
    pipeline = AIPipeline(
        order_id=request.order_id,
        order_number=order.get("order_number"),
        config=config,
        original_text=original_text,
        original_document_base64=original_document_base64,
        original_filename=original_filename,
        started_by_id=user.get("id"),
        started_by_name=user.get("name"),
        started_at=datetime.utcnow(),
        overall_status="in_progress",
        claude_api_key_used=claude_api_key[:10] + "..." if claude_api_key else None
    )

    pipeline_dict = pipeline.dict()

    # Save pipeline
    await db.ai_pipelines.insert_one(pipeline_dict)

    # Update order status
    await db.translation_orders.update_one(
        {"id": request.order_id},
        {"$set": {
            "translation_status": "in_translation",
            "ai_pipeline_id": pipeline.id,
            "ai_pipeline_status": "in_progress"
        }}
    )

    # Start Stage 1: AI Translator
    pipeline_dict["stages"]["ai_translator"]["status"] = "in_progress"
    pipeline_dict["stages"]["ai_translator"]["started_at"] = datetime.utcnow().isoformat()

    await db.ai_pipelines.update_one(
        {"id": pipeline.id},
        {"$set": {
            "stages.ai_translator.status": "in_progress",
            "stages.ai_translator.started_at": datetime.utcnow(),
            "current_stage": "ai_translator"
        }}
    )

    # Run Stage 1
    result = await run_ai_translator_stage(pipeline_dict, claude_api_key)

    if result["success"]:
        # Skip Layout stage - go directly to Proofreader
        # Layout preservation is now handled in the translator prompt
        await db.ai_pipelines.update_one(
            {"id": pipeline.id},
            {"$set": {
                "stages.ai_translator.status": "completed",
                "stages.ai_translator.completed_at": datetime.utcnow(),
                "stages.ai_translator.result": result["result"],
                "stages.ai_translator.notes": result.get("notes"),
                "total_tokens_used": result.get("tokens_used", 0),
                # Skip ai_layout - mark as skipped and go to proofreader
                "stages.ai_layout.status": "skipped",
                "stages.ai_layout.notes": "Layout preservation handled in translator stage",
                "current_stage": "ai_proofreader",
                "stages.ai_proofreader.status": "in_progress",
                "stages.ai_proofreader.started_at": datetime.utcnow()
            }}
        )

        # Skip Stage 2 (Layout) - Run Stage 3: Proofreading directly
        proofread_result = await run_ai_proofreader_stage(pipeline_dict, result["result"], claude_api_key)

        if proofread_result["success"]:
            total_tokens = result.get("tokens_used", 0) + proofread_result.get("tokens_used", 0)

            await db.ai_pipelines.update_one(
                {"id": pipeline.id},
                {"$set": {
                    "stages.ai_proofreader.status": "completed",
                    "stages.ai_proofreader.completed_at": datetime.utcnow(),
                    "stages.ai_proofreader.result": proofread_result["result"],
                    "stages.ai_proofreader.notes": proofread_result.get("notes"),
                    "stages.ai_proofreader.changes_made": proofread_result.get("changes_made", []),
                    "total_tokens_used": total_tokens,
                    "current_stage": "human_review",
                    "stages.human_review.status": "pending",
                    "stages.human_review.result": proofread_result["result"],
                    "overall_status": "awaiting_review",
                    "updated_at": datetime.utcnow()
                }}
            )

            # Update order to show it's ready for human review
            await db.translation_orders.update_one(
                {"id": request.order_id},
                {"$set": {
                    "translation_status": "review",
                    "ai_pipeline_status": "awaiting_review"
                }}
            )

            # Create notification for PM
            if order.get("assigned_pm_id"):
                notification = Notification(
                    user_id=order["assigned_pm_id"],
                    type="ai_translation_ready",
                    title="AI Translation Ready for Review",
                    message=f"Order {order.get('order_number')} has completed AI translation and is ready for human review.",
                    order_id=request.order_id,
                    order_number=order.get("order_number")
                )
                await db.notifications.insert_one(notification.dict())

            return {
                "status": "success",
                "pipeline_id": pipeline.id,
                "message": "AI translation completed. Ready for human review.",
                "current_stage": "human_review",
                "total_tokens_used": total_tokens
            }
        else:
            # Proofreader failed
            await db.ai_pipelines.update_one(
                {"id": pipeline.id},
                {"$set": {
                    "stages.ai_proofreader.status": "failed",
                    "stages.ai_proofreader.error_message": proofread_result.get("error"),
                    "overall_status": "failed",
                    "updated_at": datetime.utcnow()
                }}
            )
    else:
        await db.ai_pipelines.update_one(
            {"id": pipeline.id},
            {"$set": {
                "stages.ai_translator.status": "failed",
                "stages.ai_translator.error_message": result.get("error"),
                "overall_status": "failed",
                "updated_at": datetime.utcnow()
            }}
        )

        return {
            "status": "error",
            "pipeline_id": pipeline.id,
            "message": f"AI translation failed: {result.get('error')}",
            "current_stage": "ai_translator"
        }

    # Return final status
    final_pipeline = await db.ai_pipelines.find_one({"id": pipeline.id})
    return {
        "status": final_pipeline.get("overall_status"),
        "pipeline_id": pipeline.id,
        "current_stage": final_pipeline.get("current_stage"),
        "total_tokens_used": final_pipeline.get("total_tokens_used", 0)
    }


@api_router.get("/admin/ai-pipeline/{pipeline_id}")
async def get_ai_pipeline(pipeline_id: str, admin_key: str):
    """Get AI pipeline status and details"""
    await validate_admin_or_user_token(admin_key)

    pipeline = await db.ai_pipelines.find_one({"id": pipeline_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # Convert ObjectId to string
    pipeline["_id"] = str(pipeline["_id"])

    return pipeline


@api_router.get("/admin/ai-pipeline/order/{order_id}")
async def get_ai_pipeline_by_order(order_id: str, admin_key: str):
    """Get AI pipeline for a specific order"""
    await validate_admin_or_user_token(admin_key)

    pipeline = await db.ai_pipelines.find_one({"order_id": order_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="No pipeline found for this order")

    pipeline["_id"] = str(pipeline["_id"])

    return pipeline


@api_router.post("/admin/ai-pipeline/approve")
async def approve_ai_pipeline_stage(request: AIPipelineStageApproval, admin_key: str):
    """Approve or edit a pipeline stage result"""
    user = await validate_admin_or_user_token(admin_key)

    pipeline = await db.ai_pipelines.find_one({"id": request.pipeline_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    if request.stage_name != pipeline.get("current_stage"):
        raise HTTPException(status_code=400, detail=f"Cannot approve stage '{request.stage_name}'. Current stage is '{pipeline.get('current_stage')}'")

    if request.action == "approve":
        # Get the result from the current stage
        current_result = pipeline["stages"][request.stage_name].get("result")

        if request.stage_name == "human_review":
            # Final approval - complete the pipeline
            await db.ai_pipelines.update_one(
                {"id": request.pipeline_id},
                {"$set": {
                    "stages.human_review.status": "completed",
                    "stages.human_review.completed_at": datetime.utcnow(),
                    "stages.human_review.notes": request.reviewer_notes,
                    "overall_status": "completed",
                    "completed_at": datetime.utcnow(),
                    "reviewed_by_id": user.get("id"),
                    "reviewed_by_name": user.get("name"),
                    "final_translation": current_result,
                    "updated_at": datetime.utcnow()
                }}
            )

            # Update order
            await db.translation_orders.update_one(
                {"id": pipeline["order_id"]},
                {"$set": {
                    "translation_status": "ready",
                    "ai_pipeline_status": "completed",
                    "translated_content": current_result
                }}
            )

            return {
                "status": "success",
                "message": "Translation approved and ready for delivery",
                "pipeline_status": "completed"
            }
        else:
            # Move to next stage (ai_layout removed - handled in translator)
            stage_order = ["ai_translator", "ai_proofreader", "human_review"]
            current_index = stage_order.index(request.stage_name)
            next_stage = stage_order[current_index + 1]

            await db.ai_pipelines.update_one(
                {"id": request.pipeline_id},
                {"$set": {
                    f"stages.{request.stage_name}.status": "approved",
                    f"stages.{request.stage_name}.notes": request.reviewer_notes,
                    "current_stage": next_stage,
                    f"stages.{next_stage}.status": "pending",
                    "updated_at": datetime.utcnow()
                }}
            )

            return {
                "status": "success",
                "message": f"Stage '{request.stage_name}' approved. Moving to '{next_stage}'",
                "next_stage": next_stage
            }

    elif request.action == "edit":
        # Apply manual edits
        if not request.edited_content:
            raise HTTPException(status_code=400, detail="Edited content is required for 'edit' action")

        await db.ai_pipelines.update_one(
            {"id": request.pipeline_id},
            {"$set": {
                f"stages.{request.stage_name}.result": request.edited_content,
                f"stages.{request.stage_name}.notes": request.reviewer_notes or "Manually edited by reviewer",
                "updated_at": datetime.utcnow()
            }}
        )

        return {
            "status": "success",
            "message": f"Stage '{request.stage_name}' content updated"
        }

    elif request.action == "reject":
        # Mark stage for re-processing
        await db.ai_pipelines.update_one(
            {"id": request.pipeline_id},
            {"$set": {
                f"stages.{request.stage_name}.status": "rejected",
                f"stages.{request.stage_name}.notes": request.reviewer_notes,
                "overall_status": "revision_needed",
                "updated_at": datetime.utcnow()
            }}
        )

        return {
            "status": "success",
            "message": f"Stage '{request.stage_name}' rejected. Revision needed."
        }

    else:
        raise HTTPException(status_code=400, detail=f"Invalid action: {request.action}")


@api_router.get("/admin/ai-pipelines")
async def list_ai_pipelines(admin_key: str, status: Optional[str] = None, limit: int = 50):
    """List all AI translation pipelines"""
    await validate_admin_or_user_token(admin_key)

    query = {}
    if status:
        query["overall_status"] = status

    pipelines = await db.ai_pipelines.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)

    for p in pipelines:
        p["_id"] = str(p["_id"])

    return {"pipelines": pipelines, "count": len(pipelines)}


@api_router.post("/admin/ai-pipeline/{pipeline_id}/retry")
async def retry_ai_pipeline_stage(pipeline_id: str, admin_key: str, claude_api_key: str):
    """Retry a failed pipeline stage"""
    await validate_admin_or_user_token(admin_key)

    pipeline = await db.ai_pipelines.find_one({"id": pipeline_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    current_stage = pipeline.get("current_stage")
    stage_data = pipeline["stages"].get(current_stage, {})

    if stage_data.get("status") not in ["failed", "rejected"]:
        raise HTTPException(status_code=400, detail=f"Stage '{current_stage}' is not in a retryable state")

    # Get the previous stage result (or original text for first stage)
    stage_order = ["ai_translator", "ai_proofreader", "human_review"]
    current_index = stage_order.index(current_stage)

    if current_index == 0:
        previous_result = pipeline["original_text"]
    else:
        previous_stage = stage_order[current_index - 1]
        previous_result = pipeline["stages"][previous_stage].get("result", pipeline["original_text"])

    # Mark as in progress
    await db.ai_pipelines.update_one(
        {"id": pipeline_id},
        {"$set": {
            f"stages.{current_stage}.status": "in_progress",
            f"stages.{current_stage}.started_at": datetime.utcnow(),
            f"stages.{current_stage}.error_message": None,
            "overall_status": "in_progress",
            "updated_at": datetime.utcnow()
        }}
    )

    # Run the appropriate stage (ai_layout removed - handled in translator)
    if current_stage == "ai_translator":
        result = await run_ai_translator_stage(pipeline, claude_api_key)
    elif current_stage == "ai_proofreader":
        result = await run_ai_proofreader_stage(pipeline, previous_result, claude_api_key)
    else:
        raise HTTPException(status_code=400, detail="Cannot retry human review stage")

    if result["success"]:
        await db.ai_pipelines.update_one(
            {"id": pipeline_id},
            {"$set": {
                f"stages.{current_stage}.status": "completed",
                f"stages.{current_stage}.completed_at": datetime.utcnow(),
                f"stages.{current_stage}.result": result["result"],
                f"stages.{current_stage}.notes": result.get("notes"),
                "updated_at": datetime.utcnow()
            }}
        )

        return {
            "status": "success",
            "message": f"Stage '{current_stage}' completed successfully",
            "result": result["result"][:500] + "..." if len(result.get("result", "")) > 500 else result.get("result")
        }
    else:
        await db.ai_pipelines.update_one(
            {"id": pipeline_id},
            {"$set": {
                f"stages.{current_stage}.status": "failed",
                f"stages.{current_stage}.error_message": result.get("error"),
                "overall_status": "failed",
                "updated_at": datetime.utcnow()
            }}
        )

        return {
            "status": "error",
            "message": f"Stage '{current_stage}' failed: {result.get('error')}"
        }


# ==================== QUICKBOOKS INTEGRATION ====================

@api_router.get("/quickbooks/connect")
async def quickbooks_connect(admin_key: str = None):
    """Start OAuth flow to connect to QuickBooks"""
    try:
        # Get stored settings from database
        settings = await db.settings.find_one({"key": "quickbooks"})
        qb_client = get_quickbooks_client(settings)

        # Generate state for security
        state = secrets.token_urlsafe(32)

        # Store state in database for verification
        await db.settings.update_one(
            {"key": "quickbooks_oauth_state"},
            {"$set": {"value": state, "created_at": datetime.utcnow()}},
            upsert=True
        )

        auth_url = qb_client.get_authorization_url(state=state)
        return {"success": True, "authorization_url": auth_url}
    except Exception as e:
        logger.error(f"QuickBooks connect error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/quickbooks/callback")
async def quickbooks_callback(code: str = None, state: str = None, realmId: str = None, error: str = None):
    """Handle OAuth callback from QuickBooks"""
    if error:
        return HTMLResponse(content=f"""
            <html><body>
            <h2>QuickBooks Connection Failed</h2>
            <p>Error: {error}</p>
            <script>window.close();</script>
            </body></html>
        """)

    try:
        # Verify state
        stored_state = await db.settings.find_one({"key": "quickbooks_oauth_state"})
        if not stored_state or stored_state.get("value") != state:
            return HTMLResponse(content="""
                <html><body>
                <h2>Security Error</h2>
                <p>Invalid state parameter. Please try again.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
                </body></html>
            """)

        # Exchange code for tokens
        qb_client = get_quickbooks_client()
        result = qb_client.exchange_code_for_tokens(code)

        if result.get("success"):
            # Store tokens and realm_id in database
            await db.settings.update_one(
                {"key": "quickbooks"},
                {"$set": {
                    "quickbooks_realm_id": realmId,
                    "quickbooks_access_token": result.get("access_token"),
                    "quickbooks_refresh_token": result.get("refresh_token"),
                    "quickbooks_connected": True,
                    "quickbooks_connected_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )

            return HTMLResponse(content="""
                <html><body>
                <h2>QuickBooks Connected Successfully!</h2>
                <p>You can close this window and return to the portal.</p>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({type: 'quickbooks_connected', success: true}, '*');
                    }
                    setTimeout(() => window.close(), 2000);
                </script>
                </body></html>
            """)
        else:
            return HTMLResponse(content=f"""
                <html><body>
                <h2>Connection Failed</h2>
                <p>Error: {result.get('error')}</p>
                <script>setTimeout(() => window.close(), 3000);</script>
                </body></html>
            """)
    except Exception as e:
        logger.error(f"QuickBooks callback error: {str(e)}")
        return HTMLResponse(content=f"""
            <html><body>
            <h2>Error</h2>
            <p>{str(e)}</p>
            <script>setTimeout(() => window.close(), 3000);</script>
            </body></html>
        """)


@api_router.get("/quickbooks/status")
async def quickbooks_status(admin_key: str = None):
    """Check QuickBooks connection status"""
    try:
        settings = await db.settings.find_one({"key": "quickbooks"})

        if not settings or not settings.get("quickbooks_connected"):
            return {"connected": False, "company_name": None}

        # Test connection by getting company info
        qb_client = get_quickbooks_client(settings)
        result = qb_client.test_connection()

        if result.get("success"):
            return {
                "connected": True,
                "company_name": result.get("company_name"),
                "connected_at": settings.get("quickbooks_connected_at")
            }
        else:
            # Token might be expired, try to refresh
            if result.get("needs_reauth"):
                await db.settings.update_one(
                    {"key": "quickbooks"},
                    {"$set": {"quickbooks_connected": False}}
                )
            return {"connected": False, "error": result.get("error")}
    except Exception as e:
        logger.error(f"QuickBooks status error: {str(e)}")
        return {"connected": False, "error": str(e)}


@api_router.post("/quickbooks/disconnect")
async def quickbooks_disconnect(admin_key: str = None):
    """Disconnect from QuickBooks"""
    try:
        await db.settings.update_one(
            {"key": "quickbooks"},
            {"$set": {
                "quickbooks_connected": False,
                "quickbooks_access_token": None,
                "quickbooks_refresh_token": None,
                "quickbooks_realm_id": None,
                "updated_at": datetime.utcnow()
            }}
        )
        return {"success": True, "message": "Disconnected from QuickBooks"}
    except Exception as e:
        logger.error(f"QuickBooks disconnect error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quickbooks/sync/customer")
async def quickbooks_sync_customer(
    admin_key: str = None,
    customer_name: str = Body(...),
    customer_email: str = Body(None),
    customer_phone: str = Body(None),
    company_name: str = Body(None)
):
    """Create or find a customer in QuickBooks"""
    try:
        settings = await db.settings.find_one({"key": "quickbooks"})
        if not settings or not settings.get("quickbooks_connected"):
            raise HTTPException(status_code=400, detail="QuickBooks not connected")

        qb_client = get_quickbooks_client(settings)

        # First try to find existing customer by email
        if customer_email:
            existing = qb_client.find_customer_by_email(customer_email)
            if existing.get("success"):
                customers = existing.get("data", {}).get("QueryResponse", {}).get("Customer", [])
                if customers:
                    return {
                        "success": True,
                        "customer_id": customers[0].get("Id"),
                        "customer_name": customers[0].get("DisplayName"),
                        "existing": True
                    }

        # Create new customer
        result = qb_client.create_customer(
            display_name=customer_name,
            email=customer_email,
            phone=customer_phone,
            company=company_name
        )

        if result.get("success"):
            customer = result.get("data", {}).get("Customer", {})
            return {
                "success": True,
                "customer_id": customer.get("Id"),
                "customer_name": customer.get("DisplayName"),
                "existing": False
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QuickBooks sync customer error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quickbooks/sync/invoice")
async def quickbooks_sync_invoice(
    admin_key: str = None,
    order_id: str = Body(...),
    customer_id: str = Body(None),
    customer_name: str = Body(None),
    customer_email: str = Body(None),
    send_email: bool = Body(True)
):
    """Create and optionally send an invoice in QuickBooks for a completed order"""
    try:
        settings = await db.settings.find_one({"key": "quickbooks"})
        if not settings or not settings.get("quickbooks_connected"):
            raise HTTPException(status_code=400, detail="QuickBooks not connected")

        # Get order details
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        qb_client = get_quickbooks_client(settings)

        # Get or create customer
        qb_customer_id = customer_id
        if not qb_customer_id:
            # Try to find or create customer
            if customer_email:
                existing = qb_client.find_customer_by_email(customer_email)
                if existing.get("success"):
                    customers = existing.get("data", {}).get("QueryResponse", {}).get("Customer", [])
                    if customers:
                        qb_customer_id = customers[0].get("Id")

            if not qb_customer_id:
                # Create customer
                cust_name = customer_name or order.get("customer_name", "Customer")
                cust_result = qb_client.create_customer(
                    display_name=cust_name,
                    email=customer_email or order.get("customer_email")
                )
                if cust_result.get("success"):
                    qb_customer_id = cust_result.get("data", {}).get("Customer", {}).get("Id")
                else:
                    raise HTTPException(status_code=400, detail="Failed to create customer")

        # Create line items from order
        line_items = [{
            "description": f"Translation Service - {order.get('document_type', 'Document')} ({order.get('source_language', 'Source')} to {order.get('target_language', 'Target')})",
            "amount": order.get("total_price", 0),
            "quantity": 1
        }]

        # Create invoice
        invoice_result = qb_client.create_invoice(
            customer_id=qb_customer_id,
            line_items=line_items,
            memo=f"Order #{order.get('order_number', order_id)}"
        )

        if not invoice_result.get("success"):
            raise HTTPException(status_code=400, detail=f"Failed to create invoice: {invoice_result.get('error')}")

        invoice = invoice_result.get("data", {}).get("Invoice", {})
        invoice_id = invoice.get("Id")

        # Send invoice via email if requested
        if send_email and invoice_id:
            send_result = qb_client.send_invoice(invoice_id, customer_email)
            if not send_result.get("success"):
                logger.warning(f"Failed to send invoice email: {send_result.get('error')}")

        # Update order with QuickBooks info
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "quickbooks_invoice_id": invoice_id,
                "quickbooks_invoice_number": invoice.get("DocNumber"),
                "quickbooks_synced_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )

        return {
            "success": True,
            "invoice_id": invoice_id,
            "invoice_number": invoice.get("DocNumber"),
            "invoice_link": invoice.get("InvoiceLink"),
            "email_sent": send_email
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QuickBooks sync invoice error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quickbooks/sync/receipt")
async def quickbooks_sync_receipt(
    admin_key: str = None,
    order_id: str = Body(...),
    customer_id: str = Body(None),
    customer_name: str = Body(None),
    customer_email: str = Body(None),
    send_email: bool = Body(True),
    is_partner_order: bool = Body(False)
):
    """
    Create and optionally send a Sales Receipt in QuickBooks for a PAID order.

    Sales Receipts are used for transactions where payment has already been received,
    unlike Invoices which are requests for payment.

    For Partner orders (B2B): Receipt goes to the Partner, not the end client.
    For Direct orders: Receipt goes to the client.
    """
    try:
        settings = await db.settings.find_one({"key": "quickbooks"})
        if not settings or not settings.get("quickbooks_connected"):
            raise HTTPException(status_code=400, detail="QuickBooks not connected")

        # Get order details - check both collections
        order = await db.orders.find_one({"id": order_id})
        if not order:
            order = await db.translation_orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        qb_client = get_quickbooks_client(settings)

        # For Partner orders, get partner info for the receipt
        receipt_email = customer_email
        receipt_name = customer_name

        if is_partner_order and order.get("partner_id"):
            # Try to get partner details
            partner = await db.partners.find_one({"id": order.get("partner_id")})
            if partner:
                receipt_email = receipt_email or partner.get("email")
                receipt_name = receipt_name or partner.get("company_name", partner.get("name"))

        # Get or create customer in QuickBooks
        qb_customer_id = customer_id
        if not qb_customer_id:
            # Try to find existing customer by email
            if receipt_email:
                existing = qb_client.find_customer_by_email(receipt_email)
                if existing.get("success"):
                    customers = existing.get("data", {}).get("QueryResponse", {}).get("Customer", [])
                    if customers:
                        qb_customer_id = customers[0].get("Id")

            if not qb_customer_id:
                # Create customer
                cust_name = receipt_name or order.get("client_name", "Customer")
                cust_result = qb_client.create_customer(
                    display_name=cust_name,
                    email=receipt_email or order.get("client_email")
                )
                if cust_result.get("success"):
                    qb_customer_id = cust_result.get("data", {}).get("Customer", {}).get("Id")
                else:
                    raise HTTPException(status_code=400, detail="Failed to create customer")

        # Create line items from order
        doc_type = order.get('document_type', order.get('service_type', 'Document'))
        source_lang = order.get('translate_from', order.get('source_language', 'Source'))
        target_lang = order.get('translate_to', order.get('target_language', 'Target'))

        line_items = [{
            "description": f"Translation Service - {doc_type} ({source_lang} to {target_lang})",
            "amount": order.get("total_price", 0),
            "quantity": 1
        }]

        # Create Sales Receipt (not Invoice - payment already received)
        receipt_result = qb_client.create_sales_receipt(
            customer_id=qb_customer_id,
            line_items=line_items,
            memo=f"Order #{order.get('order_number', order_id)} - Payment Received"
        )

        if not receipt_result.get("success"):
            raise HTTPException(status_code=400, detail=f"Failed to create receipt: {receipt_result.get('error')}")

        receipt = receipt_result.get("data", {}).get("SalesReceipt", {})
        receipt_id = receipt.get("Id")
        receipt_number = receipt.get("DocNumber")

        # Send receipt via email if requested
        if send_email and receipt_id and receipt_email:
            send_result = qb_client.send_sales_receipt(receipt_id, receipt_email)
            if not send_result.get("success"):
                logger.warning(f"Failed to send receipt email: {send_result.get('error')}")

        # Update order with QuickBooks info (use same fields for consistency)
        update_data = {
            "quickbooks_invoice_id": receipt_id,  # Reusing field for receipt ID
            "quickbooks_invoice_number": receipt_number,
            "quickbooks_receipt_type": "sales_receipt",
            "quickbooks_synced_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Update in both possible collections
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
        await db.translation_orders.update_one({"id": order_id}, {"$set": update_data})

        return {
            "success": True,
            "receipt_id": receipt_id,
            "receipt_number": receipt_number,
            "email_sent": send_email and bool(receipt_email),
            "sent_to": receipt_email if send_email else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QuickBooks sync receipt error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quickbooks/sync/contractor-payment")
async def quickbooks_sync_contractor_payment(
    admin_key: str = None,
    translator_id: str = Body(...),
    translator_name: str = Body(...),
    translator_email: str = Body(None),
    amount: float = Body(...),
    description: str = Body(...),
    order_id: str = Body(None)
):
    """Record a contractor (1099) payment in QuickBooks"""
    try:
        settings = await db.settings.find_one({"key": "quickbooks"})
        if not settings or not settings.get("quickbooks_connected"):
            raise HTTPException(status_code=400, detail="QuickBooks not connected")

        qb_client = get_quickbooks_client(settings)

        # Find or create vendor
        existing = qb_client.find_vendor_by_name(translator_name)
        vendor_id = None

        if existing.get("success"):
            vendors = existing.get("data", {}).get("QueryResponse", {}).get("Vendor", [])
            if vendors:
                vendor_id = vendors[0].get("Id")

        if not vendor_id:
            # Create vendor as 1099 contractor
            vendor_result = qb_client.create_vendor(
                display_name=translator_name,
                email=translator_email,
                is_1099=True
            )
            if vendor_result.get("success"):
                vendor_id = vendor_result.get("data", {}).get("Vendor", {}).get("Id")
            else:
                raise HTTPException(status_code=400, detail="Failed to create vendor")

        # Create bill for the contractor payment
        line_items = [{
            "description": description,
            "amount": amount
        }]

        bill_result = qb_client.create_bill(
            vendor_id=vendor_id,
            line_items=line_items,
            memo=f"Payment to {translator_name}" + (f" - Order #{order_id}" if order_id else "")
        )

        if not bill_result.get("success"):
            raise HTTPException(status_code=400, detail=f"Failed to create bill: {bill_result.get('error')}")

        bill = bill_result.get("data", {}).get("Bill", {})

        return {
            "success": True,
            "bill_id": bill.get("Id"),
            "vendor_id": vendor_id,
            "amount": amount
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QuickBooks sync contractor payment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/quickbooks/invoice/{order_id}")
async def quickbooks_get_invoice(order_id: str, admin_key: str = None):
    """Get QuickBooks invoice status for an order"""
    try:
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if not order.get("quickbooks_invoice_id"):
            return {"synced": False}

        settings = await db.settings.find_one({"key": "quickbooks"})
        if not settings or not settings.get("quickbooks_connected"):
            return {
                "synced": True,
                "invoice_id": order.get("quickbooks_invoice_id"),
                "invoice_number": order.get("quickbooks_invoice_number"),
                "status": "unknown",
                "error": "QuickBooks not connected"
            }

        qb_client = get_quickbooks_client(settings)
        result = qb_client.get_invoice(order.get("quickbooks_invoice_id"))

        if result.get("success"):
            invoice = result.get("data", {}).get("Invoice", {})
            return {
                "synced": True,
                "invoice_id": invoice.get("Id"),
                "invoice_number": invoice.get("DocNumber"),
                "status": "Paid" if invoice.get("Balance", 1) == 0 else "Unpaid",
                "balance": invoice.get("Balance"),
                "total": invoice.get("TotalAmt")
            }
        else:
            return {
                "synced": True,
                "invoice_id": order.get("quickbooks_invoice_id"),
                "status": "unknown",
                "error": result.get("error")
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"QuickBooks get invoice error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DOCUMENT CERTIFICATION SYSTEM ====================

def generate_qr_code(data: str) -> str:
    """Generate QR code as base64 image"""
    try:
        import qrcode
        from io import BytesIO

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except ImportError:
        logger.warning("qrcode library not installed, skipping QR generation")
        return None
    except Exception as e:
        logger.error(f"QR code generation error: {str(e)}")
        return None

@api_router.post("/certifications/create")
async def create_certification(data: CertificationCreate, admin_key: str):
    """Create a new document certification with unique ID and QR code"""
    # Validate admin key
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Generate certification ID
        cert_id = f"LT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

        # Create document hash from content
        document_hash = hashlib.sha256(data.document_content.encode('utf-8')).hexdigest()

        # Generate verification URL
        base_url = os.environ.get("FRONTEND_URL", "https://portal.legacytranslations.com")
        verification_url = f"{base_url}/#/verify/{cert_id}"

        # Generate QR code
        qr_code_data = generate_qr_code(verification_url)

        # Create certification record
        certification = {
            "certification_id": cert_id,
            "order_id": data.order_id,
            "order_number": data.order_number,
            "document_type": data.document_type,
            "source_language": data.source_language,
            "target_language": data.target_language,
            "page_count": data.page_count,
            "document_hash": document_hash,
            "certifier_name": data.certifier_name,
            "certifier_title": data.certifier_title,
            "certifier_credentials": data.certifier_credentials,
            "company_name": data.company_name,
            "company_address": data.company_address,
            "company_phone": data.company_phone,
            "company_email": data.company_email,
            "client_name": data.client_name,
            "certified_at": datetime.utcnow(),
            "is_valid": True,
            "verification_url": verification_url,
            "qr_code_data": qr_code_data
        }

        # Store in database
        await db.certifications.insert_one(certification)

        logger.info(f"Created certification: {cert_id}")

        return {
            "success": True,
            "certification_id": cert_id,
            "verification_url": verification_url,
            "qr_code_data": qr_code_data,
            "document_hash": document_hash,
            "certified_at": certification["certified_at"].isoformat()
        }

    except Exception as e:
        logger.error(f"Error creating certification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/certifications/verify/{certification_id}")
async def verify_certification(certification_id: str):
    """Public endpoint to verify a document certification"""
    try:
        # Find certification
        certification = await db.certifications.find_one({"certification_id": certification_id})

        if not certification:
            return CertificationVerifyResponse(
                is_valid=False,
                certification_id=certification_id,
                message="Certification not found. This document may not be certified by Legacy Translations."
            )

        # Check if revoked
        if certification.get("revoked_at"):
            return CertificationVerifyResponse(
                is_valid=False,
                certification_id=certification_id,
                certified_at=certification.get("certified_at"),
                message=f"This certification was revoked on {certification.get('revoked_at').strftime('%Y-%m-%d')}. Reason: {certification.get('revocation_reason', 'Not specified')}"
            )

        # Valid certification
        return CertificationVerifyResponse(
            is_valid=True,
            certification_id=certification_id,
            certified_at=certification.get("certified_at"),
            document_type=certification.get("document_type"),
            source_language=certification.get("source_language"),
            target_language=certification.get("target_language"),
            certifier_name=certification.get("certifier_name"),
            certifier_title=certification.get("certifier_title"),
            certifier_credentials=certification.get("certifier_credentials"),
            company_name=certification.get("company_name"),
            client_name=certification.get("client_name"),
            message="✓ This document has been certified by Legacy Translations Inc."
        )

    except Exception as e:
        logger.error(f"Error verifying certification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/certifications/{certification_id}")
async def get_certification(certification_id: str, admin_key: str):
    """Get full certification details (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        certification = await db.certifications.find_one({"certification_id": certification_id})
        if not certification:
            raise HTTPException(status_code=404, detail="Certification not found")

        if '_id' in certification:
            del certification['_id']

        return certification

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting certification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/certifications")
async def list_certifications(admin_key: str, limit: int = 50):
    """List all certifications (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") in ["admin", "pm"]:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        certifications = await db.certifications.find().sort("certified_at", -1).limit(limit).to_list(limit)

        for cert in certifications:
            if '_id' in cert:
                del cert['_id']

        return {"certifications": certifications, "count": len(certifications)}

    except Exception as e:
        logger.error(f"Error listing certifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/certifications/{certification_id}/revoke")
async def revoke_certification(certification_id: str, admin_key: str, reason: str = ""):
    """Revoke a certification (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if user and user.get("role") == "admin":
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        result = await db.certifications.update_one(
            {"certification_id": certification_id},
            {
                "$set": {
                    "is_valid": False,
                    "revoked_at": datetime.utcnow(),
                    "revocation_reason": reason
                }
            }
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Certification not found")

        logger.info(f"Revoked certification: {certification_id}")

        return {"success": True, "message": f"Certification {certification_id} has been revoked"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking certification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BACKUP & RESTORE SYSTEM ====================

@api_router.get("/admin/backup/source-code")
async def download_source_code(admin_key: str):
    """Download the application source code as a ZIP file (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Create a ZIP file in memory
        zip_buffer = io.BytesIO()

        # Get the project root directory
        backend_dir = Path(__file__).parent
        project_root = backend_dir.parent

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add backend files
            backend_path = project_root / 'backend'
            if backend_path.exists():
                for file_path in backend_path.rglob('*'):
                    if file_path.is_file() and not file_path.name.startswith('.') and '__pycache__' not in str(file_path):
                        arcname = f"backend/{file_path.relative_to(backend_path)}"
                        zip_file.write(file_path, arcname)

            # Add frontend src files
            frontend_src = project_root / 'frontend' / 'src'
            if frontend_src.exists():
                for file_path in frontend_src.rglob('*'):
                    if file_path.is_file() and not file_path.name.startswith('.'):
                        arcname = f"frontend/src/{file_path.relative_to(frontend_src)}"
                        zip_file.write(file_path, arcname)

            # Add frontend public files
            frontend_public = project_root / 'frontend' / 'public'
            if frontend_public.exists():
                for file_path in frontend_public.rglob('*'):
                    if file_path.is_file() and not file_path.name.startswith('.'):
                        arcname = f"frontend/public/{file_path.relative_to(frontend_public)}"
                        zip_file.write(file_path, arcname)

            # Add package.json
            package_json = project_root / 'frontend' / 'package.json'
            if package_json.exists():
                zip_file.write(package_json, "frontend/package.json")

            # Add requirements.txt
            requirements = project_root / 'backend' / 'requirements.txt'
            if requirements.exists():
                zip_file.write(requirements, "backend/requirements.txt")

        zip_buffer.seek(0)

        # Generate filename with timestamp
        timestamp = datetime.utcnow().strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"legacy_portal_source_{timestamp}.zip"

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Error creating source code backup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")


@api_router.post("/admin/backup/restore-point")
async def create_restore_point(admin_key: str, name: str = Body(""), description: str = Body("")):
    """Create a restore point with all database data (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")

    try:
        restore_point_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()

        # Collect all data from main collections
        orders = await db.orders.find({}).to_list(10000)
        admin_users = await db.admin_users.find({}).to_list(1000)
        translator_payments = await db.translator_payments.find({}).to_list(10000)
        expenses = await db.expenses.find({}).to_list(10000)
        partners = await db.partners.find({}).to_list(1000)
        certifications = await db.certifications.find({}).to_list(10000)

        # Convert ObjectIds to strings
        def serialize_docs(docs):
            for doc in docs:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
                for key, value in doc.items():
                    if isinstance(value, datetime):
                        doc[key] = value.isoformat()
            return docs

        restore_point = {
            "id": restore_point_id,
            "name": name or f"Restore Point {timestamp.strftime('%Y-%m-%d %H:%M')}",
            "description": description,
            "created_at": timestamp,
            "data": {
                "orders": serialize_docs(orders),
                "admin_users": serialize_docs(admin_users),
                "translator_payments": serialize_docs(translator_payments),
                "expenses": serialize_docs(expenses),
                "partners": serialize_docs(partners),
                "certifications": serialize_docs(certifications)
            },
            "stats": {
                "orders_count": len(orders),
                "users_count": len(admin_users),
                "payments_count": len(translator_payments),
                "expenses_count": len(expenses),
                "partners_count": len(partners),
                "certifications_count": len(certifications)
            }
        }

        # Save to restore_points collection
        await db.restore_points.insert_one(restore_point)

        logger.info(f"Restore point created: {restore_point_id} with {len(orders)} orders")

        return {
            "success": True,
            "restore_point_id": restore_point_id,
            "name": restore_point["name"],
            "created_at": timestamp.isoformat(),
            "stats": restore_point["stats"]
        }

    except Exception as e:
        logger.error(f"Error creating restore point: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create restore point: {str(e)}")


@api_router.get("/admin/backup/restore-points")
async def list_restore_points(admin_key: str):
    """List all available restore points (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")

    try:
        # Get restore points without the full data (for performance)
        restore_points = await db.restore_points.find(
            {},
            {"data": 0}  # Exclude the data field for listing
        ).sort("created_at", -1).to_list(100)

        for rp in restore_points:
            if '_id' in rp:
                rp['_id'] = str(rp['_id'])
            if rp.get('created_at'):
                rp['created_at'] = rp['created_at'].isoformat()

        return {"restore_points": restore_points}

    except Exception as e:
        logger.error(f"Error listing restore points: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list restore points")


@api_router.post("/admin/backup/restore/{restore_point_id}")
async def restore_from_point(restore_point_id: str, admin_key: str, confirm: bool = Body(False)):
    """Restore database from a restore point (admin only) - DESTRUCTIVE OPERATION"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")

    if not confirm:
        raise HTTPException(status_code=400, detail="Please confirm the restore operation. This will overwrite all current data!")

    try:
        # Get the restore point
        restore_point = await db.restore_points.find_one({"id": restore_point_id})
        if not restore_point:
            raise HTTPException(status_code=404, detail="Restore point not found")

        # Create an automatic backup before restore
        auto_backup_id = str(uuid.uuid4())
        current_orders = await db.orders.find({}).to_list(10000)
        current_users = await db.admin_users.find({}).to_list(1000)

        def serialize_docs(docs):
            for doc in docs:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
                for key, value in doc.items():
                    if isinstance(value, datetime):
                        doc[key] = value.isoformat()
            return docs

        auto_backup = {
            "id": auto_backup_id,
            "name": f"Auto-backup before restore {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            "description": f"Automatic backup created before restoring from {restore_point.get('name', restore_point_id)}",
            "created_at": datetime.utcnow(),
            "data": {
                "orders": serialize_docs(current_orders),
                "admin_users": serialize_docs(current_users)
            },
            "stats": {
                "orders_count": len(current_orders),
                "users_count": len(current_users)
            },
            "is_auto_backup": True
        }
        await db.restore_points.insert_one(auto_backup)

        # Restore data
        data = restore_point.get("data", {})

        # Restore orders
        if "orders" in data and data["orders"]:
            await db.orders.delete_many({})
            for order in data["orders"]:
                if '_id' in order:
                    del order['_id']
            await db.orders.insert_many(data["orders"])

        # Restore admin_users
        if "admin_users" in data and data["admin_users"]:
            await db.admin_users.delete_many({})
            for user in data["admin_users"]:
                if '_id' in user:
                    del user['_id']
            await db.admin_users.insert_many(data["admin_users"])

        # Restore translator_payments
        if "translator_payments" in data and data["translator_payments"]:
            await db.translator_payments.delete_many({})
            for payment in data["translator_payments"]:
                if '_id' in payment:
                    del payment['_id']
            await db.translator_payments.insert_many(data["translator_payments"])

        # Restore expenses
        if "expenses" in data and data["expenses"]:
            await db.expenses.delete_many({})
            for expense in data["expenses"]:
                if '_id' in expense:
                    del expense['_id']
            await db.expenses.insert_many(data["expenses"])

        # Restore partners
        if "partners" in data and data["partners"]:
            await db.partners.delete_many({})
            for partner in data["partners"]:
                if '_id' in partner:
                    del partner['_id']
            await db.partners.insert_many(data["partners"])

        logger.info(f"Database restored from restore point: {restore_point_id}")

        return {
            "success": True,
            "message": "Database restored successfully",
            "restored_from": restore_point.get("name", restore_point_id),
            "auto_backup_id": auto_backup_id,
            "stats": restore_point.get("stats", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring from restore point: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to restore: {str(e)}")


@api_router.delete("/admin/backup/restore-point/{restore_point_id}")
async def delete_restore_point(restore_point_id: str, admin_key: str):
    """Delete a restore point (admin only)"""
    is_valid = admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024")
    if not is_valid:
        user = await get_current_admin_user(admin_key)
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")

    try:
        result = await db.restore_points.delete_one({"id": restore_point_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Restore point not found")

        logger.info(f"Deleted restore point: {restore_point_id}")
        return {"success": True, "message": "Restore point deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting restore point: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete restore point")


# Include the router in the main app
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Legacy Translations API", "status": "online", "api_docs": "/docs"}

# AWS Diagnostic endpoint
@app.get("/api/admin/aws-diagnostic")
async def aws_diagnostic():
    """Diagnose AWS Textract configuration"""
    result = {
        "aws_credentials_status": aws_credentials_status,
        "textract_client_initialized": textract_client is not None,
        "aws_region": os.environ.get('AWS_REGION', 'us-east-1'),
        "aws_key_id_present": bool(os.environ.get('AWS_ACCESS_KEY_ID')),
        "aws_secret_present": bool(os.environ.get('AWS_SECRET_ACCESS_KEY')),
    }

    # Try a simple test call if client is initialized
    if textract_client:
        try:
            # Create a simple test image (1x1 white pixel PNG)
            import base64
            # Minimal valid PNG (1x1 white pixel)
            test_png = base64.b64decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            )
            response = textract_client.detect_document_text(Document={'Bytes': test_png})
            result["textract_test"] = "SUCCESS"
            result["textract_response_blocks"] = len(response.get('Blocks', []))
        except Exception as e:
            result["textract_test"] = "FAILED"
            result["textract_error"] = str(e)
            result["textract_error_type"] = type(e).__name__

    return result

# ==================== SALES CONTROL ENDPOINTS ====================

class Salesperson(BaseModel):
    id: str = None
    name: str
    email: str
    phone: str = ""
    commission_type: str = "tier"  # tier, fixed, percentage
    commission_rate: float = 0  # percentage or fixed amount per partner
    base_salary: float = 0
    monthly_target: int = 10  # partners per month
    status: str = "active"  # active, inactive, pending
    hired_date: str = None
    notes: str = ""
    created_at: str = None
    # Authentication fields
    password_hash: str = None
    token: str = None
    invite_token: str = None
    invite_sent_at: str = None

class SalesGoal(BaseModel):
    id: str = None
    salesperson_id: str
    month: str  # YYYY-MM format
    target_partners: int
    target_revenue: float
    achieved_partners: int = 0
    achieved_revenue: float = 0
    bonus_earned: float = 0
    status: str = "in_progress"  # in_progress, achieved, missed
    created_at: str = None

class PartnerAcquisition(BaseModel):
    id: str = None
    salesperson_id: str
    partner_id: str
    partner_name: str
    partner_tier: str = "bronze"  # bronze, silver, gold, platinum
    acquisition_date: str = None
    commission_paid: float = 0
    commission_status: str = "pending"  # pending, approved, paid
    partner_monthly_sales: float = 0  # For percentage-based commission tracking
    notes: str = ""
    created_at: str = None
    approved_at: str = None
    paid_at: str = None

class SalespersonNotification(BaseModel):
    id: str = None
    salesperson_id: str
    type: str  # commission_approved, commission_paid, goal_achieved, welcome
    title: str
    message: str
    amount: float = 0
    read: bool = False
    created_at: str = None

class CommissionPayment(BaseModel):
    id: str = None
    salesperson_id: str
    salesperson_name: str = ""
    acquisition_ids: list = []  # List of acquisition IDs included in this payment
    total_amount: float
    payment_method: str = "bank_transfer"  # bank_transfer, paypal, check
    payment_reference: str = ""
    paid_at: str = None
    notes: str = ""
    created_at: str = None

# Get all salespeople
@app.get("/admin/salespeople")
async def get_salespeople(admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    salespeople = await db.salespeople.find().sort("created_at", -1).to_list(100)

    # Get acquisition counts for each salesperson
    for sp in salespeople:
        sp["_id"] = str(sp["_id"])
        acquisitions = await db.partner_acquisitions.count_documents({"salesperson_id": sp["id"]})
        sp["total_acquisitions"] = acquisitions

        # Get current month acquisitions
        current_month = datetime.now().strftime("%Y-%m")
        month_acquisitions = await db.partner_acquisitions.count_documents({
            "salesperson_id": sp["id"],
            "acquisition_date": {"$regex": f"^{current_month}"}
        })
        sp["month_acquisitions"] = month_acquisitions

    return salespeople

# Create salesperson
@app.post("/admin/salespeople")
async def create_salesperson(salesperson: Salesperson, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    salesperson.id = str(uuid.uuid4())[:8]
    salesperson.created_at = datetime.now(ZoneInfo("America/New_York")).isoformat()
    salesperson.hired_date = salesperson.hired_date or datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d")

    await db.salespeople.insert_one(salesperson.dict())

    return {"success": True, "salesperson": salesperson.dict()}

# Update salesperson
@app.put("/admin/salespeople/{salesperson_id}")
async def update_salesperson(salesperson_id: str, salesperson: Salesperson, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    update_data = {k: v for k, v in salesperson.dict().items() if v is not None and k != "id"}

    result = await db.salespeople.update_one(
        {"id": salesperson_id},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Salesperson not found")

    return {"success": True}

# Delete salesperson
@app.delete("/admin/salespeople/{salesperson_id}")
async def delete_salesperson(salesperson_id: str, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    result = await db.salespeople.delete_one({"id": salesperson_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salesperson not found")

    return {"success": True}

# Get sales goals
@app.get("/admin/sales-goals")
async def get_sales_goals(admin_key: str = Header(None), month: str = None):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    query = {}
    if month:
        query["month"] = month

    goals = await db.sales_goals.find(query).sort("month", -1).to_list(100)

    for goal in goals:
        goal["_id"] = str(goal["_id"])
        # Get salesperson name
        sp = await db.salespeople.find_one({"id": goal["salesperson_id"]})
        goal["salesperson_name"] = sp["name"] if sp else "Unknown"

    return goals

# Create/Update sales goal
@app.post("/admin/sales-goals")
async def create_sales_goal(goal: SalesGoal, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    # Check if goal already exists for this salesperson/month
    existing = await db.sales_goals.find_one({
        "salesperson_id": goal.salesperson_id,
        "month": goal.month
    })

    if existing:
        # Update existing goal
        await db.sales_goals.update_one(
            {"id": existing["id"]},
            {"$set": {
                "target_partners": goal.target_partners,
                "target_revenue": goal.target_revenue
            }}
        )
        return {"success": True, "updated": True}

    goal.id = str(uuid.uuid4())[:8]
    goal.created_at = datetime.now().isoformat()

    await db.sales_goals.insert_one(goal.dict())

    return {"success": True, "goal": goal.dict()}

# Get partner acquisitions
@app.get("/admin/partner-acquisitions")
async def get_partner_acquisitions(admin_key: str = Header(None), salesperson_id: str = None):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    query = {}
    if salesperson_id:
        query["salesperson_id"] = salesperson_id

    acquisitions = await db.partner_acquisitions.find(query).sort("acquisition_date", -1).to_list(200)

    for acq in acquisitions:
        acq["_id"] = str(acq["_id"])
        # Get salesperson name
        sp = await db.salespeople.find_one({"id": acq["salesperson_id"]})
        acq["salesperson_name"] = sp["name"] if sp else "Unknown"

    return acquisitions

# Record partner acquisition
@app.post("/admin/partner-acquisitions")
async def create_partner_acquisition(acquisition: PartnerAcquisition, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    acquisition.id = str(uuid.uuid4())[:8]
    acquisition.created_at = datetime.now().isoformat()
    acquisition.acquisition_date = acquisition.acquisition_date or datetime.now().strftime("%Y-%m-%d")

    # Calculate commission based on tier
    tier_commissions = {
        "bronze": 50,
        "silver": 75,
        "gold": 100,
        "platinum": 150
    }

    salesperson = await db.salespeople.find_one({"id": acquisition.salesperson_id})
    if salesperson:
        if salesperson.get("commission_type") == "fixed":
            acquisition.commission_paid = salesperson.get("commission_rate", 0)
        else:
            acquisition.commission_paid = tier_commissions.get(acquisition.partner_tier, 50)

    await db.partner_acquisitions.insert_one(acquisition.dict())

    # Update sales goal if exists for this month
    month = acquisition.acquisition_date[:7]  # YYYY-MM
    goal = await db.sales_goals.find_one({
        "salesperson_id": acquisition.salesperson_id,
        "month": month
    })

    if goal:
        await db.sales_goals.update_one(
            {"id": goal["id"]},
            {"$inc": {"achieved_partners": 1}}
        )

    return {"success": True, "acquisition": acquisition.dict()}

# Update acquisition commission status
@app.put("/admin/partner-acquisitions/{acquisition_id}/status")
async def update_acquisition_status(acquisition_id: str, status: str, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    if status not in ["pending", "approved", "paid"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.partner_acquisitions.update_one(
        {"id": acquisition_id},
        {"$set": {"commission_status": status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Acquisition not found")

    return {"success": True}

# Get sales dashboard stats
@app.get("/admin/sales-dashboard")
async def get_sales_dashboard(admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    current_month = datetime.now().strftime("%Y-%m")

    # Total salespeople
    total_salespeople = await db.salespeople.count_documents({"status": "active"})

    # Total partners acquired this month
    month_acquisitions = await db.partner_acquisitions.count_documents({
        "acquisition_date": {"$regex": f"^{current_month}"}
    })

    # Total partners acquired all time
    total_acquisitions = await db.partner_acquisitions.count_documents({})

    # Pending commissions
    pending_pipeline = [
        {"$match": {"commission_status": {"$in": ["pending", "approved"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$commission_paid"}}}
    ]
    pending_result = await db.partner_acquisitions.aggregate(pending_pipeline).to_list(1)
    pending_commissions = pending_result[0]["total"] if pending_result else 0

    # Paid commissions this month
    paid_pipeline = [
        {"$match": {
            "commission_status": "paid",
            "acquisition_date": {"$regex": f"^{current_month}"}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$commission_paid"}}}
    ]
    paid_result = await db.partner_acquisitions.aggregate(paid_pipeline).to_list(1)
    paid_commissions = paid_result[0]["total"] if paid_result else 0

    # Top performers this month
    top_performers_pipeline = [
        {"$match": {"acquisition_date": {"$regex": f"^{current_month}"}}},
        {"$group": {
            "_id": "$salesperson_id",
            "count": {"$sum": 1},
            "commission": {"$sum": "$commission_paid"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_performers = await db.partner_acquisitions.aggregate(top_performers_pipeline).to_list(5)

    # Add salesperson names to top performers
    for performer in top_performers:
        sp = await db.salespeople.find_one({"id": performer["_id"]})
        performer["name"] = sp["name"] if sp else "Unknown"
        performer["salesperson_id"] = performer.pop("_id")

    # Monthly trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_date = datetime.now() - timedelta(days=30*i)
        month_str = month_date.strftime("%Y-%m")
        count = await db.partner_acquisitions.count_documents({
            "acquisition_date": {"$regex": f"^{month_str}"}
        })
        monthly_trend.append({
            "month": month_str,
            "acquisitions": count
        })

    # Acquisitions by tier
    tier_pipeline = [
        {"$group": {
            "_id": "$partner_tier",
            "count": {"$sum": 1}
        }}
    ]
    tier_distribution = await db.partner_acquisitions.aggregate(tier_pipeline).to_list(10)
    tier_dict = {t["_id"]: t["count"] for t in tier_distribution}

    return {
        "total_salespeople": total_salespeople,
        "month_acquisitions": month_acquisitions,
        "total_acquisitions": total_acquisitions,
        "pending_commissions": pending_commissions,
        "paid_commissions": paid_commissions,
        "top_performers": top_performers,
        "monthly_trend": monthly_trend,
        "tier_distribution": {
            "bronze": tier_dict.get("bronze", 0),
            "silver": tier_dict.get("silver", 0),
            "gold": tier_dict.get("gold", 0),
            "platinum": tier_dict.get("platinum", 0)
        },
        "current_month": current_month
    }

# ==================== SALESPERSON PORTAL ENDPOINTS ====================

# Send invite to salesperson
@app.post("/admin/salespeople/{salesperson_id}/invite")
async def invite_salesperson(salesperson_id: str, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    salesperson = await db.salespeople.find_one({"id": salesperson_id})
    if not salesperson:
        raise HTTPException(status_code=404, detail="Salesperson not found")

    # Generate invite token
    invite_token = str(uuid.uuid4())

    await db.salespeople.update_one(
        {"id": salesperson_id},
        {"$set": {
            "invite_token": invite_token,
            "invite_sent_at": datetime.now().isoformat(),
            "status": "pending"
        }}
    )

    # Send invite email
    try:
        frontend_url = os.environ.get('FRONTEND_URL', 'https://portal.legacytranslations.com')
        invite_link = f"{frontend_url}/#/sales-invite?token={invite_token}"

        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 10px;">
                <h1 style="color: white; margin: 0;">🎉 Welcome to the Team!</h1>
            </div>

            <div style="padding: 30px 20px;">
                <p>Hi <strong>{salesperson['name']}</strong>,</p>

                <p>You've been invited to join <strong>Legacy Translations</strong> as a Sales Partner!</p>

                <p>As a sales partner, you'll be able to:</p>
                <ul>
                    <li>✅ Register new partners and earn commissions</li>
                    <li>📊 Track your performance and earnings</li>
                    <li>💰 View your monthly commission reports</li>
                </ul>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invite_link}" style="background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Set Up Your Account
                    </a>
                </div>

                <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
            </div>

            <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 10px;">
                <p style="margin: 0; color: #666;">Legacy Translation Services</p>
            </div>
        </div>
        """

        msg = MIMEMultipart('alternative')
        msg['Subject'] = "🎉 You're Invited to Join Legacy Translations Sales Team!"
        msg['From'] = EMAIL_USER
        msg['To'] = salesperson['email']
        msg.attach(MIMEText(email_html, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_USER, EMAIL_PASSWORD)
            smtp.send_message(msg)

        logger.info(f"Invite sent to salesperson: {salesperson['email']}")

    except Exception as e:
        logger.error(f"Error sending invite email: {str(e)}")
        # Don't fail the request, invite token is still set

    return {"success": True, "message": "Invitation sent", "invite_link": invite_link}

# Salesperson set password (from invite)
@app.post("/salesperson/set-password")
async def salesperson_set_password(invite_token: str = Form(...), password: str = Form(...)):
    salesperson = await db.salespeople.find_one({"invite_token": invite_token})
    if not salesperson:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    # Check if invite is expired (7 days)
    if salesperson.get("invite_sent_at"):
        invite_date = datetime.fromisoformat(salesperson["invite_sent_at"])
        if datetime.now() - invite_date > timedelta(days=7):
            raise HTTPException(status_code=400, detail="Invite token has expired")

    # Set password and activate
    token = str(uuid.uuid4())
    await db.salespeople.update_one(
        {"id": salesperson["id"]},
        {"$set": {
            "password_hash": hash_password(password),
            "token": token,
            "status": "active",
            "invite_token": None
        }}
    )

    return {"success": True, "token": token, "salesperson": {
        "id": salesperson["id"],
        "name": salesperson["name"],
        "email": salesperson["email"]
    }}

# Salesperson login
@app.post("/salesperson/login")
async def salesperson_login(email: str = Form(...), password: str = Form(...)):
    salesperson = await db.salespeople.find_one({"email": email.lower().strip()})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not salesperson.get("password_hash"):
        raise HTTPException(status_code=401, detail="Account not set up. Please use your invite link.")

    if not verify_password(password, salesperson["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if salesperson.get("status") != "active":
        raise HTTPException(status_code=401, detail="Account is not active")

    # Generate new token
    token = str(uuid.uuid4())
    await db.salespeople.update_one(
        {"id": salesperson["id"]},
        {"$set": {"token": token}}
    )

    return {
        "success": True,
        "token": token,
        "salesperson": {
            "id": salesperson["id"],
            "name": salesperson["name"],
            "email": salesperson["email"],
            "commission_type": salesperson.get("commission_type", "tier"),
            "monthly_target": salesperson.get("monthly_target", 10)
        }
    }

# Get salesperson dashboard (for salesperson portal)
@app.get("/salesperson/dashboard")
async def get_salesperson_dashboard(token: str = Header(None, alias="salesperson-token")):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    salesperson = await db.salespeople.find_one({"token": token})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid token")

    current_month = datetime.now().strftime("%Y-%m")

    # My acquisitions this month
    month_acquisitions = await db.partner_acquisitions.find({
        "salesperson_id": salesperson["id"],
        "acquisition_date": {"$regex": f"^{current_month}"}
    }).to_list(100)

    # Total acquisitions
    total_acquisitions = await db.partner_acquisitions.count_documents({
        "salesperson_id": salesperson["id"]
    })

    # Pending commissions (my acquisitions not yet paid)
    pending_pipeline = [
        {"$match": {
            "salesperson_id": salesperson["id"],
            "commission_status": {"$in": ["pending", "approved"]}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$commission_paid"}}}
    ]
    pending_result = await db.partner_acquisitions.aggregate(pending_pipeline).to_list(1)
    pending_commission = pending_result[0]["total"] if pending_result else 0

    # Paid commissions all time
    paid_pipeline = [
        {"$match": {
            "salesperson_id": salesperson["id"],
            "commission_status": "paid"
        }},
        {"$group": {"_id": None, "total": {"$sum": "$commission_paid"}}}
    ]
    paid_result = await db.partner_acquisitions.aggregate(paid_pipeline).to_list(1)
    total_paid = paid_result[0]["total"] if paid_result else 0

    # Monthly breakdown (last 6 months)
    monthly_breakdown = []
    for i in range(5, -1, -1):
        month_date = datetime.now() - timedelta(days=30*i)
        month_str = month_date.strftime("%Y-%m")

        month_pipeline = [
            {"$match": {
                "salesperson_id": salesperson["id"],
                "acquisition_date": {"$regex": f"^{month_str}"}
            }},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "commission": {"$sum": "$commission_paid"}
            }}
        ]
        result = await db.partner_acquisitions.aggregate(month_pipeline).to_list(1)

        monthly_breakdown.append({
            "month": month_str,
            "acquisitions": result[0]["count"] if result else 0,
            "commission": result[0]["commission"] if result else 0
        })

    # My recent acquisitions
    recent_acquisitions = await db.partner_acquisitions.find({
        "salesperson_id": salesperson["id"]
    }).sort("acquisition_date", -1).limit(10).to_list(10)

    for acq in recent_acquisitions:
        acq["_id"] = str(acq["_id"])

    # Current goal
    current_goal = await db.sales_goals.find_one({
        "salesperson_id": salesperson["id"],
        "month": current_month
    })

    return {
        "salesperson": {
            "id": salesperson["id"],
            "name": salesperson["name"],
            "email": salesperson["email"],
            "commission_type": salesperson.get("commission_type", "tier"),
            "monthly_target": salesperson.get("monthly_target", 10),
            "base_salary": salesperson.get("base_salary", 0)
        },
        "stats": {
            "month_acquisitions": len(month_acquisitions),
            "total_acquisitions": total_acquisitions,
            "pending_commission": pending_commission,
            "total_paid": total_paid,
            "current_month": current_month
        },
        "monthly_breakdown": monthly_breakdown,
        "recent_acquisitions": recent_acquisitions,
        "current_goal": {
            "target": current_goal["target_partners"] if current_goal else salesperson.get("monthly_target", 10),
            "achieved": current_goal["achieved_partners"] if current_goal else len(month_acquisitions)
        }
    }

# Salesperson register a new partner
@app.post("/salesperson/register-partner")
async def salesperson_register_partner(
    token: str = Header(None, alias="salesperson-token"),
    company_name: str = Form(...),
    contact_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    partner_tier: str = Form("bronze"),
    notes: str = Form("")
):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    salesperson = await db.salespeople.find_one({"token": token})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Check if partner already exists
    existing = await db.partners.find_one({"email": email.lower().strip()})
    if existing:
        raise HTTPException(status_code=400, detail="A partner with this email already exists")

    # Create partner
    partner_id = str(uuid.uuid4())[:8]
    temp_password = str(uuid.uuid4())[:8]  # Temporary password

    partner = Partner(
        id=partner_id,
        company_name=company_name,
        contact_name=contact_name,
        email=email.lower().strip(),
        phone=phone,
        password_hash=hash_password(temp_password),
        referred_by=salesperson["id"]
    )

    await db.partners.insert_one(partner.dict())

    # Record acquisition
    tier_commissions = {
        "bronze": 50,
        "silver": 75,
        "gold": 100,
        "platinum": 150
    }

    acquisition = PartnerAcquisition(
        id=str(uuid.uuid4())[:8],
        salesperson_id=salesperson["id"],
        partner_id=partner_id,
        partner_name=company_name,
        partner_tier=partner_tier,
        acquisition_date=datetime.now().strftime("%Y-%m-%d"),
        commission_paid=tier_commissions.get(partner_tier, 50),
        commission_status="pending",
        notes=notes,
        created_at=datetime.now().isoformat()
    )

    await db.partner_acquisitions.insert_one(acquisition.dict())

    # Update sales goal if exists
    current_month = datetime.now().strftime("%Y-%m")
    goal = await db.sales_goals.find_one({
        "salesperson_id": salesperson["id"],
        "month": current_month
    })
    if goal:
        await db.sales_goals.update_one(
            {"id": goal["id"]},
            {"$inc": {"achieved_partners": 1}}
        )

        # Check if goal was just achieved - send notification
        updated_goal = await db.sales_goals.find_one({"id": goal["id"]})
        if updated_goal and updated_goal["achieved_partners"] == updated_goal["target_partners"]:
            # Goal just achieved! Create notification
            goal_notification = {
                "id": str(uuid.uuid4())[:8],
                "salesperson_id": salesperson["id"],
                "type": "goal_achieved",
                "title": "🏆 Meta Atingida! / Goal Achieved!",
                "message": f"Parabéns! Você atingiu sua meta de {updated_goal['target_partners']} parceiros este mês! / Congratulations! You reached your goal of {updated_goal['target_partners']} partners this month!",
                "amount": 100,  # Bonus amount
                "read": False,
                "created_at": datetime.now().isoformat()
            }
            await db.salesperson_notifications.insert_one(goal_notification)

            # Update goal status
            await db.sales_goals.update_one(
                {"id": goal["id"]},
                {"$set": {"status": "achieved", "bonus_earned": 100}}
            )

    # Send welcome email to new partner with credentials
    try:
        frontend_url = os.environ.get('FRONTEND_URL', 'https://portal.legacytranslations.com')
        login_link = f"{frontend_url}/#/partner"

        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 10px;">
                <h1 style="color: white; margin: 0;">Welcome to Legacy Translations!</h1>
            </div>

            <div style="padding: 30px 20px;">
                <p>Hi <strong>{contact_name}</strong>,</p>

                <p>Your partner account has been created by {salesperson['name']}!</p>

                <p>Here are your login credentials:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Temporary Password:</strong> {temp_password}</p>
                </div>

                <p>Please change your password after your first login.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_link}" style="background: linear-gradient(135deg, #2563EB, #7C3AED); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Access Partner Portal
                    </a>
                </div>

                <p>As a <strong>{partner_tier.upper()}</strong> partner, you'll enjoy exclusive discounts on all translation services!</p>
            </div>
        </div>
        """

        msg = MIMEMultipart('alternative')
        msg['Subject'] = "🎉 Welcome to Legacy Translations Partner Program!"
        msg['From'] = EMAIL_USER
        msg['To'] = email
        msg.attach(MIMEText(email_html, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_USER, EMAIL_PASSWORD)
            smtp.send_message(msg)

    except Exception as e:
        logger.error(f"Error sending partner welcome email: {str(e)}")

    return {
        "success": True,
        "partner": {
            "id": partner_id,
            "company_name": company_name,
            "email": email
        },
        "acquisition": {
            "tier": partner_tier,
            "commission": tier_commissions.get(partner_tier, 50)
        }
    }

# Get commission structure explanation
@app.get("/salesperson/commission-info")
async def get_commission_info(token: str = Header(None, alias="salesperson-token")):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    salesperson = await db.salespeople.find_one({"token": token})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid token")

    commission_type = salesperson.get("commission_type", "tier")
    commission_rate = salesperson.get("commission_rate", 0)

    return {
        "commission_type": commission_type,
        "commission_rate": commission_rate,
        "tier_commissions": {
            "bronze": {"pages": "1-50/month", "discount": "10%", "commission": 50},
            "silver": {"pages": "51-150/month", "discount": "15%", "commission": 75},
            "gold": {"pages": "151-300/month", "discount": "25%", "commission": 100},
            "platinum": {"pages": "300+/month", "discount": "35%", "commission": 150}
        },
        "percentage_commission": {
            "description": "Percentual sobre as vendas geradas pelo parceiro",
            "rate": f"{commission_rate}%" if commission_type == "percentage" else "N/A",
            "example": f"Se o parceiro gastar $500/mês, sua comissão será ${500 * commission_rate / 100:.2f}" if commission_type == "percentage" else "N/A"
        },
        "payment_info": {
            "method": "Zelle / ACH Transfer",
            "schedule": "Semanal (Sextas) para novos parceiros, Mensal (dia 15) para recorrentes",
            "minimum_payout": 50
        },
        "bonuses": {
            "retention_bonus": "$25 extra se o parceiro permanecer 3+ meses ativo",
            "platinum_bonus": "$50 extra por assinar parceiros Platinum",
            "monthly_target_bonus": f"$100 bônus por atingir {salesperson.get('monthly_target', 10)} parceiros/mês"
        }
    }

# Salesperson notifications
@app.get("/salesperson/notifications")
async def get_salesperson_notifications(token: str = Header(None, alias="salesperson-token")):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    salesperson = await db.salespeople.find_one({"token": token})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid token")

    notifications = await db.salesperson_notifications.find(
        {"salesperson_id": salesperson["id"]}
    ).sort("created_at", -1).to_list(50)

    for n in notifications:
        n["_id"] = str(n["_id"])

    return {"notifications": notifications}

@app.put("/salesperson/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, token: str = Header(None, alias="salesperson-token")):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    salesperson = await db.salespeople.find_one({"token": token})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid token")

    await db.salesperson_notifications.update_one(
        {"id": notification_id, "salesperson_id": salesperson["id"]},
        {"$set": {"read": True}}
    )

    return {"success": True}

@app.put("/salesperson/notifications/read-all")
async def mark_all_notifications_read(token: str = Header(None, alias="salesperson-token")):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    salesperson = await db.salespeople.find_one({"token": token})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid token")

    await db.salesperson_notifications.update_many(
        {"salesperson_id": salesperson["id"]},
        {"$set": {"read": True}}
    )

    return {"success": True}

# Salesperson payment history
@app.get("/salesperson/payment-history")
async def get_payment_history(token: str = Header(None, alias="salesperson-token")):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    salesperson = await db.salespeople.find_one({"token": token})
    if not salesperson:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get all payments for this salesperson
    payments = await db.commission_payments.find(
        {"salesperson_id": salesperson["id"]}
    ).sort("paid_at", -1).to_list(100)

    for p in payments:
        p["_id"] = str(p["_id"])

    # Get paid acquisitions with details
    paid_acquisitions = await db.partner_acquisitions.find(
        {"salesperson_id": salesperson["id"], "commission_status": "paid"}
    ).sort("paid_at", -1).to_list(100)

    for a in paid_acquisitions:
        a["_id"] = str(a["_id"])

    return {
        "payments": payments,
        "paid_acquisitions": paid_acquisitions,
        "total_paid": sum(p.get("total_amount", 0) for p in payments)
    }

# Admin: Approve commission
@app.put("/admin/acquisitions/{acquisition_id}/approve")
async def approve_acquisition(acquisition_id: str, admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    acquisition = await db.partner_acquisitions.find_one({"id": acquisition_id})
    if not acquisition:
        raise HTTPException(status_code=404, detail="Acquisition not found")

    await db.partner_acquisitions.update_one(
        {"id": acquisition_id},
        {"$set": {
            "commission_status": "approved",
            "approved_at": datetime.now().isoformat()
        }}
    )

    # Create notification for salesperson
    notification = SalespersonNotification(
        id=str(uuid.uuid4())[:8],
        salesperson_id=acquisition["salesperson_id"],
        type="commission_approved",
        title="Comissão Aprovada!",
        message=f"Sua comissão de ${acquisition['commission_paid']} pelo parceiro {acquisition['partner_name']} foi aprovada.",
        amount=acquisition["commission_paid"],
        created_at=datetime.now().isoformat()
    )
    await db.salesperson_notifications.insert_one(notification.dict())

    return {"success": True}

# Admin: Process payment for multiple acquisitions
@app.post("/admin/commission-payments")
async def create_commission_payment(
    salesperson_id: str = Form(...),
    acquisition_ids: str = Form(...),  # Comma-separated IDs
    payment_method: str = Form("bank_transfer"),
    payment_reference: str = Form(""),
    notes: str = Form(""),
    admin_key: str = Header(None)
):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    salesperson = await db.salespeople.find_one({"id": salesperson_id})
    if not salesperson:
        raise HTTPException(status_code=404, detail="Salesperson not found")

    # Parse acquisition IDs
    acq_ids = [aid.strip() for aid in acquisition_ids.split(",") if aid.strip()]

    # Update all acquisitions to paid
    total_amount = 0
    for acq_id in acq_ids:
        acquisition = await db.partner_acquisitions.find_one({"id": acq_id})
        if acquisition:
            total_amount += acquisition.get("commission_paid", 0)
            await db.partner_acquisitions.update_one(
                {"id": acq_id},
                {"$set": {
                    "commission_status": "paid",
                    "paid_at": datetime.now().isoformat()
                }}
            )

    # Create payment record
    payment = CommissionPayment(
        id=str(uuid.uuid4())[:8],
        salesperson_id=salesperson_id,
        salesperson_name=salesperson["name"],
        acquisition_ids=acq_ids,
        total_amount=total_amount,
        payment_method=payment_method,
        payment_reference=payment_reference,
        paid_at=datetime.now().isoformat(),
        notes=notes,
        created_at=datetime.now().isoformat()
    )
    await db.commission_payments.insert_one(payment.dict())

    # Create notification
    notification = SalespersonNotification(
        id=str(uuid.uuid4())[:8],
        salesperson_id=salesperson_id,
        type="commission_paid",
        title="Pagamento Recebido!",
        message=f"Você recebeu ${total_amount:.2f} via {payment_method}. Ref: {payment_reference}",
        amount=total_amount,
        created_at=datetime.now().isoformat()
    )
    await db.salesperson_notifications.insert_one(notification.dict())

    return {"success": True, "payment": payment.dict()}

# Admin: Get salesperson ranking
@app.get("/admin/salesperson-ranking")
async def get_salesperson_ranking(admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    salespeople = await db.salespeople.find({"status": "active"}).to_list(100)

    current_month = datetime.now().strftime("%Y-%m")
    rankings = []

    for sp in salespeople:
        # Count this month's acquisitions
        month_acquisitions = await db.partner_acquisitions.count_documents({
            "salesperson_id": sp["id"],
            "acquisition_date": {"$regex": f"^{current_month}"}
        })

        # Total acquisitions
        total_acquisitions = await db.partner_acquisitions.count_documents({
            "salesperson_id": sp["id"]
        })

        # Total commissions earned
        acquisitions = await db.partner_acquisitions.find({
            "salesperson_id": sp["id"],
            "commission_status": "paid"
        }).to_list(1000)
        total_earned = sum(a.get("commission_paid", 0) for a in acquisitions)

        # Pending commissions
        pending_acq = await db.partner_acquisitions.find({
            "salesperson_id": sp["id"],
            "commission_status": {"$in": ["pending", "approved"]}
        }).to_list(1000)
        pending_amount = sum(a.get("commission_paid", 0) for a in pending_acq)

        rankings.append({
            "id": sp["id"],
            "name": sp["name"],
            "email": sp["email"],
            "month_acquisitions": month_acquisitions,
            "total_acquisitions": total_acquisitions,
            "monthly_target": sp.get("monthly_target", 10),
            "target_progress": round((month_acquisitions / sp.get("monthly_target", 10)) * 100, 1),
            "total_earned": total_earned,
            "pending_amount": pending_amount,
            "commission_type": sp.get("commission_type", "tier")
        })

    # Sort by month_acquisitions (descending)
    rankings.sort(key=lambda x: x["month_acquisitions"], reverse=True)

    # Add rank positions
    for i, r in enumerate(rankings):
        r["rank"] = i + 1

    return {
        "month": current_month,
        "rankings": rankings
    }

# Admin: Get pending commissions for payment
@app.get("/admin/pending-commissions")
async def get_pending_commissions(admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    # Get all approved acquisitions (ready for payment)
    acquisitions = await db.partner_acquisitions.find({
        "commission_status": "approved"
    }).sort("acquisition_date", -1).to_list(500)

    # Group by salesperson
    by_salesperson = {}
    for acq in acquisitions:
        sp_id = acq["salesperson_id"]
        if sp_id not in by_salesperson:
            sp = await db.salespeople.find_one({"id": sp_id})
            by_salesperson[sp_id] = {
                "salesperson_id": sp_id,
                "salesperson_name": sp["name"] if sp else "Unknown",
                "salesperson_email": sp["email"] if sp else "",
                "acquisitions": [],
                "total_amount": 0
            }
        acq["_id"] = str(acq["_id"])
        by_salesperson[sp_id]["acquisitions"].append(acq)
        by_salesperson[sp_id]["total_amount"] += acq.get("commission_paid", 0)

    return {"pending_by_salesperson": list(by_salesperson.values())}

# Admin: Get payment history
@app.get("/admin/payment-history")
async def get_admin_payment_history(admin_key: str = Header(None)):
    if not admin_key:
        raise HTTPException(status_code=401, detail="Admin key required")

    payments = await db.commission_payments.find().sort("paid_at", -1).to_list(200)

    for p in payments:
        p["_id"] = str(p["_id"])

    total_paid = sum(p.get("total_amount", 0) for p in payments)

    return {
        "payments": payments,
        "total_paid": total_paid
    }

@app.on_event("startup")
async def create_default_partner():
    """Create default partner from environment variables if set"""
    default_email = os.environ.get('DEFAULT_PARTNER_EMAIL')
    default_password = os.environ.get('DEFAULT_PARTNER_PASSWORD')

    if default_email and default_password:
        try:
            # Check if partner already exists
            existing = await db.partners.find_one({"email": default_email})
            if not existing:
                partner = Partner(
                    company_name=os.environ.get('DEFAULT_PARTNER_COMPANY', 'Default Partner'),
                    email=default_email,
                    password_hash=hash_password(default_password),
                    contact_name=os.environ.get('DEFAULT_PARTNER_NAME', 'Admin'),
                    phone=os.environ.get('DEFAULT_PARTNER_PHONE', '')
                )
                await db.partners.insert_one(partner.dict())
                logger.info(f"Default partner created: {default_email}")
            else:
                logger.info(f"Default partner already exists: {default_email}")
        except Exception as e:
            logger.error(f"Error creating default partner: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()