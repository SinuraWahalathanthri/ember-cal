import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(mapWorkerUrl);
import "maplibre-gl/dist/maplibre-gl.css";
import {
  TerraDraw,
  TerraDrawRectangleMode,
  TerraDrawPolygonMode,
  TerraDrawCircleMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import {
  Plus,
  Minus,
  Maximize,
  MousePointer2,
  Square,
  Hexagon,
  Circle,
  Layers,
  Flame,
} from "lucide-react";
import { points } from "./analytics.mjs";
export default function Map({
  region,
  onArea,
  records,
  observed = false,
}: {
  region: any;
  onArea: (b: number[]) => void;
  records?: any[];
  observed?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    draw = useRef<TerraDraw | null>(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState("select"),
    [error, setError] = useState(false),
    [layers, setLayers] = useState(false),
    [sensor, setSensor] = useState("All sensors");
  const recordRef = useRef(records);
  recordRef.current = records;
  const callback = useRef(onArea);
  callback.current = onArea;
  useEffect(() => {
    if (!el.current) return;
    let active = true;
    setReady(false);
    const m = new maplibregl.Map({
      container: el.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: region.center,
      zoom: region.zoom,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.on("error", () => {
      if (active) setError(true);
    });
    m.on("load", () => {
      if (!active) return;
      setError(false);
      m.addSource("hotspots", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: (recordRef.current ?? points(region.id)).map((p: any) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lon, p.lat] },
            properties: p,
          })),
        } as any,
      });
      m.addLayer({
        id: "hotspots-glow",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": 8,
          "circle-color": "#e8743b",
          "circle-opacity": 0.12,
        },
      });
      m.addLayer({
        id: "hotspots",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-radius": 3.2,
          "circle-color": "#d76532",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1,
        },
      });
      m.on("click", "hotspots", (e) => {
        const p = e.features?.[0]?.properties;
        if (p) {
          const content = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = observed
            ? `Sensor confidence: ${p.sensor_confidence}`
            : p.confidence;
          content.append(title);
          for (const line of [
            observed
              ? `NASA FIRMS · ${p.sensor} · ${p.satellite}`
              : `Synthetic ${p.sensor} detection`,
            `${p.date} ${p.time}`,
            `FRP: ${p.frp} MW`,
            p.evidence,
          ]) {
            content.append(document.createElement("br"));
            content.append(document.createTextNode(line));
          }
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(content)
            .addTo(m);
        }
      });
      const d = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: m }),
        modes: [
          new TerraDrawSelectMode(),
          new TerraDrawRectangleMode(),
          new TerraDrawPolygonMode(),
          new TerraDrawCircleMode(),
        ],
      });
      d.start();
      d.setMode("select");
      setReady(true);
      draw.current = d;
      d.on("finish", () => {
        const f = d.getSnapshot().at(-1);
        if (!f || f.geometry.type !== "Polygon") return;
        const pts = f.geometry.coordinates[0];
        callback.current([
          Math.min(...pts.map((p) => p[0])),
          Math.min(...pts.map((p) => p[1])),
          Math.max(...pts.map((p) => p[0])),
          Math.max(...pts.map((p) => p[1])),
        ]);
        d.setMode("select");
        setTool("select");
      });
    });
    return () => {
      active = false;
      draw.current?.stop();
      draw.current = null;
      m.remove();
      map.current = null;
    };
  }, [region.id, observed]);
  useEffect(() => {
    const m = map.current;
    const update = () => {
      const src = m?.getSource("hotspots") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (src && records)
        src.setData({
          type: "FeatureCollection",
          features: records.map((p: any) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lon, p.lat] },
            properties: p,
          })),
        } as any);
    };
    if (m?.isStyleLoaded()) update();
    else m?.once("load", update);
    return () => {
      m?.off("load", update);
    };
  }, [records]);
  useEffect(() => {
    const m = map.current;
    if (m?.getLayer("hotspots")) {
      const f: any =
        sensor === "All sensors" ? null : ["==", ["get", "sensor"], sensor];
      m.setFilter("hotspots", f);
      m.setFilter("hotspots-glow", f);
    }
  }, [sensor]);
  function select(t: string) {
    draw.current?.setMode(t);
    setTool(t);
  }
  return (
    <div className="map-wrap">
      <div ref={el} className="map-canvas" />
      <div className="map-top">
        <span className="map-label">
          <span className="live-dot" /> Satellite detections{" "}
          <span className="mini-badge">{observed ? "FIRMS NRT" : "DEMO"}</span>
        </span>
        <button
          className="icon-button"
          title="Map layers"
          onClick={() => setLayers(!layers)}
        >
          <Layers size={17} />
        </button>
      </div>
      <div className="map-tools">
        {[
          ["select", MousePointer2, "Pan map"],
          ["rectangle", Square, "Draw rectangle"],
          ["polygon", Hexagon, "Draw polygon"],
          ["circle", Circle, "Draw circle"],
        ].map(([id, I, label]: any) => (
          <button
            key={id}
            title={ready ? label : "Map is loading"}
            disabled={!ready}
            aria-label={label}
            className={tool === id ? "selected" : ""}
            onClick={() => select(id)}
          >
            <I size={17} />
          </button>
        ))}
      </div>
      <div className="map-zoom">
        <button aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={17} />
        </button>
        <button aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus size={17} />
        </button>
        <button
          aria-label="Reset map"
          onClick={() =>
            map.current?.flyTo({ center: region.center, zoom: region.zoom })
          }
        >
          <Maximize size={16} />
        </button>
      </div>
      {layers && (
        <div className="map-layers">
          <strong>Detection layers</strong>
          <select
            aria-label="Satellite filter"
            value={sensor}
            onChange={(e) => setSensor(e.target.value)}
          >
            <option>All sensors</option>
            <option>VIIRS</option>
            <option>MODIS</option>
          </select>
          <small>
            {observed
              ? "Observed detections · Five-day request"
              : "Synthetic points · November 2026"}
          </small>
        </div>
      )}
      {error && (
        <div className="map-error">
          Basemap unavailable. Area forms and analytics remain available.
        </div>
      )}
      <div className="map-bottom">
        <span>
          <Flame size={12} />{" "}
          {observed ? "Observed detections" : "Synthetic hotspots"}
        </span>
        <span>Draw an area to explore →</span>
      </div>
    </div>
  );
}
