import os
import time
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

# 1. Initialize the Client with version='v1beta'
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"),
    version='v1beta'
)

def run_sniper():
    print("🐺 [WOLF AGENT: SNIPER] Iniciando Auditoria e Copywriting...")
    
    # 6. Mantendo batch processing logic for 20 leads
    print("🔎 Consultando banco de dados por alvos...")
    try:
        response = supabase.table('leads_lobo') \
            .select("id, niche, website, maps_rating") \
            .eq("status", "cold_lead") \
            .is_("ai_icebreaker", "null") \
            .neq("website", "None") \
            .limit(20) \
            .execute()
        leads = response.data
    except Exception as e:
        print(f"❌ Erro ao conectar com Supabase: {e}")
        return

    if not leads:
        print("✅ Nenhum alvo com website pendente de auditoria no momento.")
        return

    print(f"🎯 {len(leads)} alvos encontrados. Carregando munição...\n")

    # 2. Loop Agêntico
    for lead in leads:
        lead_id = lead['id']
        niche = lead['niche']
        url = lead.get('website')
        rating = lead.get('maps_rating') or "Sem nota"

        print(f"🤖 [ALVO] {url} (Nicho: {niche} | Maps: {rating})")
        print("⏳ Lendo site e gerando pitch... (Aguardando API)")
        
        start_time = time.time()

        # 3. Logic: Modify the internal prompt to request a structured text response using a delimiter
        prompt = (
            f"Você é um especialista em vendas e performance web. "
            f"Analise o site {url}. "
            f"Identifique falhas visíveis de performance (LCP/FCP) usando ferramentas de busca. "
            f"Crie um 'Pitch Challenger' agressivo e curto (2 frases) em pt-BR. "
            f"A empresa tem nota {rating} no Google Maps. Conecte a nota com a falha do site para gerar urgência de compra de uma Landing Page Next.js. "
            f"Retorne o resultado estritamente no formato: AUDIT: [resumo do problema técnico] | PITCH: [texto persuasivo]"
        )

        try:
            # 2. Tooling: Use only 'types.Tool(google_search=types.GoogleSearch())'
            # Completely remove the 'update_lead_pitch' function declaration
            res = client.models.generate_content(
                model="gemini-3-flash-preview", # 1. Set model to 'gemini-3-flash-preview'
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.3
                )
            )
            
            calc_time = round(time.time() - start_time, 1)
            # 6. Maintain latency logs
            print(f"⏱️ [LATENCY] API respondeu em {calc_time}s")

            # 4. Implementation: Use Python string parsing to extract the audit and pitch
            response_text = res.text if res.text else ""
            
            # Simple parsing using split or regex
            if "AUDIT:" in response_text and "PITCH:" in response_text:
                try:
                    # Regex for more robust extraction
                    match = re.search(r"AUDIT:(.*)\|.*PITCH:(.*)", response_text, re.DOTALL | re.IGNORECASE)
                    if not match:
                        # Fallback to simple split
                        parts = response_text.split("|")
                        audit = parts[0].replace("AUDIT:", "").strip()
                        pitch = parts[1].replace("PITCH:", "").strip()
                    else:
                        audit = match.group(1).strip()
                        pitch = match.group(2).strip()

                    # 5. Persistence: Use the existing 'supabase' client directly to update
                    supabase.table('leads_lobo').update({
                        "technical_audit": audit,
                        "ai_icebreaker": pitch
                    }).eq("id", lead_id).execute()
                    
                    print(f"   ✅ Sucesso! Pitch: {pitch}\n")
                except Exception as parse_err:
                    print(f"   ⚠️ Erro ao processar formato de resposta: {parse_err}")
                    print(f"   DEBUG_RAW: {response_text}")
            else:
                print(f"   ⚠️ Resposta fora do formato esperado. DEBUG_RAW: {response_text}")

        except Exception as e:
            print(f"   ❌ ERRO DA API: Ocorreu uma falha no processamento deste lead.")
            # 5. Capture precise validation failure
            if hasattr(e, 'response') and e.response:
                print(f"DEBUG_SNIPER: {e.response.text}")
            print(f"   🔍 Log: {str(e)[:150]}...\n") 
        
        # 6. Maintain heartbeat/sleep
        time.sleep(3)

if __name__ == "__main__":
    run_sniper()
