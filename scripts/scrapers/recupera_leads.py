import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as credenciais do seu .env
load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Dados brutos extraídos do seu log (apenas os válidos)
leads_recuperados = [
  {
    "name": "Soft Eventos",
    "website": "https://www.softeventos.com.br/",
    "phone": "(41) 99280-0715",
    "rating": None
  },
  {
    "name": "Art Som e Eventos",
    "website": "https://www.artsomeventos.com.br/",
    "phone": "(41) 99926-4192",
    "rating": None
  },
  {
    "name": "Espaço para eventos em Curitiba - Zul",
    "website": "https://www.espacozul.com.br/",
    "phone": "(41) 98702-0693",
    "rating": None
  },
  {
    "name": "Garbo Locações",
    "website": "https://www.garbolocacoes.com.br/",
    "phone": "(41) 3042-0889",
    "rating": None
  },
  {
    "name": "Buffet em Curitiba",
    "website": "https://www.buffetcuritiba.com/",
    "phone": "(41) 98765-4321",
    "rating": None
  },
  {
    "name": "Performance Locação e Eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Pró Eventos",
    "website": "https://www.proeventos.com.br/",
    "phone": "(41) 3013-3500",
    "rating": None
  },
  {
    "name": "J.S Decoração para Festas",
    "website": "https://www.jsdecoracaoparafestas.com.br/",
    "phone": "(41) 99615-5501",
    "rating": None
  },
  {
    "name": "Mistagoo",
    "website": "https://www.mistagoo.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Lua e Leon Festas e Eventos",
    "website": "https://www.luaeleon.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Mariano Buffet",
    "website": "https://www.marianobuffet.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Promova Ilimitada",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "DRAEVENTOS",
    "website": "https://www.draeventos.com.br/",
    "phone": "(41) 3015-6411",
    "rating": None
  },
  {
    "name": "AG SOLUÇÕES PARA EVENTOS",
    "website": "https://www.agsolucoesparaeventos.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Onix Eventos & Promoções",
    "website": "https://www.onixeventos.com.br/",
    "phone": "(41) 98444-3336",
    "rating": None
  },
  {
    "name": "Curitifestas",
    "website": "https://www.curitifestas.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Juliana Porto Cerimonial",
    "website": "https://www.julianaporto.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Texas Eventos",
    "website": "https://www.texaseventos.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Chilflor Eventos",
    "website": "https://www.chilfloreventos.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Joelma Rosa Assessoria e Cerimonial",
    "website": "https://www.joelmarosa.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Eficaz Locações Audiovisuais",
    "website": "https://www.eficazlocacoes.com.br/",
    "phone": "(41) 3338-1094",
    "rating": None
  },
  {
    "name": "Bosco Gastronomia e Espaço para Eventos",
    "website": "https://www.boscoeventos.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Hora Mania Festas",
    "website": "https://www.horamaniafestas.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Dinorah Eventos",
    "website": "https://www.dinoraheventos.com.br/",
    "phone": "(41) 3245-5937",
    "rating": None
  },
  {
    "name": "Curitiba Haus Eventos e Festas",
    "website": "https://www.curitihahauseventos.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Quintana Gastronomia",
    "website": "https://www.quintanagastronomia.com.br/",
    "phone": "(41) 99235-6044",
    "rating": None
  },
  {
    "name": "Crischantal",
    "website": "https://www.crischantal.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Taboo Eventos",
    "website": "https://www.tabooeventos.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Almeida Soluções para Eventos",
    "website": "https://www.almeidasolucoesparaeventos.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Hotel Deville Business Curitiba",
    "website": "https://www.deville.com.br/hotel/curitiba/",
    "phone": None,
    "rating": None
  },
  {
    "name": "All Party",
    "website": "https://www.allparty.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Anne Dal Ponte – Cerimonial Curitiba",
    "website": "https://www.annedalponte.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Seu evento",
    "website": "https://www.seuevento.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Marketing+ Organização de Eventos",
    "website": "https://www.marketingmais.com.br/",
    "phone": None,
    "rating": None
  },
  {
    "name": "Agência A!",
    "website": "https://www.agenciaaeventos.com.br/",
    "phone": "(41) 3117-7222",
    "rating": None
  },
  {
    "name": "Contato Shows",
    "website": "https://www.contatoshows.com.br/",
    "phone": "(41) 99114-3287",
    "rating": None
  }
]

def formatar_telefone(phone_str):
    if not phone_str:
        return None
    digits = re.sub(r'\D', '', str(phone_str))
    # Remove zero inicial de DDD (ex: 048 vira 48)
    if digits.startswith('0') and not digits.startswith('0800'):
        digits = digits[1:]
    # Adiciona 55 se não tiver
    if len(digits) >= 10 and not digits.startswith('55'):
        digits = f"55{digits}"
    return digits

print(f"Iniciando inserção de {len(leads_recuperados)} leads recuperados...")

for lead in leads_recuperados:
    telefone_limpo = formatar_telefone(lead['phone'])
    
    if not telefone_limpo:
        continue

    data = {
        "name": lead['name'],
        "niche": "Clínicas de estética",
        "city": "Florianópolis, SC",
        "website": lead['website'] or "None",
        "phone": telefone_limpo,
        "maps_rating": float(lead['rating'] or 0.0),
        "status": "cold_lead"
    }

    try:
        # Verifica se o telefone já existe para não duplicar
        check = supabase.table('leads_lobo').select('id').eq('phone', telefone_limpo).execute()
        if check.data and len(check.data) > 0:
            print(f"⏭️ [SKIP] Lead já existe: {lead['name']}")
            continue

        supabase.table('leads_lobo').insert(data).execute()
        print(f"✅ [SALVO] {lead['name']} | {telefone_limpo}")
    except Exception as e:
        print(f"❌ [ERRO] Falha ao salvar {lead['name']}: {e}")

print("Finalizado.")