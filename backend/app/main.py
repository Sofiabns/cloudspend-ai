from datetime import UTC, date, datetime, timedelta
from typing import Literal

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.adapters import AwsCostAdapter, DemoCostAdapter
from app.config import Settings, get_settings
from app.models import (
    AnomalyResponse,
    CostsResponse,
    ForecastResponse,
    HealthResponse,
    OverviewResponse,
    RecommendationResponse,
)
from app.services.analytics import AnalyticsService


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()
    app = FastAPI(
        title=config.app_name,
        version="1.0.0",
        description="Explainable AWS FinOps analytics, forecasting, and anomaly detection.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    adapter = (
        AwsCostAdapter(config.aws_region)
        if config.app_mode == "aws"
        else DemoCostAdapter(config.data_dir / "demo_costs_v2.parquet")
    )
    analytics = AnalyticsService(adapter)

    def service() -> AnalyticsService:
        return analytics

    @app.get("/api/v1/health", response_model=HealthResponse, tags=["System"])
    def health() -> HealthResponse:
        return HealthResponse(mode=config.app_mode, timestamp=datetime.now(UTC))

    @app.get("/api/v1/overview", response_model=OverviewResponse, tags=["FinOps"])
    def overview(engine: AnalyticsService = Depends(service)) -> OverviewResponse:
        return engine.overview(date.today())

    @app.get("/api/v1/costs", response_model=CostsResponse, tags=["FinOps"])
    def costs(
        start: date = Query(default_factory=lambda: date.today() - timedelta(days=90)),
        end: date = Query(default_factory=date.today),
        group_by: Literal["service", "region", "account"] = "service",
        engine: AnalyticsService = Depends(service),
    ) -> CostsResponse:
        return engine.costs(start, end, group_by)

    @app.get("/api/v1/forecast", response_model=ForecastResponse, tags=["Machine Learning"])
    def forecast(
        horizon: int = Query(30, ge=7, le=90), engine: AnalyticsService = Depends(service)
    ) -> ForecastResponse:
        return engine.forecast(date.today(), horizon)

    @app.get("/api/v1/anomalies", response_model=list[AnomalyResponse], tags=["Machine Learning"])
    def anomaly_list(engine: AnalyticsService = Depends(service)) -> list[AnomalyResponse]:
        return engine.anomalies(date.today())

    @app.get("/api/v1/recommendations", response_model=list[RecommendationResponse], tags=["FinOps"])
    def recommendation_list(engine: AnalyticsService = Depends(service)) -> list[RecommendationResponse]:
        return engine.adapter.get_recommendations()

    return app


app = create_app()
