from typing import List, Optional
from pydantic import BaseModel


class SeverityCount(BaseModel):
    name: str
    value: int
    color: str


class ServiceReliability(BaseModel):
    name: str
    reliability: float
    incidents: int
    color: str


class RecurringIssue(BaseModel):
    name: str
    count: int
    change: str


class FrequencyDataPoint(BaseModel):
    week: str
    incidents: int
    critical: int
    resolved: int


class ResolutionTrendPoint(BaseModel):
    month: str
    hours: float
    target: float = 4.0


class AnalyticsSummaryResponse(BaseModel):
    total_incidents: int
    active_incidents: int
    resolved_incidents: int
    critical_incidents: int
    fleet_reliability: float
    median_mttr_hours: float
    incident_frequency_weekly: float
    severity_distribution: List[SeverityCount]
    service_breakdown: List[ServiceReliability]
    recurring_issues: List[RecurringIssue]
    frequency_trend: List[FrequencyDataPoint]
    resolution_trend: List[ResolutionTrendPoint]
    memory_count: int
    recalled_count: int

