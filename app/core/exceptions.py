class TranslationError(Exception):
    """Base exception for translation errors"""
    pass


class FileEncodingError(TranslationError):
    """Raised when file encoding cannot be detected"""
    pass


class InvalidFileFormatError(TranslationError):
    """Raised when file format is not supported"""
    pass


class GPTAPIError(TranslationError):
    """Raised when GPT API call fails"""
    pass


class CSVParsingError(TranslationError):
    """Raised when CSV parsing fails"""
    pass

# Made with Bob
