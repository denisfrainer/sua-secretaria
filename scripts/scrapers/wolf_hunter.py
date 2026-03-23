import os
import re
import time
import random
from playwright.sync_api import sync_playwright
from supabase import create_client, Client

# ==========================================
# 1. CREDENCIAIS DO SUPABASE (VIA VARIÁVEIS DE AMBIENTE)
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("⚠️ As credenciais do Supabase não foram encontradas no ambiente!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 2. FUNÇÕES DE UTILIDADE
# ==========================================
def sanitize_phone(phone_str):
    """Limpa o número e formata para o padrão E.164"""
    numbers = re.sub(r'\D', '', phone_str)
    if not numbers.startswith('55'):
        numbers = '55' + numbers
    return f"+{numbers}"

# ==========================================
# 3. O MOTOR DE BUSCA (PLAYWRIGHT)
# ==========================================
def run_wolf_hunter(search_query: str, limit=5):
    print(f"\n🐺 [WOLF HUNTER] Iniciando caçada por: '{search_query}'")
    
    with sync_playwright() as p:
        # headless=False: Você verá o navegador abrir e fazer a busca
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        url = f"https://www.google.com/maps/search/{search_query.replace(' ', '+')}"
        page.goto(url)
        
        print("⏳ Aguardando renderização do mapa...")
        page.wait_for_selector('div[role="feed"]', timeout=15000)
        time.sleep(3) 
        
        places = page.query_selector_all('div[role="feed"] > div')
        leads_captured = 0
        
        for place in places:
            if leads_captured >= limit:
                break
                
            try:
                raw_text = place.inner_text()
                if not raw_text:
                    continue
                
                lines = raw_text.split('\n')
                company_name = lines[0].strip() if lines else "Empresa Desconhecida"
                
                # Regex para buscar padrões de telefone brasileiros
                phone_match = re.search(r'\(?\d{2}\)?\s?(?:9?\d{4})[-.\s]?\d{4}', raw_text)
                
                if phone_match and len(company_name) > 2:
                    raw_phone = phone_match.group(0)
                    clean_phone = sanitize_phone(raw_phone)
                    
                    print(f"\n🎯 Alvo Detectado: {company_name} | {clean_phone}")
                    
                    # ==========================================
                    # 4. INJEÇÃO NO BANCO DE DADOS (SDK)
                    # ==========================================
                    existing = supabase.table('leads_lobo').select("id").eq("phone", clean_phone).execute()
                    
                    if not existing.data:
                        try:
                            supabase.table('leads_lobo').insert({
                                "phone": clean_phone,
                                "niche": company_name, 
                                "lead_source": "GOOGLE_MAPS_SCRAPER",
                                "status": "cold_lead"
                            }).execute()
                            print("   ✅ Salvo no Supabase.")
                            leads_captured += 1
                        except Exception as insert_error:
                            print(f"   ❌ Erro ao salvar no banco: {insert_error}")
                    else:
                        print("   ⚠️ Lead já existe no banco. Ignorado.")
            
            except Exception as e:
                # Ignora cards patrocinados ou que não são estabelecimentos
                pass
                
        browser.close()
        print(f"\n🏁 Caçada finalizada. {leads_captured} leads processados.")

if __name__ == "__main__":
    # Lista com seus nichos de alto ticket em Floripa
    TARGET_NICHES = [
        "clínicas de estética avançada em florianópolis",
        "escritórios de advocacia corporativa em florianópolis",
        "imobiliárias de alto padrão em florianópolis",
        "clínicas odontológicas de implante em florianópolis",
        "escritórios de arquitetura e interiores em florianópolis"
    ]

    # Sorteia um nicho aleatório toda vez que rodar
    selected_query = random.choice(TARGET_NICHES)
    
    # Chama o scraper com o nicho sorteado e limite de 50
    run_wolf_hunter(selected_query, limit=50)