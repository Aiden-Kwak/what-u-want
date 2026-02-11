from pydantic import BaseModel, Field
from typing import Optional


class TranslationRequest(BaseModel):
    api_key: str = Field(..., min_length=20)
    prompt: Optional[str] = Field(
        default="Translate the following CSV data to English. Maintain the exact CSV format.",
        max_length=2000
    )
    model: Optional[str] = Field(default="gpt-4-turbo-preview")


class TranslationResponse(BaseModel):
    success: bool
    message: str
    download_url: Optional[str] = None
    filename: Optional[str] = None
    sheets_processed: Optional[int] = None

# Made with Bob
