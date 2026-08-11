import random
from datetime import date, timedelta
from math import pi, sin
from pathlib import Path

import duckdb

from app.adapters.base import CostAdapter
from app.models import CostPoint, RecommendationResponse

SERVICES = {
    "Amazon EC2": 238.0,
    "Amazon RDS": 121.0,
    "Amazon S3": 61.0,
    "AWS Lambda": 42.0,
    "Amazon CloudFront": 29.0,
}
REGIONS = ["us-east-1", "sa-east-1", "eu-west-1", "us-west-2"]
ACCOUNTS = ["Production", "Staging", "Data Lab"]
KNOWN_ANOMALY_DAYS = {218: ("Amazon EC2", 3.2), 302: ("AWS Lambda", 4.0), 354: ("Amazon RDS", 2.3)}


class DemoCostAdapter(CostAdapter):
    """Deterministic, non-sensitive FinOps dataset for public demos."""

    def __init__(self, data_path: Path | None = None) -> None:
        self._end = date.today() + timedelta(days=1)
        self._start = self._end - timedelta(days=365)
        self.data_path = data_path or Path(__file__).resolve().parents[2] / "data" / "demo_costs.parquet"
        self._ensure_parquet()

    def _generate(self, start: date, end: date) -> list[CostPoint]:
        rng = random.Random(2608)
        points: list[CostPoint] = []
        day_count = (end - self._start).days
        weights = list(SERVICES.items())
        for offset in range(max(0, (start - self._start).days), day_count + 1):
            current = self._start + timedelta(days=offset)
            if current >= end:
                break
            weekly = 1 + sin(offset / 7 * 2 * pi) * 0.07
            month_cycle = 1.18 if current.day == 1 else 1.10 if current.day == 15 else 1.0
            growth = 1 + offset * 0.00075
            for service_index, (service, base) in enumerate(weights):
                anomaly = KNOWN_ANOMALY_DAYS.get(offset)
                multiplier = anomaly[1] if anomaly and anomaly[0] == service else 1.0
                amount = base * weekly * month_cycle * growth * multiplier * rng.uniform(0.94, 1.06)
                region = REGIONS[(offset + service_index) % len(REGIONS)]
                account = ACCOUNTS[(offset + service_index * 2) % len(ACCOUNTS)]
                points.append(
                    CostPoint(date=current, amount=round(amount, 2), service=service, region=region, account=account)
                )
        return points

    def _ensure_parquet(self) -> None:
        if self.data_path.exists():
            return
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        rows = [
            (point.date, point.amount, point.service, point.region, point.account)
            for point in self._generate(self._start, self._end)
        ]
        connection = duckdb.connect()
        connection.execute(
            "CREATE TABLE costs(date DATE, amount DOUBLE, service VARCHAR, region VARCHAR, account VARCHAR)"
        )
        connection.executemany("INSERT INTO costs VALUES (?, ?, ?, ?, ?)", rows)
        connection.execute("COPY costs TO ? (FORMAT PARQUET, COMPRESSION ZSTD)", [str(self.data_path)])
        connection.close()

    def get_costs(self, start: date, end: date) -> list[CostPoint]:
        query = """
            SELECT CAST(date AS DATE) AS date, amount, service, region, account
            FROM read_parquet(?)
            WHERE date >= ? AND date < ?
            ORDER BY date, service
        """
        connection = duckdb.connect()
        rows = connection.execute(query, [str(self.data_path), start, end]).fetchall()
        connection.close()
        return [CostPoint(date=row[0], amount=row[1], service=row[2], region=row[3], account=row[4]) for row in rows]

    def get_recommendations(self) -> list[RecommendationResponse]:
        rows = [
            (
                "REC-101",
                "Right-size underutilized EC2 instances",
                "EC2",
                "4 instances",
                624,
                "Low",
                96,
                "Average CPU utilization remained below 18% for 30 days.",
            ),
            (
                "REC-102",
                "Purchase a Compute Savings Plan",
                "Savings Plans",
                "$6.2K eligible spend",
                487,
                "Medium",
                91,
                "Stable compute usage supports a one-year, no-upfront commitment.",
            ),
            (
                "REC-103",
                "Remove unattached EBS volumes",
                "EBS",
                "11 volumes",
                214,
                "Low",
                99,
                "Volumes have been unattached for more than 14 days.",
            ),
            (
                "REC-104",
                "Move S3 objects to Intelligent-Tiering",
                "S3",
                "8.4 TB",
                176,
                "Low",
                88,
                "Access patterns vary across archival and analytics workloads.",
            ),
            (
                "REC-105",
                "Tune provisioned RDS storage",
                "RDS",
                "analytics-db-prod",
                138,
                "Medium",
                84,
                "Allocated IOPS consistently exceed observed demand.",
            ),
        ]
        return [
            RecommendationResponse(
                id=i,
                title=t,
                service=s,
                resource=r,
                monthly_savings=m,
                annual_savings=m * 12,
                effort=e,
                confidence=c,
                detail=d,
            )
            for i, t, s, r, m, e, c, d in rows
        ]
