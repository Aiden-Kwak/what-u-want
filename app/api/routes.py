from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pathlib import Path
from typing import Optional, Dict
from app.services.file_handler import FileHandler
from app.services.converter import ExcelConverter
from app.services.translator import TranslationService
from app.models.schemas import TranslationResponse
from app.core.exceptions import TranslationError
from app.core.config import settings
from app.core.prompts import get_available_languages
from app.utils.log_handler import create_session, get_log_queue, cleanup_session, add_session_handler, remove_session_handler
import logging
import uuid
import asyncio
import json
import queue

router = APIRouter()
logger = logging.getLogger(__name__)

# Global progress tracking
progress_store: Dict[str, dict] = {}


@router.get("/languages")
async def get_languages():
    """Get available languages for translation"""
    return JSONResponse(content=get_available_languages())


@router.post("/translate", response_model=TranslationResponse)
async def translate_file(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    source_lang: str = Form(default="ko"),
    target_lang: str = Form(default="en"),
    model: str = Form(default="gpt-4.1-mini"),
    session_id: Optional[str] = Form(None)
):
    """
    Translate Excel/CSV file using GPT
    
    Args:
        file: Uploaded Excel or CSV file
        api_key: OpenAI API key
        source_lang: Source language code (e.g., 'ko', 'en')
        target_lang: Target language code (e.g., 'en', 'ko')
        model: GPT model to use
        session_id: Session ID for log streaming
        
    Returns:
        TranslationResponse with download URL
    """
    file_handler = FileHandler()
    input_path = None
    output_path = None
    log_handler = None
    
    try:
        # Add session log handler if session_id provided
        if session_id:
            log_handler = add_session_handler(session_id)
        
        # Determine which API key to use
        final_api_key = api_key if api_key else settings.OPENAI_API_KEY
        
        if not final_api_key:
            raise HTTPException(
                status_code=400,
                detail="API key is required. Please provide it in the form or set OPENAI_API_KEY in .env file."
            )
        
        # Save uploaded file
        input_path = await file_handler.save_upload_file(file)
        logger.info(f"File uploaded: {input_path}")
        
        # Determine file type
        file_ext = input_path.suffix.lower()
        
        # Convert to CSV dict
        if file_ext == '.xlsx':
            csv_dict = ExcelConverter.excel_to_csv_dict(input_path)
        else:  # .csv
            csv_content = ExcelConverter.csv_file_to_string(input_path)
            csv_dict = {"Sheet1": csv_content}
        
        total_sheets = len(csv_dict)
        logger.info(f"Sheets to translate: {list(csv_dict.keys())} (Total: {total_sheets})")
        logger.info(f"Translation: {source_lang} -> {target_lang}")
        
        # Translate with progress tracking
        translator = TranslationService(api_key=final_api_key, model=model)
        translated_dict = {}
        
        for idx, (sheet_name, csv_content) in enumerate(csv_dict.items(), 1):
            logger.info(f"Translating sheet {idx}/{total_sheets}: {sheet_name}")
            translated_content = translator.translate_csv(
                csv_content,
                source_lang,
                target_lang,
                sheet_name
            )
            translated_dict[sheet_name] = translated_content
            logger.info(f"Completed sheet {idx}/{total_sheets}: {sheet_name}")
        
        logger.info("All translations completed")
        
        # Convert back to Excel
        original_filename = file.filename or "translated_file.xlsx"
        output_filename = file_handler.generate_output_filename(original_filename)
        output_path = file_handler.temp_dir / output_filename
        ExcelConverter.csv_to_excel(translated_dict, output_path)
        
        logger.info(f"Output file created: {output_path}")
        
        return TranslationResponse(
            success=True,
            message="Translation completed successfully",
            download_url=f"/api/download/{output_filename}",
            filename=output_filename,
            sheets_processed=len(translated_dict)
        )
        
    except TranslationError as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    finally:
        # Remove log handler
        if log_handler:
            remove_session_handler(log_handler)
        
        # Cleanup input file
        if input_path:
            file_handler.cleanup_file(input_path)


@router.get("/download/{filename}")
async def download_file(filename: str):
    """
    Download translated file
    
    Args:
        filename: Name of file to download
        
    Returns:
        FileResponse with Excel file
    """
    file_path = Path("temp") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/logs/stream")
async def stream_logs(request: Request, session_id: str):
    """
    Stream logs via Server-Sent Events (SSE)
    
    Args:
        request: FastAPI request object
        session_id: Session ID for log streaming
        
    Returns:
        StreamingResponse with SSE data
    """
    async def event_generator():
        """Generate SSE events from log queue"""
        log_queue = get_log_queue(session_id)
        
        if not log_queue:
            yield f"data: {json.dumps({'error': 'Invalid session ID'})}\n\n"
            return
        
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                try:
                    # Get log from queue with timeout
                    log_entry = log_queue.get(timeout=1)
                    
                    # Format as SSE
                    data = json.dumps({
                        'level': log_entry['level'],
                        'message': log_entry['message'],
                        'timestamp': log_entry['timestamp']
                    })
                    
                    yield f"data: {data}\n\n"
                    
                except queue.Empty:
                    # Send keepalive
                    yield f": keepalive\n\n"
                    await asyncio.sleep(1)
                    
        except asyncio.CancelledError:
            pass
        finally:
            # Cleanup when client disconnects
            cleanup_session(session_id)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/logs/session")
async def create_log_session():
    """
    Create a new log session
    
    Returns:
        JSON with session ID
    """
    session_id = create_session()
    return JSONResponse(content={"session_id": session_id})


# Made with Bob
