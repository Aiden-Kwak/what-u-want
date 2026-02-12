"""
Progress tracking utilities for translation process
"""
from typing import Dict, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class TranslationStage(str, Enum):
    """Translation process stages"""
    UPLOAD = "upload"
    PREPARATION = "preparation"
    TRANSLATION = "translation"
    EXCEL_GENERATION = "excel_generation"
    COMPLETE = "complete"


class ProgressTracker:
    """Track translation progress and calculate percentages"""
    
    # Stage weight distribution (total = 100%)
    STAGE_WEIGHTS = {
        TranslationStage.UPLOAD: 10,           # 0-10%
        TranslationStage.PREPARATION: 10,      # 10-20%
        TranslationStage.TRANSLATION: 60,      # 20-80%
        TranslationStage.EXCEL_GENERATION: 15, # 80-95%
        TranslationStage.COMPLETE: 5,          # 95-100%
    }
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.current_stage = TranslationStage.UPLOAD
        self.total_chunks = 0
        self.completed_chunks = 0
        
    def get_stage_start_percentage(self, stage: TranslationStage) -> int:
        """Get the starting percentage for a given stage"""
        start = 0
        for s in TranslationStage:
            if s == stage:
                break
            start += self.STAGE_WEIGHTS[s]
        return start
    
    def calculate_progress(self) -> int:
        """Calculate current progress percentage"""
        base_progress = self.get_stage_start_percentage(self.current_stage)
        
        if self.current_stage == TranslationStage.TRANSLATION and self.total_chunks > 0:
            # Calculate translation progress based on chunks
            chunk_progress = (self.completed_chunks / self.total_chunks) * self.STAGE_WEIGHTS[TranslationStage.TRANSLATION]
            return int(base_progress + chunk_progress)
        else:
            # For other stages, return the start of the stage
            return base_progress
    
    def set_stage(self, stage: TranslationStage, message: Optional[str] = None):
        """Set current stage and log milestone"""
        self.current_stage = stage
        progress = self.calculate_progress()
        
        if message:
            logger.info(f"📍 MILESTONE: {message} ({progress}%)")
        
        return {
            "type": "milestone",
            "stage": stage.value,
            "percentage": progress,
            "message": message or f"Stage: {stage.value}"
        }
    
    def set_translation_chunks(self, total: int):
        """Set total number of translation chunks"""
        self.total_chunks = total
        self.completed_chunks = 0
        logger.info(f"📦 Translation will process {total} chunks")
    
    def increment_chunk(self, current: int, total: int, message: Optional[str] = None):
        """Increment completed chunks and calculate progress"""
        self.completed_chunks = current
        self.total_chunks = total
        progress = self.calculate_progress()
        
        default_message = f"청크 {current}/{total} 번역 완료"
        log_message = message or default_message
        
        logger.info(f"📦 PROGRESS: {log_message} ({progress}%)")
        
        return {
            "type": "progress",
            "stage": self.current_stage.value,
            "current": current,
            "total": total,
            "percentage": progress,
            "message": log_message
        }
    
    def complete_stage(self, stage: TranslationStage, message: Optional[str] = None):
        """Mark a stage as complete and move to next"""
        # Calculate progress at the end of this stage
        base = self.get_stage_start_percentage(stage)
        progress = base + self.STAGE_WEIGHTS[stage]
        
        if message:
            logger.info(f"✅ COMPLETE: {message} ({progress}%)")
        
        return {
            "type": "milestone",
            "stage": stage.value,
            "percentage": progress,
            "message": message or f"Completed: {stage.value}",
            "completed": True
        }


# Global progress trackers
_progress_trackers: Dict[str, ProgressTracker] = {}


def get_progress_tracker(session_id: str) -> ProgressTracker:
    """Get or create progress tracker for session"""
    if session_id not in _progress_trackers:
        _progress_trackers[session_id] = ProgressTracker(session_id)
    return _progress_trackers[session_id]


def cleanup_progress_tracker(session_id: str):
    """Remove progress tracker for session"""
    if session_id in _progress_trackers:
        del _progress_trackers[session_id]
        logger.debug(f"Cleaned up progress tracker for session {session_id}")


# Made with Bob
