from abc import ABC, abstractmethod
from datetime import date

from app.models import CostPoint, RecommendationResponse


class CostAdapter(ABC):
    @abstractmethod
    def get_costs(self, start: date, end: date) -> list[CostPoint]: ...

    @abstractmethod
    def get_recommendations(self) -> list[RecommendationResponse]: ...
