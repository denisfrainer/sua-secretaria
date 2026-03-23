import os
import json
import re
import time
import random
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# --- Setup de Ambiente ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def extract_json_from_text(text: str) -> list:
    """Extrai e limpa o JSON da resposta em texto puro do Gemini."""
    try:
        # Puxa apenas o conteúdo dentro do bloco markdown ```json ... ```
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

def run_hunter():
    print("🐺 [WOLF AGENT: HUNTER] Iniciando Mineração Geográfica com Resiliência Silicon Valley...")
    
    neighborhoods = ['Centro', 'Trindade', 'Agronômica', 'Estreito', 'Coqueiros', 'Campeche']
    niche_query = "Clínica Odontológica"
    max_retries = 3
    backoff_times = [10, 20, 40]
    
    for neighborhood in neighborhoods:
        location = f"{neighborhood}, Florianopolis, SC"
        print(f"\n📍 Minerando em: {location}...")

        # Prompt otimizado para extrair website_uri real e reduzir fantasmas falsos
        prompt = (
            f"Busque 15 '{niche_query}' em {location} usando o Google Maps. "
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
                print(f"🔎 [API] Chamando Gemini (Modelo: gemini-3-flash-preview) para {neighborhood}...")
                response = client.models.generate_content(
                    model="gemini-3-flash-preview", 
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_maps=types.GoogleMaps())],
                        tool_config=types.ToolConfig(
                            retrieval_config=types.RetrievalConfig(
                                lat_lng=types.LatLng(latitude=-27.595, longitude=-48.548)
                            )
                        ),
                        temperature=0.1
                    )
                )
                
                leads_data = extract_json_from_text(response.text)
                break # Sucesso na chamada, sai do loop de retentativas

            except Exception as e:
                error_msg = str(e)
                if "503" in error_msg:
                    if attempt < max_retries:
                        delay = backoff_times[attempt] + random.uniform(1, 3)
                        print(f"⚠️ [503] Service Unavailable. Tentativa {attempt + 1}/{max_retries}. Retentando em {delay:.1f}s...")
                        time.sleep(delay)
                        continue
                    else:
                        print(f"❌ [ERRO] Falha persistente 503 após {max_retries} tentativas para {neighborhood}.")
                        skip_neighborhood = True
                        break
                elif "400" in error_msg:
                    print(f"🛑 [400] Bad Request (Parâmetros Inválidos). Pulando bairro {neighborhood}...")
                    skip_neighborhood = True
                    break
                else:
                    print(f"❌ [ERRO INESPERADO] {error_msg}")
                    skip_neighborhood = True
                    break

        if skip_neighborhood or not leads_data:
            print(f"⏩ Pulando processamento para {neighborhood}.")
            continue

        print(f"🎯 {len(leads_data)} leads extraídos. Filtrando e persistindo...")

        for lead in leads_data:
            name = lead.get('name', 'Desconhecido')
            raw_url = lead.get('website')
            phone = lead.get('phone', 'Sem telefone')
            rating = lead.get('rating')

            # O filtro de realidade: remove lixo do Google
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
                if website:
                    print(f"   ✅ [COM SITE] Salvo: {name}")
                else:
                    print(f"   👻 [FANTASMA] Salvo: {name}")
            except Exception:
                print(f"   ⚠️ Ignorando duplicata: {name}")
                continue
        
        # Jitter no intervalo entre bairros
        next_neighborhood_delay = 5 + random.uniform(1, 3)
        print(f"⏳ Aguardando {next_neighborhood_delay:.1f}s para o próximo bairro...")
        time.sleep(next_neighborhood_delay)

    print("\n🏁 Mineração Geográfica concluída com sucesso!")

if __name__ == "__main__":
    run_hunter()
