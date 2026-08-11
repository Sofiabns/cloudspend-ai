from datetime import date
from typing import Any

import boto3

from app.adapters.base import CostAdapter
from app.models import CostPoint, RecommendationResponse


class AwsCostAdapter(CostAdapter):
    """Read-only AWS adapter. Credentials come exclusively from boto3's credential chain."""

    def __init__(self, region: str = "us-east-1", ce_client: Any = None, hub_client: Any = None) -> None:
        self.ce = ce_client or boto3.client("ce", region_name="us-east-1")
        self.hub = hub_client or boto3.client("cost-optimization-hub", region_name=region)

    def get_costs(self, start: date, end: date) -> list[CostPoint]:
        response = self.ce.get_cost_and_usage(
            TimePeriod={"Start": start.isoformat(), "End": end.isoformat()},
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}, {"Type": "DIMENSION", "Key": "REGION"}],
        )
        points: list[CostPoint] = []
        for period in response.get("ResultsByTime", []):
            day = date.fromisoformat(period["TimePeriod"]["Start"])
            for group in period.get("Groups", []):
                service, region = (group.get("Keys") + ["Global"])[:2]
                amount = float(group["Metrics"]["UnblendedCost"]["Amount"])
                points.append(
                    CostPoint(
                        date=day,
                        amount=max(0, round(amount, 4)),
                        service=service,
                        region=region or "Global",
                        account="AWS account",
                    )
                )
        return points

    def get_recommendations(self) -> list[RecommendationResponse]:
        try:
            response = self.hub.list_recommendations(maxResults=50)
        except self.hub.exceptions.AccessDeniedException:
            return []
        output: list[RecommendationResponse] = []
        for index, item in enumerate(response.get("items", []), start=1):
            savings = float(item.get("estimatedMonthlySavings", 0))
            resource_type = str(item.get("currentResourceType", "AWS resource"))
            output.append(
                RecommendationResponse(
                    id=str(item.get("recommendationId", f"AWS-{index}")),
                    title=f"Optimize {resource_type}",
                    service=resource_type,
                    resource=str(item.get("resourceId", "Resource")),
                    monthly_savings=round(savings, 2),
                    annual_savings=round(savings * 12, 2),
                    effort="Medium",
                    confidence=90,
                    detail=str(item.get("actionType", "AWS Cost Optimization Hub recommendation")),
                )
            )
        return output
