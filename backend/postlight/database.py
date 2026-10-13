import psycopg

from postlight.config import settings


def connection():
    return psycopg.connect(settings.supabase_db_url)
