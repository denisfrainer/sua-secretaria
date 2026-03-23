import os
import json
import re
import time
import random
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

# Cliente simplificado v1beta com timeout de 60s
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"), 
    http_options={'api_version': 'v1beta', 'timeout': 60}
)

def extract_json_from_text(text: str) -> list:
    """Extrai e limpa o JSON da resposta do Gemini."""
    try:
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
        json_str = match.group(1) if match else text.strip()
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"❌ Falha de decodificação JSON: {e}")
        return []

def clean_website(url: str) -> str | None:
    """Filtra as URLs internas do Google Maps."""
    if not url or str(url).lower() in ["none", "null", ""]:
        return None
    if "googleusercontent.com" in url or "maps.google.com" in url:
        return None
    return url

def run_hunter():
    print("🐺 [WOLF AGENT: HUNTER] Iniciando Mineração Geográfica (High-Speed Mode)...")
    
    neighborhoods = ['Centro', 'Trindade', 'Agronômica', 'Estreito', 'Coqueiros', 'Campeche']
    total_neighborhoods = len(neighborhoods)
    niche_query = "Clínica Odontológica"
    
    for index, neighborhood in enumerate(neighborhoods, 1):
        location = f"{neighborhood}, Florianopolis, SC"
        print(f"\n📍 [{index}/{total_neighborhoods}] Minerando: {location}...")

        # Prompt otimizado para extração rápida de 5 clínicas
        prompt = (
            f"Busque 5 '{niche_query}' em {location} usando o Google Maps. "
            "Retorne APENAS um array JSON válido com as chaves: "
            "'name' (string), 'website' (string ou null), 'phone' (string) e 'rating' (number). "
            "Priorize o website oficial real. Nenhum texto adicional."
        )

        try:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"💓 [REQUEST] {timestamp} | Gemini-3-Flash-Preview")
            
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
            print(f"⏱️ [LATENCY] {latency:.2f}s")
            
            leads_data = extract_json_from_text(response.text)
            
            if leads_data:
                print(f"🎯 {len(leads_data)} leads encontrados. Persistindo...")
                for lead in leads_data:
                    name = lead.get('name', 'Desconhecido')
                    website = clean_website(lead.get('website'))

                    data = {
                        "niche": name,
                        "website": website if website else "None", 
                        "phone": lead.get('phone', 'Sem telefone'),
                        "maps_rating": float(lead.get('rating')) if lead.get('rating') else 0.0,
                        "status": "cold_lead"
                    }

                    try:
                        supabase.table('leads_lobo').insert(data).execute()
                        print(f"   ✅ [{'SITE' if website else 'GHOST'}] {name}")
                    except Exception:
                        print(f"   ⚠️ [DUPLICATE] {name}")
                        continue
            else:
                print(f"⚠️ Nenhum dado extraído para {neighborhood}.")

        except Exception as e:
            print(f"❌ [ERRO] {str(e)[:100]}")
        
        # Delay reduzido para alta performance
        if index < total_neighborhoods:
            time.sleep(5)

    print("\n🏁 SHUTDOWN: Ciclo de mineração finalizado.")

if __name__ == "__main__":
    run_hunter()
