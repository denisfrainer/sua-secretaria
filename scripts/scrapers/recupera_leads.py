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
leads_recuperados = leads = [
  {
    "name": "Margille Pizzaria",
    "website": "https://www.margille.com.br/",
    "phone": "(51) 3221-4004",
    "rating": None
  },
  {
    "name": "Padaria Gaby",
    "website": None,
    "phone": "(51) 3257-5833",
    "rating": None
  },
  {
    "name": "Pão da Nona",
    "website": None,
    "phone": "(51) 3233-3599",
    "rating": None
  },
  {
    "name": "Renan Santos Oliveira",
    "website": None,
    "phone": "(51) 9170-2404",
    "rating": None
  },
  {
    "name": "Panificadora J R",
    "website": None,
    "phone": "(51) 3318-3730",
    "rating": None
  },
  {
    "name": "Confeitaria Armelin",
    "website": None,
    "phone": "(51) 3233-7909",
    "rating": None
  },
  {
    "name": "Delf Distribuidora de Alimentos",
    "website": None,
    "phone": "(51) 3351-7374",
    "rating": None
  },
  {
    "name": "Panificadora Porto Belo",
    "website": None,
    "phone": "(51) 3015-4560",
    "rating": None
  },
  {
    "name": "Padaria e Confeitaria Nutripão",
    "website": None,
    "phone": "(51) 3249-6296",
    "rating": None
  },
  {
    "name": "Padaria Bela União",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Donna Laura",
    "website": None,
    "phone": "(51) 3519-3571",
    "rating": None
  },
  {
    "name": "Espaço Veganista",
    "website": None,
    "phone": "(51) 99325-1983",
    "rating": None
  },
  {
    "name": "Espaço Not Meat",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Bagatela Lanches",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Atelier de Massas",
    "website": "www.atelierdemassas.com.br",
    "phone": "(51) 3225 1125",
    "rating": None
  },
  {
    "name": "Sette Pasta",
    "website": None,
    "phone": "(51) 3012-2926",
    "rating": None
  },
  {
    "name": "Aora Cucina",
    "website": None,
    "phone": "(51) 99119-9387",
    "rating": None
  },
  {
    "name": "Mandarinier Gastronomia",
    "website": None,
    "phone": "(51) 3517 7703",
    "rating": None
  },
  {
    "name": "Marcianos Burguer",
    "website": None,
    "phone": "(51) 99523-9876",
    "rating": None
  },
  {
    "name": "Confeitaria Zona Sul",
    "website": "www.confeitariazonasul.com.br",
    "phone": "(51) 3249-5000",
    "rating": None
  },
  {
    "name": "J3 Burguer",
    "website": None,
    "phone": "(51) 99561-7805",
    "rating": None
  },
  {
    "name": "Gianluca Zaffari",
    "website": None,
    "phone": "(51) 3311-7207",
    "rating": None
  },
  {
    "name": "Bellona",
    "website": None,
    "phone": "(51) 98525-5585",
    "rating": None
  },
  {
    "name": "Freddo",
    "website": None,
    "phone": "(51) 3328-3680",
    "rating": None
  },
  {
    "name": "Miski",
    "website": None,
    "phone": "(51) 3372-7176",
    "rating": None
  },
  {
    "name": "Banca 40",
    "website": None,
    "phone": "(51) 3226-3533",
    "rating": None
  },
  {
    "name": "Di Argento",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Sollo Pizza",
    "website": None,
    "phone": "51 3218.2222",
    "rating": None
  },
  {
    "name": "Café do Bem",
    "website": None,
    "phone": "(51) 98561-8642",
    "rating": None
  },
  {
    "name": "Altis Centro",
    "website": None,
    "phone": "(51) 3028-6960",
    "rating": None
  },
  {
    "name": "Altis Mont'Serrat",
    "website": None,
    "phone": "(51) 3084-4444",
    "rating": None
  },
  {
    "name": "Mark Hamburgueria - Vila Roubadinhas",
    "website": None,
    "phone": "512314-2500",
    "rating": None
  },
  {
    "name": "Mark Hamburgueria - Zona Sul",
    "website": None,
    "phone": "514066-6888",
    "rating": None
  },
  {
    "name": "Mark Hamburgueria - Bom Fim",
    "website": None,
    "phone": "513110-6039",
    "rating": None
  },
  {
    "name": "Mark Hamburgueria - Auxiliadora",
    "website": None,
    "phone": "513519-6638",
    "rating": None
  },
  {
    "name": "Mark Hamburgueria - Cidade Baixa",
    "website": None,
    "phone": "513030-0062",
    "rating": None
  },
  {
    "name": "Chez Philippe",
    "website": None,
    "phone": "(51) 3312-5333",
    "rating": None
  },
  {
    "name": "Stella Alpina Sorveteria e Café",
    "website": None,
    "phone": "(51) 3338-1515",
    "rating": None
  },
  {
    "name": "Stella Alpina Gelados e Alimentos Ltda Epp",
    "website": "stellaalpina.com.br",
    "phone": "(51) 3336-3633",
    "rating": None
  },
  {
    "name": "Confeitaria Maranghello",
    "website": None,
    "phone": "(51) 3235.2511",
    "rating": None
  },
  {
    "name": "Le Bateau Ivre",
    "website": None,
    "phone": "(51) 994536412",
    "rating": None
  },
  {
    "name": "Agridoce Café",
    "website": None,
    "phone": "51 3392 7746",
    "rating": None
  },
  {
    "name": "Aurora Antiespecista",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Vê Empório e Restaurante",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Casa Oriental",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Govinda",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "La Rouge Bistrô",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Mantra Gastronomia e Arte",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Suprem",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Ocidente",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Ojas",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Nataraj",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Jean Pierre Pâtisserie et Boulangerie",
    "website": None,
    "phone": "(51) 3332-8142",
    "rating": None
  },
  {
    "name": "Oui Oui Boulangerie",
    "website": None,
    "phone": "(51) 3208-0090",
    "rating": None
  },
  {
    "name": "Vive Le Café",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Oh Brüder Passo d'Areia",
    "website": None,
    "phone": "+55 (51) 98323-2290",
    "rating": None
  },
  {
    "name": "Massa Madre",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Cumbuca Padaria",
    "website": None,
    "phone": "(51) 3212-0292",
    "rating": None
  },
  {
    "name": "Quero Pão",
    "website": None,
    "phone": "(51) 3029-2780",
    "rating": None
  },
  {
    "name": "Barbarella Bakery",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Priscilla'a Bakery",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Cheiro Verde",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Pizzaria Don Vitto",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Nono Ludovico",
    "website": None,
    "phone": "(51) 3333-7050",
    "rating": None
  },
  {
    "name": "Confeitaria Matheus",
    "website": None,
    "phone": "(51) 3224-2179",
    "rating": None
  },
  {
    "name": "UM Bar&Cozinha",
    "website": None,
    "phone": "51.3239.6751",
    "rating": None
  },
  {
    "name": "Five Points Burger",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Tutano Burger",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Mureta",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Mark Hamburgueria",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Bendizê Hamburgueria",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Confeitaria Paris",
    "website": None,
    "phone": "51 99982.2918",
    "rating": None
  },
  {
    "name": "Padaria e Confeitaria Dalmás",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Porto Cara de Mau",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Don Aurélio Pizzaria",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Altis Gastronomia",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Hard Rock Cafe Porto Alegre",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Quincho Parrilla y Bar",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Lima's Pizzaria",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Rodízio Burguer POA",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Oak Sushi",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Garcias PB",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Oca Pizza",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Nihon Sushi Bar",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Picanhas Grill Veg",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Sui Yuan",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "The Raven Restaurant",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Quiero Café - Centro Histórico",
    "website": None,
    "phone": "51 99989-0735",
    "rating": None
  },
  {
    "name": "Maison Gastronomia",
    "website": None,
    "phone": "(51) 98950-4057",
    "rating": None
  },
  {
    "name": "Prawer",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Gelateria Di Argento",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Gelf's",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Creäm",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Quati Gelateria Artesanal",
    "website": None,
    "phone": "+55 51 99479-6408",
    "rating": None
  },
  {
    "name": "Confeitaria Dona Inês",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Yami Café",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Moa Cafeteria",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Espaço Brasco",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Peppo Cucina",
    "website": None,
    "phone": None,
    "rating": None
  },
  {
    "name": "Panorama Gastronômico",
    "website": None,
    "phone": "(51) 3207-8999",
    "rating": None
  },
  {
    "name": "Shopping das Padarias",
    "website": "www.shoppingdaspadarias.com.br",
    "phone": "(51) 3342-5124",
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