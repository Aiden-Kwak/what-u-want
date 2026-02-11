import chardet
from pathlib import Path
from typing import Tuple


def detect_encoding(file_path: Path) -> Tuple[str, float]:
    """
    Detect file encoding using chardet
    
    Args:
        file_path: Path to the file
        
    Returns:
        Tuple of (encoding, confidence)
    """
    with open(file_path, 'rb') as f:
        raw_data = f.read()
    
    result = chardet.detect(raw_data)
    encoding = result['encoding']
    confidence = result['confidence']
    
    # Fallback encodings if confidence is low
    if confidence < 0.7:
        # Try common encodings
        for enc in ['utf-8', 'euc-kr', 'cp949', 'utf-16']:
            try:
                raw_data.decode(enc)
                return enc, 1.0
            except UnicodeDecodeError:
                continue
    
    return encoding, confidence


def read_file_with_encoding(file_path: Path) -> str:
    """
    Read file content with automatic encoding detection
    
    Args:
        file_path: Path to the file
        
    Returns:
        File content as string
    """
    encoding, confidence = detect_encoding(file_path)
    
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            return f.read()
    except UnicodeDecodeError:
        # Fallback to utf-8 with error handling
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

# Made with Bob
