from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
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
from docx import Document
import io
import tempfile
import re
import asyncio
import httpx
from contextlib import asynccontextmanager

# Emergent integrations
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# SendGrid imports
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

# Email Service Class
class EmailDeliveryError(Exception):
    pass

class EmailService:
    def __init__(self):
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        self.sender_email = os.environ.get('SENDER_EMAIL')
        
    async def send_email(self, to: str, subject: str, content: str, content_type: str = "html"):
        """Send email via SendGrid"""
        message = Mail(
            from_email=self.sender_email,
            to_emails=to,
            subject=subject,
            html_content=content if content_type == "html" else None,
            plain_text_content=content if content_type == "plain" else None
        )

        try:
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            return response.status_code == 202
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise EmailDeliveryError(f"Failed to send email: {str(e)}")
    
    async def send_order_confirmation_email(self, recipient_email: str, order_details: dict, is_partner: bool = True):
        """Send order confirmation email"""
        subject = f"Translation Order Confirmation - {order_details.get('reference', 'N/A')}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c5aa0;">Translation Order Confirmation</h2>
                    
                    <p>{'Thank you for your order!' if is_partner else 'New order received from partner portal.'}</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Order Details:</h3>
                        <p><strong>Reference:</strong> {order_details.get('reference', 'N/A')}</p>
                        <p><strong>Service Type:</strong> {order_details.get('service_type', 'N/A').title()}</p>
                        <p><strong>Language Pair:</strong> {order_details.get('translate_from', 'N/A').title()} → {order_details.get('translate_to', 'N/A').title()}</p>
                        <p><strong>Word Count:</strong> {order_details.get('word_count', 0)} words</p>
                        <p><strong>Urgency:</strong> {order_details.get('urgency', 'standard').title()}</p>
                        <p><strong>Estimated Delivery:</strong> {order_details.get('estimated_delivery', 'N/A')}</p>
                    </div>
                    
                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2c5aa0;">Pricing Summary:</h3>
                        <p><strong>Base Price:</strong> ${order_details.get('base_price', 0):.2f}</p>
                        {f"<p><strong>Urgency Fee:</strong> ${order_details.get('urgency_fee', 0):.2f}</p>" if order_details.get('urgency_fee', 0) > 0 else ""}
                        <p style="font-size: 18px; font-weight: bold; color: #2c5aa0;"><strong>Total: ${order_details.get('total_price', 0):.2f}</strong></p>
                    </div>
                    
                    <div style="margin: 30px 0;">
                        <p>If you have any questions about your order, please don't hesitate to contact us at <a href="mailto:contact@legacytranslations.com">contact@legacytranslations.com</a></p>
                        <p>Thank you for choosing Legacy Translations!</p>
                    </div>
                    
                    <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
                        <p>Legacy Translations - Professional Translation Services</p>
                        <p>This is an automated email. Please do not reply to this message.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return await self.send_email(recipient_email, subject, html_content, "html")

# Initialize email service
email_service = EmailService()

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

# Payment Models
class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    quote_id: str
    amount: float
    currency: str = "usd"
    payment_status: str = "pending"  # pending, paid, failed, expired
    status: str = "initiated"  # initiated, pending, completed, expired
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

# Utility functions
def count_words(text: str) -> int:
    """Count words in text"""
    # Simple word counting by splitting on whitespace and filtering empty strings
    words = text.strip().split()
    words = [word for word in words if word.strip()]
    return len(words)

def calculate_price(word_count: int, service_type: str, urgency: str) -> tuple[float, float, float]:
    """Calculate pricing based on word count, service type, and urgency"""
    
    # Convert words to pages (250 words = 1 page)
    pages = max(1, word_count / 250)
    
    # Base price depending on service type
    if service_type == "standard":
        # Standard: Minimum $18.00 (up to 250 words), then $0.02 per word
        if word_count <= 250:
            base_price = 18.00
        else:
            base_price = 18.00 + ((word_count - 250) * 0.02)
    elif service_type == "professional":
        # Professional: $23.99 per page (250 words = 1 page)
        base_price = pages * 23.99
    elif service_type == "specialist":
        # Specialist: Minimum $29.00 for first page, then $0.13 per word for additional
        if word_count <= 250:
            base_price = 29.00
        else:
            base_price = 29.00 + ((word_count - 250) * 0.13)
    else:
        base_price = pages * 23.99  # Default to professional
    
    # Urgency fees based on percentage of base price
    urgency_fee = 0
    if urgency == "priority":
        urgency_fee = base_price * 0.20  # 20% of base price
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

async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text from uploaded file using appropriate method"""
    content = await file.read()
    file_extension = file.filename.split('.')[-1].lower()
    
    try:
        if file_extension in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            # Image OCR
            image = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(image)
            return text
            
        elif file_extension == 'pdf':
            # PDF text extraction
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
            
        elif file_extension in ['docx', 'doc']:
            # Word document
            doc = Document(io.BytesIO(content))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
            
        elif file_extension == 'txt':
            # Plain text
            text = content.decode('utf-8')
            return text
            
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
async def upload_document(file: UploadFile = File(...)):
    """Upload and process document for word count extraction"""
    
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
        
        return DocumentUploadResponse(
            filename=file.filename,
            word_count=word_count,
            file_size=len(content),
            message=f"Successfully extracted {word_count} words from {file.filename}"
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
@api_router.post("/payment/checkout", response_model=CheckoutSessionResponse)
async def create_payment_checkout(request: PaymentCheckoutRequest):
    """Create Stripe checkout session for quote payment"""
    
    try:
        # Get quote from database
        quote = await db.translation_quotes.find_one({"id": request.quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        quote_obj = TranslationQuote(**quote)
        
        # Initialize Stripe checkout
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        # Create success and cancel URLs
        success_url = f"{request.origin_url}?payment_success=true&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}?payment_cancelled=true"
        
        # Prepare metadata for the session
        metadata = {
            "quote_id": request.quote_id,
            "reference": quote_obj.reference,
            "service_type": quote_obj.service_type,
            "word_count": str(quote_obj.word_count),
            "source": "partner_portal"
        }
        
        # Initialize Stripe checkout with webhook URL
        host_url = request.origin_url.replace(request.origin_url.split('://')[1].split('/')[0], 
                                            request.origin_url.split('://')[1].split('/')[0])
        webhook_url = f"https://{request.origin_url.split('://')[1].split('/')[0]}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Create checkout session request - amount must be float
        checkout_request = CheckoutSessionRequest(
            amount=float(quote_obj.total_price),  # Ensure float format
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        # Create checkout session
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        payment_transaction = PaymentTransaction(
            session_id=session.session_id,
            quote_id=request.quote_id,
            amount=float(quote_obj.total_price),
            currency="usd",
            payment_status="pending",
            status="initiated",
            metadata=metadata
        )
        
        # Save payment transaction to database
        await db.payment_transactions.insert_one(payment_transaction.dict())
        
        logger.info(f"Created payment checkout session: {session.session_id} for quote: {request.quote_id}")
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment checkout: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create payment checkout")

@api_router.get("/payment/status/{session_id}", response_model=CheckoutStatusResponse)
async def get_payment_status(session_id: str):
    """Get payment status for a checkout session"""
    
    try:
        # Get payment transaction from database
        payment_transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not payment_transaction:
            raise HTTPException(status_code=404, detail="Payment session not found")
        
        # Initialize Stripe checkout
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        
        # Get checkout status from Stripe
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Update payment transaction if status changed and not already processed
        if (status_response.payment_status != payment_transaction.get("payment_status") and 
            payment_transaction.get("payment_status") != "paid"):
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": status_response.payment_status,
                        "status": status_response.status,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # If payment is successful, send confirmation emails
            if status_response.payment_status == "paid" and payment_transaction.get("payment_status") != "paid":
                await handle_successful_payment(session_id, payment_transaction)
        
        return status_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting payment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    try:
        # Get request body and signature
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # Initialize Stripe checkout for webhook handling
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process webhook event based on type
        if webhook_response.event_type in ["checkout.session.completed", "payment_intent.succeeded"]:
            session_id = webhook_response.session_id
            
            # Update payment transaction
            payment_transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if payment_transaction and payment_transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "status": "completed",
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                # Send confirmation emails
                await handle_successful_payment(session_id, payment_transaction)
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook handling failed")

async def handle_successful_payment(session_id: str, payment_transaction: dict):
    """Handle successful payment by sending confirmation emails"""
    
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
            "total_price": quote.get("total_price")
        }
        
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()