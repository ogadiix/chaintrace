"""
Report Service
Orchestrates investigation data compilation, deterministic versioning,
PDF generation, storage management, and database record persistence.
Source of truth: Master Prompt Phase 9 Sections 21-25, 28
"""

import os
import uuid
from datetime import UTC, datetime
from typing import Any

from apps.api.src.core.config import settings
from apps.api.src.models.case import Case
from apps.api.src.models.report import Report
from apps.api.src.models.trace import TraceRequest
from apps.api.src.models.user import User
from apps.api.src.schemas.report import ReportGenerateRequest
from apps.api.src.services.attribution_service import (
    AttributionService,
    get_attribution_service,
)
from apps.api.src.services.intelligence import (
    IntelligenceEngine,
    get_intelligence_engine,
)
from apps.api.src.services.report_generator import ReportGenerator
from apps.api.src.services.risk_engine import RiskEngine, get_risk_engine
from apps.api.src.services.trace_engine import TraceEngine, get_trace_engine
from chaintrace_shared import BlockchainType
from fastapi import Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession


class ReportService:
    def __init__(
        self,
        trace_engine: TraceEngine,
        intel_engine: IntelligenceEngine,
        attr_service: AttributionService,
        risk_engine: RiskEngine,
    ) -> None:
        self.trace_engine = trace_engine
        self.intel_engine = intel_engine
        self.attr_service = attr_service
        self.risk_engine = risk_engine
        self.generator = ReportGenerator()
        self.reports_dir = os.path.abspath(settings.REPORTS_DIR)
        os.makedirs(self.reports_dir, exist_ok=True)

    async def get_next_report_version(self, db: AsyncSession, case_id: str) -> str:
        """
        Determines the sequential version string (1.0, 1.1, 1.2...) for a given case.
        """
        stmt = select(func.count(Report.id)).where(Report.case_id == case_id)
        res = await db.execute(stmt)
        count = res.scalar() or 0
        return f"1.{count}"

    async def create_report(
        self,
        db: AsyncSession,
        case: Case,
        current_user: User,
        payload: ReportGenerateRequest,
    ) -> Report:
        """
        Compiles all forensic evidence from trace, intelligence, attribution, and risk layers,
        generates the official PDF file, and registers the Report record in the database.
        """
        version = await self.get_next_report_version(db, case.id)
        report_id = str(uuid.uuid4())
        report_number = f"REP-{case.case_number}-V{version}"
        title = payload.title or f"Investigation Dossier: {case.title}"
        filename = f"ChainTrace_{case.case_number}_v{version}.pdf"
        output_dir = os.path.join(self.reports_dir, case.id)
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"{report_id}.pdf")

        # 1. Compile Trace Data
        trace_result = None
        if case.suspect_wallet and case.target_chain:
            try:
                trace_req = TraceRequest(
                    chain=BlockchainType(case.target_chain),
                    seed_wallet=case.suspect_wallet,
                    max_hops=4,
                )
                trace_result = await self.trace_engine.execute_trace(
                    trace_req, investigation_id=case.id
                )
            except Exception:
                trace_result = None

        # 2. Compile Intelligence Findings
        intel_result = None
        if trace_result:
            try:
                intel_result = self.intel_engine.analyze(
                    trace_result=trace_result, investigation_id=case.id
                )
            except Exception:
                intel_result = None

        # 3. Compile VASP Attribution
        attr_result = None
        if trace_result:
            try:
                attr_result = await self.attr_service.analyze_trace_attributions(
                    trace_result=trace_result, investigation_id=case.id
                )
            except Exception:
                attr_result = None

        # 4. Compile Risk Assessment (retrieve latest or evaluate)
        risk_assessment = await self.risk_engine.get_latest_assessment(case.id)
        if not risk_assessment and trace_result and intel_result and attr_result:
            try:
                risk_assessment = self.risk_engine.evaluate_risk(
                    investigation_id=case.id,
                    seed_wallet=case.suspect_wallet,
                    trace_result=trace_result,
                    intel_result=intel_result,
                    attr_result=attr_result,
                )
                await self.risk_engine.record_assessment(risk_assessment)
            except Exception:
                risk_assessment = None

        # 5. Snapshot of Core Findings for metadata
        summary_snapshot: dict[str, Any] = {
            "case_number": case.case_number,
            "target_chain": case.target_chain,
            "suspect_wallet": case.suspect_wallet,
            "risk_score": getattr(risk_assessment, "score", 0) if risk_assessment else 0,
            "risk_level": str(getattr(risk_assessment, "risk_level", "LOW"))
            if risk_assessment
            else "LOW",
            "findings_count": len(getattr(intel_result, "findings", [])) if intel_result else 0,
            "attributions_count": len(getattr(attr_result, "attributions", []))
            if attr_result
            else 0,
            "nodes_count": getattr(trace_result.statistics, "nodes", 0)
            if trace_result and hasattr(trace_result, "statistics")
            else 0,
            "edges_count": getattr(trace_result.statistics, "edges", 0)
            if trace_result and hasattr(trace_result, "statistics")
            else 0,
        }

        # 6. Create Report Record in DB (Status: GENERATING)
        report_record = Report(
            id=report_id,
            case_id=case.id,
            investigation_id=case.id,
            report_number=report_number,
            version=version,
            title=title,
            filename=filename,
            storage_path=output_path,
            file_size_bytes=0,
            status="GENERATING",
            created_by_id=current_user.id,
            parameters=payload.model_dump(),
            summary_snapshot=summary_snapshot,
        )
        db.add(report_record)
        await db.commit()
        await db.refresh(report_record)

        # 7. Generate PDF Document
        try:
            report_meta = {
                "report_id": report_id,
                "report_number": report_number,
                "version": version,
                "created_at": datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
                "investigator_name": current_user.full_name or current_user.email,
                "options": {
                    "include_tx_appendix": payload.include_tx_appendix,
                    "max_appendix_txs": payload.max_appendix_txs,
                    "notes": payload.notes,
                },
            }

            gen_result = self.generator.generate(
                case=case,
                trace_result=trace_result,
                intel_result=intel_result,
                attr_result=attr_result,
                risk_assessment=risk_assessment,
                report_meta=report_meta,
                output_path=output_path,
            )

            # Update DB with completion stats
            report_record.file_size_bytes = gen_result["file_size_bytes"]
            report_record.sha256_hash = gen_result["sha256_hash"]
            report_record.status = "COMPLETED"
            report_record.completed_at = datetime.now(UTC)
            await db.commit()
            await db.refresh(report_record)

        except Exception as exc:
            report_record.status = "FAILED"
            report_record.error_message = str(exc)
            await db.commit()
            await db.refresh(report_record)
            raise

        return report_record

    async def list_reports(
        self, db: AsyncSession, case_id: str | None = None, user: User | None = None
    ) -> list[Report]:
        """Lists generated reports optionally filtered by case ID and user access."""
        stmt = select(Report).order_by(desc(Report.created_at))
        if case_id:
            stmt = stmt.where(Report.case_id == case_id)
        if user and user.role != "ADMIN":
            stmt = stmt.join(Case, Report.case_id == Case.id).where(
                (Case.created_by_id == user.id) | (Case.assigned_to_id == user.id)
            )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_report_by_id(self, db: AsyncSession, report_id: str) -> Report | None:
        """Fetches report record by unique UUID."""
        stmt = select(Report).where(Report.id == report_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()


def get_report_service(
    trace_engine: TraceEngine = Depends(get_trace_engine),
    intel_engine: IntelligenceEngine = Depends(get_intelligence_engine),
    attr_service: AttributionService = Depends(get_attribution_service),
    risk_engine: RiskEngine = Depends(get_risk_engine),
) -> ReportService:
    return ReportService(
        trace_engine=trace_engine,
        intel_engine=intel_engine,
        attr_service=attr_service,
        risk_engine=risk_engine,
    )
