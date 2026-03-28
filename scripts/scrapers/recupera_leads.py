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
leads_recuperados = leads = leads_data = leads_data = leads_data = [
  {
    "name": "Marketing+ Organização de Eventos",
    "website": None,
    "phone": "(48) 99138-0505",
    "rating": None
  },
  {
    "name": "Santo Evento",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Dj Peter Sonorização Iluminação para festa e eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Alonso Fotografia Estúdio",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Vanessa Silva / Fotografia de eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Adriana Prado / Fotografia de eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "LUSCH Agência 360º",
    "website": None,
    "phone": "(48) 3030-7322",
    "rating": None
  },
  {
    "name": "SB+ Eventos",
    "website": None,
    "phone": "(48) 3380-2980",
    "rating": None
  },
  {
    "name": "Lake View",
    "website": None,
    "phone": "(48) 9190-8812",
    "rating": None
  },
  {
    "name": "TIPFLORIPA EVENTOS",
    "website": None,
    "phone": "(48) 998461405",
    "rating": None
  },
  {
    "name": "MC Centro de Eventos",
    "website": None,
    "phone": "48 3034-9400",
    "rating": None
  },
  {
    "name": "Sobrallia Buffet",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Boutique de Eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Diego Dahmer Foto e Filme",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Juliana Hames - Decoração de Eventos",
    "website": None,
    "phone": "(48) 99161-4506",
    "rating": None
  },
  {
    "name": "Go Promo Eventos",
    "website": None,
    "phone": "(48) 99204-9488",
    "rating": None
  },
  {
    "name": "La Vaca",
    "website": None,
    "phone": "(48) 9138-2322",
    "rating": None
  },
  {
    "name": "PROJESOM – Soluções para Eventos",
    "website": None,
    "phone": "(48) 99630-1112",
    "rating": None
  },
  {
    "name": "Marcello Dornelles",
    "website": None,
    "phone": "(48) 99659-7805",
    "rating": None
  },
  {
    "name": "Banda Rock in Family",
    "website": None,
    "phone": "(48) 98414-7172",
    "rating": None
  },
  {
    "name": "FS Som e Luzes",
    "website": None,
    "phone": "(48) 99101-3912",
    "rating": None
  },
  {
    "name": "PinkBlue Festas e Eventos",
    "website": None,
    "phone": "(48) 9674-6318",
    "rating": None
  },
  {
    "name": "Agapes Buffet E Eventos",
    "website": None,
    "phone": "(48) 3369-0064",
    "rating": None
  },
  {
    "name": "Bambalalão Festas",
    "website": None,
    "phone": "(48) 3037-2153",
    "rating": None
  },
  {
    "name": "Bella Gula Bistro",
    "website": None,
    "phone": "(48) 99154-5885",
    "rating": None
  },
  {
    "name": "Belle Blanc Noivas E Festas",
    "website": None,
    "phone": "(48) 3223-2021",
    "rating": None
  },
  {
    "name": "Bianco De Moura Suna",
    "website": None,
    "phone": "(48) 99630-7686",
    "rating": None
  },
  {
    "name": "Bistro Da Leila",
    "website": None,
    "phone": "(48) 3232-5048",
    "rating": None
  },
  {
    "name": "Black Sheep Sushi Bar",
    "website": None,
    "phone": "(48) 3206-4337",
    "rating": None
  },
  {
    "name": "Brand Buffet",
    "website": None,
    "phone": "(48) 3348-6563",
    "rating": None
  },
  {
    "name": "Buffet Café & Cia",
    "website": None,
    "phone": "(48) 3240-5146",
    "rating": None
  },
  {
    "name": "Buffet Dos Anjos",
    "website": None,
    "phone": "(48) 3233-5742",
    "rating": None
  },
  {
    "name": "Buffet Giovanni Kazuo Culinária Japonesa",
    "website": None,
    "phone": "(48) 99135-6800",
    "rating": None
  },
  {
    "name": "Buffet Pedrinho & Filhos",
    "website": None,
    "phone": "(48) 3233-2823",
    "rating": None
  },
  {
    "name": "Buffet Rio Branco",
    "website": None,
    "phone": "(48) 3028-6558",
    "rating": None
  },
  {
    "name": "Buffet Rio Branco",
    "website": None,
    "phone": "(48) 99905-5791",
    "rating": None
  },
  {
    "name": "Buffet Styllus Festas & Eventos",
    "website": None,
    "phone": "(48) 3231-0777",
    "rating": None
  },
  {
    "name": "Contemporâneo Coquetéis",
    "website": None,
    "phone": "(48) 9911-5292",
    "rating": None
  },
  {
    "name": "DuCrepe Crepes para Eventos",
    "website": None,
    "phone": "(48) 3372-7356",
    "rating": None
  },
  {
    "name": "Pizza do Henry",
    "website": None,
    "phone": "(48) 98408-9569",
    "rating": None
  },
  {
    "name": "Pizza Vip",
    "website": None,
    "phone": "(48) 8446-9692",
    "rating": None
  },
  {
    "name": "Ana Decoradora",
    "website": None,
    "phone": "(48) 99974-1802",
    "rating": None
  },
  {
    "name": "3d Produções De Eventos",
    "website": None,
    "phone": "(48) 99957-4070",
    "rating": None
  },
  {
    "name": "A&b Eventos",
    "website": None,
    "phone": "(48) 3028-7478",
    "rating": None
  },
  {
    "name": "A1 Formaturas",
    "website": None,
    "phone": "(48) 3028-3060",
    "rating": None
  },
  {
    "name": "Açoriana Congressos E Eventos",
    "website": None,
    "phone": "(48) 3024-5903",
    "rating": None
  },
  {
    "name": "Activa Formaturas",
    "website": None,
    "phone": "(48) 3234-0200",
    "rating": None
  },
  {
    "name": "All Entretenimento",
    "website": None,
    "phone": "(48) 3028-9400",
    "rating": None
  },
  {
    "name": "Alpe Eventos",
    "website": None,
    "phone": "(48) 3234-5751",
    "rating": None
  },
  {
    "name": "América Do Sol Turismo E Eventos",
    "website": None,
    "phone": "(48) 3224-6957",
    "rating": None
  },
  {
    "name": "Anna Carolina Fernandes Cassalho",
    "website": None,
    "phone": "(48) 3234-6713",
    "rating": None
  },
  {
    "name": "Apoia-se Prestadora de Serviço",
    "website": None,
    "phone": "(48) 3223-3198",
    "rating": None
  },
  {
    "name": "Art E E L Volpato Júnior Prod Cult",
    "website": None,
    "phone": "(48) 3209-6754",
    "rating": None
  },
  {
    "name": "Art Festas e Decorações",
    "website": None,
    "phone": "(48) 3337-6345",
    "rating": None
  },
  {
    "name": "As9 Entretenimento E Negócios",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Be Modelos e Eventos",
    "website": None,
    "phone": "48 3322-3028",
    "rating": None
  },
  {
    "name": "Crepe Suzette Band",
    "website": None,
    "phone": "(48) 99650-2075",
    "rating": None
  },
  {
    "name": "Aktoro Professional Interpreting Course for Theatre, TV and Film",
    "website": None,
    "phone": "(48) 3333-2434",
    "rating": None
  },
  {
    "name": "Lindacap Restaurant",
    "website": None,
    "phone": "(48) 3222-4002",
    "rating": None
  },
  {
    "name": "Noly Moreira",
    "website": None,
    "phone": "(48) 99975 4867",
    "rating": None
  },
  {
    "name": "Chef Will Eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "MV Buffet Festas e Eventos",
    "website": None,
    "phone": "(48) 99216-9524",
    "rating": None
  },
  {
    "name": "Decorativa Festas",
    "website": None,
    "phone": "(48) 99941-9290",
    "rating": None
  },
  {
    "name": "Vila dos Araçás",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "OnEventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Impacto Multieventos",
    "website": None,
    "phone": "(48) 3337-4803",
    "rating": None
  },
  {
    "name": "Agencia048",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Floripa Eventos",
    "website": None,
    "phone": "(48) 99953-3053",
    "rating": None
  },
  {
    "name": "Projecta Eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Nathan Filmes",
    "website": None,
    "phone": "(48) 99151-0472",
    "rating": None
  },
  {
    "name": "Casa Múltiplas",
    "website": None,
    "phone": "48 992120632",
    "rating": None
  },
  {
    "name": "Indaiá Eventos",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Orth Produções",
    "website": None,
    "phone": "(48) 3333–7510",
    "rating": None
  },
  {
    "name": "All Party",
    "website": None,
    "phone": None,
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