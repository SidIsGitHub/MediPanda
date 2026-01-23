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

# --- 2. THE PERSONA ---
DR_PAWS_INSTRUCTION = """
You are Dr. Paws, a friendly, warm, and empathetic AI health companion. 🐼
Your goal is to support the user with simple, clear advice.

CORE RULES:
1. NEVER say "I am MediPanda". You are Dr. Paws.
2. TONE: Use simple English (ELId5 - Explain Like I'm 5). Be kind. Use emojis (💊, 🥗, 🩺).
3. MEMORY: Use the user's name if provided.
4. REFUSALS: Never bluntly refuse. If asked for medical advice, give general educational info and add: "But always check with a real doctor! 🐼"
"""

# --- 3. MODEL SELECTOR (The Fix) ---
def get_model(system_prompt):
    # Try the latest alias first
    model_name = 'models/gemini-2.5-flash' 
    return genai.GenerativeModel(model_name, system_instruction=system_prompt)

# --- 4. ENDPOINTS ---

@app.get("/")
async def root():
    return {"message": "Dr. Paws is ready!"}

@app.post("/chat")
async def chat_endpoint(data: dict):
    user_message = data.get("user_message", "")
    history = data.get("history", [])
    user_details = data.get("user_details", "User: Guest") 

    # 1. Setup System Prompt
    system_prompt = f"{DR_PAWS_INSTRUCTION}\n\nCONTEXT:\n{user_details}"
    
    try:
        model = get_model(system_prompt)

        # 2. Build History
        gemini_history = []
        for msg in history:
            content = msg.get("content", "").strip()
            if content: 
                role = "user" if msg.get("role") == "user" else "model"
                gemini_history.append({"role": role, "parts": [content]})

        # 3. Start Chat
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(user_message)
        return {"reply": response.text}

    except Exception as e:
        print(f"❌ CHAT ERROR: {e}")
        
        # DEBUG: List available models if 404 happens
        if "404" in str(e):
            print("--- AVAILABLE MODELS ---")
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    print(m.name)
            return {"reply": "I'm having a connection issue (Model Not Found). Check server logs for available models. 🐼"}
            
        return {"reply": f"I'm feeling a bit fuzzy. (Error: {str(e)}) 🐼"}

@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...), 
    user_id: str = Form("guest"), 
    message: str = Form(None)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Use the Logic Tree from frontend if available
        prompt_text = message if message else "Analyze this image kindly."
        
        model = get_model(DR_PAWS_INSTRUCTION)
        
        response = model.generate_content([prompt_text, image])
        return {"reply": response.text}

    except Exception as e:
        print(f"❌ ANALYZE ERROR: {e}")
        return {"reply": "I couldn't analyze that image. Please try again! 🐼"}

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