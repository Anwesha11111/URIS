"""
🧠 FinLit Bot - Google Gemini AI
Deploy: Render.com (Free tier works perfectly)
"""
import os
import uvicorn
from datetime import datetime
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import google.generativeai as genai
from .models import ChatMessage, ChatResponse, HealthCheck

# Initialize FastAPI
app = FastAPI(title="🧠 FinLit Bot - Gemini AI", version="1.1.0")

# CORS
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Serve frontend
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Google Gemini Setup
genai.configure(api_key=os.getenv("AIzaSyAPGx_tRclCdYux7ifhsQa6dP0h-zpcejc"))
MODEL_NAME = "gemini-1.5-flash"  # Fastest + cheapest

model = genai.GenerativeModel(MODEL_NAME)

# India Financial Links
OFFICIAL_LINKS = {
    "bank": "https://rbi.org.in/Scripts/FAQView.aspx?Id=28",
    "savings": "https://financialservices.gov.in/beta/en/open-account",
    "investment": "https://www.sebi.gov.in/investor_education.html",
    "mutual": "https://www.amfiindia.com/investor-corner",
    "credit": "https://www.cibil.com/",
    "budget": "https://financialplanning.nism.ac.in/",
    "insurance": "https://policyholder.gov.in/",
    "loan": "https://sachet.rbi.org.in/",
    "fd": "https://www.sbi.co.in/web/interest-rates/interest-rates/deposit-rates"
}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

# 🗣️ Main Chat API - Google Gemini
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(message: ChatMessage):
    try:
        # Smart link detection
        official_link = ""
        message_lower = message.message.lower()
        for keyword, url in OFFICIAL_LINKS.items():
            if keyword in message_lower:
                official_link = f"\n\n🔗 **Official Guide**: [{keyword.title().replace('_',' ')}]({url})"
                break

        # Gemini-optimized prompt
        system_prompt = """You are FinLit Bot, India's trusted financial literacy AI assistant.

🧠 **Your Style**:
• Beginner-friendly (no jargon)
• Step-by-step actionable advice  
• India-focused (RBI/SEBI rules)
• Structured format with bullets/lists
• Add safety disclaimers

📋 **Always Include**:
1. Simple explanation
2. 3-5 step action plan
3. Official links when relevant
4. Next steps

❌ **Never**:
• Personalized advice
• Recommend specific products
• Guarantee returns

**Topics**: Budgeting, Banking, SIP/Mutual Funds, Credit Score, Insurance, Loans, FD/RD, Taxes"""

        # Generate response
        response = model.generate_content([
            system_prompt,
            f"User: {message.message}"
        ])

        ai_response = response.text.strip() + official_link

        return ChatResponse(
            response=ai_response,
            type="gemini",
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

# 🔌 WebSocket Real-time
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            result = await chat_endpoint(ChatMessage(message=data))
            await manager.send_message(result.response, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# 🏠 Frontend Route
@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    try:
        with open("../frontend/index.html", "r", encoding="utf-8") as f:
            content = f.read()
            # Inject API URL for easy deployment
            content = content.replace(
                "const API_BASE_URL = 'https://your-finlit-app.onrender.com';",
                f"const API_BASE_URL = '{os.getenv('RENDER_EXTERNAL_URL', 'http://localhost:8000')}';"
            )
            return HTMLResponse(content=content)
    except FileNotFoundError:
        return HTMLResponse(
            content="""
            <h1>🚀 FinLit Bot - Google Gemini Ready!</h1>
            <p>✅ Backend deployed successfully</p>
            <p><strong>Test API:</strong></p>
            <pre>curl -X POST /api/chat -d '{"message":"budget"}'</pre>
            <p><a href="/docs" style="background:#4285f4;color:white;padding:10px 20px;border-radius:5px;">API Docs</a></p>
            """,
            status_code=200
        )

# ❤️ Health Check
@app.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
