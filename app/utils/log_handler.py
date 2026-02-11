import logging
import queue
from typing import Dict, Set
import uuid

# Global log queues for each session
log_queues: Dict[str, queue.Queue] = {}


class SSELogHandler(logging.Handler):
    """Custom log handler that broadcasts logs to SSE clients"""
    
    def __init__(self, session_id: str):
        super().__init__()
        self.session_id = session_id
        
        # Create queue for this session if it doesn't exist
        if session_id not in log_queues:
            log_queues[session_id] = queue.Queue()
    
    def emit(self, record):
        """Emit a log record to the queue"""
        try:
            log_entry = self.format(record)
            
            # Add to queue if session exists
            if self.session_id in log_queues:
                log_queues[self.session_id].put({
                    'level': record.levelname,
                    'message': log_entry,
                    'timestamp': record.created
                })
        except Exception:
            self.handleError(record)


def create_session() -> str:
    """Create a new session ID"""
    session_id = str(uuid.uuid4())
    log_queues[session_id] = queue.Queue()
    return session_id


def get_log_queue(session_id: str):
    """Get log queue for a session"""
    return log_queues.get(session_id)


def cleanup_session(session_id: str):
    """Clean up session resources"""
    if session_id in log_queues:
        del log_queues[session_id]


def add_session_handler(session_id: str):
    """Add SSE handler to root logger for this session"""
    handler = SSELogHandler(session_id)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    # Add to root logger
    logging.getLogger().addHandler(handler)
    
    return handler


def remove_session_handler(handler: logging.Handler):
    """Remove handler from root logger"""
    logging.getLogger().removeHandler(handler)

# Made with Bob
