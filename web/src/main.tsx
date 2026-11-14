import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  Flame,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  MapPin,
  CalendarDays,
  Download,
  Share2,
  Info,
  ArrowLeft,
  ArrowUp,
  Check,
  Plus,
  Globe2,
  Bell,
  BookOpen,
  ShieldCheck,
  ChartNoAxesCombined,
  LayoutGrid,
  Table2,
  X,
  Search,
  SlidersHorizontal,
  ExternalLink,
  LocateFixed,
  TriangleAlert,
  FileText,
  CheckCheck,
  Mail,
  Menu,
  Image as ImageIcon,
} from "lucide-react";
const Map = React.lazy(() => import("./Map"));
import {
  MONTHS,
  REGIONS,
  fixture,
  anomaly,
  quantile,
  csv,
  points,
  inBounds,
} from "./analytics.mjs";
import "./styles/tokens.css";
import "./style.css";
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");
const ramp = [
  "#f0f4e8",
  "#d9e6ca",
  "#adca9a",
  "#78ad80",
  "#4b8c78",
  "#286c70",
  "#204f66",
  "#243b58",
];
const stored = (key: string, otherwise: any) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || otherwise;
  } catch {
    return otherwise;
  }
};
function save(name: string, text: string, type = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function IconLabel({ children, icon: Icon }: any) {
  return (
    <>
      <Icon size={15} />
      {children}
    </>
  );
}
function App() {
  const [connection, setConnection] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/firms/status")
      .then((r) => r.json())
      .then((d) => setConnection(Boolean(d.configured)))
      .catch(() => setConnection(false));
  }, []);
  const initial = new URLSearchParams(location.search);
  const [page, setPage] = useState(
      location.pathname.slice(1) || (initial.has("tour") ? "app" : "overview"),
    ),
    [regionId, setRegionId] = useState(initial.get("region") || "sri_lanka"),
    [mode, setMode] = useState("Analyst"),
    [metric, setMetric] = useState("harmonized"),
    [view, setView] = useState("calendar"),
    [table, setTable] = useState(false),
    [period, setPeriod] = useState("all"),
    [start, setStart] = useState("2001-01-01"),
    [end, setEnd] = useState("2026-11-14"),
    [selected, setSelected] = useState({ year: 2026, month: 10 }),
    [bounds, setBounds] = useState<number[] | null>(null),
    [areaModal, setAreaModal] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [toast, setToast] = useState(""),
    [tour, setTour] = useState(initial.has("tour") ? 1 : 0),
    [showInfo, setShowInfo] = useState(false),
    [confidence, setConfidence] = useState("vegetation"),
    [watches, setWatches] = useState<any[]>(() =>
      stored("embercal-watches", []),
    ),
    [alerts, setAlerts] = useState<any[]>(() => stored("embercal-alerts", []));
  const chartRef = useRef<HTMLDivElement>(null);
  const region = REGIONS.find((r) => r.id === regionId) || REGIONS[0];
  const base = useMemo(() => fixture(region.id), [region.id]);
  const areaFraction = bounds
    ? Math.min(
        1,
        Math.max(
          0.015,
          ((bounds[2] - bounds[0]) * (bounds[3] - bounds[1])) /
            ((region.bbox[2] - region.bbox[0]) *
              (region.bbox[3] - region.bbox[1])),
        ),
      )
    : 1;
  const data = base.map((c) => {
    const scale = areaFraction * (confidence === "likely" ? 0.78 : 1);
    return {
      ...c,
      value: Math.round(c.value * scale),
      lo: Math.round(c.lo * scale),
      hi: Math.round(c.hi * scale),
      raw_modis: Math.round(c.raw_modis * scale),
      raw_viirs: Math.round(c.raw_viirs * scale),
    };
  });
  const filtered = data.filter(
    (c) =>
      `${c.year}-${String(c.month).padStart(2, "0")}` >= start.slice(0, 7) &&
      `${c.year}-${String(c.month).padStart(2, "0")}` <= end.slice(0, 7) &&
      !c.future,
  );
  const a = anomaly(data, selected.year, selected.month);
  const years = [...new Set(filtered.map((c) => c.year))].reverse();
  const allYears = [...new Set(data.map((c) => c.year))];
  const current = 2026;
  const annual = allYears
    .filter((y) => y < 2026 && `${y}-01-01` >= start && `${y}-12-31` <= end)
    .map((y) => ({
      year: y,
      total: data
        .filter((c) => c.year === y && !c.gap)
        .reduce((a, c) => a + c.value, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const selectedCell = data.find(
    (c) => c.year === selected.year && c.month === selected.month,
  )!;
  const shownPoints = points(region.id).filter(
    (p) =>
      (!bounds || inBounds(p, bounds)) &&
      (confidence !== "likely" || p.confidence === "Likely fire"),
  );
  function notify(s: string) {
    setToast(s);
    setTimeout(() => setToast(""), 4500);
  }
  function go(p: string) {
    setPage(p);
    history.pushState({}, "", p === "overview" ? "/" : `/${p}`);
    window.scrollTo(0, 0);
  }
  function pickRegion(id: string) {
    setRegionId(id);
    setBounds(null);
  }
  function applyPreset(p: string) {
    setPeriod(p);
    if (p === "30") {
      setStart("2026-10-16");
      setEnd("2026-11-14");
    } else if (p === "season") {
      setStart("2026-07-01");
      setEnd("2026-11-14");
    } else {
      setStart("2001-01-01");
      setEnd("2026-11-14");
    }
  }
  function exportCsv(hotspots = false) {
    save(
      `embercal-${region.id}-${hotspots ? "hotspots" : "monthly"}-SYNTHETIC.csv`,
      csv(
        hotspots
          ? shownPoints
          : filtered.map((c) => ({
              ...c,
              region: region.id,
              confidence_filter: confidence,
              area_fraction: areaFraction,
              data_source: "SYNTHETIC fixture",
              method: "demo-v1",
            })),
      ),
    );
    notify("CSV downloaded · synthetic demonstration data");
    setExportOpen(false);
  }
  async function png() {
    if (!chartRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(chartRef.current, {
        backgroundColor: "#fff",
        pixelRatio: 2,
        skipFonts: true,
      });
      const l = document.createElement("a");
      l.href = url;
      l.download = "embercal-calendar-SYNTHETIC.png";
      l.click();
      notify("Chart image downloaded");
    } catch {
      notify("Image export unavailable. Use CSV or PDF briefing.");
    }
    setExportOpen(false);
  }
  async function pdf() {
    const { jsPDF } = await import("jspdf");
    const d = new jsPDF();
    d.setFontSize(24);
    d.text("EmberCal | Area briefing", 18, 24);
    d.setFontSize(11);
    const lines = [
      `Region: ${region.name}`,
      `SYNTHETIC DEMONSTRATION — not operational fire data`,
      `Period: ${start} to ${end}`,
      `Selected month: ${MONTHS[selected.month - 1]} ${selected.year}`,
      `VIIRS-equivalent hotspots: ${fmt(a.count)}`,
      `Historical median: ${fmt(a.median)} | Ratio: ${a.ratio.toFixed(2)}x`,
      `Historical rank: ${a.rank} of ${a.n} | ${a.level}`,
      `Filter: ${confidence} | Method: demo-v1`,
      `The selected month is a complete-month example.`,
      `November 2026 is provisional; current-month anomaly is disabled.`,
      `Synthetic uncertainty: ${fmt(selectedCell.lo)} to ${fmt(selectedCell.hi)}.`,
      `Hotspots are satellite detections, not individual fires.`,
      `Cloud, smoke and overpass timing can hide burning activity.`,
      `No field validation has been performed. Precision is not measured.`,
      `Source: deterministic EmberCal fixture, generated 14 Nov 2026.`,
      `NASA FIRMS is the intended production source; it is not connected.`,
    ];
    lines.forEach((line, i) =>
      d.text(d.splitTextToSize(line, 174), 18, 40 + i * 11),
    );
    d.save("embercal-briefing-SYNTHETIC.pdf");
    setExportOpen(false);
  }
  async function share() {
    const url = `${location.origin}/app?region=${region.id}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Region link copied. Custom area and filters are not included.");
    } catch {
      notify(url);
    }
  }
  function addWatch(name: string, email: string) {
    const item = {
      id: Date.now(),
      name,
      email,
      region: region.id,
      area: bounds,
    };
    const next = [...watches, item];
    setWatches(next);
    localStorage.setItem("embercal-watches", JSON.stringify(next));
    notify("Watch area saved on this device · demo only");
  }
  function testAlert(w: any) {
    const item = {
      id: Date.now(),
      watch: w.name,
      time: new Date().toISOString(),
      text: `TEST · ${w.name}: 4 synthetic detections. ${a.ratio.toFixed(1)}× historical median. Confidence: Likely fire. Delivery: mocked; no email sent.`,
    };
    const next = [item, ...alerts];
    setAlerts(next);
    localStorage.setItem("embercal-alerts", JSON.stringify(next));
    notify("Test alert added to the local outbox. No email sent.");
  }
  useEffect(() => {
    const handler = () => setPage(location.pathname.slice(1) || "overview");
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  useEffect(() => {
    if (!areaModal && !showInfo) return;
    const previous = document.activeElement as HTMLElement;
    const timer = setTimeout(
      () => document.querySelector<HTMLElement>(".modal button")?.focus(),
      0,
    );
    function trap(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAreaModal(false);
        setShowInfo(false);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".modal button,.modal input,.modal select,.modal a",
        ),
      ).filter(
        (el) => el.offsetParent !== null && !el.hasAttribute("disabled"),
      );
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [areaModal, showInfo]);
  const nav = [
    ["app", "Explore"],
    ["recent", "Recent detections"],
    ["alerts", "Watch areas"],
    ["methods", "Methods"],
    ["accuracy", "Accuracy"],
  ];
  return (
    <>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => go("overview")}
          aria-label="EmberCal home"
        >
          <span className="brand-icon">
            <Flame size={23} strokeWidth={1.6} />
          </span>
          Ember<span>Cal</span>
          <span className="beta">BETA</span>
        </button>
        <nav>
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              {label}
              {id === "alerts" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="top-right">
          <span className="data-pill">
            <span />{" "}
            {connection === null
              ? "Checking connection…"
              : connection
                ? "FIRMS key configured"
                : "Snapshot mode · add a key"}
          </span>
          <button
            className="button small"
            onClick={() => {
              go("overview");
            }}
          >
            About the project <ArrowUpRight size={14} />
          </button>
        </div>
      </header>
      {page === "app" ? (
        <>
          <div className="page-intro">
            <div>
              <div className="eyebrow">SATELLITE DATA. A CLEARER PICTURE.</div>
              <h1>
                Fire activity, in context<span>.</span>
              </h1>
              <p>
                Explore 26 years of fire history. Understand what’s normal. See
                what’s changing.
              </p>
            </div>
            <div className="mode-switch">
              {["Responder", "Analyst"].map((m) => (
                <button
                  aria-pressed={mode === m}
                  className={mode === m ? "selected" : ""}
                  onClick={() => setMode(m)}
                  key={m}
                >
                  {m === "Analyst" ? (
                    <ChartNoAxesCombined size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}{" "}
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="demo-banner">
            <Info size={15} />
            <span>
              <strong>Historical calendar: synthetic demo.</strong>{" "}
              {connection
                ? "Your FIRMS key is configured."
                : "Saved NASA observations are available; add FIRMS_MAP_KEY to .env for live refresh."}{" "}
              Observed recent detections are available in their own view.
            </span>
            <button onClick={() => go("recent")}>
              Recent observations <ArrowRight size={13} />
            </button>
          </div>
          <div className="workspace">
            <aside className="sidebar">
              <div className="sidebar-heading">
                <span>YOUR AREA OF INTEREST</span>
                <Globe2 size={15} />
              </div>
              <label className="field-label" htmlFor="region">
                Region
              </label>
              <div className="select-wrap">
                <MapPin size={16} />
                <select
                  id="region"
                  value={region.id}
                  onChange={(e) => pickRegion(e.target.value)}
                >
                  {REGIONS.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="map-side-meta">
                <span>{region.sub}</span>
                <span>
                  {bounds ? "Custom boundary" : "National / regional boundary"}
                </span>
              </div>
              <Suspense
                fallback={<div className="map-skeleton">Loading map…</div>}
              >
                <Map
                  region={region}
                  onArea={(b) => {
                    setBounds(b);
                    notify(
                      "Custom area selected. Demo counts scale by bounding-box area.",
                    );
                  }}
                />
              </Suspense>
              <button
                className="area-button"
                onClick={() => setAreaModal(true)}
              >
                <LocateFixed size={15} />
                {bounds
                  ? "Edit custom area"
                  : "Enter coordinates or upload GeoJSON"}
                <ChevronRight size={14} />
              </button>
              {bounds && (
                <button className="text-button" onClick={() => setBounds(null)}>
                  Clear custom selection ×
                </button>
              )}
              <div className="side-section">
                <h3>
                  <CalendarDays size={15} /> Date range
                </h3>
                <div className="date-presets">
                  {[
                    ["all", "Full record"],
                    ["season", "This season"],
                    ["30", "30 days"],
                  ].map(([id, t]) => (
                    <button
                      key={id}
                      className={period === id ? "selected" : ""}
                      onClick={() => applyPreset(id)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="date-fields">
                  <label>
                    From
                    <input
                      type="date"
                      min="2001-01-01"
                      max={end}
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        setPeriod("custom");
                      }}
                    />
                  </label>
                  <span>→</span>
                  <label>
                    To
                    <input
                      type="date"
                      min={start}
                      max="2026-11-14"
                      value={end}
                      onChange={(e) => {
                        setEnd(e.target.value);
                        setPeriod("custom");
                      }}
                    />
                  </label>
                </div>
                <p className="caption">
                  Monthly fixture: selects intersecting months.
                </p>
              </div>
              <div className="side-section">
                <h3>
                  <SlidersHorizontal size={15} /> Detection confidence
                </h3>
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  aria-label="Confidence filter"
                >
                  <option value="vegetation">All vegetation detections</option>
                  <option value="likely">Likely fire & above only</option>
                </select>
                <p className="caption">
                  Industrial heat sources excluded in the planned production
                  method.{" "}
                  <button onClick={() => go("methods")}>Learn more ↗</button>
                </p>
              </div>
              <div className="side-note">
                <ShieldCheck size={17} />
                <div>
                  <strong>A consistent view across sensors</strong>
                  <p>MODIS + VIIRS, brought onto one common baseline.</p>
                  <button onClick={() => go("methods")}>
                    Explore the methodology <ArrowRight size={12} />
                  </button>
                </div>
              </div>
              <button
                className="watch-button"
                onClick={() => {
                  go("alerts");
                }}
              >
                <Bell size={16} />
                Watch this area
                <Plus size={15} />
              </button>
              <div className="source-note">
                INTENDED DATA SOURCE
                <span>
                  NASA FIRMS <ArrowUpRight size={11} />
                </span>
                <small>Demo fixture · 14 Nov 2026</small>
              </div>
            </aside>
            <main className="analysis-main">
              <div className="area-title">
                <div>
                  <div className="breadcrumb">
                    Explore <ChevronRight size={12} /> {region.sub}
                  </div>
                  <h2>
                    {bounds ? "Custom area" : region.name}{" "}
                    <span className="region-tag">
                      {bounds ? "CUSTOM AREA" : "REGION"}
                    </span>
                  </h2>
                </div>
                <div className="action-buttons">
                  <button
                    className="button icon-only"
                    title="Copy region link"
                    onClick={share}
                  >
                    <Share2 size={16} />
                  </button>
                  <div className="export-wrap">
                    <button
                      className="button primary"
                      onClick={() => setExportOpen(!exportOpen)}
                    >
                      <Download size={15} /> Export data
                      <ChevronDown size={13} />
                    </button>
                    {exportOpen && (
                      <div className="dropdown">
                        {[
                          ["Monthly summary CSV", () => exportCsv()],
                          ["Hotspot records CSV", () => exportCsv(true)],
                          ["Calendar PNG", png],
                          ["PDF briefing", pdf],
                        ].map(([label, fn]: any) => (
                          <button key={label} onClick={fn}>
                            {label}
                            <ArrowUpRight size={13} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    {MONTHS[selected.month - 1].toUpperCase()} {selected.year}{" "}
                    <span className="demo-chip">SYNTHETIC</span>
                  </div>
                  <div className="stat-value">
                    {fmt(a.count)}
                    <span className="stat-unit">hotspots</span>
                  </div>
                  <p>VIIRS-equivalent · harmonized</p>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    COMPARED WITH HISTORY <ChartNoAxesCombined size={14} />
                  </div>
                  <div className="stat-value">
                    {a.ratio.toFixed(2)}
                    <span className="times">×</span>
                    <span
                      className={`level ${a.level === "Normal" ? "normal" : ""}`}
                    >
                      {a.level === "Normal" ? (
                        <Check size={11} />
                      ) : (
                        <ArrowUp size={11} />
                      )}{" "}
                      {a.level}
                    </span>
                  </div>
                  <p>vs. {fmt(a.median)} historical median</p>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    HISTORICAL RANK <CalendarDays size={14} />
                  </div>
                  <div className="stat-value">
                    {a.rank}
                    <span className="times">/ {a.n}</span>
                  </div>
                  <p>
                    Highest {MONTHS[selected.month - 1]} activity since 2001
                  </p>
                </div>
              </div>
              <div className="insight">
                <span className="insight-icon">
                  <ChartNoAxesCombined size={16} />
                </span>
                <span>
                  <strong>What does this mean?</strong>{" "}
                  {MONTHS[selected.month - 1]} {selected.year} was{" "}
                  {a.ratio >= 1 ? "above" : "below"} the historical median in
                  this synthetic example.{" "}
                  {a.level === "Normal"
                    ? "Activity falls within the typical range."
                    : "Explore the calendar to compare it with earlier years."}
                </span>
                <button
                  aria-label="About this verdict"
                  onClick={() => setShowInfo(true)}
                >
                  <Info size={15} />
                </button>
              </div>
              <div className="chart-tabs">
                {[
                  ["calendar", "Burning calendar", LayoutGrid],
                  ["season", "Seasonal patterns", ChartNoAxesCombined],
                  ["annual", "Annual comparison", CalendarDays],
                ].map(([id, label, I]: any) => (
                  <button
                    key={id}
                    aria-pressed={view === id}
                    className={view === id ? "active" : ""}
                    onClick={() => setView(id)}
                  >
                    <I size={15} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="chart-card" ref={chartRef}>
                <div className="chart-heading">
                  <div>
                    <h3>
                      {view === "calendar"
                        ? "Every season tells a story"
                        : view === "season"
                          ? "When does burning activity peak?"
                          : "The years with the most activity"}
                    </h3>
                    <p>
                      {view === "calendar"
                        ? "Monthly fire activity, on one consistent baseline."
                        : view === "season"
                          ? "Historical monthly range, median, and the current year."
                          : "Complete years ranked by harmonized hotspot totals."}
                    </p>
                  </div>
                  <button
                    className={`button table-button ${table ? "pressed" : ""}`}
                    onClick={() => setTable(!table)}
                  >
                    {table ? <LayoutGrid size={14} /> : <Table2 size={14} />}{" "}
                    {table ? "Chart" : "Table"}
                  </button>
                </div>
                {view === "calendar" ? (
                  <>
                    <div className="calendar-controls">
                      <div className="metric-switch">
                        {[
                          ["harmonized", "Harmonized"],
                          ["raw", "Raw MODIS"],
                          ["anomaly", "Anomaly"],
                        ].map(([id, t]) => (
                          <button
                            key={id}
                            aria-pressed={metric === id}
                            className={metric === id ? "selected" : ""}
                            onClick={() => setMetric(id)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <span className="subtle">
                        {metric === "harmonized"
                          ? "VIIRS-equivalent hotspots"
                          : metric === "raw"
                            ? "MODIS detections"
                            : "Ratio to monthly median"}{" "}
                        <Info size={12} />
                      </span>
                    </div>
                    {table ? (
                      <div className="table-scroll">
                        <table>
                          <caption>
                            Synthetic monthly counts · {region.name}
                          </caption>
                          <thead>
                            <tr>
                              <th>Year</th>
                              {MONTHS.map((m) => (
                                <th key={m}>{m}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {years.map((y) => (
                              <tr key={y}>
                                <th>{y}</th>
                                {MONTHS.map((_, m) => {
                                  const c = filtered.find(
                                    (c) => c.year === y && c.month === m + 1,
                                  );
                                  return (
                                    <td key={m}>
                                      {c?.gap
                                        ? "Gap"
                                        : c
                                          ? fmt(
                                              metric === "raw"
                                                ? c.raw_modis
                                                : c.value,
                                            )
                                          : "—"}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        className={`heatmap ${mode === "Responder" ? "compact" : ""}`}
                      >
                        <div className="heat-row heat-header">
                          <span>YEAR</span>
                          {MONTHS.map((m) => (
                            <span key={m}>{m}</span>
                          ))}
                        </div>
                        {years
                          .filter((_, i) => mode === "Analyst" || i < 8)
                          .map((y) => (
                            <div className="heat-row" key={y}>
                              <span className="year">
                                {y}
                                {y === 2026 && <i />}
                              </span>
                              {MONTHS.map((m, mi) => {
                                const c = filtered.find(
                                  (c) => c.year === y && c.month === mi + 1,
                                );
                                const median = quantile(
                                  data
                                    .filter(
                                      (d) =>
                                        d.month === mi + 1 && d.year < 2026,
                                    )
                                    .map((d) => d.value),
                                  0.5,
                                );
                                const v = c
                                  ? metric === "raw"
                                    ? c.raw_modis
                                    : c.value
                                  : 0;
                                const ratio = c ? c.value / median : 0;
                                const color =
                                  metric === "anomaly"
                                    ? ratio > 1.4
                                      ? "#b86233"
                                      : ratio > 1.1
                                        ? "#e6b898"
                                        : ratio > 0.9
                                          ? "#eceee9"
                                          : ratio > 0.7
                                            ? "#a8cbd9"
                                            : "#648fa7"
                                    : ramp[
                                        Math.min(
                                          7,
                                          Math.floor(
                                            v /
                                              (region.scale *
                                                areaFraction *
                                                175),
                                          ),
                                        )
                                      ];
                                return (
                                  <button
                                    key={m}
                                    disabled={
                                      !c ||
                                      c.future ||
                                      c.gap ||
                                      (c.month === 11 && c.year === 2026)
                                    }
                                    className={`heat-cell ${!c ? "empty" : ""} ${c?.gap ? "gap" : ""} ${c?.provisional ? "provisional" : ""} ${selected.year === y && selected.month === mi + 1 ? "chosen" : ""}`}
                                    style={{
                                      backgroundColor:
                                        c && !c.gap ? color : undefined,
                                      backgroundImage:
                                        c && y < 2012
                                          ? "repeating-linear-gradient(135deg,transparent,transparent 4px,#ffffff1a 4px,#ffffff1a 5px)"
                                          : undefined,
                                    }}
                                    title={`${m} ${y}: ${!c ? "Outside date range" : c.gap ? "Missing observation example" : fmt(v) + " synthetic hotspots"}${c?.provisional ? " · provisional" : ""}`}
                                    aria-label={`${m} ${y}: ${c ? fmt(v) : "no"} synthetic hotspots`}
                                    onClick={() =>
                                      setSelected({ year: y, month: mi + 1 })
                                    }
                                  />
                                );
                              })}
                            </div>
                          ))}
                      </div>
                    )}
                    <div className="calendar-legend">
                      <span className="legend-caption">
                        <span className="legend-box hatched" /> Pre-2012:
                        calibrated estimates{" "}
                        <span className="legend-box outlined" /> Provisional
                      </span>
                      <span className="ramp-label">
                        {metric === "anomaly" ? "Below" : "Less"}{" "}
                        <span
                          className="color-ramp"
                          style={{
                            background:
                              metric === "anomaly"
                                ? "linear-gradient(90deg,#648fa7,#eceee9,#b86233)"
                                : `linear-gradient(90deg,${ramp.join(",")})`,
                          }}
                        />
                        {metric === "anomaly" ? "Above normal" : "More"}
                      </span>
                    </div>
                    <div className="selected-detail">
                      <span className="selected-square" />
                      <strong>
                        {MONTHS[selected.month - 1]} {selected.year}
                      </strong>
                      <span>{fmt(selectedCell.value)} hotspots</span>
                      <span className="detail-muted">
                        Illustrative range {fmt(selectedCell.lo)}–
                        {fmt(selectedCell.hi)}
                      </span>
                      <button onClick={() => setShowInfo(true)}>
                        View provenance <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </>
                ) : view === "season" ? (
                  <SeasonChart data={data} table={table} />
                ) : (
                  <AnnualChart annual={annual} table={table} />
                )}
                <div className="chart-foot">
                  <span>
                    <span className="tiny-dot" /> Synthetic demonstration · Not
                    for operational decisions
                  </span>
                  <span>
                    Baseline 2001–2025 <Info size={11} />
                  </span>
                </div>
              </div>
              {mode === "Analyst" && (
                <div className="bottom-grid">
                  <div className="mini-chart-card">
                    <div className="mini-heading">
                      <h3>A rhythm through the year</h3>
                      <button
                        onClick={() => {
                          setView("season");
                          chartRef.current?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }}
                        aria-label="Open seasonal chart"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <p>
                      Typical activity peaks in{" "}
                      {region.id === "nsw"
                        ? "December–February"
                        : "August–October"}
                      .
                    </p>
                    <MiniBars data={data} />
                    <div className="mini-footer">
                      <span className="line-key" /> Historical monthly median{" "}
                      <span>2001–2025</span>
                    </div>
                  </div>
                  <div className="mini-chart-card">
                    <div className="mini-heading">
                      <h3>A history worth comparing</h3>
                      <button
                        onClick={() => setView("annual")}
                        aria-label="Open annual chart"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <p>Highest activity in this synthetic record.</p>
                    <div className="ranking-list">
                      {!annual.length && (
                        <span className="caption">
                          Choose a historical range to compare complete years.
                        </span>
                      )}
                      {annual.slice(0, 3).map((r, i) => (
                        <div key={r.year}>
                          <span className="rank-num">0{i + 1}</span>
                          <strong>{r.year}</strong>
                          <span className="rank-track">
                            <i
                              style={{
                                width: `${(r.total / annual[0].total) * 100}%`,
                                background: i === 0 ? "#254f55" : "#b5c9c8",
                              }}
                            />
                          </span>
                          <span>{fmt(r.total)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mini-footer">
                      <Info size={12} /> Full calendar years only · Synthetic
                      counts
                    </div>
                  </div>
                </div>
              )}
              <div className="limitations">
                <Info size={15} />
                <p>
                  <strong>
                    Hotspots are detections, not individual fires.
                  </strong>{" "}
                  Clouds, smoke and satellite overpass times can hide activity.
                  Recent months are provisional.{" "}
                  <button onClick={() => go("methods")}>
                    Understand the limits ↗
                  </button>
                </p>
              </div>
            </main>
          </div>
        </>
      ) : page === "overview" ? (
        <Landing
          onExplore={() => go("app")}
          onMethods={() => go("methods")}
          onAlerts={() => go("alerts")}
        />
      ) : page === "methods" ? (
        <Methods onExplore={() => go("app")} info={showInfo} />
      ) : page === "accuracy" ? (
        <Accuracy />
      ) : page === "recent" ? (
        <Recent />
      ) : page === "alerts" ? (
        <Alerts
          watches={watches}
          alerts={alerts}
          addWatch={addWatch}
          testAlert={testAlert}
          region={region}
          onRemove={(id: number) => {
            const n = watches.filter((w) => w.id !== id);
            setWatches(n);
            localStorage.setItem("embercal-watches", JSON.stringify(n));
          }}
        />
      ) : (
        <Methods onExplore={() => go("app")} info={false} />
      )}
      <footer>
        <span className="footer-brand">
          <Flame size={15} /> EmberCal{" "}
          <span>Clarity for a changing fire landscape.</span>
        </span>
        <div>
          <button onClick={() => go("methods")}>Data & methodology</button>
          <button onClick={() => go("accuracy")}>Accuracy & limitations</button>
          <span>Built for NASA Space Apps</span>
        </div>
      </footer>
      {areaModal && (
        <AreaModal
          region={region}
          close={() => setAreaModal(false)}
          apply={(b: number[]) => {
            setBounds(b);
            setAreaModal(false);
            notify("Custom area applied · bounding-box demo approximation");
          }}
        />
      )}
      {showInfo && page === "app" && (
        <div className="modal-backdrop" onClick={() => setShowInfo(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Provenance and limits"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setShowInfo(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="eyebrow">PROVENANCE & LIMITS</div>
            <h2>Know where the number comes from.</h2>
            <p>
              This workspace uses a deterministic synthetic fixture. It does not
              contain NASA observations.
            </p>
            <dl>
              <dt>Selected month</dt>
              <dd>
                {MONTHS[selected.month - 1]} {selected.year}
              </dd>
              <dt>Intended products</dt>
              <dd>MODIS C6.1 / VIIRS 375 m</dd>
              <dt>Method version</dt>
              <dd>demo-v1 · illustrative values</dd>
              <dt>Confidence filter</dt>
              <dd>{confidence}</dd>
              <dt>Custom geometry</dt>
              <dd>
                {bounds
                  ? "Bounding-box area scaling (demo only)"
                  : "Preset region"}
              </dd>
              <dt>Validation</dt>
              <dd>Not measured · no ground truth</dd>
            </dl>
            <p className="caption">
              Uncertainty is illustrative, not a fitted confidence interval.
              Production harmonization requires overlap calibration and held-out
              validation. Current partial-month anomaly is disabled.
            </p>
            <button
              className="button primary"
              onClick={() => {
                setShowInfo(false);
                go("methods");
              }}
            >
              Read the methods <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
      {tour > 0 && (
        <div className="tour-card">
          <button
            className="close"
            onClick={() => setTour(0)}
            aria-label="Close tour"
          >
            <X size={15} />
          </button>
          <span className="eyebrow">EXPLORE EMBERCAL · {tour} / 5</span>
          <h3>
            {
              [
                "One history, different sensors",
                "Make comparisons consistent",
                "Choose the place that matters",
                "Ask: is this normal?",
                "Take the context with you",
              ][tour - 1]
            }
          </h3>
          <p>
            {
              [
                "Raw MODIS counts use a different scale. Choose Raw MODIS in the calendar.",
                "Switch to Harmonized to explore the common demonstration baseline.",
                "Draw a shape on the map or enter coordinates to select an area.",
                "Select a complete month to update the historical comparison.",
                "Download a CSV or PDF briefing. All demo exports are labelled synthetic.",
              ][tour - 1]
            }
          </p>
          <button
            className="button primary"
            onClick={() => {
              if (tour === 5) setTour(0);
              else {
                setTour(tour + 1);
                if (tour === 1) setMetric("harmonized");
                if (tour === 2) setAreaModal(true);
              }
            }}
          >
            {tour === 5 ? "Finish tour" : "Next step"}
            <ArrowRight size={13} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          {toast}
        </div>
      )}
    </>
  );
}
function MiniBars({ data }: any) {
  const v = MONTHS.map((_: any, i: number) =>
    quantile(
      data
        .filter((c: any) => c.month === i + 1 && c.year < 2026)
        .map((c: any) => c.value),
      0.5,
    ),
  );
  const max = Math.max(...v);
  return (
    <div className="mini-bars">
      {v.map((value: number, i: number) => (
        <div key={i}>
          <span
            title={`${MONTHS[i]} median: ${fmt(value)}`}
            style={{
              height: `${Math.max(4, (value / max) * 72)}px`,
              background: i >= 7 && i <= 9 ? "#245860" : "#d5e2df",
            }}
          />
          <small>{MONTHS[i].slice(0, 1)}</small>
        </div>
      ))}
    </div>
  );
}
function SeasonChart({ data, table }: any) {
  const rows = MONTHS.map((m, i) => {
    const vals = data
      .filter((c: any) => c.month === i + 1 && c.year < 2026)
      .map((c: any) => c.value);
    return {
      month: m,
      median: quantile(vals, 0.5),
      p10: quantile(vals, 0.1),
      p90: quantile(vals, 0.9),
      current:
        i < 11
          ? data.find((c: any) => c.month === i + 1 && c.year === 2026).value
          : null,
    };
  });
  const max = Math.max(...rows.map((r) => r.p90)) * 1.12;
  if (table)
    return (
      <div className="table-scroll">
        <table>
          <caption>Synthetic monthly climatology</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Median</th>
              <th>10th percentile</th>
              <th>90th percentile</th>
              <th>2026</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <th>{r.month}</th>
                <td>{fmt(r.median)}</td>
                <td>{fmt(r.p10)}</td>
                <td>{fmt(r.p90)}</td>
                <td>{r.current ? fmt(r.current) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  const x = (i: number) => 65 + i * 54,
    y = (v: number) => 235 - (v / max) * 195;
  return (
    <div className="svg-chart">
      <svg
        viewBox="0 0 720 280"
        role="img"
        aria-label="Synthetic monthly climatology, median, 10th–90th percentile range, and 2026"
      >
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((n) => (
            <g key={n}>
              <line
                x1="52"
                x2="685"
                y1={y(n * max)}
                y2={y(n * max)}
                stroke="#e9eded"
              />
              <text x="42" y={y(n * max) + 4} textAnchor="end">
                {fmt(n * max)}
              </text>
            </g>
          ))}
        </g>
        <path
          d={`M ${rows.map((r, i) => `${x(i)},${y(r.p90)}`).join(" L ")} L ${[
            ...rows,
          ]
            .reverse()
            .map((r, i) => `${x(11 - i)},${y(r.p10)}`)
            .join(" L ")} Z`}
          fill="#e0ebe8"
        />
        <path
          d={`M ${rows.map((r, i) => `${x(i)},${y(r.median)}`).join(" L ")}`}
          fill="none"
          stroke="#2b5c60"
          strokeWidth="2.5"
        />
        {rows.map((r, i) => (
          <g key={r.month}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={y(r.p10)}
              y2={y(r.p90)}
              stroke="#a9c5c1"
            />
            <text x={x(i)} y="261" textAnchor="middle">
              {r.month}
            </text>
            <circle cx={x(i)} cy={y(r.median)} r="3" fill="#2b5c60" />
          </g>
        ))}
        <path
          d={`M ${rows
            .filter((r) => r.current !== null)
            .map((r, i) => `${x(i)},${y(r.current!)}`)
            .join(" L ")}`}
          fill="none"
          stroke="#507da7"
          strokeWidth="2.5"
          strokeDasharray="6 4"
        />
      </svg>
      <div className="chart-key">
        <span>
          <i style={{ background: "#d5e2df" }} /> Historical p10–p90
        </span>
        <span>
          <i style={{ background: "#2b5c60" }} /> Median
        </span>
        <span>
          <i style={{ background: "#507da7" }} /> 2026 · November partial
        </span>
      </div>
    </div>
  );
}
function AnnualChart({ annual, table }: any) {
  if (table)
    return (
      <div className="table-scroll">
        <table>
          <caption>Synthetic annual ranking · complete years</caption>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Year</th>
              <th>Harmonized total</th>
            </tr>
          </thead>
          <tbody>
            {annual.map((r: any, i: number) => (
              <tr key={r.year}>
                <td>{i + 1}</td>
                <th>{r.year}</th>
                <td>{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="annual-bars">
      {annual.slice(0, 12).map((r: any, i: number) => (
        <div key={r.year}>
          <span>{r.year}</span>
          <div>
            <i
              style={{
                width: `${(r.total / annual[0].total) * 100}%`,
                background: i === 0 ? "#234e55" : "#b7ceca",
              }}
            />
          </div>
          <strong>{fmt(r.total)}</strong>
          {i === 0 && <span className="mini-badge">HIGHEST</span>}
        </div>
      ))}
    </div>
  );
}
function AreaModal({ region, close, apply }: any) {
  const [tab, setTab] = useState("coordinates"),
    [error, setError] = useState(""),
    [lat, setLat] = useState(String(region.center[1])),
    [lon, setLon] = useState(String(region.center[0])),
    [radius, setRadius] = useState("25"),
    [bbox, setBbox] = useState(region.bbox.join(", "));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    let b: number[];
    if (tab === "coordinates") {
      const la = Number(lat),
        lo = Number(lon),
        r = Number(radius);
      if (
        !Number.isFinite(la + lo + r) ||
        la < -85 ||
        la > 85 ||
        lo < -180 ||
        lo > 180 ||
        r <= 0 ||
        r > 500
      ) {
        setError(
          "Enter latitude −85 to 85, longitude −180 to 180, and radius 1–500 km.",
        );
        return;
      }
      const dy = r / 111,
        dx = dy / Math.cos((la * Math.PI) / 180);
      b = [lo - dx, la - dy, lo + dx, la + dy];
    } else b = bbox.split(",").map(Number);
    if (
      b.length !== 4 ||
      b.some((x) => !Number.isFinite(x)) ||
      b[0] >= b[2] ||
      b[1] >= b[3] ||
      b[0] < -180 ||
      b[2] > 180 ||
      b[1] < -90 ||
      b[3] > 90
    ) {
      setError("Use west, south, east, north with valid coordinate bounds.");
      return;
    }
    if (
      b[2] < region.bbox[0] ||
      b[0] > region.bbox[2] ||
      b[3] < region.bbox[1] ||
      b[1] > region.bbox[3]
    ) {
      setError("Select an area that overlaps the current demo region.");
      return;
    }
    apply(b);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      const g = JSON.parse(await file.text());
      let coords: number[][] = [];
      function walk(v: any) {
        if (Array.isArray(v) && typeof v[0] === "number" && v.length >= 2)
          coords.push(v);
        else if (Array.isArray(v)) v.forEach(walk);
      }
      if (g.type === "FeatureCollection")
        g.features.forEach((f: any) => walk(f.geometry.coordinates));
      else walk(g.type === "Feature" ? g.geometry.coordinates : g.coordinates);
      if (
        !coords.length ||
        coords.some((c) => c.some((n) => !Number.isFinite(n)))
      )
        throw Error();
      const b = [
        Math.min(...coords.map((c) => c[0])),
        Math.min(...coords.map((c) => c[1])),
        Math.max(...coords.map((c) => c[0])),
        Math.max(...coords.map((c) => c[1])),
      ];
      setBbox(b.join(", "));
      setTab("bbox");
      setError("");
    } catch {
      setError("Please upload a valid GeoJSON geometry or FeatureCollection.");
    }
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="area-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close"
          onClick={close}
          aria-label="Close area selection"
        >
          <X size={18} />
        </button>
        <div className="eyebrow">DEFINE YOUR AREA</div>
        <h2 id="area-title">Start with a place.</h2>
        <p>
          Choose a location within {region.name}. The demo uses its bounding box
          to scale synthetic counts.
        </p>
        <div className="metric-switch">
          {[
            ["coordinates", "Point & radius"],
            ["bbox", "Bounding box"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "selected" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={submit}>
          {tab === "coordinates" ? (
            <>
              <div className="form-row">
                <label>
                  Latitude
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    required
                    type="number"
                    step="any"
                  />
                </label>
                <label>
                  Longitude
                  <input
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    required
                    type="number"
                    step="any"
                  />
                </label>
              </div>
              <label>
                Radius (km)
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <label>
              West, south, east, north
              <input
                value={bbox}
                onChange={(e) => setBbox(e.target.value)}
                required
              />
            </label>
          )}
          <label className="upload-label">
            <Plus size={15} /> Or upload GeoJSON
            <input
              type="file"
              accept=".json,.geojson,application/geo+json"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit">
            Apply area
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
function Methods({ onExplore }: any) {
  return (
    <main className="editorial">
      <div className="eyebrow">THE METHOD BEHIND THE MAP</div>
      <h1>
        Different satellites.
        <br />
        One consistent story.
      </h1>
      <p className="editorial-lead">
        A new satellite shouldn’t create a new fire trend. EmberCal is designed
        to put MODIS and VIIRS observations on a common historical baseline.
      </p>
      <div className="method-feature">
        <span>2001</span>
        <div className="method-timeline">
          <i />
          <strong>MODIS → calibrated estimates</strong>
          <i />
          <strong>VIIRS → reference observations</strong>
        </div>
        <span>2026</span>
      </div>
      <div className="demo-banner">
        <Info size={17} />
        <span>
          The historical calendar is synthetic. The Recent detections view now
          reads observed NASA FIRMS NRT snapshots with your server-side key.
          Production historical harmonization and independent validation remain
          to be completed.
        </span>
      </div>
      <h2>From detections to decisions.</h2>
      <div className="method-steps">
        {[
          [
            "01",
            "Clean the observations",
            "Normalize sensor records, remove duplicate detections, and filter persistent industrial heat sources consistently across sensors.",
          ],
          [
            "02",
            "Count common fire cell-days",
            "Place observations on a common approximately 1 km grid. A cell observed burning on a local date contributes once, reducing pixel-size effects.",
          ],
          [
            "03",
            "Calibrate the overlap",
            "Fit VIIRS-to-MODIS ratios by cell, season and day/night. Shrink sparse estimates toward regional and global parent ratios.",
          ],
          [
            "04",
            "Keep one reference constellation",
            "Use the planned S-NPP reference, then NOAA-20 adjusted on overlap. Extra live satellites must not inflate historical comparisons.",
          ],
          [
            "05",
            "Publish uncertainty and evidence",
            "Bootstrap overlap years for uncertainty. Validate on held-out years and check seasonality and sensor transitions before claiming a reliable harmonized series.",
          ],
        ].map(([n, t, p]) => (
          <div key={n}>
            <span>{n}</span>
            <section>
              <h3>{t}</h3>
              <p>{p}</p>
            </section>
          </div>
        ))}
      </div>
      <h2>Confidence you can inspect.</h2>
      <p>
        The planned rule-based evidence combines vegetation cover, static-source
        masks, multi-satellite agreement, persistence, signal strength and
        neighbouring detections. Ground confirmation or burn-scar evidence can
        upgrade a detection to Confirmed.
      </p>
      <div className="label-list">
        <span>
          <CheckCheck size={16} /> Confirmed
        </span>
        <span>
          <ShieldCheck size={16} /> Likely fire
        </span>
        <span>
          <Info size={16} /> Possible fire
        </span>
        <span>
          <X size={16} /> Probably not vegetation fire
        </span>
      </div>
      <p>
        Demo labels and evidence are synthetic examples. They have not been
        computed from real land-cover or burn-scar products.
      </p>
      <h2>Know the limits.</h2>
      <ul className="limit-list">
        <li>Hotspots are detections, not a count of separate fires.</li>
        <li>
          Cloud, smoke, small fires and satellite timing cause omissions. “No
          fire detected” does not mean there is no fire.
        </li>
        <li>
          Near-real-time products are provisional and can change after science
          processing.
        </li>
        <li>
          Current month-to-date comparisons must use the same elapsed days in
          historical years. This demo disables November anomaly selection until
          that daily pipeline exists.
        </li>
        <li>
          Sensor availability and retirement dates from the supplied brief must
          be verified against NASA before operational use.
        </li>
        <li>
          Custom areas currently use bounding-box scaling; they do not run a
          calibrated spatial query.
        </li>
      </ul>
      <h2>Data credits & privacy.</h2>
      <p>
        The Recent detections view uses NASA FIRMS MODIS NRT and VIIRS
        NOAA-20/NOAA-21 NRT observations. The historical calendar still uses
        synthetic data. The map uses CARTO and OpenStreetMap. Watch areas and
        mock alerts are stored only in this browser. No messages are sent and no
        agency authentication is implemented.
      </p>
      <button className="button primary" onClick={onExplore}>
        Explore the demonstration
        <ArrowRight size={15} />
      </button>
    </main>
  );
}
function Accuracy() {
  return (
    <main className="editorial">
      <div className="eyebrow">TRANSPARENCY FIRST</div>
      <h1>
        Trust starts
        <br />
        with measurement.
      </h1>
      <p className="editorial-lead">
        Accuracy is a result to measure, not a promise to make. No field
        validation has been performed for this synthetic demonstration.
      </p>
      <div className="accuracy-stats">
        <div>
          <span>GROUND-TRUTH SAMPLES</span>
          <strong>0</strong>
          <p>No reviewed detections</p>
        </div>
        <div>
          <span>MEASURED PRECISION</span>
          <strong>—</strong>
          <p>Not yet measured</p>
        </div>
        <div>
          <span>HELD-OUT VALIDATION</span>
          <strong>Pending</strong>
          <p>Real observations required</p>
        </div>
      </div>
      <h2>A clear validation plan.</h2>
      <p>
        The production target is at least 100 Sri Lanka dry-season detections
        from 2019–2025, stratified by confidence label and land cover.
        Before/after Sentinel-2 imagery and human review are needed to establish
        independent ground truth.
      </p>
      <div className="table-scroll">
        <table>
          <caption>Validation status · 14 November 2026</caption>
          <thead>
            <tr>
              <th>Check</th>
              <th>Target</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Likely + Confirmed precision",
                "≥95% over vegetation",
                "Not measured",
              ],
              [
                "Industrial false-alarm reduction",
                "≥70% vs raw",
                "Not measured",
              ],
              ["Known static-source alerts", "Zero", "Not validated"],
              ["Harmonization hold-out", "2019–2025", "Not run"],
              ["Seasonality correlation", "≥0.9", "Not run"],
              ["Sensor transition test", "No artificial step", "Not run"],
            ].map((r) => (
              <tr key={r[0]}>
                {r.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>What will be published.</h2>
      <p>
        Precision by confidence label with sample sizes and 95% intervals;
        industrial and urban false-alarm rates; omission estimates where
        independent scars exist; and regional harmonization R², MAPE and bias
        against raw and single-ratio baselines.
      </p>
      <div className="side-note">
        <ShieldCheck size={22} />
        <p>
          Until these checks are complete, EmberCal is a demonstration and must
          not be used for emergency dispatch or operational decisions.
        </p>
      </div>
    </main>
  );
}
function Alerts({
  watches,
  alerts,
  addWatch,
  testAlert,
  onRemove,
  region,
}: any) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [creating, setCreating] = useState(false);
  return (
    <main className="alerts-page">
      <div className="eyebrow">LOCAL DEMO · NO EXTERNAL DELIVERY</div>
      <div className="page-intro">
        <div>
          <h1>
            A little context.
            <br />
            When it matters.
          </h1>
          <p>Save a watch area and explore contextual fire alerts.</p>
        </div>
        <button
          className="button primary"
          onClick={() => setCreating(!creating)}
        >
          <Plus size={15} /> New watch area
        </button>
      </div>
      <div className="demo-banner">
        <Bell size={16} />
        <span>
          Watch areas and the test outbox stay in this browser. Scheduled
          satellite fetching, email, and Telegram are not connected.
        </span>
      </div>
      {creating && (
        <form
          className="watch-form"
          onSubmit={(e) => {
            e.preventDefault();
            addWatch(name, email);
            setCreating(false);
            setName("");
            setEmail("");
          }}
        >
          <h3>Watch {region.name}</h3>
          <p className="caption">
            Saves the current region and selected area. Recipients are
            illustrative.
          </p>
          <div className="form-row">
            <label>
              Area name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Monaragala district"
              />
            </label>
            <label>
              Responsible person’s email
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@example.org"
              />
            </label>
          </div>
          <button className="button primary" type="submit">
            Save watch area <Check size={15} />
          </button>
        </form>
      )}
      <h2>
        Your watch areas <span className="region-tag">{watches.length}</span>
      </h2>
      {!watches.length ? (
        <div className="empty-state">
          <span>
            <Bell size={27} />
          </span>
          <h3>Keep an eye on a place.</h3>
          <p>
            Add your first watch area, then send a test alert
            <br />
            to see the historical context in action.
          </p>
          <button className="button" onClick={() => setCreating(true)}>
            <Plus size={14} /> Create watch area
          </button>
        </div>
      ) : (
        <div className="watch-grid">
          {watches.map((w: any) => (
            <div className="watch-card" key={w.id}>
              <div className="mini-heading">
                <span className="eyebrow">MOCK DELIVERY</span>
                <button
                  onClick={() => onRemove(w.id)}
                  aria-label={`Delete ${w.name}`}
                >
                  <X size={16} />
                </button>
              </div>
              <h3>{w.name}</h3>
              <p>
                <MapPin size={14} />
                {REGIONS.find((r) => r.id === w.region)?.name}
              </p>
              <p>
                <Mail size={14} />
                {w.email}
              </p>
              <button className="button" onClick={() => testAlert(w)}>
                Send test alert <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="section-title">
        <h2>Test outbox</h2>
        <button
          className="button"
          disabled={!alerts.length}
          onClick={() => save("embercal-mock-alerts.csv", csv(alerts))}
        >
          <Download size={14} /> Export history
        </button>
      </div>
      {!alerts.length ? (
        <p className="empty-inline">
          No test alerts yet. Messages will appear here after you send a test.
        </p>
      ) : (
        alerts.map((a: any) => (
          <div className="outbox-item" key={a.id}>
            <span className="mini-badge">MOCKED</span>
            <strong>{a.watch}</strong>
            <time>{new Date(a.time).toLocaleString()}</time>
            <p>{a.text}</p>
          </div>
        ))
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
function Landing({ onExplore, onMethods, onAlerts }: any) {
  const demo = fixture();
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="hero-tag">
          OPEN DATA. A LONGER VIEW. <ArrowUpRight size={12} />
        </div>
        <h1>
          See the fire.
          <br />
          Understand the <span>pattern.</span>
        </h1>
        <p>
          A clearer picture of a changing fire landscape.
          <br />
          26 years of satellite history, brought into context.
        </p>
        <div className="hero-actions">
          <button className="button primary" onClick={onExplore}>
            Explore the fire calendar <ArrowUpRight size={16} />
          </button>
          <button className="button" onClick={onMethods}>
            Behind the science <ArrowRight size={15} />
          </button>
        </div>
        <span className="hero-demo">
          <span /> Synthetic history demo · NASA FIRMS recent-data connection
        </span>
        <div className="hero-product">
          <div className="hero-product-top">
            <span>
              <Flame size={17} /> EmberCal <i>/</i> Sri Lanka
            </span>
            <span>26 years. One common baseline.</span>
            <button onClick={onExplore}>
              Open explorer <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="hero-dashboard">
            <aside>
              <span className="eyebrow">YOUR AREA OF INTEREST</span>
              <h3>
                Sri Lanka <MapPin size={14} />
              </h3>
              <div className="island-graphic">
                <svg
                  viewBox="0 0 180 240"
                  role="img"
                  aria-label="Stylized Sri Lanka region illustration"
                >
                  <defs>
                    <pattern
                      id="mapgrid"
                      width="15"
                      height="15"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 15 0 L 0 0 0 15"
                        fill="none"
                        stroke="#bdcfcd"
                        strokeWidth=".4"
                      />
                    </pattern>
                  </defs>
                  <rect width="180" height="240" fill="#e8f1f2" />
                  <rect width="180" height="240" fill="url(#mapgrid)" />
                  <path
                    d="M88 18 L103 32 L103 51 L115 74 L125 103 L139 126 L143 159 L135 189 L118 212 L92 222 L72 211 L58 187 L55 156 L65 127 L72 94 L76 58 L76 35 Z"
                    fill="#e7e9d9"
                    stroke="#b9c8ac"
                    strokeWidth="1.4"
                  />
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                    <circle
                      key={i}
                      cx={83 + Math.sin(i * 8) * 23}
                      cy={62 + i * 11}
                      r={i % 3 === 0 ? 3 : 2}
                      fill="#ce744c"
                      stroke="#fff"
                      strokeWidth=".8"
                    />
                  ))}
                  <text
                    x="91"
                    y="164"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#91a28d"
                  >
                    SRI LANKA
                  </text>
                </svg>
                <div className="island-pin">
                  <MapPin size={13} /> South Asia
                </div>
              </div>
              <small>NASA FIRMS · Intended data source</small>
            </aside>
            <div className="hero-calendar">
              <div className="hero-calendar-heading">
                <div>
                  <span className="eyebrow">HARMONIZED FIRE ACTIVITY</span>
                  <h3>A history you can compare.</h3>
                </div>
                <span className="hero-status">SYNTHETIC DEMO</span>
              </div>
              <div className="heat-row heat-header">
                <span>YEAR</span>
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
              {Array.from({ length: 14 }, (_, i) => 2026 - i).map((y) => (
                <div className="heat-row" key={y}>
                  <span className="year">{y}</span>
                  {MONTHS.map((m, i) => {
                    const c = demo.find(
                      (c) => c.year === y && c.month === i + 1,
                    )!;
                    return (
                      <span
                        key={m}
                        className="heat-cell"
                        style={{
                          background: c.future
                            ? "#f5f7f2"
                            : ramp[Math.min(7, Math.floor(c.value / 175))],
                        }}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="hero-callout">
                <ChartNoAxesCombined size={17} />
                <span>
                  <strong>Is this normal for this place and season?</strong>
                  <br />
                  Go beyond the hotspot. Put each month in perspective.
                </span>
                <ArrowRight size={17} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="feature-links">
        <button onClick={onExplore}>
          <CalendarDays size={22} />
          <h3>
            One harmonized
            <br />
            fire calendar.
          </h3>
          <p>
            Explore the patterns <ArrowRight size={14} />
          </p>
        </button>
        <button onClick={onAlerts}>
          <Bell size={22} />
          <h3>
            Watch the places
            <br />
            that matter.
          </h3>
          <p>
            Set up a demo watch area <ArrowRight size={14} />
          </p>
        </button>
        <button onClick={onMethods}>
          <ShieldCheck size={22} />
          <h3>
            Transparent methods.
            <br />
            Honest limitations.
          </h3>
          <p>
            Understand the science <ArrowRight size={14} />
          </p>
        </button>
      </section>
      <section className="dark-story">
        <div className="eyebrow">FROM SIGNAL TO UNDERSTANDING</div>
        <h2>
          A satellite sees a hotspot.
          <br />
          Context tells the bigger story.
        </h2>
        <div>
          {[
            [
              "01",
              "The challenge",
              "Different sensors detect different amounts of activity. Put them together without calibration, and a new satellite can look like a new fire trend.",
            ],
            [
              "02",
              "The approach",
              "A common grid, overlapping observations, and a consistent reference. Designed to make historical comparisons meaningful.",
            ],
            [
              "03",
              "The decision",
              "See seasonal patterns, compare years, and ask whether a month is unusual. Export the context with every number.",
            ],
          ].map(([n, t, p]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
        <button className="button" onClick={onExplore}>
          Start exploring <ArrowUpRight size={15} />
        </button>
      </section>
      <section className="landing-bottom">
        <span className="eyebrow">BUILT ON OPEN SCIENCE</span>
        <h2>It all starts with the data.</h2>
        <p>
          Designed for NASA FIRMS MODIS and VIIRS observations.
          <br />
          This workspace uses synthetic fixtures while the production data
          pipeline and independent validation are developed.
        </p>
        <button className="button" onClick={onMethods}>
          Read the methodology <ArrowRight size={14} />
        </button>
      </section>
    </main>
  );
}
function Recent() {
  const [regionId, setRegionId] = useState("sri_lanka"),
    [snapshot, setSnapshot] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [bounds, setBounds] = useState<number[] | null>(null),
    [sensor, setSensor] = useState("all");
  const region = REGIONS.find((r) => r.id === regionId)!;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSnapshot(null);
    setBounds(null);
    fetch(`/api/live?region=${regionId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "Could not load observations.");
        if (active) setSnapshot(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [regionId]);
  const rows = (snapshot?.detections || []).filter(
    (p: any) =>
      (!bounds || inBounds(p, bounds)) &&
      (sensor === "all" || p.sensor === sensor),
  );
  const stale =
    snapshot?.fetched_at &&
    Date.now() - Date.parse(snapshot.fetched_at) > 6 * 3600 * 1000;
  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      const r = await fetch(`/api/live/refresh?region=${regionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Refresh failed.");
      setSnapshot(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <main className="recent-page">
      <div className="eyebrow">NASA FIRMS · OBSERVED NEAR-REAL-TIME DATA</div>
      <div className="page-intro">
        <div>
          <h1>What the satellites detected.</h1>
          <p>
            Recent raw observations, kept separate from the synthetic historical
            calendar.
          </p>
        </div>
        <button
          className="button primary"
          disabled={refreshing || loading}
          onClick={refresh}
        >
          <Globe2 size={15} />
          {refreshing ? "Fetching from NASA…" : "Refresh observations"}
        </button>
      </div>
      <div className="demo-banner">
        <Info size={16} />
        <span>
          <strong>Observed data, provisional.</strong> Five-day FIRMS request
          window · NOAA-20, NOAA-21 and MODIS. Raw detections are not harmonized
          counts or confirmed fires. No scheduled refresh is enabled.
        </span>
      </div>
      <div className="recent-toolbar">
        <label>
          Monitoring region
          <select
            disabled={refreshing}
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setSensor("all");
            }}
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sensor
          <select value={sensor} onChange={(e) => setSensor(e.target.value)}>
            <option value="all">All sensors</option>
            <option>VIIRS</option>
            <option>MODIS</option>
          </select>
        </label>
        <button
          className="button"
          disabled={!snapshot}
          onClick={() =>
            save(
              `embercal-${regionId}-FIRMS-observed.csv`,
              rows.length
                ? csv(rows)
                : "latitude,longitude,date,time,sensor,satellite,sensor_confidence,frp,source,is_nrt,synthetic\n",
            )
          }
        >
          <Download size={14} /> Observed CSV
        </button>
        {bounds && (
          <button className="text-button" onClick={() => setBounds(null)}>
            Clear map selection ×
          </button>
        )}
      </div>
      {error && (
        <div className="recent-warning" role="alert">
          <TriangleAlert size={16} />
          <span>
            {error} {snapshot ? "Previous observations remain visible." : ""}
          </span>
        </div>
      )}
      {stale && (
        <div className="recent-warning">
          <TriangleAlert size={16} />
          <span>
            Data delayed: this snapshot was fetched more than six hours ago.
            Refresh to request the latest available observations.
          </span>
        </div>
      )}
      {loading ? (
        <div className="empty-state" role="status">
          <Globe2 size={24} />
          <p>Loading central observation snapshot…</p>
        </div>
      ) : (
        snapshot && (
          <>
            <div className="recent-stats">
              <div>
                <span>DETECTIONS IN SELECTION</span>
                <strong>{fmt(rows.length)}</strong>
                <small>
                  {bounds
                    ? "Bounding-box map selection"
                    : "Full monitoring region"}
                </small>
              </div>
              <div>
                <span>REQUEST WINDOW</span>
                <strong>{snapshot.window_days || 5} days</strong>
                <small>Most recent FIRMS window; availability can lag</small>
              </div>
              <div>
                <span>LAST SUCCESSFUL FETCH</span>
                <strong className="fetch-time">
                  {snapshot.fetched_at
                    ? new Date(snapshot.fetched_at).toLocaleString("en-GB", {
                        timeZone: "UTC",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) + " UTC"
                    : "Not fetched"}
                </strong>
                <small>
                  All three sources must succeed before replacing data
                </small>
              </div>
            </div>
            <div className="recent-map">
              <Suspense
                fallback={<div className="map-skeleton">Loading map…</div>}
              >
                <Map
                  region={region}
                  onArea={setBounds}
                  records={rows}
                  observed
                />
              </Suspense>
              {!rows.length && (
                <div className="no-detections">
                  <ShieldCheck size={22} />
                  <h3>No detections returned in this window.</h3>
                  <p>
                    This does not mean there is no fire. Clouds, small fires,
                    <br />
                    satellite timing and data availability can hide activity.
                  </p>
                </div>
              )}
            </div>
            <div className="recent-sources">
              {(snapshot.sources || []).map((s: any) => (
                <span key={s.source}>
                  <Check size={13} />
                  {s.source}
                  <strong>{fmt(s.count)} returned</strong>
                </span>
              ))}
            </div>
            <h2>Detection records</h2>
            <p className="recent-explainer">
              Sensor confidence is NASA’s detection-quality flag. It is not an
              independently validated “Likely fire” label. Static-source masks
              and ground confirmation are not applied here.
            </p>
            <div className="table-scroll">
              <table>
                <caption>
                  NASA FIRMS raw NRT observations · Coordinates and acquisition
                  times in UTC
                </caption>
                <thead>
                  <tr>
                    {[
                      "Date / time",
                      "Satellite",
                      "Coordinates",
                      "Sensor confidence",
                      "FRP (MW)",
                      "Product",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 500).map((p: any) => (
                    <tr key={p.id}>
                      <td>
                        {p.date} {p.time}
                      </td>
                      <td>{p.satellite}</td>
                      <td>
                        {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                      </td>
                      <td>{p.sensor_confidence}</td>
                      <td>{p.frp}</td>
                      <td>{p.source}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={6}>
                        No detections returned. No zero-fire conclusion can be
                        drawn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {rows.length > 500 && (
                <p className="caption">
                  Showing the first 500 records. CSV includes all{" "}
                  {fmt(rows.length)} selected records.
                </p>
              )}
            </div>
            <p className="recent-explainer">
              Refresh performs one central regional request per source,
              independent of drawn area. Successful refreshes are cached for 15
              minutes to reduce quota use; the Worker instance cache is
              temporary. Acquisition dates on records describe the actual
              observation times. Historical harmonization and measured fire
              accuracy remain unfinished.
            </p>
          </>
        )
      )}
    </main>
  );
}
