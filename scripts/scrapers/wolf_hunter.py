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

# --- Setup de Ambiente ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

# 1. Initialize the Client with version='v1beta'
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"), 
    http_options={'api_version': 'v1beta'}
)

def extract_json_from_text(text: str) -> list:
    """Extrai e limpa o JSON da resposta do Gemini."""
    try:
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
        json_str = match.group(1) if match else text.strip()
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"❌ Falha de decodificação JSON: {e}")
        sys.stdout.flush()
        return []

def clean_website(url: str) -> str | None:
    """Filtra as URLs internas do Google Maps."""
    if not url or str(url).lower() in ["none", "null", ""]:
        return None
    if "googleusercontent.com" in url or "maps.google.com" in url:
        return None
    return url

def normalize_phone(phone: str) -> str:
    """Remove caracteres não numéricos e força o padrão de 12 dígitos (sem o 9)."""
    if not phone or str(phone).lower() in ["none", "null", "sem telefone", ""]:
        return "55"
    
    # Remove tudo que não for número
    digits = re.sub(r'\D', '', str(phone))
    
    # Adiciona prefixo 55 se não existir
    if not digits.startswith('55'):
        digits = f"55{digits}"
    
    # Se tiver 13 dígitos (DDI + DDD + 9 dígitos), remove o 5º dígito (o 9)
    if len(digits) == 13:
        digits = digits[:4] + digits[5:]
        
    return digits

def run_hunter():
    print("🐺 [WOLF AGENT: HUNTER] Iniciando Estratégia de Alto Volume (Internal Knowledge Mode)...")
    sys.stdout.flush()

    # 4. Deduplication logic with existing_names
    print("🔄 Sincronizando base de dados local...")
    sys.stdout.flush()
    existing_names = set()
    try:
        response = supabase.table('leads_lobo').select('name').execute()
        if response.data:
            existing_names = {row['name'] for row in response.data if row.get('name')}
        print(f"📊 {len(existing_names)} leads já conhecidos carregados.")
        sys.stdout.flush()
    except Exception as e:
        print(f"⚠️ Erro ao sincronizar base: {e}")
        sys.stdout.flush()
    
    BROAD_KEYWORDS = [
        'restaurantes', 
        'clínicas odontológicas', 
        'escritórios de advocacia', 
        'academias', 
        'estética', 
        'pet shops', 
        'imobiliárias', 
        'hospedagens'
    ]
    
    selected_keywords = random.sample(BROAD_KEYWORDS, 3)
    
    for keyword in selected_keywords:
        query = f"{keyword} em Florianópolis, SC"
        print(f"\n🎯 Minerando Alvo: {query}...")
        sys.stdout.flush()

        # 3. Updated prompt to use internal knowledge and prioritize companies without website
        prompt = (
            f"Liste 15 empresas reais e conhecidas do nicho '{keyword}' em Florianópolis, SC. "
            "Priorize empresas que NÃO possuem site oficial ou página de vendas em seu banco de dados interno. "
            "Retorne APENAS um array JSON válido com as chaves: "
            "'name' (string), 'website' (string ou null), 'phone' (string) e 'rating' (number). "
            "Use seu conhecimento interno. Nenhum texto adicional."
        )

        try:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"💓 [REQUEST] {timestamp} | Gemini-3-Flash-Preview (Internal Knowledge)")
            sys.stdout.flush()
            
            start_api = time.time()
            
            # 1. Exponential Backoff retry mechanism for the Gemini API call
            response = None
            for attempt in range(3):
                try:
                    response = client.models.generate_content(
                        model="gemini-3-flash-preview", 
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.1
                        )
                    )
                    # 2. If the call is successful, break out of the retry loop
                    break
                except Exception as e:
                    # 3. If an exception occurs, print a warning
                    print(f"⚠️ [TENTATIVA {attempt+1}/3] Servidor ocupado, aguardando...")
                    sys.stdout.flush()
                    # 4. Exponential wait: 10s, 20s
                    if attempt < 2:
                        time.sleep(10 * (attempt + 1))
                    else:
                        # 5. If all 3 attempts fail, raise the exception to be caught by the outer loop
                        raise e

            latency = time.time() - start_api
            print(f"⏱️ [LATENCY] {latency:.2f}s")
            sys.stdout.flush()
            
            leads_data = extract_json_from_text(response.text)
            
            if leads_data:
                print(f"✅ {len(leads_data)} leads encontrados. Processando validação...")
                sys.stdout.flush()
                
                for lead in leads_data:
                    name = lead.get('name')
                    
                    if not name or str(name).strip().upper() in ["", "NONE", "NULL"]:
                        print(f"   🚫 [SKIP] Nome inválido: {name}")
                        sys.stdout.flush()
                        continue

                    if name in existing_names:
                        print(f"   ⏭️ [SKIP] Lead já existente: {name}")
                        sys.stdout.flush()
                        continue

                    # Limpeza de Website (mantendo lógica anterior)
                    website = clean_website(lead.get('website'))
                    
                    # Normalização de Telefone (Nova função com regex e prefixo 55)
                    raw_phone = lead.get('phone', '')
                    normalized_phone = normalize_phone(raw_phone)
                    
                    # Garantia de maps_rating como 0.0 se nulo ou inválido
                    try:
                        raw_rating = lead.get('rating')
                        maps_rating = float(raw_rating) if raw_rating is not None else 0.0
                    except (ValueError, TypeError):
                        maps_rating = 0.0

                    data = {
                        "name": name,
                        "niche": keyword.capitalize(),
                        "website": website if website else "None", 
                        "phone": normalized_phone,
                        "maps_rating": maps_rating,
                        "status": "cold_lead"
                    }

                    # 4. Supabase persistence
                    try:
                        supabase.table('leads_lobo').insert(data).execute()
                        status_tag = "SITE" if website else "FANTASMA"
                        print(f"   📥 [{status_tag}] {name} | 📱 {normalized_phone}")
                        sys.stdout.flush()
                        existing_names.add(name)
                    except Exception as e:
                        print(f"   ❌ [INSERT ERROR] {name}: {e}")
                        sys.stdout.flush()
                        continue
            else:
                print(f"⚠️ Nenhum dado extraído para a query: {query}")
                sys.stdout.flush()

        except Exception as e:
            # 5. Outer loop catches the raised exception and moves to next keyword
            print(f"❌ [ERRO NO LOOP] {str(e)[:150]}")
            sys.stdout.flush()
        
        # 5. sys.stdout.flush() maintained
        time.sleep(5)
        sys.stdout.flush()

    print("\n🏁 SHUTDOWN: Extração broad finalizada com sucesso.")
    sys.stdout.flush()

if __name__ == "__main__":
    run_hunter()
