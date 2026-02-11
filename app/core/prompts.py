"""
Translation prompts management
All prompts are centrally managed here
"""

# JSON-based System Prompt for GPT
SYSTEM_PROMPT_JSON = {
    "role": "professional_translator",
    "capabilities": [
        "Translate text content between languages",
        "Preserve data structure and formatting",
        "Handle technical and business terminology"
    ],
    "constraints": [
        "Never modify keys or field names",
        "Never change numbers, dates, or technical values",
        "Never add or remove data entries",
        "Never truncate or summarize content",
        "Always maintain exact array length"
    ],
    "output_requirements": [
        "Return valid JSON only",
        "No explanations or comments",
        "Same structure as input",
        "Complete translation of all entries"
    ]
}

# Language names mapping
LANGUAGE_NAMES = {
    'en': 'English',
    'ko': 'Korean',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian'
}


def generate_user_prompt_json(source_lang: str, target_lang: str, json_data: list) -> dict:
    """
    Generate JSON-structured user prompt for translation
    
    Args:
        source_lang: Source language code (e.g., 'ko', 'en')
        target_lang: Target language code (e.g., 'en', 'ko')
        json_data: List of dictionaries representing CSV rows
        
    Returns:
        Dictionary containing structured prompt
    """
    return {
        "task": "translate",
        "source_language": source_lang,
        "target_language": target_lang,
        "rules": [
            "Translate ONLY the text values in each object",
            "Keep all keys (field names) in English unchanged",
            "Keep numbers, dates, URLs, and special characters unchanged",
            "Preserve empty or null values as-is",
            "Maintain the exact same array length and structure",
            "Do not add, remove, or reorder any objects",
            "Do not add explanations or metadata"
        ],
        "input_data": json_data,
        "output_format": {
            "type": "array",
            "description": "Return a JSON array with the same structure as input_data, but with text values translated"
        }
    }


def get_available_languages():
    """Get list of available languages"""
    return LANGUAGE_NAMES


# Made with Bob