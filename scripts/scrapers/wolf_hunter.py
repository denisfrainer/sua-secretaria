import os
import json
import re
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
    print("🐺 [WOLF AGENT: HUNTER] Iniciando Mineração Geográfica...")
    
    niche_query = "Clínica Odontológica"
    location = "Florianópolis, SC"
    
    # Pedimos JSON via instrução textual, já que o parâmetro MIME type gera erro 400 com o Maps
    prompt = (
        f"Busque 5 '{niche_query}' em {location} usando o Google Maps. "
        "Retorne APENAS um array JSON válido. Cada objeto deve ter as chaves: "
        "'name' (string), 'website' (string ou null), 'phone' (string) e 'rating' (number). "
        "Nenhum texto adicional."
    )

    print(f"🔎 Acionando Google Maps via Gemini para: {niche_query} na Trindade/Centro...")
    
    try:
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
        
        if not leads_data:
            print("⚠️ A extração falhou ou retornou vazio.")
            return

        print(f"🎯 {len(leads_data)} leads extraídos do Maps. Filtrando e persistindo...\n")

        for lead in leads_data:
            name = lead.get('name', 'Desconhecido')
            raw_url = lead.get('website')
            phone = lead.get('phone', 'Sem telefone')
            rating = lead.get('rating')

            # O filtro de realidade: remove lixo do Google
            website = clean_website(raw_url)

            data = {
                "niche": name, # Utilizando a coluna niche para guardar o nome da empresa
                "website": website if website else "None", 
                "phone": phone,
                "maps_rating": float(rating) if rating else 0.0,
                "status": "cold_lead"
            }

            try:
                supabase.table('leads_lobo').insert(data).execute()
            except Exception:
                print("   ⚠️ Ignorando duplicata: Lead ja existe no banco")
                continue
            
            if website:
                print(f"   ✅ [COM SITE] Salvo: {name} (Nota: {rating})")
            else:
                print(f"   👻 [FANTASMA] Salvo: {name} (Nota: {rating}) - Pronto para pitch de invisibilidade.")

    except Exception as e:
        print(f"❌ ERRO CRÍTICO no Hunter: {str(e)}")

if __name__ == "__main__":
    run_hunter()
