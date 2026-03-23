import os
import time
import json
import re
import sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# --- Setup de Ambiente ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

# 1. Initialize the Client with version='v1beta' and model='gemini-3-flash-preview'
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"),
    version='v1beta'
)

def run_sniper():
    print("🐺 [WOLF AGENT: SNIPER] Iniciando Auditoria e Copywriting...")
    sys.stdout.flush()
    
    # 6. Mantendo batch processing logic for 20 leads
    print("🔎 Consultando banco de dados por alvos...")
    sys.stdout.flush()
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
        sys.stdout.flush()
        return

    if not leads:
        print("✅ Nenhum alvo com website pendente de auditoria no momento.")
        sys.stdout.flush()
        return

    print(f"🎯 {len(leads)} alvos encontrados. Carregando munição...\n")
    sys.stdout.flush()

    # 2. Loop Agêntico
    for lead in leads:
        lead_id = lead['id']
        niche = lead['niche']
        url = lead.get('website')
        rating = lead.get('maps_rating') or "Sem nota"

        print(f"🤖 [ALVO] {url} (Nicho: {niche} | Maps: {rating})")
        print("⏳ Lendo site e gerando pitch... (Aguardando API)")
        sys.stdout.flush()
        
        start_time = time.time()

        # 3. Prompt: Instruct the model to return a raw JSON string
        prompt = (
            f"Você é um especialista em vendas e performance web. "
            f"Analise o site {url}. "
            f"Identifique falhas visíveis de performance (LCP/FCP) usando ferramentas de busca. "
            f"Crie um 'Pitch Challenger' agressivo e curto (2 frases) em pt-BR. "
            f"A empresa tem nota {rating} no Google Maps. Conecte a nota com a falha do site para gerar urgência de compra de uma Landing Page Next.js. "
            f"Retorne o resultado estritamente como um objeto JSON válido com as chaves: "
            f"\"technical_audit\" (string) e \"pitch\" (string). Não adicione nenhum outro texto."
        )

        try:
            # 2. Tooling: Use ONLY 'tools=[types.Tool(google_search=types.GoogleSearch())]'
            res = client.models.generate_content(
                model="gemini-3-flash-preview", 
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.3
                )
            )
            
            calc_time = round(time.time() - start_time, 1)
            # 6. Maintain latency logs and sys.stdout.flush()
            print(f"⏱️ [LATENCY] API respondeu em {calc_time}s")
            sys.stdout.flush()

            # 4. Logic: Parse the JSON response
            response_text = res.text if res.text else ""
            
            # Clean possible markdown formatting
            clean_json = re.sub(r'```json|```', '', response_text).strip()
            
            try:
                data = json.loads(clean_json)
                audit = data.get("technical_audit")
                pitch = data.get("pitch")

                if audit and pitch:
                    # 5. Persistence: Call supabase.table("leads_lobo").update(...) directly
                    supabase.table('leads_lobo').update({
                        "technical_audit": audit,
                        "ai_icebreaker": pitch
                    }).eq("id", lead_id).execute()
                    
                    print(f"   ✅ Sucesso! Pitch: {pitch}\n")
                    sys.stdout.flush()
                else:
                    print(f"   ⚠️ Erro: Campos obrigatórios ausentes no JSON. DEBUG_RAW: {response_text}")
                    sys.stdout.flush()

            except json.JSONDecodeError:
                print(f"   ⚠️ Erro ao decodificar JSON. DEBUG_RAW: {response_text}")
                sys.stdout.flush()

        except Exception as e:
            print(f"   ❌ ERRO DA API: Ocorreu uma falha no processamento deste lead.")
            # Capture precise validation failure
            if hasattr(e, 'response') and e.response:
                print(f"DEBUG_SNIPER: {e.response.text}")
            print(f"   🔍 Log: {str(e)[:150]}...\n") 
            sys.stdout.flush()
        
        time.sleep(3)

if __name__ == "__main__":
    run_sniper()
