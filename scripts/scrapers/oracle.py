import os
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# --- Configuração de Ambiente ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def get_technical_audit(url: str) -> str:
    """Auditoria de performance e SEO on-page."""
    if not url or "http" not in str(url):
        return "Sem website: invisibilidade digital completa."
    try:
        start = time.time()
        res = requests.get(url, timeout=8, headers={'User-Agent': 'WolfAgent/1.0'})
        duration = round(time.time() - start, 2)
        soup = BeautifulSoup(res.text, 'html.parser')
        h1 = soup.find('h1')
        return f"Site carrega em {duration}s. SEO H1: {'OK' if h1 else 'Faltando'}."
    except:
        return "Site offline ou bloqueando acesso."

def run_hyper_local_oracle():
    print("🐺 [WOLF AGENT] Iniciando Hyper-Local Closer...")

    # Busca leads frios de Floripa
    leads = supabase.table('leads_lobo').select("id, niche, website, city") \
        .eq("status", "cold_lead") \
        .is_("ai_icebreaker", "null") \
        .limit(10).execute()

    if not leads.data:
        print("✅ Tudo limpo. Sem leads pendentes.")
        return

    for lead in leads.data:
        lead_id, niche, website = lead['id'], lead['niche'], lead.get('website')
        
        # 1. Auditoria Técnica
        tech_context = get_technical_audit(website)
        
        print(f"🔎 Analisando {niche} em Florianópolis...")

        try:
            # 2. IA + Maps Grounding (O 'Hyper-Local' Tweak)
            response = client.models.generate_content(
                model='gemini-3-flash-preview',
                contents=(
                    f"Analise a reputação local da empresa '{niche}' em Florianópolis. "
                    f"Compare com o contexto técnico: {tech_context}. "
                    "Gere um pitch Challenger agressivo de 2 frases em pt-BR. "
                    "Frase 1: Conecte a nota/reputação do Google Maps com a falha técnica do site. "
                    "Frase 2: Sugira que o Next.js é a única forma de parar de perder clientes para o vizinho."
                ),
                config=types.GenerateContentConfig(
                    system_instruction="Você é o Lobo de Floripa, um Senior Dev que não tolera amadorismo digital.",
                    # Ativa a busca no Google Maps
                    tools=[types.Tool(google_maps=types.GoogleMaps())],
                    # Trava a busca em Florianópolis
                    tool_config=types.ToolConfig(
                        retrieval_config=types.RetrievalConfig(
                            lat_lng=types.LatLng(latitude=-27.595, longitude=-48.548)
                        )
                    ),
                    temperature=0.7
                ),
            )

            pitch = response.text.strip()
            
            # 3. Update no Supabase
            if pitch:
                supabase.table('leads_lobo').update({"ai_icebreaker": pitch}).eq("id", lead_id).execute()
                print(f"   ✨ Pitch Gerado: {lead_id}")
            
            # Delay para respeitar o quota do Maps Grounding (Free: 500 RPD)
            time.sleep(5)

        except Exception as e:
            print(f"   ❌ Erro no Processamento: {e}")

if __name__ == "__main__":
    run_hyper_local_oracle()