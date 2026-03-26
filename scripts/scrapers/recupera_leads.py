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
  {"name": "Clínicas de Estética - em Florianópolis, SC - Floripa Empresas", "website": None, "phone": "(48) 3028-5788", "rating": None},
  {"name": "Espaço Sandra Vieira Estética E Spa", "website": None, "phone": "(48) 99638-3544", "rating": None},
  {"name": "Clínica de Estética Maria Izabel", "website": None, "phone": "(48) 3244-1214", "rating": None},
  {"name": "Bem Estar Estética e Saúde", "website": None, "phone": "(48) 3229-6534", "rating": None},
  {"name": "Bella Pelle Estética Avançada", "website": None, "phone": "(48) 3025-7303", "rating": None},
  {"name": "Clínica Estética Florianópolis", "website": "clinicaesteticafloripa.com", "phone": "(48) 9 8822-1122", "rating": None},
  {"name": "Salão da Bel - Felipe Schmidt", "website": None, "phone": "(48) 99178-9191", "rating": "1.0"},
  {"name": "Clínica Pillar", "website": None, "phone": "(48) 98867-8356", "rating": None},
  {"name": "Léia Salão - Unidade Florianópolis SC", "website": None, "phone": "48 3224-4097", "rating": None},
  {"name": "Bellaris Clinic - Unidade Florianópolis - Centro", "website": None, "phone": "+55 48 99633-4321", "rating": None},
  {"name": "Bellaris Clinic - Unidade Florianópolis - Santa Mônica", "website": None, "phone": "+55 48 99675-4321", "rating": None},
  {"name": "Virtuosa Florianopolis", "website": None, "phone": "(48) 3091-1777", "rating": None},
  {"name": "Dr. Laser - Unidade Florianópolis", "website": None, "phone": "(48) 3364-3429", "rating": None},
  {"name": "GIO Estética Avançada - Florianópolis Centro", "website": None, "phone": "(48) 3207-8225", "rating": None},
  {"name": "Hair Address", "website": None, "phone": "(48) 3024-2899", "rating": None},
  {"name": "Adriano Ribeiro cabeleireiro e maquiador", "website": None, "phone": "(48) 3364-9592", "rating": None},
  {"name": "Aldeia Do cabelo", "website": None, "phone": "(48) 99903-3116", "rating": None},
  {"name": "Alexandres Hair cabeleireiros", "website": None, "phone": "(48) 3879-2608", "rating": None},
  {"name": "Alice Magri centro de beleza e estética", "website": None, "phone": "(48) 3028-9918", "rating": None},
  {"name": "Alongamento De cílios - flávia finamor", "website": None, "phone": "(48) 99695-4478", "rating": None},
  {"name": "Alongamento De cílios são josé sc", "website": None, "phone": "(48) 3234-6339", "rating": None},
  {"name": "Am Estúdio salão de beleza e barbearia", "website": None, "phone": "(48) 3222-3595", "rating": None},
  {"name": "Estética Arlete", "website": None, "phone": "48 3244-5462", "rating": None},
  {"name": "Clínica Dircksen", "website": None, "phone": "(048) 99929 0071", "rating": None},
  {"name": "Olavita", "website": None, "phone": "(48) 98823-6842", "rating": None}
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