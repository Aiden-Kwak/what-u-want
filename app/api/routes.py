from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pathlib import Path
from typing import Optional, Dict
import json
import asyncio
import queue
from app.services.file_handler import FileHandler
from app.services.converter import ExcelConverter
from app.services.translator import TranslationService
from app.models.schemas import TranslationResponse
from app.core.exceptions import TranslationError
from app.core.config import settings
from app.core.prompts import get_available_languages
from app.utils.log_handler import create_session, get_log_queue, cleanup_session, add_session_handler, remove_session_handler
from app.utils.progress_tracker import get_progress_tracker, cleanup_progress_tracker, TranslationStage
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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    source_lang: str = Form(default="ko"),
    target_lang: str = Form(default="en"),
    model: str = Form(default="gpt-4.1-mini"),
    session_id: Optional[str] = Form(None)
):
    """
    Lightning fast entry point: Just queue the task and return
    """
    # Quick check for API key
    final_api_key = api_key if api_key else settings.OPENAI_API_KEY
    if not final_api_key:
        raise HTTPException(status_code=400, detail="API key is required.")

    # Read file content into memory immediately to keep it available for background task
    file_content = await file.read()
    filename = file.filename
    
    # Offload EVERYTHING else to background
    background_tasks.add_task(
        run_translation_task_full,
        file_content=file_content,
        filename=filename,
        api_key=final_api_key,
        source_lang=source_lang,
        target_lang=target_lang,
        model=model,
        session_id=session_id
    )
    
    return TranslationResponse(
        success=True,
        message="Job queued successfully",
        download_url="",
        filename=filename,
        sheets_processed=0
    )


async def run_translation_task_full(
    file_content: bytes,
    filename: str,
    api_key: str,
    source_lang: str,
    target_lang: str,
    model: str,
    session_id: Optional[str]
):
    """
    Heavy lifting background worker
    """
    import os
    import uuid
    from app.services.file_handler import FileHandler
    
    file_handler = FileHandler()
    input_path = None
    log_handler = None
    progress_tracker = None
    
    try:
        if session_id:
            log_handler = add_session_handler(session_id)
            progress_tracker = get_progress_tracker(session_id)
        
        if progress_tracker:
            progress_tracker.set_stage(TranslationStage.UPLOAD, "파일 저장 및 분석 중")
        
        # 1. Save file from memory bytes
        file_ext = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        input_path = Path("temp") / unique_filename
        input_path.parent.mkdir(exist_ok=True)
        
        with open(input_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"Background task: File saved to {input_path}")
        
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
        
        if progress_tracker:
            progress_tracker.complete_stage(TranslationStage.UPLOAD, f"파일 분석 완료 ({total_sheets}개 시트)")
        
        # Stage 2: Preparation (10-20%)
        if progress_tracker:
            progress_tracker.set_stage(TranslationStage.PREPARATION, "번역 준비 중")
        
        # Define progress callback for translator
        def translation_progress_callback(event_type: str, *args):
            if not progress_tracker:
                return
            
            if event_type == 'chunks_total':
                total_chunks = args[0]
                progress_tracker.set_translation_chunks(total_chunks)
            elif event_type == 'chunk_complete':
                current, total = args[0], args[1]
                progress_tracker.increment_chunk(current, total)
        
        # Translate with progress tracking
        translator = TranslationService(
            api_key=api_key, 
            model=model,
            progress_callback=translation_progress_callback
        )
        
        if progress_tracker:
            progress_tracker.complete_stage(TranslationStage.PREPARATION, "번역 준비 완료")
            progress_tracker.set_stage(TranslationStage.TRANSLATION, "AI 번역 시작")
        
        # Stage 3: Translation (20-80%)
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
        
        if progress_tracker:
            progress_tracker.complete_stage(TranslationStage.TRANSLATION, "모든 번역 완료")
        
        # Stage 4: Excel Generation (80-95%)
        if progress_tracker:
            progress_tracker.set_stage(TranslationStage.EXCEL_GENERATION, "엑셀 파일 생성 중")
        
        # Convert back to Excel
        output_filename = f"{input_path.stem}_translated.xlsx"
        output_path = Path("temp") / output_filename
        ExcelConverter.csv_to_excel(translated_dict, output_path)
        
        logger.info(f"Output file created: {output_path}")
        
        if progress_tracker:
            progress_tracker.complete_stage(TranslationStage.EXCEL_GENERATION, f"생성 완료: {output_filename}")
        
        # Stage 5: Complete (95-100%)
        if progress_tracker:
            progress_tracker.set_stage(TranslationStage.COMPLETE, "번역 완료!")
            progress_tracker.complete_stage(TranslationStage.COMPLETE, "다운로드 준비 완료")
            # CRITICAL: Send filename via log for frontend to capture
            logger.info(f"✅ COMPLETE: DOWNLOAD_READY:{output_filename}")
            progress_tracker.complete_stage(TranslationStage.COMPLETE, "번역 프로세스 종료")
            
    except TranslationError as e:
        logger.error(f"Background translation task failed: {str(e)}")
        if progress_tracker:
            progress_tracker.set_stage(TranslationStage.COMPLETE, f"❌ 에러 발생: {str(e)}")
    
    except Exception as e:
        logger.error(f"Unexpected error in background task: {str(e)}")
        if progress_tracker:
            progress_tracker.set_stage(TranslationStage.COMPLETE, f"❌ 에러 발생: {str(e)}")
    
    finally:
        # Remove log handler
        if log_handler:
            remove_session_handler(log_handler)
        
        # Cleanup progress tracker
        if session_id:
            cleanup_progress_tracker(session_id)
        
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
