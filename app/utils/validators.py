from pathlib import Path
from app.core.config import settings
from app.core.exceptions import InvalidFileFormatError


def validate_file_extension(filename: str) -> bool:
    """
    Validate file extension
    
    Args:
        filename: Name of the file
        
    Returns:
        True if valid
        
    Raises:
        InvalidFileFormatError: If extension not supported
    """
    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise InvalidFileFormatError(
            f"File extension {ext} not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )
    return True


def validate_file_size(file_size: int) -> bool:
    """
    Validate file size
    
    Args:
        file_size: Size of file in bytes
        
    Returns:
        True if valid
        
    Raises:
        InvalidFileFormatError: If file too large
    """
    if file_size > settings.MAX_FILE_SIZE:
        raise InvalidFileFormatError(
            f"File size {file_size} exceeds maximum {settings.MAX_FILE_SIZE}"
        )
    return True

# Made with Bob
