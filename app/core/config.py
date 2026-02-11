from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Excel Translator"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # OpenAI API
    OPENAI_API_KEY: Optional[str] = None
    
    # File Upload
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: set = {".xlsx", ".csv"}
    TEMP_DIR: Path = Path("temp")
    
    # GPT API
    GPT_MODEL: str = "gpt-4-turbo-preview"
    MAX_TOKENS: int = 4096
    TEMPERATURE: float = 0.3
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Made with Bob
