import os
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# --- Setup de Ambiente (Absolute Pathing) ---
# Garante que o .env seja encontrado na raiz, independente de onde o script rode
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=env_path)

# --- Configurações das Chaves ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    print(f"❌ Erro crítico: Chaves não encontradas em {env_path}")
    exit(1)

# --- Inicialização de Clientes ---
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = genai.Client(api_key=GEMINI_API_KEY)

def get_site_audit(url: str) -> str:
    """
    Realiza o audit técnico real para dar 'munição' ao pitch do Lobo.
    """
    if not url or url == "None" or "http" not in str(url):
        return "Lead sem site: focar na invisibilidade digital total e perda de autoridade local."
    
    try:
        start_time = time.time()
        # User-agent para evitar bloqueios simples de scrapers
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, timeout=10, headers=headers)
        duration = round(time.time() - start_time, 2)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        h1 = soup.find('h1')
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        
        audit_data = [
            f"Velocidade de carregamento: {duration}s",
            f"Tag H1: {'Otimizada' if h1 else 'Faltando (Grave)'}",
            f"SEO Meta Description: {'Presente' if meta_desc else 'Ausente'}",
            f"Status Code: {response.status_code}"
        ]
        return " | ".join(audit_data)
        
    except Exception as e:
        return f"Site instável ou inacessível. Erro: {str(e)[:50]}. Focar na urgência de estabilidade e Next.js."

def run_oracle():
    print(f"🔮 [ORACLE] Iniciando auditoria técnica para Wolf Agent...")

    # Seleção estratégica: status frio, sem pitch gerado e com website preenchido
    try:
        leads = supabase.table('leads_lobo').select("id, niche, website") \
            .eq("status", "cold_lead") \
            .is_("ai_icebreaker", "null") \
            .not_.is_("website", "null") \
            .limit(20).execute()
    except Exception as e:
        print(f"❌ Erro ao acessar Supabase: {e}")
        return

    if not leads.data:
        print("✅ Nenhum lead pendente para auditoria.")
        return

    print(f"📈 Encontrados {len(leads.data)} leads para processar.")

    for lead in leads.data:
        lead_id = lead['id']
        niche = lead.get('niche', 'Nicho Geral')
        website = lead.get('website')

        print(f"🔎 Analisando: {niche} -> {website}...")
        
        # Auditoria técnica real
        audit_context = get_site_audit(website)

        try:
            # Modelo Gemini 3 Flash (Padrão Ouro 2026)
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "Você é um Senior B2B Tech Closer especializado em high-performance websites (Next.js). "
                        "Seu tom é direto, técnico e agressivo. Você não cumprimenta, você aponta o problema. "
                        "Sua meta é converter o erro técnico detectado em uma prova de perda de faturamento."
                    ),
                    temperature=0.75,
                    max_output_tokens=150
                ),
                contents=(
                    f"Nicho do Lead: {niche}\n"
                    f"Dados da Auditoria: {audit_context}\n"
                    "Crie uma abordagem de exatas 2 frases em pt-BR. "
                    "Frase 1: Ataque o erro técnico (velocidade ou SEO). "
                    "Frase 2: Conecte isso à perda de receita e sugira a solução via Next.js."
                )
            )
            
            icebreaker = response.text.strip()
            
            if icebreaker:
                supabase.table('leads_lobo').update({"ai_icebreaker": icebreaker}).eq("id", lead_id).execute()
                print(f"   ✨ Sucesso: Pitch gerado para ID {lead_id}")
            
            # Delay para evitar rate-limit e parecer humano nas requisições do audit
            time.sleep(2.5)

        except Exception as e:
            print(f"   ❌ Erro no Gemini/Update para ID {lead_id}: {e}")

if __name__ == "__main__":
    run_oracle()