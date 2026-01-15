from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image
import io

app = FastAPI()

# PASTE YOUR KEY HERE
genai.configure(api_key="AIzaSyDd7g1SFl4NYAoz2IUGR8Sw1f5I8Xj-tI4")

# CRITICAL: You need a model that can see images. 
# If 'gemini-1.5-flash' fails, try 'gemini-1.5-pro'
model = genai.GenerativeModel('models/gemini-flash-latest')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REPLACE YOUR OLD SYSTEM_PROMPT WITH THIS ---

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

@app.post("/chat")
async def chat_endpoint(data: dict):
    user_message = data.get("user_message")
    # We inject a default context for chat if none exists
    current_prompt = SYSTEM_PROMPT.replace("{user_context}", "General Health")
    
    chat = model.start_chat(history=[])
    response = chat.send_message(f"{current_prompt}\n\nUser: {user_message}")
    return {"reply": response.text}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...), user_context: str = Form("General Health")):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # We fill in the specific user context (like "Diabetes") here
        final_prompt = SYSTEM_PROMPT.replace("{user_context}", user_context)
        
        # Send to Gemini
        response = model.generate_content([final_prompt, image])
        return {"reply": response.text}
    except Exception as e:
        return {"reply": f"My panda eyes are blurry... I couldn't read that. ({str(e)})"}

# Run with: python -m uvicorn main:app --reload

# To run this: python -m uvicorn main:app --reload