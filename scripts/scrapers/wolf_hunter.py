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

# Importa o módulo que você criou
from discover_whatsapp import discover_whatsapp

# --- Setup de Ambiente ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / '.env')

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

# Initialize the Client with version='v1beta'
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"), 
    http_options={'api_version': 'v1beta', 'timeout': 30.0}
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

def normalize_phone(phone: str) -> str | None:
    """Remove caracteres não numéricos e força o padrão. Retorna None se inválido."""
    if not phone or str(phone).lower() in ["none", "null", "sem telefone", ""]:
        return None
    
    digits = re.sub(r'\D', '', str(phone))
    
    if not digits:
        return None
        
    if not digits.startswith('55'):
        digits = f"55{digits}"
    
    # Se tiver 13 dígitos (DDI + DDD + 9 dígitos), remove o 5º dígito (o 9)
    if len(digits) == 13:
        digits = digits[:4] + digits[5:]
        
    return digits

def run_hunter():
    print("🐺 [WOLF AGENT: HUNTER] Iniciando Estratégia de Alto Volume (Internal Knowledge Mode)...")
    sys.stdout.flush()

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
    
# ---------------------------------------------------------
    # 🧠 SILICON TWEAK: ROULETTE STRATEGY
    # ---------------------------------------------------------
    
    # Categoria 1: Foco em Landing Pages e Automação de Alto Valor (High-Ticket)
    HIGH_TICKET_NICHES = [
        'clínicas de estética avançada', 
        'clínicas odontológicas', 
        'escritórios de advocacia', 
        'escritórios de arquitetura',
        'imobiliárias de alto padrão'
    ]
    
    # Categoria 2: Foco em Sistemas de Pedido, Reservas e Bots de Atendimento (Volume/B2C)
    VOLUME_NICHES = [
        'restaurantes e pizzarias', 
        'hospedagens e pousadas', 
        'experiências e turismo',
        'pet shops', 
        'academias e crossfit'
    ]
    
    # O Lobo joga a moeda para decidir a estratégia da rodada
    hunting_strategy = random.choice(["HIGH_TICKET", "VOLUME"])
    
    if hunting_strategy == "HIGH_TICKET":
        print("\n🎯 [ESTRATÉGIA] HIGH-TICKET: Buscando empresas com alto LTV...")
        target_list = HIGH_TICKET_NICHES
    else:
        print("\n🎯 [ESTRATÉGIA] VOLUME: Buscando empresas com alto fluxo de clientes...")
        target_list = VOLUME_NICHES

    sys.stdout.flush()
    
    # Seleciona 3 nichos aleatórios da estratégia sorteada
    selected_keywords = random.sample(target_list, 3)
    # ---------------------------------------------------------
    
    for keyword in selected_keywords:
        query = f"{keyword} em Florianópolis, SC"
        print(f"\n🎯 Minerando Alvo: {query}...")
        sys.stdout.flush()

        prompt = (
            f"List 15 real, existing businesses in the '{keyword}' niche located in Florianópolis, SC, Brazil. "
            "CRITICAL RULES: "
            "1. ANTI-GHOST PROTOCOL: Every single business MUST have a valid URL in the 'website' field. This URL can be an Instagram profile link, a Linktree, a Facebook page, or an outdated/basic website. NEVER return null for the website field. "
            "2. TARGET QUALIFICATION: Prioritize businesses that rely exclusively on social media profiles (like Instagram) or have very poor websites. These are prospects for high-ticket web development. "
            "3. ACCURATE CONTACTS: Provide their real contact number. DO NOT hallucinate or invent numbers ending in '0000', '1111', or repeating patterns. If you do not know the exact number, rely on the website URL so my scraper can find it. "
            "Return ONLY a valid JSON array with the keys: 'name' (string), 'website' (string), 'phone' (string), and 'rating' (number). Output nothing else."
        )

        try:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"💓 [REQUEST] {timestamp} | Gemini-3.1-Flash-Lite-Preview (Internal Knowledge)")
            sys.stdout.flush()
            
            start_api = time.time()
            
            response = None
            for attempt in range(3):
                try:
                    response = client.models.generate_content(
                        model="gemini-3.1-flash-lite-preview", 
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.1
                        )
                    )
                    break
                except Exception as e:
                    print(f"⚠️ [TENTATIVA {attempt+1}/3] Servidor ocupado, aguardando...")
                    sys.stdout.flush()
                    if attempt < 2:
                        time.sleep(10 * (attempt + 1))
                    else:
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

                    website = clean_website(lead.get('website'))
                    raw_phone = lead.get('phone', '')
                    
                    # ---------------------------------------------------------
                    # 🔎 INTERCEPTAÇÃO: SITE DISCOVERY
                    # ---------------------------------------------------------
                    digits_only = re.sub(r'\D', '', str(raw_phone))
                    # Se não tem telefone, ou se parece um fixo local (ex: 48 3xxx xxxx -> 10 dígitos)
                    if (not digits_only or len(digits_only) <= 10) and website:
                        print(f"   🔎 [DISCOVERY] Telefone ausente/suspeito para {name}. Vasculhando: {website}")
                        sys.stdout.flush()
                        
                        found_phone = discover_whatsapp(website)
                        
                        if found_phone:
                            print(f"   🎯 [DISCOVERY SUCCESS] WhatsApp extraído: {found_phone}")
                            sys.stdout.flush()
                            raw_phone = found_phone
                        else:
                            print(f"   ⚠️ [DISCOVERY FAILED] Nenhum número encontrado no site.")
                            sys.stdout.flush()
                    # ---------------------------------------------------------

                    normalized_phone = normalize_phone(raw_phone)
                    
                    # Filtro final de segurança contra lixo no banco
                    if not normalized_phone or len(normalized_phone) < 12:
                        print(f"   🚫 [SKIP] Sem telefone válido após varredura: {name}")
                        sys.stdout.flush()
                        continue

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
            print(f"❌ [ERRO NO LOOP] {str(e)[:150]}")
            sys.stdout.flush()
        
        time.sleep(15)
        sys.stdout.flush()

    print("\n🏁 SHUTDOWN: Extração broad finalizada com sucesso.")
    sys.stdout.flush()

if __name__ == "__main__":
    run_hunter()