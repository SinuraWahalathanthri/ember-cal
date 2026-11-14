export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const REGIONS = [
  {
    id: "sri_lanka",
    name: "Sri Lanka",
    sub: "South Asia",
    center: [80.8, 7.9],
    zoom: 6.8,
    bbox: [79.5, 5.8, 82, 10],
    scale: 1,
    season: [
      0.35, 0.55, 0.75, 0.55, 0.35, 0.45, 0.8, 1.6, 2.1, 1.7, 0.75, 0.35,
    ],
  },
  {
    id: "pantanal",
    name: "Pantanal, Brazil",
    sub: "South America",
    center: [-56.8, -18.5],
    zoom: 5.8,
    bbox: [-59, -22, -54, -15],
    scale: 5.4,
    season: [0.2, 0.2, 0.25, 0.35, 0.5, 0.75, 1.3, 2, 2.8, 2, 0.8, 0.3],
  },
  {
    id: "nsw",
    name: "New South Wales",
    sub: "Australia",
    center: [147, -32.4],
    zoom: 5.4,
    bbox: [141, -37.5, 153.7, -28],
    scale: 3.2,
    season: [2.1, 1.6, 1, 0.4, 0.2, 0.15, 0.2, 0.3, 0.6, 0.9, 1.4, 2],
  },
];
export const quantile = (a, p) => {
  if (!a.length) return 0;
  const s = [...a].sort((a, b) => a - b),
    i = (s.length - 1) * p;
  return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i % 1);
};
export function fixture(region = "sri_lanka") {
  const r = REGIONS.find((r) => r.id === region) || REGIONS[0];
  return Array.from({ length: 26 * 12 }, (_, i) => {
    const year = 2001 + Math.floor(i / 12),
      month = i % 12;
    const noise =
      0.72 + ((Math.sin(year * 8.17 + month * 3.13) + 1) / 2) * 0.65;
    const special = year === 2020 || year === 2024 ? 1.65 : 1;
    const value = Math.round(
      (210 + (year - 2001) * 3) * r.scale * r.season[month] * noise * special,
    );
    return {
      year,
      month: month + 1,
      value,
      lo: Math.round(value * (year < 2012 ? 0.74 : 0.94)),
      hi: Math.round(value * (year < 2012 ? 1.28 : 1.06)),
      raw_modis: Math.round(value / (1.8 + month * 0.025)),
      raw_viirs: year >= 2012 ? value : 0,
      gap: year === 2003 && month === 4,
      provisional: year === 2026 && month >= 6,
      future: year === 2026 && month > 10,
      synthetic: true,
    };
  });
}
export function anomaly(cells, year, month) {
  const c = cells.find((c) => c.year === year && c.month === month);
  const history = cells.filter(
    (c) => c.year < year && c.month === month && !c.gap,
  );
  const values = history.map((c) => c.value),
    median = quantile(values, 0.5),
    mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
  );
  const percentile =
    (values.filter((v) => v <= c.value).length / values.length) * 100;
  return {
    count: c.value,
    median,
    ratio: c.value / median,
    percentile,
    z: (c.value - mean) / sd,
    rank: 1 + values.filter((v) => v > c.value).length,
    n: values.length + 1,
    level:
      percentile > 97.5
        ? "Extreme"
        : percentile >= 90
          ? "High"
          : percentile >= 75
            ? "Above normal"
            : "Normal",
  };
}
export function points(region = "sri_lanka") {
  const r = REGIONS.find((r) => r.id === region) || REGIONS[0];
  return Array.from({ length: 95 }, (_, i) => {
    const u = (Math.sin(i * 78.233) * 43758.5453) % 1;
    const v = (Math.sin(i * 12.989) * 43758.5453) % 1;
    const lat = r.bbox[1] + Math.abs(u) * (r.bbox[3] - r.bbox[1]);
    const lon =
      r.center[0] + (Math.abs(v) - 0.5) * (r.bbox[2] - r.bbox[0]) * 0.6;
    return {
      id: `demo-${region}-${i}`,
      lat,
      lon,
      date: "2026-11-14",
      time: `${String(3 + (i % 17)).padStart(2, "0")}:42`,
      sensor: i % 4 === 0 ? "MODIS" : "VIIRS",
      satellite: i % 4 === 0 ? "Aqua" : i % 2 ? "NOAA-20" : "NOAA-21",
      frp: Math.round(2 + Math.abs(u) * 42),
      confidence: i % 4 === 0 ? "Possible fire" : "Likely fire",
      weight: i % 2 ? 1 : 0,
      evidence: "Synthetic example: vegetation; neighbouring detections",
      synthetic: true,
    };
  });
}
export const inBounds = (p, b) =>
  p.lon >= b[0] && p.lon <= b[2] && p.lat >= b[1] && p.lat <= b[3];
export function csv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const quote = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  return [
    keys.map(quote).join(","),
    ...rows.map((r) => keys.map((k) => quote(r[k])).join(",")),
  ].join("\n");
}
