import os
import time
from dotenv import load_dotenv
from google import genai # Novo SDK
from supabase import create_client, Client

# Garante que o .env seja carregado antes de qualquer verificação
load_dotenv()

# --- Configuração ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Debug visual para você saber o que está faltando
if not SUPABASE_URL: print("❌ Erro: SUPABASE_URL não encontrada.")
if not SUPABASE_KEY: print("❌ Erro: SUPABASE_KEY não encontrada.")
if not GEMINI_API_KEY: print("❌ Erro: GEMINI_API_KEY não encontrada.")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    exit(1)

# Inicializa clientes
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = genai.Client(api_key=GEMINI_API_KEY) # Sintaxe nova do SDK

def run_oracle():
    print("🔮 [ORACLE] Iniciando análise técnica...")
    
    # Busca leads frios sem diagnóstico
    leads = supabase.table('leads_lobo').select("id, niche, url").eq("status", "cold_lead").is_("ai_icebreaker", "null").limit(20).execute()
    
    if not leads.data:
        print("✅ Nenhum lead pendente.")
        return

    for lead in leads.data:
        lead_id = lead['id']
        niche = lead['niche']
        url = lead.get('url', 'URL não fornecida')

        print(f"🤖 Analisando Lead: {niche}...")

        try:
            # Prompt Challenger usando o Gemini 2.0 Flash (padrão do novo SDK)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=f"Nicho: {niche}. URL: {url}. Crie uma abordagem de 2 frases agressiva em pt-BR sobre falhas de performance e perda de receita. Sem saudações."
            )
            
            icebreaker = response.text.strip()
            
            if icebreaker:
                supabase.table('leads_lobo').update({"ai_icebreaker": icebreaker}).eq("id", lead_id).execute()
                print(f"   ✨ Sucesso: ID {lead_id}")
            
            time.sleep(2)
        except Exception as e:
            print(f"   ❌ Erro no processamento: {e}")

if __name__ == "__main__":
    run_oracle()