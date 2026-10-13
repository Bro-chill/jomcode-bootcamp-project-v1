from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    supabase_url: str
    supabase_service_role_key: str
    supabase_db_url: str
    supabase_storage_bucket: str = "post-images"
    google_api_key: str
    gemini_chat_model: str = "gemini-3.8-flash"
    gemini_embedding_model: str = "gemini-embedding-2"
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
