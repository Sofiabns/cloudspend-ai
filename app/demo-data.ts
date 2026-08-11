export type CostPoint = {
  date: string;
  actual: number;
  forecast?: number;
  lower?: number;
  upper?: number;
};
export type ServiceCost = {
  service: string;
  value: number;
  change: number;
  color: string;
};
export type Anomaly = {
  id: string;
  date: string;
  service: string;
  region: string;
  impact: number;
  score: number;
  severity: "Critical" | "High" | "Medium";
  cause: string;
  status: "Open" | "Reviewed";
};
export type Recommendation = {
  id: string;
  title: string;
  resource: string;
  service: string;
  monthlySavings: number;
  annualSavings: number;
  effort: "Low" | "Medium" | "High";
  confidence: number;
  detail: string;
};

const services = [
  { service: "EC2", base: 238, color: "#705cf6" },
  { service: "RDS", base: 121, color: "#15a36a" },
  { service: "S3", base: 61, color: "#ef9f27" },
  { service: "Lambda", base: 42, color: "#35a7ff" },
  { service: "CloudFront", base: 29, color: "#c66bf0" },
];

export function buildDailyCosts(days = 120): CostPoint[] {
  const start = new Date("2026-04-13T00:00:00Z");
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const weekly = Math.sin((index / 7) * Math.PI * 2) * 27;
    const trend = index * 0.72;
    const anomaly = index === 68 ? 412 : index === 101 ? 238 : 0;
    const actual = Math.round(
      468 + weekly + trend + Math.sin(index * 1.73) * 13 + anomaly,
    );
    return { date: date.toISOString().slice(0, 10), actual };
  });
}

export const costs = buildDailyCosts();
export const forecast: CostPoint[] = Array.from({ length: 30 }, (_, index) => {
  const date = new Date("2026-08-11T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + index);
  const value = Math.round(
    558 + index * 1.15 + Math.sin((index / 7) * Math.PI * 2) * 22,
  );
  const spread = 34 + index * 1.25;
  return {
    date: date.toISOString().slice(0, 10),
    actual: value,
    forecast: value,
    lower: Math.round(value - spread),
    upper: Math.round(value + spread),
  };
});

export const serviceCosts: ServiceCost[] = [
  { service: "EC2", value: 7128, change: 8.4, color: "#705cf6" },
  { service: "RDS", value: 3842, change: 3.1, color: "#15a36a" },
  { service: "S3", value: 2148, change: -4.6, color: "#ef9f27" },
  { service: "Lambda", value: 1540, change: 11.2, color: "#35a7ff" },
  { service: "CloudFront", value: 1149, change: 1.8, color: "#c66bf0" },
];

export const anomalies: Anomaly[] = [
  {
    id: "ANM-2048",
    date: "Aug 09, 2026",
    service: "EC2",
    region: "us-east-1",
    impact: 428.64,
    score: 94,
    severity: "Critical",
    cause: "Unexpected 47% increase in On-Demand instance hours",
    status: "Open",
  },
  {
    id: "ANM-2031",
    date: "Aug 03, 2026",
    service: "Lambda",
    region: "sa-east-1",
    impact: 186.2,
    score: 87,
    severity: "High",
    cause: "Invocation volume exceeded the 30-day baseline by 3.2×",
    status: "Open",
  },
  {
    id: "ANM-1987",
    date: "Jul 27, 2026",
    service: "RDS",
    region: "us-east-1",
    impact: 92.44,
    score: 73,
    severity: "Medium",
    cause: "Temporary storage growth on analytics-db-prod",
    status: "Reviewed",
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "REC-101",
    title: "Right-size underutilized EC2 instances",
    resource: "4 instances",
    service: "EC2",
    monthlySavings: 624,
    annualSavings: 7488,
    effort: "Low",
    confidence: 96,
    detail: "Average CPU utilization remained below 18% for 30 days.",
  },
  {
    id: "REC-102",
    title: "Purchase a Compute Savings Plan",
    resource: "$6.2K eligible spend",
    service: "Savings Plans",
    monthlySavings: 487,
    annualSavings: 5844,
    effort: "Medium",
    confidence: 91,
    detail: "Stable compute usage supports a one-year, no-upfront commitment.",
  },
  {
    id: "REC-103",
    title: "Remove unattached EBS volumes",
    resource: "11 volumes",
    service: "EBS",
    monthlySavings: 214,
    annualSavings: 2568,
    effort: "Low",
    confidence: 99,
    detail: "Volumes have been unattached for more than 14 days.",
  },
  {
    id: "REC-104",
    title: "Move S3 objects to Intelligent-Tiering",
    resource: "8.4 TB",
    service: "S3",
    monthlySavings: 176,
    annualSavings: 2112,
    effort: "Low",
    confidence: 88,
    detail: "Access patterns vary across archival and analytics workloads.",
  },
  {
    id: "REC-105",
    title: "Tune provisioned RDS storage",
    resource: "analytics-db-prod",
    service: "RDS",
    monthlySavings: 138,
    annualSavings: 1656,
    effort: "Medium",
    confidence: 84,
    detail: "Allocated IOPS consistently exceed observed demand.",
  },
];

export const regions = [
  { name: "us-east-1", value: 10214 },
  { name: "sa-east-1", value: 3387 },
  { name: "eu-west-1", value: 1368 },
  { name: "us-west-2", value: 838 },
];

export const accounts = [
  { name: "Production", value: 11294 },
  { name: "Staging", value: 2971 },
  { name: "Data Lab", value: 1542 },
];

export const modelMetrics = {
  mae: 29.3,
  rmse: 60.0,
  mape: 4.5,
  baselineMape: 5.1,
};
export { services };
