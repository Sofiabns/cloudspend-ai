"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Cloud,
  Download,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  accounts,
  anomalies,
  costs,
  forecast,
  modelMetrics,
  recommendations,
  regions,
  serviceCosts,
} from "./demo-data";

type View =
  | "Overview"
  | "Cost Explorer"
  | "Forecast"
  | "Anomalies"
  | "Recommendations"
  | "Settings";
const money = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
const compact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
  }).format(value);
const dateLabel = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const nav: { label: View; icon: typeof LayoutDashboard; badge?: number }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Cost Explorer", icon: BarChart3 },
  { label: "Forecast", icon: TrendingUp },
  { label: "Anomalies", icon: AlertTriangle, badge: 2 },
  { label: "Recommendations", icon: Lightbulb, badge: 5 },
];

function downloadCsv(
  filename: string,
  rows: Array<Record<string, string | number>>,
) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        <Cloud size={21} />
        <span />
      </div>
      <div>
        <strong>CloudSpend</strong>
        <em>AI</em>
      </div>
    </div>
  );
}

function Sidebar({
  view,
  setView,
  open,
  close,
  openAws,
}: {
  view: View;
  setView: (v: View) => void;
  open: boolean;
  close: () => void;
  openAws: () => void;
}) {
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={close}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button
            className="mobile-close"
            onClick={close}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav.map(({ label, icon: Icon, badge }) => (
            <button
              key={label}
              className={view === label ? "active" : ""}
              onClick={() => {
                setView(label);
                close();
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge && <b>{badge}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mode-card">
            <div>
              <span className="status-dot" />
              Demo workspace
            </div>
            <p>Safe synthetic cost data</p>
            <button onClick={openAws}>
              <Zap size={14} /> Connect AWS
            </button>
          </div>
          <button className="settings-link" onClick={() => setView("Settings")}>
            <Settings size={18} /> Settings
          </button>
          <button className="profile" onClick={() => setView("Settings")}>
            <div className="avatar">SN</div>
            <div>
              <strong>Sofia Netto</strong>
              <span>FinOps Analyst</span>
            </div>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({
  title,
  openMenu,
  openSearch,
  openNotifications,
  openCalendar,
  dateRange,
  hasUnread,
}: {
  title: View;
  openMenu: () => void;
  openSearch: () => void;
  openNotifications: () => void;
  openCalendar: () => void;
  dateRange: string;
  hasUnread: boolean;
}) {
  return (
    <header>
      <div className="header-title">
        <button
          className="menu-button"
          aria-label="Open menu"
          onClick={openMenu}
        >
          <Menu size={22} />
        </button>
        <div>
          <span>Cloud intelligence</span>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="search"
          onClick={openSearch}
          aria-label="Search and navigate"
        >
          <Search size={16} />
          <span>Search or jump to…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button
          className="icon-button"
          aria-label="Notifications"
          onClick={openNotifications}
        >
          <Bell size={18} />
          {hasUnread && <i />}
        </button>
        <button
          className="date-button"
          aria-label="Change date range"
          onClick={openCalendar}
        >
          <CalendarDays size={16} /> {dateRange} <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}

function NotificationsPanel({
  close,
  markRead,
  setView,
}: {
  close: () => void;
  markRead: () => void;
  setView: (view: View) => void;
}) {
  return (
    <div
      className="floating-panel notifications-panel"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="floating-head">
        <div>
          <strong>Notifications</strong>
          <span>2 items need attention</span>
        </div>
        <button onClick={close} aria-label="Close notifications">
          <X size={17} />
        </button>
      </div>
      {anomalies.slice(0, 2).map((item) => (
        <button
          className="notification-row"
          key={item.id}
          onClick={() => {
            markRead();
            setView("Anomalies");
            close();
          }}
        >
          <span
            className={`notification-mark ${item.severity.toLowerCase()}`}
          />
          <span>
            <strong>{item.service} spend anomaly</strong>
            <small>{item.cause}</small>
          </span>
          <em>{item.date.replace(", 2026", "")}</em>
        </button>
      ))}
      <button className="panel-footer-action" onClick={markRead}>
        <Check size={15} /> Mark all as read
      </button>
    </div>
  );
}

function DateRangePanel({
  close,
  apply,
}: {
  close: () => void;
  apply: (label: string) => void;
}) {
  const [start, setStart] = useState("2026-05-13");
  const [end, setEnd] = useState("2026-08-10");
  const choosePreset = (label: string) => {
    apply(label);
    close();
  };
  return (
    <div
      className="floating-panel calendar-panel"
      role="dialog"
      aria-label="Date range"
    >
      <div className="floating-head">
        <div>
          <strong>Date range</strong>
          <span>Updates every dashboard view</span>
        </div>
        <button onClick={close} aria-label="Close date picker">
          <X size={17} />
        </button>
      </div>
      <div className="preset-list">
        <button onClick={() => choosePreset("Jul 12 – Aug 10")}>
          Last 30 days
        </button>
        <button
          className="selected"
          onClick={() => choosePreset("May 13 – Aug 10")}
        >
          <Check size={14} /> Last 90 days
        </button>
        <button onClick={() => choosePreset("Aug 11, 2025 – Aug 10, 2026")}>
          Last 12 months
        </button>
      </div>
      <div className="custom-range">
        <label>
          Start
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          End
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>
      <button
        className="primary-wide"
        onClick={() => {
          const format = (value: string) =>
            new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            });
          apply(`${format(start)} – ${format(end)}`);
          close();
        }}
      >
        Apply custom range
      </button>
    </div>
  );
}

function CommandPalette({
  close,
  setView,
}: {
  close: () => void;
  setView: (view: View) => void;
}) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);
  const items = [...nav, { label: "Settings" as View, icon: Settings }].filter(
    (item) => item.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className="modal-layer"
      role="dialog"
      aria-modal="true"
      aria-label="Search navigation"
    >
      <button
        className="modal-backdrop"
        aria-label="Close search"
        onClick={close}
      />
      <div className="command-palette">
        <div className="command-input">
          <Search size={18} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages…"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results">
          <p>GO TO</p>
          {items.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setView(label);
                close();
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              <ArrowRight size={14} />
            </button>
          ))}
          {!items.length && (
            <div className="empty-command">No matching page</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AwsModal({
  close,
  openSettings,
}: {
  close: () => void;
  openSettings: () => void;
}) {
  return (
    <div
      className="modal-layer"
      role="dialog"
      aria-modal="true"
      aria-label="Connect AWS"
    >
      <button
        className="modal-backdrop"
        aria-label="Close AWS connection dialog"
        onClick={close}
      />
      <div className="product-modal">
        <div className="modal-icon">
          <Cloud size={22} />
        </div>
        <button className="modal-close" onClick={close} aria-label="Close">
          <X size={18} />
        </button>
        <p className="eyebrow">READ-ONLY CONNECTION</p>
        <h2>Connect an AWS cost profile</h2>
        <p>
          CloudSpend uses the standard AWS credential chain on your backend.
          Access keys are never entered in this dashboard or stored in the
          browser.
        </p>
        <div className="security-list">
          <span>
            <ShieldCheck size={16} /> Cost Explorer read access only
          </span>
          <span>
            <ShieldCheck size={16} /> No infrastructure changes
          </span>
          <span>
            <ShieldCheck size={16} /> Public demo remains synthetic
          </span>
        </div>
        <button
          className="primary-wide"
          onClick={() => {
            close();
            openSettings();
          }}
        >
          Open connection settings
        </button>
        <small>
          Setup instructions and IAM policy are included in the repository.
        </small>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  good,
  icon: Icon,
  accent,
  note,
}: {
  label: string;
  value: string;
  delta: string;
  good?: boolean;
  icon: typeof Activity;
  accent: string;
  note: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${accent}`}>
        <Icon size={19} />
      </div>
      <div className="metric-copy">
        <p>{label}</p>
        <h3>{value}</h3>
        <div>
          <span className={good === false ? "bad" : "good"}>
            {good === false ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}{" "}
            {delta}
          </span>
          <small>{note}</small>
        </div>
      </div>
    </article>
  );
}

const chartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) =>
  active && payload?.length ? (
    <div className="chart-tooltip">
      <span>{label ? dateLabel(label) : ""}</span>
      {payload
        .filter((x) => x.value != null)
        .map((x) => (
          <strong key={x.name}>
            <i style={{ background: x.color }} />
            {x.name}: {money(x.value)}
          </strong>
        ))}
    </div>
  ) : null;

function CostTrendCard() {
  const data = costs.slice(-90);
  return (
    <section className="panel cost-trend">
      <div className="panel-head">
        <div>
          <p className="eyebrow">COST TREND</p>
          <h2>Daily cloud spend</h2>
        </div>
        <div className="legend">
          <span>
            <i className="violet" />
            Actual spend
          </span>
          <span>
            <i className="grid-dot" />
            30-day average
          </span>
        </div>
      </div>
      <div className="big-total">
        <strong>$15,807.42</strong>
        <span>
          <ArrowUpRight size={13} /> 6.8%
        </span>
        <small>vs. previous period</small>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#705cf6" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#705cf6" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e8ebe9" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => dateLabel(v)}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={chartTooltip} />
            <Area
              type="monotone"
              dataKey="actual"
              name="Spend"
              stroke="#705cf6"
              strokeWidth={2.5}
              fill="url(#costFill)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={() => 538}
              name="Average"
              stroke="#9aa4a0"
              strokeDasharray="4 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ServiceCard({ openDetails }: { openDetails: () => void }) {
  const total = serviceCosts.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="panel service-card">
      <div className="panel-head">
        <div>
          <p className="eyebrow">COST ALLOCATION</p>
          <h2>Spend by service</h2>
        </div>
        <button className="text-button" onClick={openDetails}>
          View details <ArrowRight size={14} />
        </button>
      </div>
      <div className="service-chart">
        <div className="donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={serviceCosts}
                dataKey="value"
                innerRadius={61}
                outerRadius={82}
                paddingAngle={3}
                strokeWidth={0}
              >
                {serviceCosts.map((item) => (
                  <Cell key={item.service} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div>
            <strong>{compact(total)}</strong>
            <span>Total spend</span>
          </div>
        </div>
        <div className="service-list">
          {serviceCosts.map((item) => (
            <div key={item.service}>
              <i style={{ background: item.color }} />
              <strong>{item.service}</strong>
              <span>{money(item.value)}</span>
              <em className={item.change < 0 ? "down" : ""}>
                {item.change > 0 ? "+" : ""}
                {item.change}%
              </em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InsightStrip({
  openRecommendations,
}: {
  openRecommendations: () => void;
}) {
  return (
    <section className="insight-strip">
      <div className="insight-icon">
        <TrendingUp size={20} />
      </div>
      <div>
        <p>COST SIGNAL</p>
        <strong>
          Your August spend is trending <em>7.2% above budget</em>, primarily
          driven by EC2 On-Demand usage.
        </strong>
        <span>
          Switching four eligible workloads to a Savings Plan could close 64% of
          the projected gap.
        </span>
      </div>
      <button onClick={openRecommendations}>
        View recommendation <ArrowRight size={15} />
      </button>
    </section>
  );
}

function Overview({ setView }: { setView: (v: View) => void }) {
  return (
    <>
      <div className="metrics-grid">
        <MetricCard
          label="Month-to-date spend"
          value="$15,807"
          delta="6.8%"
          good={false}
          icon={CircleDollarSign}
          accent="purple"
          note="vs. last period"
        />
        <MetricCard
          label="Forecasted month end"
          value="$18,642"
          delta="3.1%"
          good={false}
          icon={TrendingUp}
          accent="blue"
          note="above budget"
        />
        <MetricCard
          label="Savings identified"
          value="$1,639"
          delta="10.4%"
          icon={Target}
          accent="green"
          note="of monthly spend"
        />
        <MetricCard
          label="Cost efficiency score"
          value="82 / 100"
          delta="5 pts"
          icon={Gauge}
          accent="amber"
          note="this month"
        />
      </div>
      <InsightStrip openRecommendations={() => setView("Recommendations")} />
      <div className="overview-grid">
        <CostTrendCard />
        <ServiceCard openDetails={() => setView("Cost Explorer")} />
      </div>
      <div className="bottom-grid">
        <AnomalyPreview setView={setView} />
        <RecommendationPreview setView={setView} />
      </div>
    </>
  );
}

function AnomalyPreview({ setView }: { setView: (v: View) => void }) {
  return (
    <section className="panel preview-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">ANOMALY DETECTION</p>
          <h2>Recent cost anomalies</h2>
        </div>
        <button className="text-button" onClick={() => setView("Anomalies")}>
          View all <ArrowRight size={14} />
        </button>
      </div>
      {anomalies.slice(0, 2).map((item) => (
        <div className="preview-row" key={item.id}>
          <div className={`severity-icon ${item.severity.toLowerCase()}`}>
            <AlertTriangle size={17} />
          </div>
          <div>
            <strong>{item.service} spend spike</strong>
            <span>{item.cause}</span>
          </div>
          <div className="row-value">
            <strong>+{money(item.impact, 2)}</strong>
            <span>{item.date}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function RecommendationPreview({ setView }: { setView: (v: View) => void }) {
  return (
    <section className="panel preview-panel" id="recommendations">
      <div className="panel-head">
        <div>
          <p className="eyebrow">TOP OPPORTUNITIES</p>
          <h2>Recommended actions</h2>
        </div>
        <button
          className="text-button"
          onClick={() => setView("Recommendations")}
        >
          View all <ArrowRight size={14} />
        </button>
      </div>
      {recommendations.slice(0, 2).map((item) => (
        <div className="preview-row" key={item.id}>
          <div className="severity-icon savings">
            <Lightbulb size={17} />
          </div>
          <div>
            <strong>{item.title}</strong>
            <span>
              {item.resource} · {item.effort} effort
            </span>
          </div>
          <div className="row-value saving">
            <strong>{money(item.monthlySavings)}/mo</strong>
            <span>{item.confidence}% confidence</span>
          </div>
        </div>
      ))}
    </section>
  );
}

function CostExplorer() {
  const [dimension, setDimension] = useState<"Service" | "Region" | "Account">(
    "Service",
  );
  const [period, setPeriod] = useState("90");
  const [service, setService] = useState("All services");
  const [region, setRegion] = useState("All regions");
  const [account, setAccount] = useState("All accounts");
  const rawData =
    dimension === "Service"
      ? serviceCosts.map((x) => ({
          name: x.service,
          value: x.value,
          color: x.color,
        }))
      : dimension === "Region"
        ? regions
        : accounts;
  const selected =
    dimension === "Service"
      ? service
      : dimension === "Region"
        ? region
        : account;
  const allLabel = `All ${dimension.toLowerCase()}s`;
  const data =
    selected === allLabel
      ? rawData
      : rawData.filter((item) => item.name === selected);
  const chartData = costs.slice(-Number(period));
  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Understand every dollar</h2>
          <p>
            Break down AWS spend across services, regions, and linked accounts.
          </p>
        </div>
        <button
          className="outline-button"
          onClick={() =>
            downloadCsv(
              "cloudspend-costs.csv",
              chartData.map((point) => ({
                date: point.date,
                amount_usd: point.actual,
              })),
            )
          }
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="filter-bar">
        <label>
          <CalendarDays size={15} />
          <select
            aria-label="Cost period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="120">Last 120 days</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <select
            aria-label="Filter service"
            value={service}
            onChange={(event) => {
              setService(event.target.value);
              setDimension("Service");
            }}
          >
            <option>All services</option>
            {serviceCosts.map((item) => (
              <option key={item.service}>{item.service}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <select
            aria-label="Filter region"
            value={region}
            onChange={(event) => {
              setRegion(event.target.value);
              setDimension("Region");
            }}
          >
            <option>All regions</option>
            {regions.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <select
            aria-label="Filter account"
            value={account}
            onChange={(event) => {
              setAccount(event.target.value);
              setDimension("Account");
            }}
          >
            <option>All accounts</option>
            {accounts.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <span>Updated 4 min ago</span>
      </div>
      <section className="panel explorer-chart">
        <div className="panel-head">
          <div>
            <p className="eyebrow">DAILY COST</p>
            <h2>Spend over time</h2>
          </div>
          <div className="segmented">
            {(["Service", "Region", "Account"] as const).map((x) => (
              <button
                key={x}
                className={dimension === x ? "active" : ""}
                onClick={() => setDimension(x)}
              >
                By {x}
              </button>
            ))}
          </div>
        </div>
        <div className="explorer-area">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -8, bottom: 5 }}
            >
              <defs>
                <linearGradient id="explorerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#705cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#705cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e8ebe9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateLabel}
                tickLine={false}
                axisLine={false}
                minTickGap={42}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={chartTooltip} />
              <Area
                dataKey="actual"
                name="Spend"
                stroke="#705cf6"
                strokeWidth={2.5}
                fill="url(#explorerFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel allocation-table">
        <div className="panel-head">
          <div>
            <p className="eyebrow">BREAKDOWN</p>
            <h2>Cost by {dimension.toLowerCase()}</h2>
          </div>
          <strong>{money(data.reduce((s, x) => s + x.value, 0))} total</strong>
        </div>
        {data.map((item, index) => {
          const max = Math.max(...data.map((x) => x.value));
          return (
            <div className="allocation-row" key={item.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.name}</strong>
              <div>
                <i
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    background: "color" in item ? item.color : "#705cf6",
                  }}
                />
              </div>
              <b>{money(item.value)}</b>
              <em>
                {(
                  (item.value / data.reduce((s, x) => s + x.value, 0)) *
                  100
                ).toFixed(1)}
                %
              </em>
            </div>
          );
        })}
      </section>
    </>
  );
}

function ForecastView() {
  const combined = [
    ...costs.slice(-35).map((x) => ({ ...x, history: x.actual })),
    ...forecast,
  ];
  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Know what comes next</h2>
          <p>
            XGBoost forecasts future spend with calibrated uncertainty and a
            seasonal baseline.
          </p>
        </div>
        <span className="model-badge">
          <Bot size={16} /> Model healthy
        </span>
      </div>
      <div className="forecast-stats">
        <div>
          <span>30-day forecast</span>
          <strong>$18,642</strong>
          <em>+$1,174 vs. budget</em>
        </div>
        <div>
          <span>Prediction range</span>
          <strong>$17.4K – $19.8K</strong>
          <em>90% confidence</em>
        </div>
        <div>
          <span>Model accuracy</span>
          <strong>{modelMetrics.mape}% MAPE</strong>
          <em>12.7% better than baseline</em>
        </div>
      </div>
      <section className="panel forecast-chart">
        <div className="panel-head">
          <div>
            <p className="eyebrow">30-DAY OUTLOOK</p>
            <h2>Actual and forecasted spend</h2>
          </div>
          <div className="legend">
            <span>
              <i className="navy" />
              Actual
            </span>
            <span>
              <i className="violet" />
              Forecast
            </span>
            <span>
              <i className="soft-violet" />
              Confidence interval
            </span>
          </div>
        </div>
        <div className="forecast-area">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={combined}
              margin={{ top: 20, right: 12, left: -6, bottom: 5 }}
            >
              <defs>
                <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#705cf6" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#705cf6" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e8ebe9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateLabel}
                tickLine={false}
                axisLine={false}
                minTickGap={42}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={chartTooltip} />
              <Area
                dataKey="upper"
                name="Upper bound"
                stroke="none"
                fill="url(#confidenceFill)"
              />
              <Line
                dataKey="history"
                name="Actual"
                stroke="#16231e"
                strokeWidth={2.3}
                dot={false}
              />
              <Line
                dataKey="forecast"
                name="Forecast"
                stroke="#705cf6"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="metrics-panel">
        <div className="model-card">
          <div className="model-head">
            <div className="metric-icon purple">
              <Bot size={19} />
            </div>
            <div>
              <p>MODEL PERFORMANCE</p>
              <h3>XGBoost time-series regressor</h3>
            </div>
            <span>v1.3.0</span>
          </div>
          <div className="model-metrics">
            <div>
              <span>MAE</span>
              <strong>${modelMetrics.mae}</strong>
              <small>Mean absolute error</small>
            </div>
            <div>
              <span>RMSE</span>
              <strong>${modelMetrics.rmse}</strong>
              <small>Root mean square error</small>
            </div>
            <div>
              <span>MAPE</span>
              <strong>{modelMetrics.mape}%</strong>
              <small>Production model</small>
            </div>
            <div>
              <span>Baseline MAPE</span>
              <strong>{modelMetrics.baselineMape}%</strong>
              <small>Seasonal naive</small>
            </div>
          </div>
        </div>
        <div className="drivers-card">
          <p>TOP FORECAST DRIVERS</p>
          {[
            { n: "7-day rolling spend", v: 92 },
            { n: "Day of week", v: 74 },
            { n: "EC2 usage trend", v: 61 },
            { n: "Month progression", v: 43 },
          ].map((x) => (
            <div key={x.n}>
              <span>{x.n}</span>
              <div>
                <i style={{ width: `${x.v}%` }} />
              </div>
              <b>{x.v}%</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AnomaliesView() {
  const [reviewed, setReviewed] = useState<string[]>([]);
  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Catch unusual spend early</h2>
          <p>
            Isolation Forest continuously scores changes against service-level
            behavior.
          </p>
        </div>
        <div className="anomaly-score">
          <ShieldCheck size={18} />
          <div>
            <strong>94.1%</strong>
            <span>Detection precision</span>
          </div>
        </div>
      </div>
      <div className="metrics-grid three">
        <MetricCard
          label="Open anomalies"
          value="2"
          delta="1 new"
          good={false}
          icon={AlertTriangle}
          accent="red"
          note="since yesterday"
        />
        <MetricCard
          label="Total cost impact"
          value="$707"
          delta="18.4%"
          good={false}
          icon={CircleDollarSign}
          accent="amber"
          note="this month"
        />
        <MetricCard
          label="Avoided spend"
          value="$1,284"
          delta="32.1%"
          icon={ShieldCheck}
          accent="green"
          note="last 90 days"
        />
      </div>
      <section className="anomaly-list">
        {anomalies.map((item) => {
          const isReviewed =
            reviewed.includes(item.id) || item.status === "Reviewed";
          return (
            <article key={item.id} className="panel anomaly-item">
              <div
                className={`anomaly-accent ${item.severity.toLowerCase()}`}
              />
              <div className="anomaly-main">
                <div className="anomaly-title">
                  <span
                    className={`severity-pill ${item.severity.toLowerCase()}`}
                  >
                    {item.severity}
                  </span>
                  <strong>{item.service} cost anomaly</strong>
                  <small>{item.id}</small>
                </div>
                <p>{item.cause}</p>
                <div className="anomaly-meta">
                  <span>
                    <CalendarDays size={14} />
                    {item.date}
                  </span>
                  <span>
                    <Cloud size={14} />
                    {item.region}
                  </span>
                  <span>
                    <Activity size={14} />
                    Anomaly score {item.score}/100
                  </span>
                </div>
              </div>
              <div className="impact">
                <span>Estimated impact</span>
                <strong>+{money(item.impact, 2)}</strong>
                <em>above expected spend</em>
              </div>
              <button
                className={isReviewed ? "reviewed" : "review"}
                onClick={() => setReviewed([...reviewed, item.id])}
              >
                {isReviewed ? (
                  <>
                    <Check size={15} /> Reviewed
                  </>
                ) : (
                  "Mark reviewed"
                )}
              </button>
            </article>
          );
        })}
      </section>
    </>
  );
}

function RecommendationsView() {
  const [applied, setApplied] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "quick" | "savings">("all");
  const total = recommendations.reduce(
    (sum, item) => sum + item.monthlySavings,
    0,
  );
  const visibleRecommendations =
    filter === "quick"
      ? recommendations.filter((item) => item.effort === "Low")
      : filter === "savings"
        ? [...recommendations].sort(
            (a, b) => b.monthlySavings - a.monthlySavings,
          )
        : recommendations;
  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Turn insight into savings</h2>
          <p>
            Opportunities are ranked by financial impact, confidence, and
            implementation effort.
          </p>
        </div>
        <button
          className="outline-button"
          onClick={() =>
            downloadCsv(
              "cloudspend-recommendations.csv",
              recommendations.map((item) => ({
                recommendation: item.title,
                service: item.service,
                resource: item.resource,
                monthly_savings_usd: item.monthlySavings,
                annual_savings_usd: item.annualSavings,
                effort: item.effort,
                confidence: item.confidence,
              })),
            )
          }
        >
          <Download size={16} /> Export report
        </button>
      </div>
      <section className="savings-hero">
        <div>
          <span>ESTIMATED SAVINGS POTENTIAL</span>
          <strong>
            {money(total)}
            <small>/ month</small>
          </strong>
          <p>
            {money(total * 12)} annually across {recommendations.length}{" "}
            opportunities
          </p>
        </div>
        <div className="savings-ring">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ value: 10.4 }, { value: 89.6 }]}
                dataKey="value"
                innerRadius={49}
                outerRadius={60}
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                <Cell fill="#16a36a" />
                <Cell fill="rgba(255,255,255,.12)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div>
            <strong>10.4%</strong>
            <span>of spend</span>
          </div>
        </div>
        <div className="savings-summary">
          <div>
            <span>Quick wins</span>
            <strong>3</strong>
            <small>Low effort</small>
          </div>
          <div>
            <span>High confidence</span>
            <strong>4</strong>
            <small>Above 85%</small>
          </div>
        </div>
      </section>
      <div className="recommendation-controls">
        <div className="segmented">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All opportunities
          </button>
          <button
            className={filter === "quick" ? "active" : ""}
            onClick={() => setFilter("quick")}
          >
            Quick wins
          </button>
          <button
            className={filter === "savings" ? "active" : ""}
            onClick={() => setFilter("savings")}
          >
            Highest savings
          </button>
        </div>
        <span>Sorted by potential impact</span>
      </div>
      <section className="recommendation-list">
        {visibleRecommendations.map((item, index) => {
          const done = applied.includes(item.id);
          return (
            <article className="panel recommendation-item" key={item.id}>
              <div className="rank">{String(index + 1).padStart(2, "0")}</div>
              <div className="rec-copy">
                <div>
                  <span className="service-pill">{item.service}</span>
                  <span className={`effort-pill ${item.effort.toLowerCase()}`}>
                    {item.effort} effort
                  </span>
                  <span className="confidence">
                    <ShieldCheck size={13} />
                    {item.confidence}% confidence
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <small>{item.resource}</small>
              </div>
              <div className="rec-value">
                <span>Save up to</span>
                <strong>{money(item.monthlySavings)}/mo</strong>
                <small>{money(item.annualSavings)}/year</small>
              </div>
              <button
                className={done ? "applied" : "action-button"}
                onClick={() => setApplied([...applied, item.id])}
              >
                {done ? (
                  <>
                    <Check size={15} /> Added to plan
                  </>
                ) : (
                  <>
                    Review action <ArrowRight size={15} />
                  </>
                )}
              </button>
            </article>
          );
        })}
      </section>
    </>
  );
}

function SettingsView({ openAws }: { openAws: () => void }) {
  const [budget, setBudget] = useState("17468");
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <div className="page-intro">
        <div>
          <h2>Workspace settings</h2>
          <p>
            Manage the demo, budgets, and the alerts shown in this dashboard.
          </p>
        </div>
        {saved && (
          <span className="saved-state">
            <Check size={15} /> Changes saved
          </span>
        )}
      </div>
      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="settings-card-head">
            <div className="metric-icon blue">
              <Cloud size={19} />
            </div>
            <div>
              <h3>Data connection</h3>
              <p>Choose where CloudSpend reads cost data.</p>
            </div>
          </div>
          <div className="connection-option active">
            <div>
              <span className="status-dot" />
              <strong>Demo workspace</strong>
              <small>Safe synthetic data · Active</small>
            </div>
            <span>Connected</span>
          </div>
          <button className="connection-option" onClick={openAws}>
            <div>
              <Cloud size={16} />
              <strong>AWS account</strong>
              <small>Cost Explorer and Optimization Hub</small>
            </div>
            <ArrowRight size={16} />
          </button>
        </section>
        <section className="panel settings-card">
          <div className="settings-card-head">
            <div className="metric-icon green">
              <CircleDollarSign size={19} />
            </div>
            <div>
              <h3>Monthly budget</h3>
              <p>Used for forecasts and overspend signals.</p>
            </div>
          </div>
          <label className="budget-input">
            <span>Budget in USD</span>
            <div>
              <b>$</b>
              <input
                type="number"
                min="1"
                value={budget}
                onChange={(event) => {
                  setBudget(event.target.value);
                  setSaved(false);
                }}
              />
            </div>
          </label>
        </section>
        <section className="panel settings-card settings-wide">
          <div className="settings-card-head">
            <div className="metric-icon amber">
              <Bell size={19} />
            </div>
            <div>
              <h3>Notifications</h3>
              <p>Control the operational signals included in your workspace.</p>
            </div>
          </div>
          <label className="toggle-row">
            <span>
              <strong>Cost anomaly alerts</strong>
              <small>
                Notify when spend exceeds the expected service baseline.
              </small>
            </span>
            <input
              aria-label="Cost anomaly alerts"
              type="checkbox"
              checked={anomalyAlerts}
              onChange={(event) => {
                setAnomalyAlerts(event.target.checked);
                setSaved(false);
              }}
            />
            <i />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Weekly FinOps digest</strong>
              <small>
                Summarize spend, forecast, and savings opportunities.
              </small>
            </span>
            <input
              aria-label="Weekly FinOps digest"
              type="checkbox"
              checked={weeklyDigest}
              onChange={(event) => {
                setWeeklyDigest(event.target.checked);
                setSaved(false);
              }}
            />
            <i />
          </label>
        </section>
      </div>
      <div className="settings-actions">
        <button className="action-button" onClick={() => setSaved(true)}>
          Save changes
        </button>
      </div>
    </>
  );
}

export function CloudSpendDashboard() {
  const [view, setView] = useState<View>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [awsOpen, setAwsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [dateRange, setDateRange] = useState("May 13 – Aug 10");
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setCalendarOpen(false);
        setAwsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  const content = useMemo(() => {
    if (view === "Overview") return <Overview setView={setView} />;
    if (view === "Cost Explorer") return <CostExplorer />;
    if (view === "Forecast") return <ForecastView />;
    if (view === "Anomalies") return <AnomaliesView />;
    if (view === "Recommendations") return <RecommendationsView />;
    return <SettingsView openAws={() => setAwsOpen(true)} />;
  }, [view]);
  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        setView={setView}
        open={menuOpen}
        close={() => setMenuOpen(false)}
        openAws={() => setAwsOpen(true)}
      />
      <div className="main-shell">
        <Header
          title={view}
          openMenu={() => setMenuOpen(true)}
          openSearch={() => setSearchOpen(true)}
          openNotifications={() => {
            setNotificationsOpen((open) => !open);
            setCalendarOpen(false);
          }}
          openCalendar={() => {
            setCalendarOpen((open) => !open);
            setNotificationsOpen(false);
          }}
          dateRange={dateRange}
          hasUnread={hasUnread}
        />
        {notificationsOpen && (
          <NotificationsPanel
            close={() => setNotificationsOpen(false)}
            markRead={() => setHasUnread(false)}
            setView={setView}
          />
        )}
        {calendarOpen && (
          <DateRangePanel
            close={() => setCalendarOpen(false)}
            apply={setDateRange}
          />
        )}
        <main>{content}</main>
        <footer>
          <span>CloudSpend AI · Demo data only</span>
          <span>
            <span className="status-dot" />
            All systems operational
          </span>
        </footer>
      </div>
      {searchOpen && (
        <CommandPalette close={() => setSearchOpen(false)} setView={setView} />
      )}
      {awsOpen && (
        <AwsModal
          close={() => setAwsOpen(false)}
          openSettings={() => setView("Settings")}
        />
      )}
    </div>
  );
}
