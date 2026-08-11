from datetime import date

from app.adapters.aws import AwsCostAdapter


class FakeCostExplorer:
    def get_cost_and_usage(self, **kwargs):
        assert kwargs["Granularity"] == "DAILY"
        assert kwargs["Metrics"] == ["UnblendedCost"]
        return {
            "ResultsByTime": [
                {
                    "TimePeriod": {"Start": "2026-08-01", "End": "2026-08-02"},
                    "Groups": [
                        {
                            "Keys": ["Amazon EC2", "us-east-1"],
                            "Metrics": {"UnblendedCost": {"Amount": "12.34", "Unit": "USD"}},
                        }
                    ],
                }
            ]
        }


class FakeHub:
    def list_recommendations(self, **kwargs):
        return {
            "items": [
                {
                    "recommendationId": "abc",
                    "estimatedMonthlySavings": 42,
                    "currentResourceType": "Ec2Instance",
                    "resourceId": "i-demo",
                    "actionType": "Rightsize",
                }
            ]
        }


def test_aws_adapter_maps_cost_explorer_contract():
    adapter = AwsCostAdapter(ce_client=FakeCostExplorer(), hub_client=FakeHub())
    points = adapter.get_costs(date(2026, 8, 1), date(2026, 8, 2))
    assert len(points) == 1
    assert points[0].amount == 12.34
    assert points[0].service == "Amazon EC2"


def test_aws_adapter_maps_cost_optimization_hub_contract():
    adapter = AwsCostAdapter(ce_client=FakeCostExplorer(), hub_client=FakeHub())
    recommendations = adapter.get_recommendations()
    assert recommendations[0].monthly_savings == 42
    assert recommendations[0].annual_savings == 504
