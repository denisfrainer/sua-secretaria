import sys
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

    # --- PATCH DE SINCRONIZAÇÃO TOTAL COM PAGINAÇÃO ---
    existing_names = set()
    existing_phones = set()
    try:
        limit = 1000
        offset = 0
        while True:
            # Puxa nome e telefone usando paginação para furar o teto de 1000 do Supabase
            res = supabase.table('leads_lobo').select('name, phone').range(offset, offset + limit - 1).execute()
            
            if not res.data:
                break
                
            for row in res.data:
                if row.get('name'):
                    existing_names.add(row['name'])
                if row.get('phone'):
                    existing_phones.add(row['phone'])
            
            if len(res.data) < limit: # Se retornou menos que 1000, é a última página
                break
                
            offset += limit
            
        print(f"📊 {len(existing_names)} nomes e {len(existing_phones)} telefones únicos já conhecidos carregados do Supabase.")
    except Exception as e:
        print(f"⚠️ Erro ao sincronizar base: {e}")
    # --------------------------------------------------

    sys.stdout.flush()

# Automated niche selection
    niches = [
        "clínicas de depilação", "depilação a laser", "depiladoras", 
        "design de sobrancelhas", "lash designers", "extensão de cílios", 
        "micropigmentação", "estúdios de unhas", "nail designers",

        # 🎯 TIER 1: Ouro Puro (Mão Ocupada + Alto Volume de Agendamento)
        # Conversão mais rápida para o pitch "Você para o serviço pra responder cliente?"
        "barbearias", "salões de beleza", "esmalterias", "estúdios de tatuagem",
        "clínicas de estética", "estética automotiva", "pet shops", "banho e tosa",

        # 🎯 TIER 2: Saúde e Bem-Estar (Recorrência e Agenda Lotada)
        # Tíquete médio alto, muita dúvida sobre convênio/preços
        "clínicas odontológicas", "consultórios médicos", "clínicas veterinárias",
        "fisioterapia", "estúdios de pilates", "academias", "crossfit",

        # 🎯 TIER 3: Turismo e Locais (Forte em Floripa)
        # Alto volume de dúvidas repetitivas (preço, horário, localização)
        "pousadas", "hostels", "passeios de barco", "escolas de surf", 
        "quadras de beach tennis", "aluguel de pranchas",
        
        # 🎯 TIER 4: Serviços de Alto Valor (Lead Qualification)
        # Eliza atua filtrando curiosos antes de passar pro humano
        "imobiliárias", "construtoras", "energia solar", "móveis planejados", 
        "oficinas mecânicas especializadas"
    ]

    city = [
        "Florianópolis, SC",
        "Porto Alegre, RS",
        "Curitiba, PR"
    ]

    keyword = random.choice(niches)
    city = random.choice(city)

    print(f"🎯 Target Niche: {keyword.upper()} | 📍 City: {city}")
    sys.stdout.flush()

    prompt = (
        f"Search for {50} real and active businesses in the '{keyword}' niche in {city}. "
        "CRITICAL: You must provide a valid phone number for every business. "
        "If the phone is not on the main page, check their Instagram or contact page. "
        "You must extract the phone number from the Google Search results. If a business does not have a valid, visible phone number, DO NOT include it in the final JSON array under any circumstances. Strictly return only businesses that possess a valid phone number."
        "Return a JSON array: [{'name': '...', 'website': '...', 'phone': '...', 'rating': ...}]"
        "CRITICAL RULE: STOP GENERATION AT EXACTLY 50 LEADS. You must return a maximum of 50 valid items in the JSON array. Do not include a 51st item under any circumstances. Prioritize quality over quantity."
        "CRITICAL RULE: Return ONLY the raw JSON array. DO NOT include greetings, apologies, explanations, or any conversational text before or after the JSON code block. Output nothing else."
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
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
                ],
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

# Extração de dados robusta (Sniper Extraction com Sanitização)
        leads_data = []
        try:
            raw_text = response.text
            
            # 1. Limpeza de Markdown (Remove ```json e ``` de qualquer parte do texto)
            clean_text = re.sub(r"```[a-zA-Z]*", "", raw_text)
            
            # 2. Corrige a alucinação de arrays divididos (ex: "]\n[" ou "][" vira ",")
            clean_text = re.sub(r"\]\s*\[", ",", clean_text)
            
            # 3. Busca os limites reais do array após a limpeza
            start_idx = clean_text.find('[')
            end_idx = clean_text.rfind(']')
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = clean_text[start_idx:end_idx+1]
                
                # 4. Remove caracteres de controle invisíveis
                json_str_clean = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', json_str)
                
                # 5. Parse final
                leads_data = json.loads(json_str_clean, strict=False)
            else:
                raise ValueError("Array JSON não delimitado na resposta.")
                
        except Exception as json_err:
            print(f"❌ Falha ao processar JSON: {json_err}")
            with open("error_log.txt", "a", encoding="utf-8") as f:
                f.write(f"\n--- ERRO ({timestamp}) ---\n{response.text}\n")
            print("--- INÍCIO DA RESPOSTA BRUTA ---")
            print(response.text) 
            print("--- FIM DA RESPOSTA BRUTA ---")
            sys.stdout.flush()

        if leads_data:
            print(f"✅ SUCESSO! O Lobo encontrou {len(leads_data)} empresas reais:")

            # 1. Crie o contador antes de começar a processar os leads
            saved_count = 0

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
                if name in existing_names or clean_phone in existing_phones:
                    print(f"   ⏭️ [SKIP] Lead já salvo: {name} | {clean_phone}")
                    sys.stdout.flush()
                    continue
                # ----------------------------
                # --- BLOCO DE SALVAMENTO NO SUPABASE ---
                data = {
                    "name": name,
                    "niche": keyword.capitalize(),
                    "city": city,
                    "website": lead.get('website') if lead.get('website') else None,
                    "phone": clean_phone,
                    "maps_rating": float(lead.get('rating') or 0.0),
                    "status": "cold_lead"
                }

                try:
                    supabase.table('leads_lobo').insert(data).execute()
                    print(f"   💾 [DB] {name} salvo com sucesso.")
                    existing_names.add(name) # Evita duplicados na mesma rodada
                    existing_phones.add(clean_phone)
                    saved_count += 1 # Incrementa o contador
                except Exception as e:
                    if "23505" in str(e):
                        print(f"   ⏭️ [SKIP] Telefone de {name} já existe no banco.")
                    else:
                        print(f"   ❌ [DB ERROR] Falha ao salvar {name}: {e}")
                # ---------------------------------------

            # 2. Imprima o resumo no final
            print(f"\n{'='*50}")
            print(f"📊 RESUMO DA CAÇADA:")
            print(f"   Empresas encontradas: {len(leads_data)}")
            print(f"   Empresas salvas no banco: {saved_count}")
            print(f"   Empresas ignoradas (duplicadas): {len(leads_data) - saved_count}")
            print(f"{'='*50}\n")

    except Exception as e:
        print(f"❌ ERRO TÉCNICO: {e}")

if __name__ == "__main__":
    run_hunter()