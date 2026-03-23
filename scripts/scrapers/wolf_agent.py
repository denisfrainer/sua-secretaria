import os
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# --- Setup de Ambiente ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
# Argumento version='v1' adicionado para forçar o endpoint estável
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"), http_options={'api_version': 'v1'})

def run_sniper():
    print("🐺 [WOLF AGENT: SNIPER] Iniciando Auditoria e Copywriting...")
    
    # 1. Busca leads que PRECISAM de auditoria (tem site, mas não tem pitch)
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

        prompt = (
            f"Você é um especialista em vendas e performance web. "
            f"Analise o site {url}. "
            f"Identifique falhas visíveis de performance (LCP/FCP) usando a ferramenta url_context. "
            f"Crie um 'Pitch Challenger' agressivo e curto (2 frases) em pt-BR. "
            f"A empresa tem nota {rating} no Google Maps. Conecte a nota com a falha do site para gerar urgência de compra de uma Landing Page Next.js. "
            f"Use a função update_lead_pitch para salvar a análise e o pitch."
        )

        try:
            # Configura a Custom Tool para salvar o Pitch
            update_tool = types.Tool(
                function_declarations=[{
                    "name": "update_lead_pitch",
                    "description": "Atualiza o lead no banco com a auditoria e o texto de venda.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "technical_audit": {"type": "string", "description": "Resumo do problema técnico encontrado no site."},
                            "pitch": {"type": "string", "description": "O texto persuasivo gerado para enviar no WhatsApp."}
                        },
                        "required": ["technical_audit", "pitch"]
                    }
                }]
            )

            res = client.models.generate_content(
                model="gemini-3-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.UrlContext(), update_tool],
                    tool_config=types.ToolConfig(
                        include_server_side_tool_invocations=True,
                        function_calling_config=types.FunctionCallingConfig(
                            mode="ANY",
                            allowed_function_names=["update_lead_pitch"]
                        )
                    ),
                    temperature=0.3
                )
            )
            
            calc_time = round(time.time() - start_time, 1)
            print(f"⏱️ [LATENCY] API respondeu em {calc_time}s")

            # Processar a chamada de função
            sucesso = False
            for part in res.candidates[0].content.parts:
                if part.function_call and part.function_call.name == "update_lead_pitch":
                    args = part.function_call.args
                    audit = args.get('technical_audit')
                    pitch = args.get('pitch')
                    
                    supabase.table('leads_lobo').update({
                        "technical_audit": audit,
                        "ai_icebreaker": pitch
                    }).eq("id", lead_id).execute()
                    
                    print(f"   ✅ Sucesso! Pitch: {pitch}\n")
                    sucesso = True
            
            if not sucesso:
                print("   ⚠️ Aviso: A IA não chamou a ferramenta de persistência. Pulando...\n")

        except Exception as e:
            print(f"   ❌ ERRO DA API: Ocorreu uma falha no processamento deste lead.")
            print(f"   🔍 Log: {str(e)[:150]}...\n") 
        
        time.sleep(3)

if __name__ == "__main__":
    run_sniper()
