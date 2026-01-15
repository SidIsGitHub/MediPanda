@echo off
echo Starting the NutriBao Brain...

:: 1. Start the Python Server in the background
start cmd /k "python -m uvicorn main:app --reload"

:: 2. Wait 3 seconds for the brain to wake up
timeout /t 3

:: 3. Open your HTML app in Chrome automatically
:: (Update "index.html" to the full path if it doesn't open)
start index.html

echo Done! You can minimize this window.