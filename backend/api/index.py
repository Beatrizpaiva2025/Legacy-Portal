# Vercel serverless function entry point
import sys
from pathlib import Path

# Add parent directory to path so we can import server
sys.path.insert(0, str(Path(__file__).parent.parent))

from server import app

# Export the FastAPI app for Vercel
app = app
