"""
Latency measurement and logging utilities for LiveKit voice agent system.
Provides decorators, context managers, and utilities for measuring operation latency.
"""

import time
import logging
import functools
import asyncio
from typing import Optional, Dict, Any, Callable, Union
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass, field
from datetime import datetime
import json


logger = logging.getLogger(__name__)


@dataclass
class LatencyMeasurement:
    """Represents a single latency measurement."""
    operation: str
    duration_ms: float
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    success: bool = True
    error: Optional[str] = None


class LatencyTracker:
    """Tracks multiple latency measurements for a call session."""
    
    def __init__(self, call_id: str, room_name: str):
        self.call_id = call_id
        self.room_name = room_name
        self.measurements: list[LatencyMeasurement] = []
        self.start_time = time.time()
        
    def add_measurement(self, measurement: LatencyMeasurement):
        """Add a latency measurement to the tracker."""
        self.measurements.append(measurement)
        
        # Log the measurement immediately
        status = "SUCCESS" if measurement.success else "ERROR"
        logger.info(
            f"LATENCY_MEASUREMENT | "
            f"call_id={self.call_id} | "
            f"operation={measurement.operation} | "
            f"duration_ms={measurement.duration_ms:.2f} | "
            f"status={status} | "
            f"metadata={json.dumps(measurement.metadata)}"
        )
        
        if measurement.error:
            logger.error(f"LATENCY_ERROR | call_id={self.call_id} | operation={measurement.operation} | error={measurement.error}")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of all latency measurements."""
        if not self.measurements:
            return {"total_operations": 0, "total_duration_ms": 0}
        
        successful_measurements = [m for m in self.measurements if m.success]
        failed_measurements = [m for m in self.measurements if not m.success]
        
        total_duration = sum(m.duration_ms for m in successful_measurements)
        
        # Group by operation type
        operation_stats = {}
        for measurement in successful_measurements:
            op = measurement.operation
            if op not in operation_stats:
                operation_stats[op] = {
                    "count": 0,
                    "total_ms": 0,
                    "min_ms": float('inf'),
                    "max_ms": 0,
                    "avg_ms": 0
                }
            
            stats = operation_stats[op]
            stats["count"] += 1
            stats["total_ms"] += measurement.duration_ms
            stats["min_ms"] = min(stats["min_ms"], measurement.duration_ms)
            stats["max_ms"] = max(stats["max_ms"], measurement.duration_ms)
        
        # Calculate averages
        for stats in operation_stats.values():
            stats["avg_ms"] = stats["total_ms"] / stats["count"]
            stats["min_ms"] = stats["min_ms"] if stats["min_ms"] != float('inf') else 0
        
        return {
            "call_id": self.call_id,
            "room_name": self.room_name,
            "total_operations": len(self.measurements),
            "successful_operations": len(successful_measurements),
            "failed_operations": len(failed_measurements),
            "total_duration_ms": total_duration,
            "call_duration_ms": (time.time() - self.start_time) * 1000,
            "operation_stats": operation_stats,
            "failed_operations": [{"operation": m.operation, "error": m.error} for m in failed_measurements]
        }
    
    def log_summary(self):
        """Log a comprehensive latency summary."""
        summary = self.get_summary()
        
        logger.info(
            f"LATENCY_SUMMARY | "
            f"call_id={self.call_id} | "
            f"total_ops={summary['total_operations']} | "
            f"successful_ops={summary['successful_operations']} | "
            f"failed_ops={summary['failed_operations']} | "
            f"total_duration_ms={summary['total_duration_ms']:.2f} | "
            f"call_duration_ms={summary['call_duration_ms']:.2f}"
        )
        
        # Log operation-specific stats
        for operation, stats in summary["operation_stats"].items():
            logger.info(
                f"LATENCY_OPERATION_STATS | "
                f"call_id={self.call_id} | "
                f"operation={operation} | "
                f"count={stats['count']} | "
                f"avg_ms={stats['avg_ms']:.2f} | "
                f"min_ms={stats['min_ms']:.2f} | "
                f"max_ms={stats['max_ms']:.2f} | "
                f"total_ms={stats['total_ms']:.2f}"
            )
        
        # Log failed operations
        for failed_op in summary["failed_operations"]:
            logger.error(
                f"LATENCY_FAILED_OPERATION | "
                f"call_id={self.call_id} | "
                f"operation={failed_op['operation']} | "
                f"error={failed_op['error']}"
            )


# Global tracker storage
_trackers: Dict[str, LatencyTracker] = {}


def get_tracker(call_id: str, room_name: str = "") -> LatencyTracker:
    """Get or create a latency tracker for a call."""
    if call_id not in _trackers:
        _trackers[call_id] = LatencyTracker(call_id, room_name)
    return _trackers[call_id]


def clear_tracker(call_id: str):
    """Clear a latency tracker (call when call ends)."""
    if call_id in _trackers:
        tracker = _trackers[call_id]
        tracker.log_summary()
        del _trackers[call_id]


def measure_latency(
    operation: str,
    call_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    log_level: int = logging.INFO
):
    """
    Decorator to measure latency of a function or method.
    
    Args:
        operation: Name of the operation being measured
        call_id: Call ID for grouping measurements (optional)
        metadata: Additional metadata to log with the measurement
        log_level: Logging level for the measurement
    """
    def decorator(func: Callable):
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                start_time = time.time()
                success = True
                error = None
                
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    
                    measurement = LatencyMeasurement(
                        operation=operation,
                        duration_ms=duration_ms,
                        timestamp=datetime.now(),
                        metadata=metadata or {},
                        success=success,
                        error=error
                    )
                    
                    if call_id:
                        tracker = get_tracker(call_id)
                        tracker.add_measurement(measurement)
                    else:
                        # Log directly if no call_id provided
                        status = "SUCCESS" if success else "ERROR"
                        logger.log(
                            log_level,
                            f"LATENCY_MEASUREMENT | "
                            f"operation={operation} | "
                            f"duration_ms={duration_ms:.2f} | "
                            f"status={status} | "
                            f"metadata={json.dumps(metadata or {})}"
                        )
            
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                start_time = time.time()
                success = True
                error = None
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    
                    measurement = LatencyMeasurement(
                        operation=operation,
                        duration_ms=duration_ms,
                        timestamp=datetime.now(),
                        metadata=metadata or {},
                        success=success,
                        error=error
                    )
                    
                    if call_id:
                        tracker = get_tracker(call_id)
                        tracker.add_measurement(measurement)
                    else:
                        # Log directly if no call_id provided
                        status = "SUCCESS" if success else "ERROR"
                        logger.log(
                            log_level,
                            f"LATENCY_MEASUREMENT | "
                            f"operation={operation} | "
                            f"duration_ms={duration_ms:.2f} | "
                            f"status={status} | "
                            f"metadata={json.dumps(metadata or {})}"
                        )
            
            return sync_wrapper
    
    return decorator


@asynccontextmanager
async def measure_latency_context(
    operation: str,
    call_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Async context manager for measuring latency of code blocks.
    
    Usage:
        async with measure_latency_context("database_query", call_id="call_123"):
            result = await database.query()
    """
    start_time = time.time()
    success = True
    error = None
    
    try:
        yield
    except Exception as e:
        success = False
        error = str(e)
        raise
    finally:
        duration_ms = (time.time() - start_time) * 1000
        
        measurement = LatencyMeasurement(
            operation=operation,
            duration_ms=duration_ms,
            timestamp=datetime.now(),
            metadata=metadata or {},
            success=success,
            error=error
        )
        
        if call_id:
            tracker = get_tracker(call_id)
            tracker.add_measurement(measurement)
        else:
            # Log directly if no call_id provided
            status = "SUCCESS" if success else "ERROR"
            logger.info(
                f"LATENCY_MEASUREMENT | "
                f"operation={operation} | "
                f"duration_ms={duration_ms:.2f} | "
                f"status={status} | "
                f"metadata={json.dumps(metadata or {})}"
            )


@contextmanager
def measure_latency_sync_context(
    operation: str,
    call_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Sync context manager for measuring latency of code blocks.
    
    Usage:
        with measure_latency_sync_context("file_operation", call_id="call_123"):
            result = file.read()
    """
    start_time = time.time()
    success = True
    error = None
    
    try:
        yield
    except Exception as e:
        success = False
        error = str(e)
        raise
    finally:
        duration_ms = (time.time() - start_time) * 1000
        
        measurement = LatencyMeasurement(
            operation=operation,
            duration_ms=duration_ms,
            timestamp=datetime.now(),
            metadata=metadata or {},
            success=success,
            error=error
        )
        
        if call_id:
            tracker = get_tracker(call_id)
            tracker.add_measurement(measurement)
        else:
            # Log directly if no call_id provided
            status = "SUCCESS" if success else "ERROR"
            logger.info(
                f"LATENCY_MEASUREMENT | "
                f"operation={operation} | "
                f"duration_ms={duration_ms:.2f} | "
                f"status={status} | "
                f"metadata={json.dumps(metadata or {})}"
            )


def log_latency_measurement(
    operation: str,
    duration_ms: float,
    call_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    success: bool = True,
    error: Optional[str] = None
):
    """
    Manually log a latency measurement.
    
    Args:
        operation: Name of the operation
        duration_ms: Duration in milliseconds
        call_id: Call ID for grouping measurements
        metadata: Additional metadata
        success: Whether the operation was successful
        error: Error message if operation failed
    """
    measurement = LatencyMeasurement(
        operation=operation,
        duration_ms=duration_ms,
        timestamp=datetime.now(),
        metadata=metadata or {},
        success=success,
        error=error
    )
    
    if call_id:
        tracker = get_tracker(call_id)
        tracker.add_measurement(measurement)
    else:
        # Log directly if no call_id provided
        status = "SUCCESS" if success else "ERROR"
        logger.info(
            f"LATENCY_MEASUREMENT | "
            f"operation={operation} | "
            f"duration_ms={duration_ms:.2f} | "
            f"status={status} | "
            f"metadata={json.dumps(metadata or {})}"
        )


class LatencyProfiler:
    """Advanced latency profiler for complex operations."""
    
    def __init__(self, call_id: str, operation: str):
        self.call_id = call_id
        self.operation = operation
        self.start_time = time.time()
        self.checkpoints: Dict[str, float] = {}
        self.metadata: Dict[str, Any] = {}
    
    def checkpoint(self, name: str, metadata: Optional[Dict[str, Any]] = None):
        """Record a checkpoint with optional metadata."""
        self.checkpoints[name] = time.time()
        if metadata:
            self.metadata[name] = metadata
    
    def finish(self, success: bool = True, error: Optional[str] = None):
        """Finish profiling and log all measurements."""
        total_duration = (time.time() - self.start_time) * 1000
        
        # Log total operation duration
        log_latency_measurement(
            operation=self.operation,
            duration_ms=total_duration,
            call_id=self.call_id,
            metadata=self.metadata,
            success=success,
            error=error
        )
        
        # Log individual checkpoint durations
        prev_time = self.start_time
        for checkpoint_name, checkpoint_time in self.checkpoints.items():
            checkpoint_duration = (checkpoint_time - prev_time) * 1000
            checkpoint_metadata = self.metadata.get(checkpoint_name, {})
            
            log_latency_measurement(
                operation=f"{self.operation}.{checkpoint_name}",
                duration_ms=checkpoint_duration,
                call_id=self.call_id,
                metadata=checkpoint_metadata,
                success=success
            )
            
            prev_time = checkpoint_time
        
        # Log final segment
        if self.checkpoints:
            final_checkpoint_time = max(self.checkpoints.values())
            final_duration = (time.time() - final_checkpoint_time) * 1000
            
            log_latency_measurement(
                operation=f"{self.operation}.final",
                duration_ms=final_duration,
                call_id=self.call_id,
                success=success
            )
