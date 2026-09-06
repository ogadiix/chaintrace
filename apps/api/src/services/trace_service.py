"""
Trace Service and Asynchronous Background Job Manager
Handles queuing, asynchronous task dispatching, safe progress reporting,
and immutable result retrieval.
Source of truth: Master Prompt Phase 4 Sections 13, 14, 15, 25
"""
import asyncio
import logging
import uuid
from datetime import UTC, datetime

from apps.api.src.models.trace import TraceJob, TraceRequest, TraceResult
from apps.api.src.services.trace_engine import TraceEngine, get_trace_engine
from chaintrace_shared import JobStatus

logger = logging.getLogger(__name__)


class TraceJobManager:
    """
    Asynchronous Trace Job Manager.
    Manages jobs transitioning through QUEUED -> RUNNING -> COMPLETED / PARTIAL / FAILED.
    """

    def __init__(self, engine: TraceEngine | None = None):
        self._engine = engine or get_trace_engine()
        self._jobs: dict[str, TraceJob] = {}
        self._lock = asyncio.Lock()

    async def create_job(
        self,
        request: TraceRequest,
        investigation_id: str | None = None,
    ) -> TraceJob:
        """Enqueues a new asynchronous trace job and triggers background execution."""
        job_id = f"job_trace_{uuid.uuid4().hex[:12]}"
        now = datetime.now(UTC).isoformat()

        job = TraceJob(
            id=job_id,
            investigation_id=investigation_id,
            chain=request.chain,
            seed_wallet=request.seed_wallet,
            status=JobStatus.QUEUED,
            progress={"nodes_processed": 0, "edges_processed": 0, "current_hop": 0, "elapsed_ms": 0.0},
            created_at=now,
            updated_at=now,
        )

        async with self._lock:
            self._jobs[job_id] = job

        # Fire async background task
        asyncio.create_task(self._run_trace_job(job_id, request, investigation_id))
        return job

    async def get_job(self, job_id: str) -> TraceJob | None:
        """Retrieves current job status and results."""
        async with self._lock:
            return self._jobs.get(job_id)

    async def list_jobs_for_investigation(self, investigation_id: str) -> list[TraceJob]:
        """Retrieves all trace jobs executed for an investigation."""
        async with self._lock:
            return [j for j in self._jobs.values() if j.investigation_id == investigation_id]

    async def _run_trace_job(self, job_id: str, request: TraceRequest, investigation_id: str | None) -> None:
        now = datetime.now(UTC).isoformat()

        async with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].status = JobStatus.RUNNING
                self._jobs[job_id].updated_at = now

        try:
            # Execute bounded graph traversal
            result: TraceResult = await self._engine.execute_trace(
                request=request,
                investigation_id=investigation_id,
                job_id=job_id,
            )

            finish_now = datetime.now(UTC).isoformat()
            async with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id].status = result.status
                    self._jobs[job_id].result = result
                    self._jobs[job_id].updated_at = finish_now
                    self._jobs[job_id].progress = {
                        "nodes_processed": result.statistics.nodes,
                        "edges_processed": result.statistics.edges,
                        "paths_found": result.statistics.paths,
                        "max_hop_reached": result.statistics.max_hop_reached,
                        "elapsed_ms": result.statistics.duration_ms,
                    }

            # Observability logging without secrets (Section 25)
            logger.info(
                "Trace job completed: id=%s investigation=%s chain=%s seed=%s status=%s nodes=%d edges=%d paths=%d elapsed=%.2fms",
                job_id,
                investigation_id,
                request.chain.value,
                request.seed_wallet,
                result.status.value,
                result.statistics.nodes,
                result.statistics.edges,
                result.statistics.paths,
                result.statistics.duration_ms,
            )
        except Exception:
            logger.exception("Trace job failed: id=%s", job_id)
            finish_now = datetime.now(UTC).isoformat()
            async with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id].status = JobStatus.FAILED
                    self._jobs[job_id].error_message = "Trace execution encountered an unexpected internal error"
                    self._jobs[job_id].updated_at = finish_now


# Singleton
_trace_job_manager_instance: TraceJobManager | None = None


def get_trace_job_manager() -> TraceJobManager:
    global _trace_job_manager_instance
    if _trace_job_manager_instance is None:
        _trace_job_manager_instance = TraceJobManager()
    return _trace_job_manager_instance
