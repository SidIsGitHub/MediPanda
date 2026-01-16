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

# --- SECURITY FIX: READ FROM RENDER ---
# We ONLY read from environment variables. 
# If testing locally, make sure these are set in your terminal or .env file.
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Check if keys exist before crashing
if not GOOGLE_API_KEY:
    print("CRITICAL: GOOGLE_API_KEY is missing!")
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    # Use the stable model version
    # Use the alias that worked for your specific account
model = genai.GenerativeModel('models/gemini-flash-latest') 

# Configure Database
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Warning: Supabase connection failed. {e}")
else:
    print("Warning: Supabase keys missing. Database features will fail.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- YOUR CUSTOM PROMPT ---
SYSTEM_PROMPT = """
You are Dr. Paws, a friendly, practical, and slightly witty panda doctor who helps users eat better.
Your goal is to be informative but keep it short, sweet, and jargon-free.

RULES FOR YOUR RESPONSE:
1. **NO ROBOTIC LISTS:** Do not use headers like "Analysis:" or "Ingredients:". Talk naturally.
2. **BE BRIEF:** Keep your answer under 3-4 sentences maximum.
3. **THE HEALTH LOGIC:**
   - **If HEALTHY:** Hype it up! (e.g., "Great for energy!"). Do NOT offer alternatives.
   - **If UNHEALTHY:** Gently warn (e.g., "Whoa, sugar bomb!"). ONLY then suggest 1 simple alternative.
4. **THE VIBE:** Casual and encouraging. Panda puns are okay sometimes.
5. **USER CONTEXT:** The user has: {user_context}. Tailor your advice to this.
"""

# --- NEW HELPER: GET USER MEMORY ---
def get_user_profile(user_id: str):
    """Fetch user context from DB. If none or DB down, return default."""
    if not supabase:
        return "General Health"
        
    try:
        # Ask Supabase for this user's data
        response = supabase.table("user_profiles").select("medical_data").eq("device_id", user_id).execute()
        
        # If found, return their specific condition
        if response.data and len(response.data) > 0:
            return response.data[0]['medical_data']
        return "General Health"
    except Exception as e:
        print(f"Database Error: {e}")
        return "General Health"

# --- ENDPOINTS ---
@app.get("/")
async def root():
    return {"message": "Dr. Paws Brain is Online! 🐼"}

@app.post("/chat")
async def chat_endpoint(data: dict):
    user_message = data.get("user_message", "") # Fix: Handle missing key safely
    
    # Simple Chat doesn't usually read profile, but we default to General
    current_prompt = SYSTEM_PROMPT.replace("{user_context}", "General Health")
    
    try:
        chat = model.start_chat(history=[])
        response = chat.send_message(f"{current_prompt}\n\nUser: {user_message}")
        return {"reply": response.text}
    except Exception as e:
        return {"reply": "I'm having a little panda brain freeze! Try again in a minute. 🐼"}

@app.post("/analyze") # NOTE: Changed from /analyze to /analyze_image to match your frontend!
async def analyze_image(file: UploadFile = File(...), user_id: str = Form("guest")):
    try:
        # 1. FETCH MEMORY
        real_context = get_user_profile(user_id)
        
        # 2. READ IMAGE
        contents = await file.read()
        
        # Check empty file
        if not contents:
             return {"reply": "I couldn't see anything! Try taking the photo again."}

        try:
            image = Image.open(io.BytesIO(contents))
        except Exception:
            return {"reply": "That image file format is tricky. Try a standard JPG or PNG!"}
        
        # 3. ASK GEMINI
        final_prompt = SYSTEM_PROMPT.replace("{user_context}", real_context)
        
        response = model.generate_content([final_prompt, image])
        return {"reply": response.text}

    except Exception as e:
        print(f"Analysis Error: {e}")
        # Check for Quota Limit
        if "429" in str(e):
             return {"reply": "I'm overwhelmed! Please wait a minute. 🐼"}
        return {"reply": "My panda eyes are blurry... I couldn't read that."}

# --- NEW ENDPOINT: SAVE PROFILE ---
@app.post("/save_profile")
async def save_profile(data: dict):
    if not supabase:
        return {"status": "error", "message": "Database not connected"}

    user_id = data.get("user_id")
    medical_context = data.get("medical_context")
    
    try:
        # Save to Supabase (Upsert)
        data = {"device_id": user_id, "medical_data": medical_context}
        supabase.table("user_profiles").upsert(data).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}