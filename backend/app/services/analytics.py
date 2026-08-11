from collections import defaultdict
from datetime import date, timedelta
from math import sqrt
from statistics import mean, median

import numpy as np

from app.adapters.base import CostAdapter
from app.models import (
    AnomalyResponse,
    CostBreakdown,
    CostSeriesPoint,
    CostsResponse,
    ForecastPoint,
    ForecastResponse,
    ModelMetrics,
    OverviewResponse,
)


def _daily(points) -> dict[date, float]:
    values: dict[date, float] = defaultdict(float)
    for point in points:
        values[point.date] += point.amount
    return dict(sorted(values.items()))


def _mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    denominator = np.maximum(np.abs(actual), 1e-6)
    return float(np.mean(np.abs((actual - predicted) / denominator)) * 100)


class AnalyticsService:
    def __init__(self, adapter: CostAdapter) -> None:
        self.adapter = adapter

    def costs(self, start: date, end: date, group_by: str = "service") -> CostsResponse:
        points = self.adapter.get_costs(start, end)
        daily = _daily(points)
        grouped: dict[str, float] = defaultdict(float)
        for point in points:
            grouped[getattr(point, group_by)] += point.amount
        total = sum(grouped.values())
        breakdown = [
            CostBreakdown(name=name, amount=round(value, 2), share=round(value / total * 100, 2) if total else 0)
            for name, value in sorted(grouped.items(), key=lambda row: row[1], reverse=True)
        ]
        return CostsResponse(
            start=start,
            end=end,
            total=round(total, 2),
            series=[CostSeriesPoint(date=day, amount=round(value, 2)) for day, value in daily.items()],
            breakdown=breakdown,
        )

    def overview(self, today: date) -> OverviewResponse:
        month_start = today.replace(day=1)
        previous_start = (month_start - timedelta(days=1)).replace(day=1)
        current = self.costs(month_start, today + timedelta(days=1))
        previous = self.costs(previous_start, month_start)
        elapsed = max(today.day, 1)
        days_in_month = ((month_start.replace(day=28) + timedelta(days=4)).replace(day=1) - month_start).days
        projected = current.total / elapsed * days_in_month
        change = (
            ((current.total / elapsed) / (previous.total / max((month_start - previous_start).days, 1)) - 1) * 100
            if previous.total
            else 0
        )
        return OverviewResponse(
            month_to_date=current.total,
            forecast_month_end=round(projected, 2),
            monthly_budget=17468,
            savings_identified=1639,
            efficiency_score=82,
            change_vs_previous_period=round(change, 2),
            top_services=current.breakdown[:5],
        )

    def forecast(self, end: date, horizon: int) -> ForecastResponse:
        start = end - timedelta(days=365)
        values_map = _daily(self.adapter.get_costs(start, end))
        dates = list(values_map)
        values = np.array(list(values_map.values()), dtype=float)
        fallback = len(values) < 60
        baseline = (
            np.array([values[i - 7] if i >= 7 else values[max(0, i - 1)] for i in range(len(values))])
            if len(values)
            else np.array([])
        )
        split = max(30, int(len(values) * 0.8))
        test = values[split:]
        baseline_test = baseline[split:]
        baseline_mape = _mape(test, baseline_test) if len(test) else 0.0
        model_name = "Seasonal naive"
        predicted_test = baseline_test.copy()
        future: list[float] = []
        try:
            if not fallback:
                from xgboost import XGBRegressor

                def features(indexes: range, source: np.ndarray) -> np.ndarray:
                    rows = []
                    for i in indexes:
                        point_date = dates[0] + timedelta(days=i)
                        lag7 = source[i - 7] if i >= 7 and i < len(source) else source[-7]
                        lag14 = source[i - 14] if i >= 14 and i < len(source) else source[-14]
                        rolling = float(np.mean(source[max(0, min(i, len(source)) - 7) : min(i, len(source))]))
                        rows.append([i, point_date.weekday(), point_date.day, point_date.month, lag7, lag14, rolling])
                    return np.array(rows)

                train_start = 14
                model = XGBRegressor(
                    n_estimators=180,
                    max_depth=3,
                    learning_rate=0.045,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="reg:squarederror",
                    random_state=42,
                )
                model.fit(features(range(train_start, split), values[:split]), values[train_start:split])
                predicted_test = model.predict(features(range(split, len(values)), values))
                model.fit(features(range(train_start, len(values)), values), values[train_start:])
                rolling_source = values.copy()
                for i in range(len(values), len(values) + horizon):
                    prediction = max(0, float(model.predict(features(range(i, i + 1), rolling_source))[0]))
                    future.append(prediction)
                    rolling_source = np.append(rolling_source, prediction)
                model_name = "XGBoost time-series regressor"
            else:
                raise RuntimeError("Insufficient history")
        except (ImportError, RuntimeError):
            future = [float(values[-7 + (i % 7)]) for i in range(horizon)] if len(values) >= 7 else [0.0] * horizon
            fallback = True
        residuals = test - predicted_test if len(test) else np.array([0.0])
        spread = max(float(np.quantile(np.abs(residuals), 0.9)), 1.0)
        points = [
            ForecastPoint(
                date=end + timedelta(days=i),
                forecast=round(v, 2),
                lower=round(max(0, v - spread), 2),
                upper=round(v + spread, 2),
            )
            for i, v in enumerate(future)
        ]
        mae = float(np.mean(np.abs(residuals)))
        rmse = sqrt(float(np.mean(residuals**2)))
        return ForecastResponse(
            horizon=horizon,
            projected_total=round(sum(future), 2),
            budget=17468,
            points=points,
            metrics=ModelMetrics(
                model=model_name,
                mae=round(mae, 2),
                rmse=round(rmse, 2),
                mape=round(_mape(test, predicted_test), 2) if len(test) else 0,
                baseline_mape=round(baseline_mape, 2),
                fallback_used=fallback,
            ),
        )

    def anomalies(self, end: date) -> list[AnomalyResponse]:
        start = end - timedelta(days=180)
        points = self.adapter.get_costs(start, end)
        by_service: dict[str, dict[date, float]] = defaultdict(lambda: defaultdict(float))
        region_by_key: dict[tuple[str, date], tuple[str, float]] = {}
        for point in points:
            by_service[point.service][point.date] += point.amount
            key = (point.service, point.date)
            if key not in region_by_key or point.amount > region_by_key[key][1]:
                region_by_key[key] = (point.region, point.amount)
        output: list[AnomalyResponse] = []
        for service, daily in by_service.items():
            ordered = sorted(daily.items())
            vals = np.array([x[1] for x in ordered])
            if len(vals) < 21:
                continue
            try:
                from sklearn.ensemble import IsolationForest

                model = IsolationForest(contamination=0.025, random_state=42)
                labels = model.fit_predict(vals.reshape(-1, 1))
                raw_scores = -model.score_samples(vals.reshape(-1, 1))
            except ImportError:
                center = median(vals)
                mad = median(abs(v - center) for v in vals) or 1
                raw_scores = np.array([abs(v - center) / mad for v in vals])
                labels = np.where(raw_scores > 6, -1, 1)
            for idx, label in enumerate(labels):
                if label != -1 or idx < 14:
                    continue
                day, actual = ordered[idx]
                expected = mean(vals[max(0, idx - 14) : idx])
                impact = actual - expected
                if impact <= max(50, expected * 0.35):
                    continue
                score = min(99, int(72 + (raw_scores[idx] - np.min(raw_scores)) / (np.ptp(raw_scores) or 1) * 27))
                severity = "Critical" if impact > 300 else "High" if impact > 150 else "Medium"
                region = region_by_key[(service, day)][0]
                output.append(
                    AnomalyResponse(
                        id=f"ANM-{day.strftime('%m%d')}-{service.split()[-1][:3].upper()}",
                        date=day,
                        service=service,
                        region=region,
                        expected_cost=round(expected, 2),
                        actual_cost=round(actual, 2),
                        impact=round(impact, 2),
                        score=score,
                        severity=severity,
                        cause=f"{service} exceeded its 14-day baseline by {actual / expected:.1f}×",
                    )
                )
        return sorted(output, key=lambda item: item.impact, reverse=True)[:10]
