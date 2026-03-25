import requests
import re
from urllib.parse import urlparse

def discover_whatsapp(website_url):
    """
    Entra no site, busca links de wa.me ou padrões numéricos de WhatsApp.
    """
    if not website_url or not urlparse(website_url).scheme:
        return None

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    try:
        # 1. Tentar baixar o HTML do site (timeout curto para não travar o scraper)
        response = requests.get(website_url, headers=headers, timeout=10, verify=False)
        html = response.text

        # 2. Busca 1: Links diretos (wa.me, api.whatsapp, etc)
        # Padrão para pegar o número dentro de URLs de redirecionamento
        wa_link_pattern = r"(?:wa\.me\/|phone=|send\?phone=)(\d{10,15})"
        wa_matches = re.findall(wa_link_pattern, html)
        
        if wa_matches:
            # Retorna o primeiro número encontrado limpando espaços
            return wa_matches[0]

        # 3. Busca 2: Padrões de texto (Brasil DDD + 9 dígitos)
        # Procura por (48) 99999-9999, 48999999999, etc.
        text_phone_pattern = r"(?:\+?55)?\s?(?:\(?([1-9][1-9])\)?)\s?(?:9\s?\d{4}[-\.\s]?\d{4})"
        text_matches = re.findall(text_phone_pattern, html)

        if text_matches:
            # Aqui você teria que reconstruir o número, mas a busca por link (Busca 1) 
            # costuma ser 90% mais precisa em sites de negócios.
            # Para simplificar, focamos no link de botão que é o padrão de clínicas/hotéis.
            pass

    except Exception as e:
        print(f"⚠️ Erro ao acessar {website_url}: {e}")
    
    return None