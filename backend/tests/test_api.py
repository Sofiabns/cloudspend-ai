from datetime import UTC, date, datetime, timedelta

from fastapi.testclient import TestClient

from app.adapters.demo import DemoCostAdapter
from app.config import Settings
from app.main import create_app

client = TestClient(create_app(Settings(app_mode="demo")))


def test_health_reports_demo_mode():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["mode"] == "demo"


def test_costs_support_all_grouping_dimensions():
    end = date.today()
    start = end - timedelta(days=30)
    for dimension in ("service", "region", "account"):
        response = client.get(
            "/api/v1/costs", params={"start": start.isoformat(), "end": end.isoformat(), "group_by": dimension}
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] > 0
        assert payload["series"]
        assert abs(sum(row["share"] for row in payload["breakdown"]) - 100) < 0.1


def test_forecast_returns_interval_and_metrics():
    response = client.get("/api/v1/forecast", params={"horizon": 30})
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["points"]) == 30
    assert payload["metrics"]["mape"] >= 0
    assert all(point["lower"] <= point["forecast"] <= point["upper"] for point in payload["points"])


def test_demo_anomalies_are_explainable():
    response = client.get("/api/v1/anomalies")
    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(item["impact"] > 0 and item["cause"] for item in payload)


def test_recommendations_are_prioritized():
    response = client.get("/api/v1/recommendations")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 5
    assert payload[0]["monthly_savings"] >= payload[-1]["monthly_savings"]


def test_demo_adapter_materializes_and_queries_parquet(tmp_path):
    adapter = DemoCostAdapter(tmp_path / "costs.parquet")
    end = datetime.now(UTC).date()
    points = adapter.get_costs(end - timedelta(days=7), end)
    assert (tmp_path / "costs.parquet").exists()
    assert len(points) == 7 * 5
    assert {point.service for point in points} >= {"Amazon EC2", "AWS Lambda"}
