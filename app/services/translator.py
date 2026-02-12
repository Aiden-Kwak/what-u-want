from openai import OpenAI
from typing import Dict, List, Optional, Callable
from app.core.exceptions import GPTAPIError
from app.core.prompts import SYSTEM_PROMPT_JSON, generate_user_prompt_json
import re
import logging
import json
import csv
from io import StringIO

logger = logging.getLogger(__name__)


class TranslationService:
    """Handle GPT-based translation"""
    
    def __init__(self, api_key: str, model: str = "gpt-4.1-nano", progress_callback: Optional[Callable] = None):
        """
        Initialize translation service
        
        Args:
            api_key: OpenAI API key
            model: GPT model to use
            progress_callback: Optional callback function for progress updates
        """
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.progress_callback = progress_callback
    
    def _csv_to_json(self, csv_content: str) -> List[Dict]:
        """Convert CSV string to JSON array of objects"""
        reader = csv.DictReader(StringIO(csv_content))
        return list(reader)
    
    def _json_to_csv(self, json_data: List[Dict]) -> str:
        """Convert JSON array of objects to CSV string, preserving original column order"""
        if not json_data:
            return ""
        
        # Validate that json_data is a list
        if not isinstance(json_data, list):
            logger.error(f"Invalid JSON data type: expected list, got {type(json_data)}")
            raise ValueError(f"Invalid JSON data: expected list, got {type(json_data)}")
        
        # Validate that all items are dictionaries
        for i, item in enumerate(json_data):
            if not isinstance(item, dict):
                logger.error(f"Invalid item at index {i}: expected dict, got {type(item)}")
                logger.error(f"Item content: {str(item)[:200]}")
                raise ValueError(f"Invalid JSON data: expected list of dicts, got {type(item)} at index {i}")
        
        # Use the keys from the first row to preserve original order
        # This assumes all rows have the same keys (which they should from GPT)
        fieldnames = list(json_data[0].keys())
        
        # Check if any other rows have different keys
        all_keys = set(fieldnames)
        for item in json_data[1:]:
            all_keys.update(item.keys())
        
        # If there are extra keys in other rows, append them
        if len(all_keys) > len(fieldnames):
            extra_keys = all_keys - set(fieldnames)
            fieldnames.extend(sorted(extra_keys))
            logger.warning(f"Found extra keys in some rows: {extra_keys}")
        
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(json_data)
        return output.getvalue()
    
    def translate_csv(
        self,
        csv_content: str,
        source_lang: str,
        target_lang: str,
        sheet_name: str = ""
    ) -> str:
        """
        Translate CSV content using GPT with JSON format
        Automatically chunks large data to avoid token limits
        
        Args:
            csv_content: CSV formatted string
            source_lang: Source language code (e.g., 'ko', 'en')
            target_lang: Target language code (e.g., 'en', 'ko')
            sheet_name: Optional sheet name for context
            
        Returns:
            Translated CSV string
            
        Raises:
            GPTAPIError: If API call fails
        """
        # Convert CSV to JSON for better structure
        try:
            json_data = self._csv_to_json(csv_content)
            logger.info(f"Converted CSV to JSON: {len(json_data)} rows")
        except Exception as e:
            logger.error(f"Failed to convert CSV to JSON: {str(e)}")
            raise GPTAPIError(f"CSV parsing failed: {str(e)}")
        
        # Check if data needs to be chunked (based on row count)
        # Very conservative: 5 rows = ~2-3k tokens with long text data
        # This ensures we stay well under the 16k token limit even with very long content
        CHUNK_SIZE = 5
        
        if len(json_data) > CHUNK_SIZE:
            logger.info(f"Large dataset detected ({len(json_data)} rows). Splitting into chunks of {CHUNK_SIZE} rows.")
            return self._translate_in_chunks(json_data, source_lang, target_lang, CHUNK_SIZE)
        
        # For small datasets, translate directly
        translated_json = self._translate_json_data(json_data, source_lang, target_lang)
        return self._json_to_csv(translated_json)
    
    def _translate_json_data(
        self,
        json_data: List[Dict],
        source_lang: str,
        target_lang: str
    ) -> List[Dict]:
        """
        Translate JSON data directly (for small datasets)
        
        Args:
            json_data: List of dictionaries representing CSV rows
            source_lang: Source language code
            target_lang: Target language code
            
        Returns:
            Translated JSON data (List of dicts)
        """
        # Generate structured JSON prompt using centralized function
        prompt_structure = generate_user_prompt_json(source_lang, target_lang, json_data)
        user_prompt = json.dumps(prompt_structure, ensure_ascii=False, indent=2)
        
        logger.info(f"JSON prompt structure created with {len(json_data)} rows")
        
        try:
            # Log the prompts for debugging
            logger.info(f"=== Translation Request ===")
            logger.info(f"Model: {self.model}")
            logger.info(f"Source: {source_lang} -> Target: {target_lang}")
            logger.info(f"Rows to translate: {len(json_data)}")
            
            # Use JSON mode for structured output with centralized prompts
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": json.dumps(SYSTEM_PROMPT_JSON, ensure_ascii=False)},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=16000,
                response_format={"type": "json_object"}
            )
            
            translated_content = response.choices[0].message.content
            
            if translated_content is None:
                raise GPTAPIError("GPT returned empty response")
            
            # Log token usage and cost
            usage = response.usage
            if usage:
                prompt_tokens = usage.prompt_tokens
                completion_tokens = usage.completion_tokens
                total_tokens = usage.total_tokens
                
                cost = self._calculate_cost(self.model, prompt_tokens, completion_tokens)
                
                logger.info(f"=== Token Usage ===")
                logger.info(f"Prompt tokens: {prompt_tokens:,}")
                logger.info(f"Completion tokens: {completion_tokens:,}")
                logger.info(f"Total tokens: {total_tokens:,}")
                logger.info(f"Estimated cost: ${cost:.6f}")
            
            # Parse JSON response
            try:
                translated_json = json.loads(translated_content)
                
                # Handle both array and object with array
                if isinstance(translated_json, dict):
                    # Look for 'input_data' key first (our expected format)
                    if 'input_data' in translated_json and isinstance(translated_json['input_data'], list):
                        translated_json = translated_json['input_data']
                        logger.info("Extracted 'input_data' array from response")
                    else:
                        # Fallback: find any list in the response
                        for key in translated_json:
                            if isinstance(translated_json[key], list) and key != 'rules':
                                translated_json = translated_json[key]
                                logger.info(f"Extracted '{key}' array from response")
                                break
                
                # Ensure it's a list
                if not isinstance(translated_json, list):
                    raise GPTAPIError(f"Expected JSON array, got {type(translated_json)}")
                
                logger.info(f"✅ Parsed JSON: {len(translated_json)} rows")
                
                # Validate row count
                if len(translated_json) < len(json_data):
                    logger.warning(f"⚠️ Row count mismatch! Input: {len(json_data)} rows, Output: {len(translated_json)} rows")
                    logger.warning(f"Some content may have been truncated by GPT")
                else:
                    logger.info(f"✅ Row count validated: {len(translated_json)} rows")
                
                logger.info(f"Translation completed, returning JSON data")
                
                return translated_json
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {str(e)}")
                logger.error(f"Response content: {translated_content[:1000]}...")
                raise GPTAPIError(f"Invalid JSON response from GPT: {str(e)}")
            
        except Exception as e:
            raise GPTAPIError(f"GPT API call failed: {str(e)}")
    
    def _translate_in_chunks(
        self,
        json_data: List[Dict],
        source_lang: str,
        target_lang: str,
        chunk_size: int
    ) -> str:
        """
        Translate large dataset by splitting into chunks
        
        Args:
            json_data: List of dictionaries representing CSV rows
            source_lang: Source language code
            target_lang: Target language code
            chunk_size: Number of rows per chunk
            
        Returns:
            Translated CSV string (all chunks combined)
        """
        translated_chunks = []
        total_chunks = (len(json_data) + chunk_size - 1) // chunk_size
        
        logger.info(f"Splitting {len(json_data)} rows into {total_chunks} chunks of {chunk_size} rows each")
        
        # Notify about total chunks if callback exists
        if self.progress_callback:
            self.progress_callback('chunks_total', total_chunks)
        
        for i in range(0, len(json_data), chunk_size):
            chunk = json_data[i:i + chunk_size]
            chunk_num = (i // chunk_size) + 1
            
            logger.info(f"📦 청크 {chunk_num}/{total_chunks} 번역 시작 ({len(chunk)} rows)")
            
            try:
                # Translate this chunk (returns JSON directly)
                chunk_json = self._translate_json_data(chunk, source_lang, target_lang)
                translated_chunks.extend(chunk_json)
                
                logger.info(f"✅ 청크 {chunk_num}/{total_chunks} 번역 완료 ({len(chunk_json)} rows)")
                
                # Notify progress if callback exists
                if self.progress_callback:
                    self.progress_callback('chunk_complete', chunk_num, total_chunks)
                
            except Exception as e:
                logger.error(f"❌ Chunk {chunk_num}/{total_chunks} failed: {str(e)}")
                raise GPTAPIError(f"Failed to translate chunk {chunk_num}: {str(e)}")
        
        # Combine all chunks
        logger.info(f"✅ All chunks translated. Combining {len(translated_chunks)} total rows")
        
        # Convert combined JSON back to CSV
        final_csv = self._json_to_csv(translated_chunks)
        
        return final_csv
    
    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """
        Calculate estimated cost based on model and token usage
        
        Args:
            model: GPT model name
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens
            
        Returns:
            Estimated cost in USD
        """
        # Pricing per 1M tokens (as of 2024)
        # Source: https://openai.com/api/pricing/
        pricing = {
            "gpt-4.1-mini": {"prompt": 0.15, "completion": 0.60},  # $0.15/$0.60 per 1M tokens
            "gpt-4.1-nano": {"prompt": 0.10, "completion": 0.40},  # $0.10/$0.40 per 1M tokens
            "gpt-4o": {"prompt": 2.50, "completion": 10.00},       # $2.50/$10.00 per 1M tokens
            "gpt-4o-mini": {"prompt": 0.15, "completion": 0.60},   # $0.15/$0.60 per 1M tokens
            "gpt-5-nano": {"prompt": 0.20, "completion": 0.80},    # $0.20/$0.80 per 1M tokens
            "gpt-4-turbo-preview": {"prompt": 10.00, "completion": 30.00},  # $10/$30 per 1M tokens
            "gpt-4": {"prompt": 30.00, "completion": 60.00},       # $30/$60 per 1M tokens
            "gpt-3.5-turbo": {"prompt": 0.50, "completion": 1.50}, # $0.50/$1.50 per 1M tokens
        }
        
        # Get pricing for model (default to gpt-4o if not found)
        model_pricing = pricing.get(model, pricing["gpt-4o"])
        
        # Calculate cost (price per 1M tokens)
        prompt_cost = (prompt_tokens / 1_000_000) * model_pricing["prompt"]
        completion_cost = (completion_tokens / 1_000_000) * model_pricing["completion"]
        
        return prompt_cost + completion_cost
    
    def _extract_csv(self, content: str) -> str:
        """
        Extract CSV content from GPT response
        
        Args:
            content: GPT response content
            
        Returns:
            Cleaned CSV content
        """
        # Remove markdown code blocks
        content = re.sub(r'```csv\n', '', content)
        content = re.sub(r'```\n', '', content)
        content = re.sub(r'```', '', content)
        
        # Remove sheet name lines that GPT sometimes adds
        # Pattern: (Sheet name: xxx) or similar variations
        lines = content.split('\n')
        cleaned_lines = []
        
        for i, line in enumerate(lines):
            # Skip lines that look like sheet name annotations
            if line.strip().startswith('(Sheet name:') or line.strip().startswith('(시트 이름:'):
                logger.info(f"Removing sheet name annotation: {line.strip()}")
                continue
            
            # Skip empty lines at the beginning
            if i == 0 and not line.strip():
                continue
                
            cleaned_lines.append(line)
        
        content = '\n'.join(cleaned_lines)
        
        return content.strip()
    
    def translate_multiple_sheets(
        self,
        csv_dict: Dict[str, str],
        source_lang: str,
        target_lang: str
    ) -> Dict[str, str]:
        """
        Translate multiple sheets
        
        Args:
            csv_dict: Dict with sheet names as keys and CSV strings as values
            source_lang: Source language code
            target_lang: Target language code
            
        Returns:
            Dict with sheet names as keys and translated CSV strings as values
        """
        translated_dict = {}
        
        for sheet_name, csv_content in csv_dict.items():
            translated_content = self.translate_csv(
                csv_content,
                source_lang,
                target_lang,
                sheet_name
            )
            translated_dict[sheet_name] = translated_content
        
        return translated_dict

# Made with Bob
