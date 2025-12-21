from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException, Request, BackgroundTasks, Depends
from fastapi.responses import JSONResponse, HTMLResponse
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure Stripe
stripe.api_key = "sk_test_51KNwnnCZYqv7a95ovlRcZyuZtQNhfB8UgpGGjYaAxOgWgNa4V4D34m5M4hhURTK68GazMTmkJzy5V7jhC9Xya7RJ00305uur7C"

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize AWS Textract client (if credentials are available)
textract_client = None
try:
    if os.environ.get('AWS_ACCESS_KEY_ID') and os.environ.get('AWS_SECRET_ACCESS_KEY'):
        textract_client = boto3.client(
            'textract',
            region_name=os.environ.get('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )
        logger.info("AWS Textract initialized successfully")
    else:
        logger.info("AWS credentials not found, using Tesseract OCR as fallback")
except Exception as e:
    logger.warning(f"Failed to initialize AWS Textract: {e}, using Tesseract as fallback")

# Email Service Class
class EmailDeliveryError(Exception):
    pass

class EmailService:
    def __init__(self):
        self.api_key = os.environ.get('RESEND_API_KEY') or os.environ.get('SENDGRID_API_KEY')
        self.sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
        # Initialize Resend
        resend.api_key = self.api_key

    async def send_email(self, to: str, subject: str, content: str, content_type: str = "html"):
        """Send email via Resend"""
        try:
            params = {
                "from": self.sender_email,
                "to": [to],
                "subject": subject,
            }
            if content_type == "html":
                params["html"] = content
            else:
                params["text"] = content

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
                "html": content,
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

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); border-radius: 8px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #1a2a4a; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
                                            💰 Total: ${order_details.get('total_price', 0):.2f}
                                        </p>
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

def get_translator_assignment_email_template(translator_name: str, order_details: dict, accept_url: str, decline_url: str) -> str:
    """Generate email template for translator assignment with accept/decline buttons"""
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
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0; width: 40%;"><strong>Order Number:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('order_number', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Client:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('client_name', 'N/A')}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Languages:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('translate_from', 'N/A').title()} → {order_details.get('translate_to', 'N/A').title()}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-size: 14px; padding: 5px 0;"><strong>Word Count:</strong></td>
                                                <td style="color: #1a2a4a; font-size: 14px; padding: 5px 0;">{order_details.get('word_count', 0)} words</td>
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
    total_price: float
    estimated_delivery: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TranslationQuoteCreate(BaseModel):
    reference: str
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"

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

class EmailNotificationRequest(BaseModel):
    quote_id: str
    partner_email: EmailStr
    send_to_company: bool = True

# Partner Models
class Partner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    email: EmailStr
    password_hash: str
    contact_name: str
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PartnerCreate(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    contact_name: str
    phone: Optional[str] = None

class PartnerLogin(BaseModel):
    email: EmailStr
    password: str

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

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # 'admin', 'pm', 'translator'

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

class AdminUserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool

# Translation Order Models (with invoice tracking)
class TranslationOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}")
    partner_id: str
    partner_company: str
    # Client info (end customer)
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
    deadline: Optional[datetime] = None  # Translation deadline
    internal_notes: Optional[str] = None  # Notes visible only to admin/PM
    revenue_source: str = "website"  # website, whatsapp, social_media, referral, partner, other
    payment_method: Optional[str] = None  # credit_card, debit, paypal, zelle, venmo, pix, apple_pay, bank_transfer

class TranslationOrderCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    service_type: str
    translate_from: str
    translate_to: str
    word_count: int
    urgency: str = "no"
    reference: Optional[str] = None
    notes: Optional[str] = None
    document_filename: Optional[str] = None
    document_ids: Optional[List[str]] = None  # IDs of uploaded documents

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
    deadline: Optional[datetime] = None
    internal_notes: Optional[str] = None
    revenue_source: Optional[str] = None  # website, whatsapp, social_media, referral, partner, other

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
    # Files (base64)
    document_data: Optional[str] = None
    document_filename: Optional[str] = None

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
    """Get current partner from token"""
    if not token or token not in active_tokens:
        return None
    partner_id = active_tokens[token]
    partner = await db.partners.find_one({"id": partner_id})
    return partner

async def get_current_admin_user(token: str = None) -> Optional[dict]:
    """Get current admin user from token"""
    if not token or token not in active_admin_tokens:
        return None
    user_info = active_admin_tokens[token]
    user = await db.admin_users.find_one({"id": user_info["user_id"]})
    return user

def require_admin_role(allowed_roles: List[str]):
    """Decorator helper to check if user has required role"""
    async def check_role(token: str) -> dict:
        if not token or token not in active_admin_tokens:
            raise HTTPException(status_code=401, detail="Not authenticated")
        user_info = active_admin_tokens[token]
        if user_info["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        user = await db.admin_users.find_one({"id": user_info["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
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

def extract_text_with_textract(content: bytes, file_extension: str) -> str:
    """Extract text using AWS Textract (best quality OCR)"""
    if not textract_client:
        return None

    try:
        # For images, use detect_document_text directly
        if file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            response = textract_client.detect_document_text(
                Document={'Bytes': content}
            )

            # Extract text from response
            text_parts = []
            for block in response.get('Blocks', []):
                if block['BlockType'] == 'LINE':
                    text_parts.append(block['Text'])

            text = '\n'.join(text_parts)
            logger.info(f"AWS Textract extracted {len(text)} characters from image")
            return text

        # For PDFs, convert pages to images first
        elif file_extension == 'pdf':
            text = ""
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

                    # Send to Textract
                    response = textract_client.detect_document_text(
                        Document={'Bytes': img_data}
                    )

                    # Extract text from response
                    for block in response.get('Blocks', []):
                        if block['BlockType'] == 'LINE':
                            text += block['Text'] + '\n'

                    text += '\n'  # Page separator

                num_pages = pdf_document.page_count
                pdf_document.close()
                logger.info(f"AWS Textract extracted {len(text)} characters from PDF ({num_pages} pages)")
                return text

            except Exception as e:
                logger.warning(f"Textract PDF processing failed: {e}")
                return None

    except ClientError as e:
        logger.warning(f"AWS Textract error: {e}")
        return None
    except Exception as e:
        logger.warning(f"Textract extraction failed: {e}")
        return None

    return None


async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text from uploaded file using AWS Textract (primary) or Tesseract (fallback)"""
    content = await file.read()
    file_extension = file.filename.split('.')[-1].lower()

    try:
        # For images - try Textract first, then Tesseract
        if file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'gif']:
            # Try AWS Textract first (best quality)
            if textract_client:
                logger.info("Using AWS Textract for image OCR...")
                text = extract_text_with_textract(content, file_extension)
                if text and len(text.strip()) > 10:
                    return text
                logger.info("Textract returned insufficient text, trying Tesseract...")

            # Fallback to Tesseract
            try:
                image = Image.open(io.BytesIO(content))
                if image.mode != 'RGB':
                    image = image.convert('RGB')

                from PIL import ImageEnhance, ImageFilter
                enhancer = ImageEnhance.Contrast(image)
                image = enhancer.enhance(2.0)
                image = image.filter(ImageFilter.SHARPEN)

                width, height = image.size
                if width < 1000 or height < 1000:
                    scale_factor = max(1000/width, 1000/height)
                    new_width = int(width * scale_factor)
                    new_height = int(height * scale_factor)
                    image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

                text = pytesseract.image_to_string(image, config=r'--oem 3 --psm 6')
                logger.info(f"Tesseract extracted {len(text)} characters from image")
                return text

            except Exception as e:
                logger.error(f"Image OCR failed: {str(e)}")
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

            # Method 4: Fallback to Tesseract OCR
            logger.info("Using Tesseract OCR for image-based PDF...")
            try:
                pdf_document = fitz.open(stream=content, filetype="pdf")

                for page_num in range(min(pdf_document.page_count, 10)):
                    page = pdf_document[page_num]
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img_data = pix.tobytes("png")

                    image = Image.open(io.BytesIO(img_data))
                    page_text = pytesseract.image_to_string(image, config=r'--oem 3 --psm 6')

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
        base_price, urgency_fee, total_price = calculate_price(
            quote_data.word_count, 
            quote_data.service_type, 
            quote_data.urgency
        )
        
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
            total_price=total_price,
            estimated_delivery=estimated_delivery
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
        
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
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
            mode='payment',
            success_url=f"{request.origin_url}?payment_success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{request.origin_url}?payment_cancelled=true",
            metadata={
                'quote_id': request.quote_id,
                'transaction_id': transaction.id
            }
        )
        
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
    """Handle Stripe webhooks"""
    
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # For now, we'll skip webhook verification in test mode
        # In production, you should verify the webhook signature
        
        event = stripe.Event.construct_from(
            json.loads(payload.decode('utf-8')), stripe.api_key
        )
        
        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            session_id = session['id']
            
            # Update payment status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "status": "completed",
                        "payment_status": "paid",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Get transaction and handle success
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                await handle_successful_payment(session_id, transaction)
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=400, detail="Webhook error")

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

# ==================== PARTNER AUTHENTICATION ====================

@api_router.post("/auth/register")
async def register_partner(partner_data: PartnerCreate):
    """Register a new partner"""
    try:
        # Check if email already exists
        existing = await db.partners.find_one({"email": partner_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create partner
        partner = Partner(
            company_name=partner_data.company_name,
            email=partner_data.email,
            password_hash=hash_password(partner_data.password),
            contact_name=partner_data.contact_name,
            phone=partner_data.phone
        )

        await db.partners.insert_one(partner.dict())

        # Generate token
        token = generate_token()
        active_tokens[token] = partner.id

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

        # Generate token
        token = generate_token()
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
    """Register a new admin user (only admin can create users)"""
    # Verify admin key OR valid admin token
    is_valid = False

    # Check if it's the master admin key
    if admin_key == os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        is_valid = True
    else:
        # Check if it's a valid admin token
        admin_user = await db.admin_users.find_one({"token": admin_key, "role": "admin", "is_active": True})
        if admin_user:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Validate role
    valid_roles = ['admin', 'pm', 'translator', 'sales']
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be: {', '.join(valid_roles)}")

    try:
        # Check if email already exists
        existing = await db.admin_users.find_one({"email": user_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user
        user = AdminUser(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            name=user_data.name,
            role=user_data.role
        )

        await db.admin_users.insert_one(user.dict())
        logger.info(f"Admin user created: {user.email} with role {user.role}")

        return {"status": "success", "message": f"User {user.name} created with role {user.role}", "user_id": user.id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@api_router.post("/admin/auth/login")
async def login_admin_user(login_data: AdminUserLogin):
    """Login admin user and return token with role"""
    try:
        # Find user by email
        user = await db.admin_users.find_one({"email": login_data.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Check if active
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")

        # Generate token
        token = generate_token()
        active_admin_tokens[token] = {"user_id": user["id"], "role": user["role"]}

        return AdminUserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            is_active=user.get("is_active", True),
            token=token,
            pages_translated=user.get("pages_translated", 0),
            pages_pending_payment=user.get("pages_pending_payment", 0)
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
    """List all admin users (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        users = await db.admin_users.find().to_list(100)
        return [AdminUserPublic(
            id=u["id"],
            email=u["email"],
            name=u["name"],
            role=u["role"],
            is_active=u.get("is_active", True)
        ) for u in users]
    except Exception as e:
        logger.error(f"Error listing admin users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list users")

@api_router.put("/admin/users/{user_id}/toggle-active")
async def toggle_admin_user_active(user_id: str, admin_key: str):
    """Toggle admin user active status (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
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

@api_router.delete("/admin/users/{user_id}")
async def delete_admin_user(user_id: str, admin_key: str):
    """Delete admin user (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
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

        # Create order
        order = TranslationOrder(
            partner_id=partner["id"],
            partner_company=partner["company_name"],
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
            document_filename=order_data.document_filename
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

        return {
            "status": "success",
            "order": order.dict(),
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
async def admin_get_all_orders(admin_key: str):
    """Get all orders (admin only)"""
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

    orders = await db.translation_orders.find().sort("created_at", -1).to_list(500)

    for order in orders:
        if '_id' in order:
            del order['_id']

    # Calculate summary
    total_pending = sum(1 for o in orders if o.get("payment_status") == "pending")
    total_paid = sum(1 for o in orders if o.get("payment_status") == "paid")
    total_overdue = sum(1 for o in orders if o.get("payment_status") == "overdue")
    total_value = sum(o.get("total_price", 0) for o in orders)
    pending_value = sum(o.get("total_price", 0) for o in orders if o.get("payment_status") == "pending")

    return {
        "orders": orders,
        "summary": {
            "total_orders": len(orders),
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
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
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
    """Create a new project manually (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    try:
        # Generate order number
        order_number = f"P{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:4].upper()}"

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

        # Parse deadline if provided
        deadline = None
        if project_data.deadline:
            try:
                deadline = datetime.fromisoformat(project_data.deadline.replace('Z', '+00:00'))
            except:
                pass

        # Calculate price if not provided
        base_price = project_data.base_price or 0.0
        urgency_fee = project_data.urgency_fee or 0.0
        total_price = project_data.total_price or (base_price + urgency_fee)

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
            payment_status="pending",
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
            payment_method=project_data.payment_method
        )

        await db.translation_orders.insert_one(order.dict())
        logger.info(f"Manual order created: {order.order_number}")

        # If document data provided, save it
        if project_data.document_data and project_data.document_filename:
            doc_record = {
                "id": str(uuid.uuid4()),
                "order_id": order.id,
                "filename": project_data.document_filename,
                "data": project_data.document_data,
                "uploaded_at": datetime.utcnow()
            }
            await db.order_documents.insert_one(doc_record)

        return {
            "status": "success",
            "message": f"Project {order.order_number} created successfully",
            "order": order.dict()
        }

    except Exception as e:
        logger.error(f"Error creating manual order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@api_router.get("/admin/users/by-role/{role}")
async def get_users_by_role(role: str, admin_key: str):
    """Get users by role (for dropdown selectors)"""
    # Validate admin key or user token
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    try:
        users = await db.admin_users.find({"role": role, "is_active": True}).to_list(100)
        return [{"id": u["id"], "name": u["name"], "email": u["email"]} for u in users]
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
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
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
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
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
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
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

    result = await db.translator_payments.update_one(
        {"id": payment_id},
        {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Get updated payment
    payment = await db.translator_payments.find_one({"id": payment_id})
    if '_id' in payment:
        del payment['_id']

    # Notify translator if marked as paid
    if update_data.status == "paid":
        await create_notification(
            user_id=payment["translator_id"],
            notif_type="payment_completed",
            title="Pagamento Confirmado",
            message=f"Seu pagamento de ${payment['total_amount']:.2f} foi confirmado."
        )

    return {"status": "success", "payment": payment}

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

    result = await db.expenses.update_one({"id": expense_id}, {"$set": update_dict})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense = await db.expenses.find_one({"id": expense_id})
    if '_id' in expense:
        del expense['_id']

    return {"status": "success", "expense": expense}

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

    # Get revenue (paid orders)
    orders = await db.orders.find({
        "payment_status": "paid",
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)

    total_revenue = sum(o.get("total_price", 0) for o in orders)

    # Revenue by source
    revenue_by_source = {}
    for source in REVENUE_SOURCES.keys():
        source_orders = [o for o in orders if o.get("revenue_source", "website") == source]
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
    all_orders = await db.orders.find({
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

    prev_orders = await db.orders.find({
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
                        if translator.get("email"):
                            try:
                                # Build accept/decline URLs
                                base_url = os.environ.get("API_BASE_URL", "https://legacy-portal.onrender.com")
                                accept_url = f"{base_url}/api/translator/assignment/{assignment_token}/accept"
                                decline_url = f"{base_url}/api/translator/assignment/{assignment_token}/decline"

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
        if update_data.internal_notes is not None:
            update_dict["internal_notes"] = update_data.internal_notes

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
    """Mark order as paid (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.translation_orders.update_one(
        {"id": order_id},
        {"$set": {"payment_status": "paid", "payment_date": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

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

class TranslationData(BaseModel):
    translation_html: str
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

@api_router.post("/admin/orders/{order_id}/translation")
async def admin_save_translation(order_id: str, data: TranslationData, admin_key: str):
    """Save translation from workspace to an order (admin only)"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    # Find the order
    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Update order with translation data
    await db.translation_orders.update_one(
        {"id": order_id},
        {"$set": {
            "translation_html": data.translation_html,
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
            "translation_status": "review",  # Move to review status
            "translation_ready": True,
            "translation_ready_at": datetime.utcnow().isoformat()
        }}
    )

    logger.info(f"Translation saved for order {order_id}, moved to review status")
    return {"success": True, "message": "Translation saved and sent to review"}

@api_router.post("/admin/orders/{order_id}/deliver")
async def admin_deliver_order(order_id: str, admin_key: str):
    """Mark order as delivered and send translation to client (admin/PM only)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

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

    # Send emails
    try:
        # Check if translated file exists
        has_attachment = order.get("translated_file") and order.get("translated_filename")

        # Use professional email template
        email_html = get_delivery_email_template(order['client_name'])

        if has_attachment:
            # Send to client WITH attachment
            await email_service.send_email_with_attachment(
                order["client_email"],
                f"Your Translation is Ready - {order['order_number']}",
                email_html,
                order["translated_file"],
                order["translated_filename"],
                order.get("translated_file_type", "application/pdf")
            )
        else:
            # Send to client WITHOUT attachment
            await email_service.send_email(
                order["client_email"],
                f"Your Translation is Ready - {order['order_number']}",
                email_html
            )

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

        return {"status": "success", "message": "Order delivered and emails sent", "attachment_sent": has_attachment}

    except Exception as e:
        logger.error(f"Failed to send delivery emails: {str(e)}")
        return {"status": "partial", "message": "Order marked as delivered but email sending failed", "error": str(e)}

@api_router.get("/admin/orders/{order_id}/translated-document")
async def get_translated_document(order_id: str, admin_key: str):
    """Get translated document info for an order (admin/PM only)"""
    user_info = await validate_admin_or_user_token(admin_key)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid admin key or token")

    order = await db.translation_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    has_file = bool(order.get("translated_file"))
    has_html = bool(order.get("translation_html"))

    return {
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

def get_assignment_response_page(status: str, message: str) -> str:
    """Generate HTML page for assignment response"""
    if status == "accepted":
        icon = "✓"
        color = "#28a745"
        title = "Assignment Accepted"
    elif status == "declined":
        icon = "✗"
        color = "#dc3545"
        title = "Assignment Declined"
    elif status == "already_responded":
        icon = "ℹ"
        color = "#6c757d"
        title = "Already Responded"
    else:
        icon = "⚠"
        color = "#ffc107"
        title = "Error"

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Legacy Translations</title>
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
            margin-bottom: 30px;
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
            "source": "manual_upload"
        })

    return {"documents": all_docs, "count": len(all_docs)}

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


# ==================== TRANSLATION WORKSPACE ENDPOINTS ====================

class OCRRequest(BaseModel):
    file_base64: str
    file_type: str
    filename: str
    use_claude: Optional[bool] = False
    claude_api_key: Optional[str] = None
    special_commands: Optional[str] = None
    preserve_layout: Optional[bool] = True

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

                # Prepare the image for Claude
                image_data = base64.b64encode(file_content).decode('utf-8')
                media_type = request.file_type if request.file_type.startswith('image/') else 'image/jpeg'

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

                message = client.messages.create(
                    model="claude-sonnet-4-20250514",
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

        if is_image:
            # Try AWS Textract first for images
            if textract_client:
                logger.info("Using AWS Textract for image OCR...")
                text = extract_text_with_textract(file_content, file_extension)
                if text and len(text.strip()) > 10:
                    logger.info(f"Textract extracted {len(text)} characters")
                else:
                    text = ""

            # Fallback to Tesseract if Textract didn't work
            if not text:
                logger.info("Using Tesseract for image OCR...")
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

                    text = pytesseract.image_to_string(image, config=r'--oem 3 --psm 6')
                    logger.info(f"Tesseract extracted {len(text)} characters")
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
                    text = extract_text_with_textract(file_content, 'pdf')
                    if text and len(text.strip()) > 10:
                        logger.info(f"Textract extracted {len(text)} characters from PDF")

                # Fallback to Tesseract
                if not text or len(text.strip()) < 10:
                    logger.info("Using Tesseract for PDF OCR...")
                    try:
                        pdf_document = fitz.open(stream=file_content, filetype="pdf")
                        text = ""

                        for page_num in range(min(pdf_document.page_count, 15)):
                            page = pdf_document[page_num]
                            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                            img_data = pix.tobytes("png")

                            image = Image.open(io.BytesIO(img_data))
                            page_text = pytesseract.image_to_string(image, config=r'--oem 3 --psm 6')

                            if page_text.strip():
                                text += page_text + "\n"

                        pdf_document.close()
                        logger.info(f"Tesseract extracted {len(text)} characters from PDF")
                    except Exception as e:
                        logger.error(f"PDF OCR failed: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {request.file_type}")

        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from document")

        # Count words
        word_count = count_words(text)

        return {
            "status": "success",
            "text": text.strip(),
            "word_count": word_count,
            "filename": request.filename
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


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
            # Build additional instructions
            additional_instructions = ""
            if request.general_instructions:
                additional_instructions = f"\n\nADDITIONAL USER INSTRUCTIONS:\n{request.general_instructions}"

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
{additional_instructions}"""

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
                        logger.info("Converting PDF to image for Claude...")
                        try:
                            import fitz  # PyMuPDF
                            pdf_bytes = base64.b64decode(image_data)
                            doc = fitz.open(stream=pdf_bytes, filetype="pdf")

                            # Convert first page to image
                            page = doc[0]
                            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))  # 2x zoom for better quality
                            img_bytes = pix.tobytes("jpeg")
                            image_data = base64.b64encode(img_bytes).decode('utf-8')
                            media_type = "image/jpeg"
                            doc.close()
                            logger.info("PDF converted to image successfully")
                        except Exception as e:
                            logger.error(f"PDF conversion failed: {e}")
                            # Fall back to text-only translation
                            image_data = None
                    elif 'png' in header.lower():
                        media_type = "image/png"
                    elif 'gif' in header.lower():
                        media_type = "image/gif"
                    elif 'webp' in header.lower():
                        media_type = "image/webp"

                if image_data:
                    message_content = [
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
                            "text": f"""Look at this document image carefully. This is the original document.

The OCR text extracted from this document is:
---
{request.text}
---

{user_message}

CRITICAL: Your HTML output MUST match the visual layout of the original document image above.
- If you see tables in the image, create HTML tables with the same structure
- If you see bordered sections, use CSS borders
- Replicate the exact visual appearance in HTML format"""
                        }
                    ]
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
                    "model": "claude-sonnet-4-20250514",
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
                "model": "claude-sonnet-4-20250514"
            }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Translation request timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# ==================== TRANSLATION RESOURCES ENDPOINTS ====================

class TranslationInstructionCreate(BaseModel):
    sourceLang: str
    targetLang: str
    title: str
    content: str

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
    """Get all translation instructions"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    instructions = await db.translation_instructions.find().sort("created_at", -1).to_list(100)
    for instr in instructions:
        if '_id' in instr:
            del instr['_id']
        if instr.get("created_at"):
            instr["created_at"] = instr["created_at"].isoformat()

    return {"instructions": instructions}


@api_router.post("/admin/translation-instructions")
async def create_translation_instruction(data: TranslationInstructionCreate, admin_key: str):
    """Create a new translation instruction"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    instruction = {
        "id": str(uuid.uuid4()),
        "sourceLang": data.sourceLang,
        "targetLang": data.targetLang,
        "title": data.title,
        "content": data.content,
        "created_at": datetime.utcnow()
    }

    await db.translation_instructions.insert_one(instruction)

    return {"status": "success", "instruction": instruction}


@api_router.put("/admin/translation-instructions/{instruction_id}")
async def update_translation_instruction(instruction_id: str, data: TranslationInstructionCreate, admin_key: str):
    """Update a translation instruction"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

    result = await db.translation_instructions.update_one(
        {"id": instruction_id},
        {"$set": {
            "sourceLang": data.sourceLang,
            "targetLang": data.targetLang,
            "title": data.title,
            "content": data.content
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Instruction not found")

    return {"status": "success"}


@api_router.delete("/admin/translation-instructions/{instruction_id}")
async def delete_translation_instruction(instruction_id: str, admin_key: str):
    """Delete a translation instruction"""
    if admin_key != os.environ.get("ADMIN_KEY", "legacy_admin_2024"):
        raise HTTPException(status_code=401, detail="Invalid admin key")

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
    """Get current customer from token"""
    if not token or token not in customer_tokens:
        return None
    customer_id = customer_tokens[token]
    customer = await db.customers.find_one({"id": customer_id})
    return customer

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

        # Generate token
        token = generate_token()
        customer_tokens[token] = customer.id

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

        # Generate token
        token = generate_token()
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

        # Create order from budget
        page_count = max(1, math.ceil(budget["word_count"] / 250))
        due_date = datetime.utcnow() + timedelta(days=30)

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
            due_date=due_date
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


# Include the router in the main app
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Legacy Translations API", "status": "online", "api_docs": "/docs"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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