import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io
# --- NEW IMPORT FOR DATABASE ---
from supabase import create_client, Client

app = FastAPI()

# --- 1. CONFIGURATION ---

# PASTE YOUR GOOGLE KEY HERE (Kept yours as requested)
GOOGLE_API_KEY = "AIzaSyDd7g1SFl4NYAoz2IUGR8Sw1f5I8Xj-tI4"

# --- PASTE YOUR SUPABASE KEYS HERE (Get these from Supabase -> Project Settings -> API) ---
# For the hackathon, you can paste them directly here inside the quotes.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://kyewbpdltqitjlgdidsr.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZXdicGRsdHFpdGpsZ2RpZHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTEyOTAsImV4cCI6MjA4NDA2NzI5MH0.IBdI5wc00iHoXt-6mUvf7EUIRIyWTpKabL2rBi47-AU")

# Configure Google AI
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('models/gemini-flash-latest')

# Configure Database
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Warning: Supabase not connected yet. {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- YOUR CUSTOM PROMPT (UNCHANGED) ---
SYSTEM_PROMPT = """
You are Dr. Paws, a friendly, practical, and slightly witty panda buddy who helps users eat better.
Your goal is to be informative but keep it short, sweet, and jargon-free.

RULES FOR YOUR RESPONSE:
1. **NO ROBOTIC LISTS:** Do not use headers like "Analysis:" or "Ingredients:". Just talk naturally while still answering neatly with new lines and spaces.
2. **BE BRIEF:** Keep your answer under 3-4 sentences maximum.
3. **THE HEALTH LOGIC:**
   - **If the food is HEALTHY:** Hype it up! Say why it's good in simple terms (e.g., "Great for energy!"). Do NOT offer alternatives.
   - **If the food is UNHEALTHY:** Gently warn the user (e.g., "Whoa, that's a sugar bomb!"). ONLY then suggest 1 simple, tasty alternative.
4. **THE VIBE:** Casual and encouraging. Sometimes (not all times), you can make a tiny joke about bamboo or being a panda, but don't be cringe.
5. **USER CONTEXT:** The user has: {user_context}. tailored your advice to this.

EXAMPLE OF A GOOD RESPONSE:
"Oof, that soda is packed with sugar! It might make you crash later. honestly, a sparkling water with some lime gives you that same fizz without the headache. Worth a shot?"
"""

# --- NEW HELPER: GET USER MEMORY ---
def get_user_profile(user_id: str):
    """Fetch user context from DB. If none, return default."""
    try:
        # Ask Supabase for this user's data
        response = supabase.table("user_profiles").select("medical_data").eq("device_id", user_id).execute()
        
        # If found, return their specific condition (e.g., "Diabetic")
        if response.data and len(response.data) > 0:
            return response.data[0]['medical_data']
        return "General Health"
    except Exception as e:
        print(f"Database Error: {e}")
        return "General Health"

# --- ENDPOINTS ---

@app.post("/chat")
async def chat_endpoint(data: dict):
    user_message = data.get("user_message")
    current_prompt = SYSTEM_PROMPT.replace("{user_context}", "General Health")
    
    chat = model.start_chat(history=[])
    response = chat.send_message(f"{current_prompt}\n\nUser: {user_message}")
    return {"reply": response.text}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...), user_id: str = Form("guest")):
    try:
        # 1. FETCH MEMORY: Get this specific user's health data
        real_context = get_user_profile(user_id)
        
        # 2. READ IMAGE
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # 3. ASK GEMINI (With the real context!)
        final_prompt = SYSTEM_PROMPT.replace("{user_context}", real_context)
        
        response = model.generate_content([final_prompt, image])
        return {"reply": response.text}
    except Exception as e:
        return {"reply": f"My panda eyes are blurry... I couldn't read that. ({str(e)})"}

# --- NEW ENDPOINT: SAVE PROFILE ---
@app.post("/save_profile")
async def save_profile(data: dict):
    user_id = data.get("user_id")
    medical_context = data.get("medical_context")
    
    try:
        # Save to Supabase (Upsert = Update if exists, Insert if new)
        data = {"device_id": user_id, "medical_data": medical_context}
        supabase.table("user_profiles").upsert(data).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Run with: python -m uvicorn main:app --reload