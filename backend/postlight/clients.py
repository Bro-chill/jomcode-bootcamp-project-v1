from google import genai
from langchain_google_genai import ChatGoogleGenerativeAI
from supabase import create_client

from postlight.config import settings


storage_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
gemini = genai.Client(api_key=settings.google_api_key)
chat_model = ChatGoogleGenerativeAI(model=settings.gemini_chat_model, google_api_key=settings.google_api_key)
