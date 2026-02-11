from pathlib import Path
from fastapi import UploadFile
import uuid
import shutil
from app.core.config import settings
from app.utils.validators import validate_file_extension, validate_file_size


class FileHandler:
    """Handle file upload, storage, and cleanup"""
    
    def __init__(self):
        """Initialize file handler"""
        self.temp_dir = settings.TEMP_DIR
        self.temp_dir.mkdir(exist_ok=True)
    
    async def save_upload_file(self, upload_file: UploadFile) -> Path:
        """
        Save uploaded file to temp directory
        
        Args:
            upload_file: Uploaded file from FastAPI
            
        Returns:
            Path to saved file
            
        Raises:
            InvalidFileFormatError: If file validation fails
        """
        # Validate extension
        validate_file_extension(upload_file.filename)
        
        # Generate unique filename
        file_ext = Path(upload_file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = self.temp_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        
        # Validate size
        file_size = file_path.stat().st_size
        validate_file_size(file_size)
        
        return file_path
    
    def cleanup_file(self, file_path: Path) -> None:
        """
        Delete temporary file
        
        Args:
            file_path: Path to file to delete
        """
        if file_path and file_path.exists():
            file_path.unlink()
    
    def generate_output_filename(self, original_filename: str) -> str:
        """
        Generate output filename
        
        Args:
            original_filename: Original uploaded filename
            
        Returns:
            Generated output filename
        """
        stem = Path(original_filename).stem
        return f"{stem}_translated.xlsx"

# Made with Bob
