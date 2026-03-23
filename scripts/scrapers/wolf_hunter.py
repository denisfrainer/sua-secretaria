import os
import json
import re
import time
import random
import httpx
import ssl
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# --- Setup de Ambiente ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

# Configuração do Cliente com v1beta. 
# Timeout simplificado para inteiro (90) para evitar Pydantic ValidationError.
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"), 
    http_options={
        'api_version': 'v1beta', 
        'timeout': 90
    }
)

def extract_json_from_text(text: str) -> list:
    """Extrai e limpa o JSON da resposta em texto puro do Gemini."""
    try:
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
        json_str = match.group(1) if match else text.strip()
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"❌ Falha de decodificação JSON: {e}")
        return []

def clean_website(url: str) -> str | None:
    """Filtra as alucinações de URL interna do Google Maps."""
    if not url or str(url).lower() in ["none", "null", ""]:
        return None
    if "googleusercontent.com" in url or "maps.google.com" in url:
        return None
    return url

def visual_countdown(seconds: float):
    """Exibe uma contagem regressiva visual no terminal."""
    total = int(seconds)
    steps = [total, total // 2, 0]
    steps = sorted(list(set(steps)), reverse=True)
    
    print(f"   ⏳ Retrying in ", end="", flush=True)
    for i, step in enumerate(steps):
        print(f"{step}...", end="" if i < len(steps)-1 else "\n", flush=True)
        if i < len(steps) - 1:
            time.sleep((steps[i] - steps[i+1]))

def run_hunter():
    print("🐺 [WOLF AGENT: HUNTER] Iniciando Mineração Geográfica (SSL/Network Resilience)...")
    
    neighborhoods = ['Centro', 'Trindade', 'Agronômica', 'Estreito', 'Coqueiros', 'Campeche']
    total_neighborhoods = len(neighborhoods)
    niche_query = "Clínica Odontológica"
    max_retries = 3
    backoff_times = [20, 40, 80]
    
    for index, neighborhood in enumerate(neighborhoods, 1):
        location = f"{neighborhood}, Florianopolis, SC"
        print(f"\n📍 Minerando em: {location}...")

        prompt = (
            f"Busque 8 '{niche_query}' em {location} usando o Google Maps. "
            "IMPORTANTE: Extraia o campo 'website_uri' real diretamente dos resultados da ferramenta para cada local. "
            "Evite URLs genéricas ou do Google. Se o local não tiver um site oficial no Maps, retorne null. "
            "Retorne APENAS um array JSON válido. Cada objeto deve ter as chaves: "
            "'name' (string), 'website' (string ou null), 'phone' (string) e 'rating' (number). "
            "Nenhum texto adicional."
        )

        leads_data = []
        skip_neighborhood = False

        for attempt in range(max_retries + 1):
            try:
                # Heartbeat Logger
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"💓 [REQUEST_START] {timestamp} | Gemini-3-Flash-Preview | Bairro: {neighborhood}")
                
                # Latency Timer & Execution
                start_api = time.time()
                response = client.models.generate_content(
                    model="gemini-3-flash-preview", 
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                        temperature=0.1
                    )
                )
                latency = time.time() - start_api
                print(f"⏱️ [LATENCY] API respondeu em {latency:.2f}s")
                
                if latency > 45:
                    print(f"⚠️ [WARNING] API call excedeu 45 segundos ({latency:.2f}s).")

                # Raw Response Debugger
                raw_text = response.text
                debug_preview = raw_text[:100].replace('\n', ' ')
                print(f"🔍 [DEBUG_RAW] Início da resposta: {debug_preview}...")
                
                leads_data = extract_json_from_text(raw_text)
                break 

            except (httpx.ConnectError, httpx.TimeoutException, ssl.SSLError):
                if attempt < max_retries:
                    print(f"⚠️ [NETWORK_FAIL] SSL/Handshake timeout or Connection error. Retrying...")
                    delay = backoff_times[attempt] + random.uniform(1, 3)
                    visual_countdown(delay)
                    continue
                else:
                    print(f"❌ [ERRO] Falha persistente de rede/SSL após {max_retries} tentativas.")
                    skip_neighborhood = True
                    break

            except Exception as e:
                error_msg = str(e)
                if "503" in error_msg:
                    if attempt < max_retries:
                        delay = backoff_times[attempt] + random.uniform(1, 3)
                        print(f"⚠️ [503] Service Unavailable. Tentativa {attempt + 1}/{max_retries}.")
                        visual_countdown(delay)
                        continue
                    else:
                        print(f"❌ [ERRO] Falha persistente 503 após {max_retries} tentativas.")
                        skip_neighborhood = True
                        break
                elif "400" in error_msg:
                    print(f"🛑 [400] Bad Request. Pulando bairro {neighborhood}...")
                    if hasattr(e, 'response') and e.response:
                        print(f"DEBUG: {e.response.text}")
                    else:
                        print(f"DEBUG: {error_msg}")
                    skip_neighborhood = True
                    break
                else:
                    print(f"❌ [ERRO INESPERADO] {error_msg}")
                    skip_neighborhood = True
                    break

        if not skip_neighborhood and leads_data:
            print(f"🎯 {len(leads_data)} leads extraídos. Persistindo...")
            for lead in leads_data:
                name = lead.get('name', 'Desconhecido')
                raw_url = lead.get('website')
                phone = lead.get('phone', 'Sem telefone')
                rating = lead.get('rating')

                website = clean_website(raw_url)

                data = {
                    "niche": name,
                    "website": website if website else "None", 
                    "phone": phone,
                    "maps_rating": float(rating) if rating else 0.0,
                    "status": "cold_lead"
                }

                try:
                    supabase.table('leads_lobo').insert(data).execute()
                    status_tag = "[DB_INSERT]"
                    if website:
                        print(f"   {status_tag} ✅ [COM SITE] {name}")
                    else:
                        print(f"   {status_tag} 👻 [FANTASMA] {name}")
                except Exception:
                    print(f"   [DB_DUPLICATE] ⚠️ Ignorando: {name}")
                    continue
        
        # Progress Tracker
        print(f"📊 Progress: [{index}/{total_neighborhoods}] neighborhoods completed")

        if index < total_neighborhoods:
            jitter_delay = 5 + random.uniform(1, 3)
            print(f"⏳ Aguardando {jitter_delay:.1f}s para o próximo ciclo...")
            time.sleep(jitter_delay)

    print("\n🏁 SHUTDOWN: Mining cycle finished. Terminal released.")

if __name__ == "__main__":
    run_hunter()
