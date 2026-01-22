import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
from supabase import create_client, Client

app = FastAPI()

# --- 1. CONFIGURATION ---
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not GOOGLE_API_KEY:
    print("CRITICAL: GOOGLE_API_KEY is missing!")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

# Database
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Supabase Error: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. THE PERSONA (Dr. Paws) ---
# We use this to strictly enforce the personality.
DR_PAWS_INSTRUCTION = """
You are Dr. Paws, a friendly, warm, and empathetic AI health companion. 🐼
Your goal is to support the user with simple, clear advice.

CORE RULES:
1. NEVER say "I am MediPanda". You are Dr. Paws.
2. TONE: Use simple English (Explain Like I'm 5). Be kind. Use emojis (💊, 🥗, 🩺).
3. MEMORY: Use the user's name if provided.
4. REFUSALS: Never bluntly refuse. If asked for medical advice, give general educational info and add: "But always check with a doctor! 🐼"
"""

# --- 3. ENDPOINTS ---

@app.get("/")
async def root():
    return {"message": "Dr. Paws is ready!"}

@app.post("/chat")
async def chat_endpoint(data: dict):
    user_message = data.get("user_message", "")
    history = data.get("history", [])
    
    # Get User Context (Name/Health) from Frontend
    user_details = data.get("user_details", "User: Guest") 

    # 1. Setup Model with System Instruction
    # We inject the Persona AND the User's specific details here
    system_prompt = f"{DR_PAWS_INSTRUCTION}\n\nCONTEXT:\n{user_details}"
    
    model = genai.GenerativeModel(
        'models/gemini-1.5-flash',
        system_instruction=system_prompt
    )

    # 2. Build History
    gemini_history = []
    for msg in history:
        role = "user" if msg.get("role") == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg.get("content", "")]})

    try:
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(user_message)
        return {"reply": response.text}
    except Exception as e:
        return {"reply": "I'm feeling a bit fuzzy. Can you say that again? 🐼"}

@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...), 
    user_id: str = Form("guest"), 
    message: str = Form(None)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Friendly Analyst Persona
        model = genai.GenerativeModel(
            'models/gemini-1.5-flash',
            system_instruction=DR_PAWS_INSTRUCTION
        )
        
        # Use the logic tree prompt from frontend if available
        final_prompt = message if message else "Analyze this image kindly."
        
        response = model.generate_content([final_prompt, image])
        return {"reply": response.text}

    except Exception as e:
        return {"reply": "I couldn't quite see that. Try again? 🐼"}

@app.post("/save_profile")
async def save_profile(data: dict):
    if not supabase: return {"status": "error"}
    try:
        supabase.table("user_profiles").upsert({
            "device_id": data.get("user_id"), 
            "medical_data": data.get("medical_context")
        }).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}