import os
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURAÇÕES ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
# IMPORTANTE: Use a SERVICE_ROLE key aqui para ignorar o RLS, não a anon key.
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") 
GOOGLE_PAGESPEED_KEY = os.environ.get("GOOGLE_PAGESPEED_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERRO: Credenciais do Supabase ausentes.")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def normalize_url(url: str) -> str:
    """Remove lixos, espaços e garante o protocolo correto."""
    url = url.strip().replace(" ", "").lower()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url

def get_pagespeed_data(url: str):
    """Consulta a API e retorna a Nota (0-100) e o Tempo de Carregamento (Segundos)."""
    endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    params = {
        'url': url,
        'strategy': 'mobile',
        'category': 'performance'
    }
    
    if GOOGLE_PAGESPEED_KEY:
        params['key'] = GOOGLE_PAGESPEED_KEY

    try:
        # Aumentamos o timeout porque o Lighthouse roda um Chrome headless na nuvem
        response = requests.get(endpoint, params=params, timeout=60)
        
        if response.status_code == 429:
            print(f"⚠️ Rate Limit atingido no Google API.")
            return "RATE_LIMIT", None
            
        response.raise_for_status()
        data = response.json()
        
        # Nota principal (0 a 100)
        score_raw = data['lighthouseResult']['categories']['performance']['score']
        score = int(score_raw * 100) if score_raw is not None else 0
        
        # Tempo de carregamento (LCP - Largest Contentful Paint)
        lcp_ms = data['lighthouseResult']['audits']['largest-contentful-paint']['numericValue']
        load_time_sec = round(lcp_ms / 1000, 1) # Retorna ex: 8.5
        
        return score, load_time_sec
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de conexão ou site fora do ar ({url}): {e}")
        return "DEAD_SITE", None
    except KeyError:
        print(f"❌ Erro ao parsear JSON do Google para {url}. Site pode bloquear bots.")
        return "DEAD_SITE", None

def run_pagespeed_hunter():
    print("\n🐺 [WOLF PAGESPEED] Iniciando auditoria de performance mobile...")
    
    # Busca 10 leads que possuem site, mas ainda não têm nota
    # Busca 10 leads que possuem site, mas ainda não têm nota
    response = supabase.table("leads_lobo") \
        .select("id, name, website") \
        .not_.is_("website", "null") \
        .is_("pagespeed_score", "null") \
        .neq("status", "invalid") \
        .limit(10) \
        .execute()
        
    leads = response.data
    
    if not leads:
        print("💤 Nenhum lead pendente de auditoria com website cadastrado.")
        return

    for lead in leads:
        # Garante que seja tratado como string
        target_url = str(lead.get('website', '')).strip()
        
        # 🛡️ TWEAK: Filtro de Falsos Nulos e lixo
        if target_url.lower() in ['none', 'null', '', 'n/a', 'nan'] or len(target_url) < 4:
            print(f"⏩ Pulando lead sem site real ('{target_url}')")
            supabase.table("leads_lobo").update({"pagespeed_score": -1}).eq("id", lead['id']).execute()
            continue
        
        # Filtra domínios de redes sociais (não podemos otimizar o servidor do Mark Zuckerberg)
        blacklisted_domains = ['instagram.com', 'facebook.com', 'linktr.ee', 'wa.me', 'ifood.com.br']
        if any(domain in target_url.lower() for domain in blacklisted_domains):
            print(f"⏩ Pulando rede social/agregador: {target_url}")
            supabase.table("leads_lobo").update({"pagespeed_score": -1}).eq("id", lead['id']).execute()
            continue

        valid_url = normalize_url(target_url)
        print(f"\n📊 Auditando: {lead['name']} ({valid_url})...")
        
        # ... resto do código continua igual (score, load_time = get_pagespeed_data...)
        
        # Filtra domínios de redes sociais (não podemos otimizar o servidor do Mark Zuckerberg)
        blacklisted_domains = ['instagram.com', 'facebook.com', 'linktr.ee', 'wa.me', 'ifood.com.br']
        if any(domain in target_url.lower() for domain in blacklisted_domains):
            print(f"⏩ Pulando rede social/agregador: {target_url}")
            supabase.table("leads_lobo").update({"pagespeed_score": -1}).eq("id", lead['id']).execute()
            continue

        valid_url = normalize_url(target_url)
        print(f"\n📊 Auditando: {lead['name']} ({valid_url})...")
        
        score, load_time = get_pagespeed_data(valid_url)
        
        if score == "RATE_LIMIT":
            print("⏳ Pausando por 30s devido a limites do Google...")
            time.sleep(30)
            continue # Tenta de novo na próxima rodada do CRON
            
        elif score == "DEAD_SITE":
            print(f"💀 Site morto ou bloqueado. Marcando como -1.")
            supabase.table("leads_lobo").update({"pagespeed_score": -1}).eq("id", lead['id']).execute()
            
        else:
            print(f"✅ Sucesso! Nota: {score}/100 | Tempo: {load_time}s")
            
            # Atualiza nota e o tempo de carregamento para usar na copy de vendas
            update_payload = {
                "pagespeed_score": score,
                # Remova a linha abaixo se não quiser criar a coluna pagespeed_time no banco agora
                "pagespeed_time": str(load_time) 
            }
            supabase.table("leads_lobo").update(update_payload).eq("id", lead['id']).execute()
            
        time.sleep(3) # Respiro padrão entre requisições

if __name__ == "__main__":
    run_pagespeed_hunter()