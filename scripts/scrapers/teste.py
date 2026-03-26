import os
from google import genai
from dotenv import load_dotenv

# Carrega as variáveis do seu arquivo .env
load_dotenv()

try:
    # A nova SDK busca automaticamente a variável GEMINI_API_KEY do ambiente
    client = genai.Client()
    
    print("🔍 Buscando modelos disponíveis para a sua chave de API...\n")
    
    # Lista os modelos disponíveis
    models = client.models.list()
    for model in models:
        print(model.name)
        
except Exception as e:
    print(f"❌ Erro ao listar modelos: {e}")