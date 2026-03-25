import socket
import os
import json
import re
import time
import random
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client

# --- PATCH CRÍTICO: FORÇAR IPV4 PARA EVITAR TIMEOUT NO WINDOWS ---
orig_getaddrinfo = socket.getaddrinfo
def patched_getaddrinfo(*args, **kwargs):
    responses = orig_getaddrinfo(*args, **kwargs)
    return [res for res in responses if res[0] == socket.AF_INET]
socket.getaddrinfo = patched_getaddrinfo
# --------------------------------------------------------------

def normalize_phone(phone: str) -> str | None:
    """Remove caracteres não numéricos e garante o padrão DDI 55."""
    if not phone or str(phone).lower() in ["none", "null", "n/a", ""]:
        return None
    
    # Mantém apenas números
    digits = re.sub(r'\D', '', str(phone))
    
    if not digits:
        return None
        
    # Garante o DDI 55 (Brasil)
    if not digits.startswith('55'):
        digits = f"55{digits}"
        
    return digits

# Setup de Ambiente
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

# Inicialização do Client (v1beta + Timeout de 5 minutos)
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"), 
    http_options={'api_version': 'v1beta'}
)

def run_hunter():
    print("🐺 [WOLF AGENT: HUNTER] Iniciando Caçada com Grounding (50 Leads)...")

    # --- ADICIONE ESTA PARTE AQUI (Sincronização com o Banco) ---
    existing_names = set()
    existing_phones = set()
    try:
        # Busca apenas os nomes dos leads já cadastrados
        res = supabase.table('leads_lobo').select('name').execute()
        if res.data:
            existing_names = {row['name'] for row in res.data if row.get('name')}
        print(f"📊 {len(existing_names)} leads já conhecidos carregados.")
    except Exception as e:
        print(f"⚠️ Erro ao sincronizar base: {e}")
    # ------------------------------------------------------------

    sys.stdout.flush()

# Automated niche selection
    nichos = [
        "restaurantes", "pousadas", "clinicas", "imobiliarias", 
        "academias", "passeios", "estetica", "energia solar", 
        "experiências", "escritórios", "pet shops", "hospedagens",
    ]
    keyword = random.choice(nichos)
    query = f"{keyword} em Florianópolis, SC"
    
    print(f"🎯 Target Niche: {keyword.upper()}")
    
    # PROMPT REDUZIDO PARA 3 LEADS (TESTE DE FOGO)
# Mude o prompt para algo assim:
    prompt = (
        f"Search for {50} real and active businesses in the '{keyword}' niche in Florianópolis, SC. "
        "CRITICAL: You must provide a valid phone number for every business. "
        "If the phone is not on the main page, check their Instagram or contact page. "
        "You must extract the phone number from the Google Search results. If a business does not have a valid, visible phone number, DO NOT include it in the final JSON array under any circumstances. Strictly return only businesses that possess a valid phone number."
        "Return a JSON array: [{'name': '...', 'website': '...', 'phone': '...', 'rating': ...}]"
        "CRITICAL RULE: STOP GENERATION AT EXACTLY 50 LEADS. You must return a maximum of 50 valid items in the JSON array. Do not include a 51st item under any circumstances. Prioritize quality over quantity."
    )   

    try:
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"💓 [REQUEST] {timestamp} | Gemini-2.5-Flash-Lite + Google Search")
        sys.stdout.flush()

        # --- ADICIONE ESTA LINHA AQUI ---
        start_api = time.time()

        # Chamada com a sintaxe correta para 2026
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite", 
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                # Sintaxe oficial: GoogleSearch() sem o "Retrieval"
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )

        latency = time.time() - start_api
        print(f"⏱️ [LATENCY] {latency:.2f}s")    
        sys.stdout.flush()

        # ... (depois do latency)
        if not response.text:
            print("⚠️ O Gemini retornou uma resposta vazia. Verifique o Safety Filter ou Rate Limit.")
            return # Sai da função para não quebrar no json.loads

# Extração de dados robusta com sanitização
        leads_data = []
        try:
            match = re.search(r'```json\s*(.*?)\s*```', response.text, re.DOTALL | re.IGNORECASE)
            json_str = match.group(1) if match else response.text.strip()
            
            if json_str:
                # Remove caracteres de controle invisíveis que quebram a leitura
                json_str_clean = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', json_str)
                leads_data = json.loads(json_str_clean, strict=False)
                
        except Exception as json_err:
            print(f"❌ Falha ao processar JSON: {json_err}")
            with open("error_log.txt", "a", encoding="utf-8") as f:
                f.write(f"\n--- ERRO ---\n{response.text}\n")

        if leads_data:
            print(f"✅ SUCESSO! O Lobo encontrou {len(leads_data)} empresas reais:")
            for lead in leads_data:
                name = lead.get('name')
                raw_phone = lead.get('phone')
                clean_phone = normalize_phone(raw_phone)
                print(f"   📥 [GROUNDED] {lead.get('name')} | 📱 {lead.get('phone')}")

                # 2. Trava de Qualidade: Descarta imediatamente se não houver telefone
                if not clean_phone or len(clean_phone) < 10:
                    print(f"   🗑️ [REJECT] {name} | Motivo: Sem telefone válido")
                    continue # <-- Esta é a palavra-chave que pula o salvamento

                # --- REMOÇÃO DO 9º DÍGITO ---
                if len(clean_phone) == 13 and clean_phone[4] == '9':
                    clean_phone = clean_phone[:4] + clean_phone[5:]
                
                # --- BLOCO DE VERIFICAÇÃO ---
                if name in existing_names or clean_phone in existing_names:
                    print(f"   ⏭️ [SKIP] Lead já salvo: {name}")
                    sys.stdout.flush()
                    continue
                # ----------------------------
                # --- BLOCO DE SALVAMENTO NO SUPABASE ---
                data = {
                    "name": name,
                    "niche": keyword.capitalize(),
                    "website": lead.get('website') or "None",
                    "phone": clean_phone,
                    "maps_rating": float(lead.get('rating') or 0.0),
                    "status": "cold_lead"
                }

                try:
                    supabase.table('leads_lobo').insert(data).execute()
                    print(f"   💾 [DB] {name} salvo com sucesso.")
                    existing_names.add(name) # Evita duplicados na mesma rodada
                except Exception as e:
                    print(f"   ❌ [DB ERROR] Falha ao salvar {name}: {e}")
                # ---------------------------------------
        else:
            print("⚠️ O modelo respondeu, mas não trouxe leads.")

    except Exception as e:
        print(f"❌ ERRO TÉCNICO: {e}")

if __name__ == "__main__":
    run_hunter()