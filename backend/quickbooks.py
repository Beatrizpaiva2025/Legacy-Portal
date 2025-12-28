"""
QuickBooks Online Integration Module
Handles OAuth 2.0 authentication and API operations for:
- Customers
- Invoices
- Vendor (1099 contractor) payments
"""

import os
import json
import base64
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from urllib.parse import urlencode

# QuickBooks API endpoints
QB_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com"
QB_PRODUCTION_BASE = "https://quickbooks.api.intuit.com"
QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

class QuickBooksClient:
    """QuickBooks Online API Client"""

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str,
                 environment: str = "sandbox", realm_id: str = None,
                 access_token: str = None, refresh_token: str = None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.environment = environment
        self.realm_id = realm_id
        self.access_token = access_token
        self.refresh_token = refresh_token

        self.base_url = QB_PRODUCTION_BASE if environment == "production" else QB_SANDBOX_BASE

    def get_authorization_url(self, state: str = None) -> str:
        """Generate OAuth 2.0 authorization URL"""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "scope": "com.intuit.quickbooks.accounting com.intuit.quickbooks.payment",
            "redirect_uri": self.redirect_uri,
            "state": state or "security_token"
        }
        return f"{QB_AUTH_URL}?{urlencode(params)}"

    def exchange_code_for_tokens(self, authorization_code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        headers = {
            "Accept": "application/json",
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "grant_type": "authorization_code",
            "code": authorization_code,
            "redirect_uri": self.redirect_uri
        }

        response = requests.post(QB_TOKEN_URL, headers=headers, data=data)

        if response.status_code == 200:
            tokens = response.json()
            self.access_token = tokens.get("access_token")
            self.refresh_token = tokens.get("refresh_token")
            return {
                "success": True,
                "access_token": self.access_token,
                "refresh_token": self.refresh_token,
                "expires_in": tokens.get("expires_in"),
                "token_type": tokens.get("token_type")
            }
        else:
            return {
                "success": False,
                "error": response.text
            }

    def refresh_access_token(self) -> Dict[str, Any]:
        """Refresh the access token using refresh token"""
        if not self.refresh_token:
            return {"success": False, "error": "No refresh token available"}

        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        headers = {
            "Accept": "application/json",
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token
        }

        response = requests.post(QB_TOKEN_URL, headers=headers, data=data)

        if response.status_code == 200:
            tokens = response.json()
            self.access_token = tokens.get("access_token")
            self.refresh_token = tokens.get("refresh_token")
            return {
                "success": True,
                "access_token": self.access_token,
                "refresh_token": self.refresh_token,
                "expires_in": tokens.get("expires_in")
            }
        else:
            return {
                "success": False,
                "error": response.text
            }

    def _make_request(self, method: str, endpoint: str, data: dict = None) -> Dict[str, Any]:
        """Make authenticated request to QuickBooks API"""
        if not self.access_token or not self.realm_id:
            return {"success": False, "error": "Not authenticated"}

        url = f"{self.base_url}/v3/company/{self.realm_id}/{endpoint}"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}

            # Handle token expiration
            if response.status_code == 401:
                refresh_result = self.refresh_access_token()
                if refresh_result.get("success"):
                    # Retry the request with new token
                    headers["Authorization"] = f"Bearer {self.access_token}"
                    if method.upper() == "GET":
                        response = requests.get(url, headers=headers, params=data)
                    elif method.upper() == "POST":
                        response = requests.post(url, headers=headers, json=data)
                else:
                    return {"success": False, "error": "Token refresh failed", "needs_reauth": True}

            if response.status_code in [200, 201]:
                return {"success": True, "data": response.json()}
            else:
                return {"success": False, "error": response.text, "status_code": response.status_code}

        except Exception as e:
            return {"success": False, "error": str(e)}

    # ==================== CUSTOMER OPERATIONS ====================

    def create_customer(self, display_name: str, email: str = None,
                       phone: str = None, company: str = None) -> Dict[str, Any]:
        """Create a new customer in QuickBooks"""
        customer_data = {
            "DisplayName": display_name,
            "PrimaryEmailAddr": {"Address": email} if email else None,
            "PrimaryPhone": {"FreeFormNumber": phone} if phone else None,
            "CompanyName": company
        }
        # Remove None values
        customer_data = {k: v for k, v in customer_data.items() if v is not None}

        return self._make_request("POST", "customer", customer_data)

    def find_customer_by_email(self, email: str) -> Dict[str, Any]:
        """Find a customer by email address"""
        query = f"SELECT * FROM Customer WHERE PrimaryEmailAddr = '{email}'"
        return self._make_request("GET", f"query?query={query}")

    def find_customer_by_name(self, name: str) -> Dict[str, Any]:
        """Find a customer by display name"""
        query = f"SELECT * FROM Customer WHERE DisplayName = '{name}'"
        return self._make_request("GET", f"query?query={query}")

    # ==================== INVOICE OPERATIONS ====================

    def create_invoice(self, customer_id: str, line_items: list,
                      due_date: str = None, memo: str = None) -> Dict[str, Any]:
        """
        Create an invoice in QuickBooks

        line_items format:
        [
            {
                "description": "Translation Service - Birth Certificate",
                "amount": 75.00,
                "quantity": 1
            }
        ]
        """
        invoice_lines = []
        for idx, item in enumerate(line_items):
            invoice_lines.append({
                "LineNum": idx + 1,
                "Amount": item.get("amount", 0) * item.get("quantity", 1),
                "DetailType": "SalesItemLineDetail",
                "Description": item.get("description", "Translation Service"),
                "SalesItemLineDetail": {
                    "Qty": item.get("quantity", 1),
                    "UnitPrice": item.get("amount", 0)
                }
            })

        invoice_data = {
            "CustomerRef": {"value": customer_id},
            "Line": invoice_lines,
            "DueDate": due_date,
            "CustomerMemo": {"value": memo} if memo else None
        }
        # Remove None values
        invoice_data = {k: v for k, v in invoice_data.items() if v is not None}

        return self._make_request("POST", "invoice", invoice_data)

    def send_invoice(self, invoice_id: str, email: str = None) -> Dict[str, Any]:
        """Send invoice to customer via email"""
        endpoint = f"invoice/{invoice_id}/send"
        if email:
            endpoint += f"?sendTo={email}"
        return self._make_request("POST", endpoint)

    def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Get invoice details"""
        return self._make_request("GET", f"invoice/{invoice_id}")

    def get_invoice_pdf(self, invoice_id: str) -> Dict[str, Any]:
        """Get invoice as PDF"""
        if not self.access_token or not self.realm_id:
            return {"success": False, "error": "Not authenticated"}

        url = f"{self.base_url}/v3/company/{self.realm_id}/invoice/{invoice_id}/pdf"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/pdf"
        }

        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return {"success": True, "pdf_data": base64.b64encode(response.content).decode()}
        return {"success": False, "error": response.text}

    # ==================== VENDOR/CONTRACTOR OPERATIONS (1099) ====================

    def create_vendor(self, display_name: str, email: str = None,
                     tax_id: str = None, is_1099: bool = True) -> Dict[str, Any]:
        """Create a vendor (contractor) in QuickBooks"""
        vendor_data = {
            "DisplayName": display_name,
            "PrimaryEmailAddr": {"Address": email} if email else None,
            "Vendor1099": is_1099,
            "TaxIdentifier": tax_id
        }
        vendor_data = {k: v for k, v in vendor_data.items() if v is not None}

        return self._make_request("POST", "vendor", vendor_data)

    def find_vendor_by_name(self, name: str) -> Dict[str, Any]:
        """Find a vendor by display name"""
        query = f"SELECT * FROM Vendor WHERE DisplayName = '{name}'"
        return self._make_request("GET", f"query?query={query}")

    def create_bill(self, vendor_id: str, line_items: list,
                   due_date: str = None, memo: str = None) -> Dict[str, Any]:
        """
        Create a bill (for contractor payment tracking)

        line_items format:
        [
            {
                "description": "Translation - Project #2024-001",
                "amount": 50.00,
                "account_id": "expense_account_id"  # Optional
            }
        ]
        """
        bill_lines = []
        for idx, item in enumerate(line_items):
            line = {
                "LineNum": idx + 1,
                "Amount": item.get("amount", 0),
                "DetailType": "AccountBasedExpenseLineDetail",
                "Description": item.get("description", "Contractor Payment"),
                "AccountBasedExpenseLineDetail": {
                    "AccountRef": {"value": item.get("account_id", "1")}  # Default expense account
                }
            }
            bill_lines.append(line)

        bill_data = {
            "VendorRef": {"value": vendor_id},
            "Line": bill_lines,
            "DueDate": due_date,
            "PrivateNote": memo
        }
        bill_data = {k: v for k, v in bill_data.items() if v is not None}

        return self._make_request("POST", "bill", bill_data)

    # ==================== PAYMENT OPERATIONS ====================

    def record_payment(self, customer_id: str, amount: float,
                      invoice_id: str = None) -> Dict[str, Any]:
        """Record a payment received from customer"""
        payment_data = {
            "CustomerRef": {"value": customer_id},
            "TotalAmt": amount
        }

        if invoice_id:
            payment_data["Line"] = [{
                "Amount": amount,
                "LinkedTxn": [{
                    "TxnId": invoice_id,
                    "TxnType": "Invoice"
                }]
            }]

        return self._make_request("POST", "payment", payment_data)

    # ==================== UTILITY OPERATIONS ====================

    def get_company_info(self) -> Dict[str, Any]:
        """Get company information to verify connection"""
        return self._make_request("GET", f"companyinfo/{self.realm_id}")

    def test_connection(self) -> Dict[str, Any]:
        """Test if connection is working"""
        result = self.get_company_info()
        if result.get("success"):
            company = result.get("data", {}).get("CompanyInfo", {})
            return {
                "success": True,
                "company_name": company.get("CompanyName"),
                "country": company.get("Country"),
                "connected": True
            }
        return {"success": False, "connected": False, "error": result.get("error")}


# ==================== HELPER FUNCTIONS ====================

def get_quickbooks_client(db_settings: dict = None) -> QuickBooksClient:
    """
    Create QuickBooks client from environment or database settings
    """
    client_id = os.getenv("QUICKBOOKS_CLIENT_ID")
    client_secret = os.getenv("QUICKBOOKS_CLIENT_SECRET")
    redirect_uri = os.getenv("QUICKBOOKS_REDIRECT_URI",
                            "https://portal.legacytranslations.com/api/quickbooks/callback")
    environment = os.getenv("QUICKBOOKS_ENVIRONMENT", "sandbox")

    # Get stored tokens from database if available
    realm_id = None
    access_token = None
    refresh_token = None

    if db_settings:
        realm_id = db_settings.get("quickbooks_realm_id")
        access_token = db_settings.get("quickbooks_access_token")
        refresh_token = db_settings.get("quickbooks_refresh_token")

    return QuickBooksClient(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        environment=environment,
        realm_id=realm_id,
        access_token=access_token,
        refresh_token=refresh_token
    )
