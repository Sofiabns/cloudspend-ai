from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["healthy"] = "healthy"
    mode: Literal["demo", "aws"]
    timestamp: datetime


class CostPoint(BaseModel):
    date: date
    amount: float = Field(ge=0)
    service: str
    region: str
    account: str


class CostSeriesPoint(BaseModel):
    date: date
    amount: float


class CostBreakdown(BaseModel):
    name: str
    amount: float
    share: float
    change: float | None = None


class CostsResponse(BaseModel):
    start: date
    end: date
    total: float
    series: list[CostSeriesPoint]
    breakdown: list[CostBreakdown]


class OverviewResponse(BaseModel):
    month_to_date: float
    forecast_month_end: float
    monthly_budget: float
    savings_identified: float
    efficiency_score: int
    change_vs_previous_period: float
    top_services: list[CostBreakdown]


class ForecastPoint(BaseModel):
    date: date
    forecast: float
    lower: float
    upper: float


class ModelMetrics(BaseModel):
    model: str
    mae: float
    rmse: float
    mape: float
    baseline_mape: float
    fallback_used: bool


class ForecastResponse(BaseModel):
    horizon: int
    projected_total: float
    budget: float
    points: list[ForecastPoint]
    metrics: ModelMetrics


class AnomalyResponse(BaseModel):
    id: str
    date: date
    service: str
    region: str
    expected_cost: float
    actual_cost: float
    impact: float
    score: int
    severity: Literal["Critical", "High", "Medium"]
    cause: str


class RecommendationResponse(BaseModel):
    id: str
    title: str
    service: str
    resource: str
    monthly_savings: float
    annual_savings: float
    effort: Literal["Low", "Medium", "High"]
    confidence: int
    detail: str
