import os
import sys
import time
import requests
from supabase import create_client, Client
from urllib.parse import urlparse
from dotenv import load_dotenv  # 1. Adicione o import

load_dotenv()

# --- CONFIGURAÇÕES ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_PAGESPEED_KEY") # Opcional, mas evita rate limits do Google

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def normalize_url(url: str) -> str:
    """Garante que a URL tenha http/https válido para a API."""
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url

def get_pagespeed_score(url: str) -> int:
    """Consulta a API do Google PageSpeed Insights (Mobile)."""
    endpoint = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    params = {
        'url': url,
        'strategy': 'mobile',
        'category': 'performance'
    }
    
    if GOOGLE_API_KEY:
        params['key'] = GOOGLE_API_KEY

    try:
        response = requests.get(endpoint, params=params, timeout=45)
        response.raise_for_status()
        data = response.json()
        
        # A nota vem como decimal (ex: 0.35). Multiplicamos por 100.
        score = data['lighthouseResult']['categories']['performance']['score']
        return int(score * 100)
    except Exception as e:
        print(f"Erro ao analisar {url}: {e}")
        return None

def run_pagespeed_hunter():
    print("\n🐺 [WOLF PAGESPEED] Iniciando auditoria de performance...")
    
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
        print("💤 Nenhum lead pendente de auditoria.")
        return

    for lead in leads:
        target_url = lead['website']
        
        # Filtra lixos que a IA possa ter deixado
        if 'instagram.com' in target_url or 'facebook.com' in target_url:
            supabase.table("leads_lobo").update({"pagespeed_score": -1}).eq("id", lead['id']).execute()
            continue

        valid_url = normalize_url(target_url)
        print(f"📊 Auditando: {lead['name']} ({valid_url})...")
        
        score = get_pagespeed_score(valid_url)
        
        if score is not None:
            print(f"✅ Nota: {score}/100")
            supabase.table("leads_lobo").update({"pagespeed_score": score}).eq("id", lead['id']).execute()
        else:
            print(f"❌ Falha. Marcando como -1 para não tentar de novo.")
            supabase.table("leads_lobo").update({"pagespeed_score": -1}).eq("id", lead['id']).execute()
            
        # Cooldown para não tomar block da API do Google
        time.sleep(5)

if __name__ == "__main__":
    run_pagespeed_hunter()