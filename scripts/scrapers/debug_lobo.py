import socket
import os
from google import genai
from dotenv import load_dotenv

# --- TRUQUE DO LOBO: FORÇAR IPV4 ---
orig_getaddrinfo = socket.getaddrinfo
def patched_getaddrinfo(*args, **kwargs):
    responses = orig_getaddrinfo(*args, **kwargs)
    return [res for res in responses if res[0] == socket.AF_INET]
socket.getaddrinfo = patched_getaddrinfo
# ----------------------------------

load_dotenv()

print("🐺 [DEBUG] Testando conexão forçando IPv4...")

try:
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model="gemini-2.0-flash", 
        contents="Oi"
    )
    print(f"✅ SUCESSO: {response.text}")
except Exception as e:
    print(f"❌ FALHOU DE NOVO: {e}")