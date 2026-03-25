from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Teste seco, sem Grounding
response = client.models.generate_content(
    model="gemini-3.1-flash-lite-preview", 
    contents="Diga 'Lobo ativo'"
)
print(response.text)