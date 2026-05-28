"use client";

/**
 * VisualizationBuilder — Enhanced
 * - Zoom & pan via d3-zoom on all cartesian charts
 * - Rich hover tooltips showing full row data
 * - Data validation with inline warnings
 * - Sharper visual design: tighter grid, crisp typography, glassy panels
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { useDatasets } from "@/lib/hooks/useDatasets";
import { queryDatasetAction } from "@/lib/actions/dataset.actions";
import type { Dataset, ColumnSchema } from "@/lib/api/datasets";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType =
  | "bar" | "grouped_bar" | "stacked_bar"
  | "line" | "area"
  | "scatter"
  | "pie" | "donut"
  | "histogram";

interface ChartConfig {
  datasetId: string;
  chartType: ChartType;
  xCol: string;
  yCol: string;
  groupCol: string;
  bins: number;
  colorScheme: string;
  title: string;
  showGrid: boolean;
  showLegend: boolean;
  showLabels: boolean;
  limit: number;
}

type QueryRow = Record<string, unknown>;

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  rows: { label: string; value: string }[];
  title: string;
}

interface ValidationIssue {
  level: "error" | "warning" | "info";
  message: string;
}

// ─── Chart metadata ───────────────────────────────────────────────────────────

const CHART_TYPES: { id: ChartType; label: string; icon: string; desc: string }[] = [
  { id: "bar", label: "Bar", icon: "▬", desc: "Compare categories" },
  { id: "grouped_bar", label: "Grouped Bar", icon: "⊟", desc: "Multi-series bars" },
  { id: "stacked_bar", label: "Stacked Bar", icon: "⊞", desc: "Part-of-whole bars" },
  { id: "line", label: "Line", icon: "∿", desc: "Trends over time" },
  { id: "area", label: "Area", icon: "◺", desc: "Volume over time" },
  { id: "scatter", label: "Scatter", icon: "⠿", desc: "Correlations" },
  { id: "pie", label: "Pie", icon: "◔", desc: "Proportions" },
  { id: "donut", label: "Donut", icon: "◎", desc: "Proportions + center" },
  { id: "histogram", label: "Histogram", icon: "▋", desc: "Distributions" },
];

const COLOR_SCHEMES: { id: string; label: string; colors: string[] }[] = [
  { id: "blue", label: "Ocean", colors: ["hsl(220,70%,55%)", "hsl(200,70%,55%)", "hsl(240,70%,65%)", "hsl(190,65%,55%)"] },
  { id: "green", label: "Forest", colors: ["hsl(152,60%,48%)", "hsl(170,55%,45%)", "hsl(130,55%,48%)", "hsl(160,50%,55%)"] },
  { id: "amber", label: "Amber", colors: ["hsl(35,92%,58%)", "hsl(20,85%,58%)", "hsl(50,85%,55%)", "hsl(15,80%,60%)"] },
  { id: "violet", label: "Violet", colors: ["hsl(262,75%,65%)", "hsl(240,70%,65%)", "hsl(280,70%,65%)", "hsl(220,75%,65%)"] },
  { id: "rose", label: "Rose", colors: ["hsl(340,75%,60%)", "hsl(320,70%,60%)", "hsl(355,80%,65%)", "hsl(310,65%,60%)"] },
  { id: "mixed", label: "Spectrum", colors: ["hsl(220,70%,55%)", "hsl(152,60%,48%)", "hsl(35,92%,58%)", "hsl(262,75%,65%)", "hsl(340,75%,60%)", "hsl(198,75%,55%)"] },
];

const DEFAULT_CONFIG: ChartConfig = {
  datasetId: "",
  chartType: "bar",
  xCol: "",
  yCol: "",
  groupCol: "",
  bins: 20,
  colorScheme: "blue",
  title: "",
  showGrid: true,
  showLegend: true,
  showLabels: false,
  limit: 200,
};

const CONFIG_STORAGE_KEY = "visualization-builder-config";
const CHART_TYPE_IDS = new Set<ChartType>(CHART_TYPES.map((chart) => chart.id));
let cachedConfig: ChartConfig = DEFAULT_CONFIG;

function isChartType(value: unknown): value is ChartType {
  return typeof value === "string" && CHART_TYPE_IDS.has(value as ChartType);
}

function normalizeConfig(value: unknown): ChartConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const config = value as Partial<ChartConfig>;

  return {
    datasetId: typeof config.datasetId === "string" ? config.datasetId : DEFAULT_CONFIG.datasetId,
    chartType: isChartType(config.chartType) ? config.chartType : DEFAULT_CONFIG.chartType,
    xCol: typeof config.xCol === "string" ? config.xCol : DEFAULT_CONFIG.xCol,
    yCol: typeof config.yCol === "string" ? config.yCol : DEFAULT_CONFIG.yCol,
    groupCol: typeof config.groupCol === "string" ? config.groupCol : DEFAULT_CONFIG.groupCol,
    bins: typeof config.bins === "number" ? config.bins : DEFAULT_CONFIG.bins,
    colorScheme: typeof config.colorScheme === "string" ? config.colorScheme : DEFAULT_CONFIG.colorScheme,
    title: typeof config.title === "string" ? config.title : DEFAULT_CONFIG.title,
    showGrid: typeof config.showGrid === "boolean" ? config.showGrid : DEFAULT_CONFIG.showGrid,
    showLegend: typeof config.showLegend === "boolean" ? config.showLegend : DEFAULT_CONFIG.showLegend,
    showLabels: typeof config.showLabels === "boolean" ? config.showLabels : DEFAULT_CONFIG.showLabels,
    limit: typeof config.limit === "number" ? config.limit : DEFAULT_CONFIG.limit,
  };
}

function getInitialConfig(): ChartConfig {
  if (typeof window === "undefined") return cachedConfig;

  try {
    const stored = window.sessionStorage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) return cachedConfig;
    cachedConfig = normalizeConfig(JSON.parse(stored));
    return cachedConfig;
  } catch {
    return cachedConfig;
  }
}

function cloneConfig(config: ChartConfig): ChartConfig {
  return { ...config };
}

function getRenderedConfig(draft: ChartConfig, applied: ChartConfig | null): ChartConfig {
  if (!applied) return draft;

  return {
    ...applied,
    title: draft.title,
    bins: draft.bins,
    colorScheme: draft.colorScheme,
    showGrid: draft.showGrid,
    showLegend: draft.showLegend,
    showLabels: draft.showLabels,
  };
}

function requiresQueryUpdate(a: ChartConfig | null, b: ChartConfig | null): boolean {
  if (a === b) return false;
  if (!a || !b) return false;

  return !(
    a.datasetId === b.datasetId &&
    a.chartType === b.chartType &&
    a.xCol === b.xCol &&
    a.yCol === b.yCol &&
    a.groupCol === b.groupCol &&
    a.limit === b.limit
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateConfig(
  config: ChartConfig,
  schema: ColumnSchema[] | null,
  data: QueryRow[] | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!schema || !config.datasetId) return issues;

  const colMap = Object.fromEntries(schema.map((c) => [c.name, c]));
  const { chartType, xCol, yCol, groupCol } = config;

  // X col checks
  if (xCol && colMap[xCol]) {
    const dtype = colMap[xCol].dtype;
    if (["bar", "grouped_bar", "stacked_bar", "pie", "donut"].includes(chartType) && dtype !== "string" && dtype !== "boolean") {
      issues.push({ level: "warning", message: `X axis "${xCol}" is ${dtype} — categorical column preferred for ${chartType}` });
    }
    if (["line", "area"].includes(chartType) && dtype !== "datetime" && dtype !== "string") {
      issues.push({ level: "info", message: `X axis "${xCol}" is ${dtype} — datetime or string recommended for time series` });
    }
    if (["scatter", "histogram"].includes(chartType) && dtype !== "integer" && dtype !== "float") {
      issues.push({ level: "error", message: `X axis "${xCol}" must be numeric for ${chartType}` });
    }
  }

  // Y col checks
  if (yCol && colMap[yCol]) {
    const dtype = colMap[yCol].dtype;
    if (dtype !== "integer" && dtype !== "float") {
      issues.push({ level: "error", message: `Y axis "${yCol}" is "${dtype}" — must be numeric` });
    }
  }

  // Group col checks
  if (groupCol && colMap[groupCol]) {
    const dtype = colMap[groupCol].dtype;
    if (dtype === "float" || dtype === "integer") {
      issues.push({ level: "warning", message: `Group column "${groupCol}" is numeric — high cardinality may produce many series` });
    }
  }

  // Data quality checks
  if (data && data.length > 0) {
    if (yCol) {
      const nullCount = data.filter((r) => r[yCol] == null || isNaN(Number(r[yCol]))).length;
      const pct = Math.round((nullCount / data.length) * 100);
      if (pct > 0 && pct <= 20) issues.push({ level: "info", message: `${nullCount} null/NaN values in "${yCol}" (${pct}% of rows) — excluded from chart` });
      if (pct > 20) issues.push({ level: "warning", message: `${pct}% null/NaN in "${yCol}" — data may be unreliable` });
    }

    if (xCol) {
      const uniq = new Set(data.map((r) => String(r[xCol]))).size;
      if (["bar", "pie", "donut"].includes(chartType) && uniq > 50) {
        issues.push({ level: "warning", message: `${uniq} unique X values — chart may be crowded. Consider filtering or grouping` });
      }
    }

    if (["grouped_bar", "stacked_bar"].includes(chartType) && groupCol) {
      const groups = new Set(data.map((r) => String(r[groupCol]))).size;
      if (groups > 8) issues.push({ level: "warning", message: `${groups} groups detected — consider limiting to ≤8 for readability` });
    }

    if (data.length === config.limit) {
      issues.push({ level: "info", message: `Showing max ${config.limit} rows — increase row limit for full dataset` });
    }
  }

  return issues;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getColors(schemeId: string, n = 8): string[] {
  const scheme = COLOR_SCHEMES.find((s) => s.id === schemeId) ?? COLOR_SCHEMES[0];
  const base = scheme.colors;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}

function fmtVal(v: unknown): string {
  if (v == null) return "—";
  const n = Number(v);
  if (!isNaN(n)) {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(3);
  }
  return String(v);
}

function autoPopulate(dataset: Dataset, chartType: ChartType): Partial<ChartConfig> {
  const schema = dataset.schema ?? [];
  const numCols = schema.filter((c) => c.dtype === "integer" || c.dtype === "float").map((c) => c.name);
  const catCols = schema.filter((c) => c.dtype === "string" || c.dtype === "boolean").map((c) => c.name);
  const dateCols = schema.filter((c) => c.dtype === "datetime").map((c) => c.name);
  const xGuess = dateCols[0] ?? catCols[0] ?? numCols[0] ?? "";

  switch (chartType) {
    case "bar": case "grouped_bar": case "stacked_bar":
      return { xCol: catCols[0] ?? xGuess, yCol: numCols[0] ?? "", groupCol: catCols[1] ?? "" };
    case "line": case "area":
      return { xCol: dateCols[0] ?? catCols[0] ?? xGuess, yCol: numCols[0] ?? "", groupCol: "" };
    case "scatter":
      return { xCol: numCols[0] ?? xGuess, yCol: numCols[1] ?? numCols[0] ?? "", groupCol: catCols[0] ?? "" };
    case "pie": case "donut":
      return { xCol: catCols[0] ?? xGuess, yCol: numCols[0] ?? "", groupCol: "" };
    case "histogram":
      return { xCol: numCols[0] ?? xGuess, yCol: "", groupCol: "" };
    default:
      return { xCol: xGuess, yCol: numCols[0] ?? "" };
  }
}

function buildQuery(config: ChartConfig): string {
  const { chartType, xCol, yCol, groupCol, limit } = config;
  if (!xCol) return "";

  const isAgeCol = (col: string) => /age/i.test(col);
  const aggFor = (col: string) => isAgeCol(col) ? "AVG" : "SUM";

  const ageGroupExpr = (col: string) =>
    `CONCAT(CAST(FLOOR(CAST("${col}" AS FLOAT) / 10) * 10 AS INT), '-', CAST(FLOOR(CAST("${col}" AS FLOAT) / 10) * 10 + 9 AS INT))`;

  const xExpr = isAgeCol(xCol) ? ageGroupExpr(xCol) : `"${xCol}"`;
  const xSelect = isAgeCol(xCol) ? `${ageGroupExpr(xCol)} AS "${xCol}"` : `"${xCol}"`;
  const xOrder = isAgeCol(xCol)
    ? `FLOOR(CAST("${xCol}" AS FLOAT) / 10) * 10`
    : `"${xCol}"`;

  switch (chartType) {
    case "bar":
      if (!yCol) return "";
      if (isAgeCol(xCol)) {
        return `SELECT ${xSelect}, ${aggFor(yCol)}("${yCol}") as "${yCol}" FROM tbl GROUP BY ${xExpr} ORDER BY ${xOrder} LIMIT ${limit}`;
      }
      return `SELECT "${xCol}", ${aggFor(yCol)}("${yCol}") as "${yCol}" FROM tbl GROUP BY "${xCol}" ORDER BY ${aggFor(yCol)}("${yCol}") DESC LIMIT ${limit}`;

    case "grouped_bar":
    case "stacked_bar":
      if (!yCol || !groupCol) return "";
      if (isAgeCol(xCol)) {
        return `SELECT ${xSelect}, "${groupCol}", ${aggFor(yCol)}("${yCol}") as "${yCol}" FROM tbl GROUP BY ${xExpr}, "${groupCol}" ORDER BY ${xOrder} LIMIT ${limit}`;
      }
      return `SELECT "${xCol}", "${groupCol}", ${aggFor(yCol)}("${yCol}") as "${yCol}" FROM tbl GROUP BY "${xCol}", "${groupCol}" ORDER BY "${xCol}" LIMIT ${limit}`;

    case "line":
    case "area":
      if (!yCol) return "";
      if (isAgeCol(xCol)) {
        return groupCol
          ? `SELECT ${xSelect}, "${groupCol}", AVG("${yCol}") as "${yCol}" FROM tbl GROUP BY ${xExpr}, "${groupCol}" ORDER BY ${xOrder} LIMIT ${limit}`
          : `SELECT ${xSelect}, AVG("${yCol}") as "${yCol}" FROM tbl GROUP BY ${xExpr} ORDER BY ${xOrder} LIMIT ${limit}`;
      }
      return groupCol
        ? `SELECT "${xCol}", "${groupCol}", AVG("${yCol}") as "${yCol}" FROM tbl GROUP BY "${xCol}", "${groupCol}" ORDER BY "${xCol}" LIMIT ${limit}`
        : `SELECT "${xCol}", AVG("${yCol}") as "${yCol}" FROM tbl GROUP BY "${xCol}" ORDER BY "${xCol}" LIMIT ${limit}`;

    case "scatter":
      if (!yCol) return "";
      if (isAgeCol(yCol)) {
        const ySelect = `${ageGroupExpr(yCol)} AS "${yCol}"`;
        return groupCol
          ? `SELECT "${xCol}", ${ySelect}, "${groupCol}" FROM tbl WHERE "${xCol}" IS NOT NULL AND "${yCol}" IS NOT NULL LIMIT ${limit}`
          : `SELECT "${xCol}", ${ySelect} FROM tbl WHERE "${xCol}" IS NOT NULL AND "${yCol}" IS NOT NULL LIMIT ${limit}`;
      }
      return groupCol
        ? `SELECT "${xCol}", "${yCol}", "${groupCol}" FROM tbl WHERE "${xCol}" IS NOT NULL AND "${yCol}" IS NOT NULL LIMIT ${limit}`
        : `SELECT "${xCol}", "${yCol}" FROM tbl WHERE "${xCol}" IS NOT NULL AND "${yCol}" IS NOT NULL LIMIT ${limit}`;

    case "pie":
    case "donut":
      if (!yCol) return "";
      if (isAgeCol(xCol)) {
        return `SELECT ${xSelect}, ${aggFor(yCol)}("${yCol}") as "${yCol}" FROM tbl GROUP BY ${xExpr} ORDER BY ${xOrder} LIMIT 12`;
      }
      return `SELECT "${xCol}", ${aggFor(yCol)}("${yCol}") as "${yCol}" FROM tbl GROUP BY "${xCol}" ORDER BY ${aggFor(yCol)}("${yCol}") DESC LIMIT 12`;

    case "histogram":
      return `SELECT "${xCol}" FROM tbl WHERE "${xCol}" IS NOT NULL LIMIT ${limit}`;

    default:
      return "";
  }
}
// ─── D3 renderers (zoom + tooltip) ────────────────────────────────────────────

const M = { top: 20, right: 20, bottom: 56, left: 60 };

type ShowTip = (e: MouseEvent, rows: { label: string; value: string }[], title: string) => void;
type HideTip = () => void;

function applyZoom(svg: SVGSVGElement, g: d3.Selection<SVGGElement, unknown, null, undefined>, w: number, h: number) {
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 20])
    .extent([[0, 0], [w, h]])
    .on("zoom", (event) => {
      g.attr("transform", event.transform.toString());
    });
  d3.select(svg).call(zoom);
  // Reset on dbl-click
  d3.select(svg).on("dblclick.zoom", () => {
    d3.select(svg).transition().duration(400).call(zoom.transform, d3.zoomIdentity);
  });
}

function renderBarChart(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip) {
  const { xCol, yCol, showGrid, showLabels, colorScheme } = cfg;
  const colors = getColors(colorScheme);
  const d3svg = d3.select(svg);
  d3svg.selectAll("*").remove();

  const iw = w - M.left - M.right;
  const ih = h - M.top - M.bottom;

  // Clip path
  const clipId = `clip-bar-${Date.now()}`;
  d3svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", iw).attr("height", ih + 4).attr("y", -4);

  const root = d3svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const chartG = root.append("g").attr("clip-path", `url(#${clipId})`);

  const xVals = data.map((d) => String(d[xCol]));
  const yVals = data.map((d) => Number(d[yCol]) || 0);
  const x = d3.scaleBand().domain(xVals).range([0, iw]).padding(0.28);
  const y = d3.scaleLinear().domain([0, (d3.max(yVals) ?? 1) * 1.06]).nice().range([ih, 0]);

  if (showGrid) {
    chartG.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-iw).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "hsl(220,13%,19%)").attr("stroke-dasharray", "2,4"));
  }

  chartG.selectAll(".bar")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(String(d[xCol]))!)
    .attr("y", (d) => y(Number(d[yCol]) || 0))
    .attr("width", x.bandwidth())
    .attr("height", (d) => ih - y(Number(d[yCol]) || 0))
    .attr("rx", 3)
    .attr("fill", colors[0])
    .attr("opacity", 0.88)
    .attr("cursor", "crosshair")
    .on("mouseenter", function (event: MouseEvent, d: QueryRow) {
      d3.select(this).attr("opacity", 1).attr("filter", "brightness(1.25)");
      showTip(event, [
        { label: xCol, value: String(d[xCol]) },
        { label: yCol, value: fmtVal(d[yCol]) },
      ], "Bar");
    })
    .on("mousemove", function (event: MouseEvent, d: QueryRow) {
      showTip(event, [
        { label: xCol, value: String(d[xCol]) },
        { label: yCol, value: fmtVal(d[yCol]) },
      ], "Bar");
    })
    .on("mouseleave", function () {
      d3.select(this).attr("opacity", 0.88).attr("filter", null);
      hideTip();
    });

  if (showLabels) {
    chartG.selectAll(".lbl")
      .data(data)
      .join("text")
      .attr("x", (d) => x(String(d[xCol]))! + x.bandwidth() / 2)
      .attr("y", (d) => y(Number(d[yCol]) || 0) - 5)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "hsl(220,13%,60%)")
      .text((d) => fmtVal(d[yCol]));
  }

  root.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(3))
    .call(g => g.select(".domain").attr("stroke", "hsl(220,13%,24%)"))
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5).attr("dy", "1.3em")
      .each(function () {
        const el = d3.select(this); const t = el.text();
        if (t.length > 11) el.text(t.slice(0, 10) + "…");
      }));

  root.append("g")
    .call(d3.axisLeft(y).ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));

  applyZoom(svg, chartG, iw, ih);
}

function renderLineChart(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip, isArea = false) {
  const { xCol, yCol, groupCol, showGrid, showLegend, colorScheme } = cfg;
  const colors = getColors(colorScheme, 8);
  const d3svg = d3.select(svg);
  d3svg.selectAll("*").remove();

  const iw = w - M.left - M.right;
  const ih = h - M.top - M.bottom;
  const clipId = `clip-line-${Date.now()}`;
  d3svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", iw).attr("height", ih + 8).attr("y", -4);

  const root = d3svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const chartG = root.append("g").attr("clip-path", `url(#${clipId})`);

  const hasGroup = groupCol && data.some((d) => d[groupCol] !== undefined);
  const groups = hasGroup ? [...new Set(data.map((d) => String(d[groupCol])))] : ["_"];
  const grouped = hasGroup ? d3.group(data, (d) => String(d[groupCol])) : new Map([["_", data]]);

  const xVals = [...new Set(data.map((d) => String(d[xCol])))].sort();
  const maxY = d3.max(data, (d) => Number(d[yCol])) ?? 1;
  const x = d3.scalePoint().domain(xVals).range([0, iw]);
  const y = d3.scaleLinear().domain([0, maxY * 1.06]).nice().range([ih, 0]);

  if (showGrid) {
    chartG.append("g")
      .call(d3.axisLeft(y).tickSize(-iw).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "hsl(220,13%,19%)").attr("stroke-dasharray", "2,4"));
  }

  groups.forEach((grp, gi) => {
    const grpData = (grouped.get(grp) ?? []).sort((a, b) => String(a[xCol]).localeCompare(String(b[xCol])));
    const color = colors[gi % colors.length];

    if (isArea) {
      const area = d3.area<QueryRow>().x((d) => x(String(d[xCol]))!).y0(ih).y1((d) => y(Number(d[yCol]) || 0)).curve(d3.curveMonotoneX);
      chartG.append("path").datum(grpData).attr("fill", color).attr("opacity", 0.12).attr("d", area);
    }

    chartG.append("path").datum(grpData)
      .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
      .attr("d", d3.line<QueryRow>().x((d) => x(String(d[xCol]))!).y((d) => y(Number(d[yCol]) || 0)).curve(d3.curveMonotoneX));

    chartG.selectAll(`.dot-${gi}`).data(grpData).join("circle")
      .attr("cx", (d) => x(String(d[xCol]))!).attr("cy", (d) => y(Number(d[yCol]) || 0))
      .attr("r", 3.5).attr("fill", color).attr("stroke", "hsl(220,13%,10%)").attr("stroke-width", 1.5)
      .attr("cursor", "crosshair")
      .on("mouseenter", function (event: MouseEvent, d: QueryRow) {
        d3.select(this).attr("r", 6);
        showTip(event, [
          { label: xCol, value: String(d[xCol]) },
          { label: yCol, value: fmtVal(d[yCol]) },
          ...(hasGroup ? [{ label: groupCol!, value: String(d[groupCol!]) }] : []),
        ], "Point");
      })
      .on("mousemove", function (event: MouseEvent, d: QueryRow) {
        showTip(event, [
          { label: xCol, value: String(d[xCol]) },
          { label: yCol, value: fmtVal(d[yCol]) },
          ...(hasGroup ? [{ label: groupCol!, value: String(d[groupCol!]) }] : []),
        ], "Point");
      })
      .on("mouseleave", function () { d3.select(this).attr("r", 3.5); hideTip(); });
  });

  root.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(3).tickValues(xVals.filter((_, i) => i % Math.ceil(xVals.length / 8) === 0)))
    .call(g => g.select(".domain").attr("stroke", "hsl(220,13%,24%)"))
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5).attr("dy", "1.3em"));

  root.append("g")
    .call(d3.axisLeft(y).ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));

  if (showLegend && hasGroup) {
    const leg = d3svg.append("g").attr("transform", `translate(${M.left},${h - 14})`);
    groups.slice(0, 6).forEach((grp, i) => {
      leg.append("line").attr("x1", i * 110).attr("x2", i * 110 + 14).attr("y1", 5).attr("y2", 5)
        .attr("stroke", colors[i]).attr("stroke-width", 2);
      leg.append("text").attr("x", i * 110 + 18).attr("y", 9).attr("font-size", 10).attr("fill", "hsl(220,13%,52%)").text(grp.slice(0, 12));
    });
  }

  applyZoom(svg, chartG, iw, ih);
}

function renderScatterChart(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip) {
  const { xCol, yCol, groupCol, showGrid, showLegend, colorScheme } = cfg;
  const colors = getColors(colorScheme, 8);
  const d3svg = d3.select(svg);
  d3svg.selectAll("*").remove();

  const iw = w - M.left - M.right;
  const ih = h - M.top - M.bottom;
  const clipId = `clip-scatter-${Date.now()}`;
  d3svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", iw).attr("height", ih);

  const root = d3svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const chartG = root.append("g").attr("clip-path", `url(#${clipId})`);

  const hasGroup = groupCol && data.some((d) => d[groupCol] !== undefined);
  const groups = hasGroup ? [...new Set(data.map((d) => String(d[groupCol])))] : [];

  const xExt = d3.extent(data, (d) => Number(d[xCol])) as [number, number];
  const yExt = d3.extent(data, (d) => Number(d[yCol])) as [number, number];
  const x = d3.scaleLinear().domain(xExt).nice().range([0, iw]);
  const y = d3.scaleLinear().domain(yExt).nice().range([ih, 0]);

  if (showGrid) {
    chartG.append("g").call(d3.axisLeft(y).tickSize(-iw).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "hsl(220,13%,19%)").attr("stroke-dasharray", "2,4"));
    chartG.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(-ih).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "hsl(220,13%,19%)").attr("stroke-dasharray", "2,4"));
  }

  chartG.selectAll("circle").data(data).join("circle")
    .attr("cx", (d) => x(Number(d[xCol]))).attr("cy", (d) => y(Number(d[yCol])))
    .attr("r", 5).attr("fill", (d) => hasGroup ? colors[groups.indexOf(String(d[groupCol!])) % colors.length] : colors[0])
    .attr("opacity", 0.72).attr("stroke", "hsl(220,13%,10%)").attr("stroke-width", 0.5).attr("cursor", "crosshair")
    .on("mouseenter", function (event: MouseEvent, d: QueryRow) {
      d3.select(this).attr("r", 8).attr("opacity", 1);
      const rows: { label: string; value: string }[] = [
        { label: xCol, value: fmtVal(d[xCol]) },
        { label: yCol, value: fmtVal(d[yCol]) },
        ...(hasGroup ? [{ label: groupCol!, value: String(d[groupCol!]) }] : []),
      ];
      Object.keys(d).filter(k => k !== xCol && k !== yCol && k !== groupCol).slice(0, 3).forEach(k => rows.push({ label: k, value: fmtVal(d[k]) }));
      showTip(event, rows, "Point");
    })
    .on("mousemove", function (event: MouseEvent, d: QueryRow) {
      showTip(event, [
        { label: xCol, value: fmtVal(d[xCol]) },
        { label: yCol, value: fmtVal(d[yCol]) },
        ...(hasGroup ? [{ label: groupCol!, value: String(d[groupCol!]) }] : []),
      ], "Point");
    })
    .on("mouseleave", function () { d3.select(this).attr("r", 5).attr("opacity", 0.72); hideTip(); });

  root.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(6))
    .call(g => g.select(".domain").attr("stroke", "hsl(220,13%,24%)"))
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));
  root.append("g").call(d3.axisLeft(y).ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));

  if (showLegend && hasGroup) {
    const leg = d3svg.append("g").attr("transform", `translate(${M.left},${h - 14})`);
    groups.slice(0, 6).forEach((grp, i) => {
      leg.append("circle").attr("cx", i * 110 + 5).attr("cy", 5).attr("r", 4.5).attr("fill", colors[i]);
      leg.append("text").attr("x", i * 110 + 14).attr("y", 9).attr("font-size", 10).attr("fill", "hsl(220,13%,52%)").text(grp.slice(0, 12));
    });
  }

  applyZoom(svg, chartG, iw, ih);
}

function renderGroupedBarChart(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip) {
  const { xCol, yCol, groupCol, showGrid, showLegend, colorScheme } = cfg;
  const colors = getColors(colorScheme, 8);
  const d3svg = d3.select(svg);
  d3svg.selectAll("*").remove();

  const iw = w - M.left - M.right;
  const ih = h - M.top - M.bottom;
  const clipId = `clip-gbar-${Date.now()}`;
  d3svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", iw).attr("height", ih + 4).attr("y", -4);

  const root = d3svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const chartG = root.append("g").attr("clip-path", `url(#${clipId})`);

  const xVals = [...new Set(data.map((d) => String(d[xCol])))];
  const groups = [...new Set(data.map((d) => String(d[groupCol])))];
  const grouped = d3.group(data, (d) => String(d[xCol]));
  const maxY = d3.max(data, (d) => Number(d[yCol])) ?? 1;

  const x0 = d3.scaleBand().domain(xVals).range([0, iw]).paddingInner(0.22);
  const x1 = d3.scaleBand().domain(groups).range([0, x0.bandwidth()]).padding(0.06);
  const y = d3.scaleLinear().domain([0, maxY * 1.06]).nice().range([ih, 0]);

  if (showGrid) {
    chartG.append("g").call(d3.axisLeft(y).tickSize(-iw).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "hsl(220,13%,19%)").attr("stroke-dasharray", "2,4"));
  }

  xVals.forEach((xv) => {
    const grpData = grouped.get(xv) ?? [];
    const grpG = chartG.append("g").attr("transform", `translate(${x0(xv)},0)`);
    grpG.selectAll("rect").data(grpData).join("rect")
      .attr("x", (d) => x1(String(d[groupCol]))!).attr("y", (d) => y(Number(d[yCol]) || 0))
      .attr("width", x1.bandwidth()).attr("height", (d) => ih - y(Number(d[yCol]) || 0))
      .attr("rx", 2).attr("fill", (d) => colors[groups.indexOf(String(d[groupCol])) % colors.length])
      .attr("opacity", 0.88).attr("cursor", "crosshair")
      .on("mouseenter", function (event: MouseEvent, d: QueryRow) {
        d3.select(this).attr("opacity", 1).attr("filter", "brightness(1.2)");
        showTip(event, [
          { label: xCol, value: String(d[xCol]) },
          { label: groupCol, value: String(d[groupCol]) },
          { label: yCol, value: fmtVal(d[yCol]) },
        ], "Grouped Bar");
      })
      .on("mousemove", function (event: MouseEvent, d: QueryRow) {
        showTip(event, [
          { label: xCol, value: String(d[xCol]) },
          { label: groupCol, value: String(d[groupCol]) },
          { label: yCol, value: fmtVal(d[yCol]) },
        ], "Grouped Bar");
      })
      .on("mouseleave", function () { d3.select(this).attr("opacity", 0.88).attr("filter", null); hideTip(); });
  });

  root.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x0).tickSize(3))
    .call(g => g.select(".domain").attr("stroke", "hsl(220,13%,24%)"))
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5).attr("dy", "1.3em"));
  root.append("g").call(d3.axisLeft(y).ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));

  if (showLegend) {
    const leg = d3svg.append("g").attr("transform", `translate(${M.left},${h - 14})`);
    groups.slice(0, 8).forEach((grp, i) => {
      leg.append("rect").attr("x", i * 100).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colors[i]);
      leg.append("text").attr("x", i * 100 + 14).attr("y", 9).attr("font-size", 10).attr("fill", "hsl(220,13%,52%)").text(grp.slice(0, 10));
    });
  }

  applyZoom(svg, chartG, iw, ih);
}

function renderStackedBarChart(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip) {
  const { xCol, yCol, groupCol, showGrid, showLegend, colorScheme } = cfg;
  const colors = getColors(colorScheme, 8);
  const d3svg = d3.select(svg);
  d3svg.selectAll("*").remove();

  const iw = w - M.left - M.right;
  const ih = h - M.top - M.bottom;
  const clipId = `clip-sbar-${Date.now()}`;
  d3svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", iw).attr("height", ih + 4).attr("y", -4);

  const root = d3svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const chartG = root.append("g").attr("clip-path", `url(#${clipId})`);

  const xVals = [...new Set(data.map((d) => String(d[xCol])))];
  const groups = [...new Set(data.map((d) => String(d[groupCol])))];
  const pivoted: Record<string, Record<string, number>> = {};
  xVals.forEach((xv) => { pivoted[xv] = {}; });
  data.forEach((row) => {
    const xv = String(row[xCol]); const gv = String(row[groupCol]);
    pivoted[xv][gv] = (pivoted[xv][gv] ?? 0) + (Number(row[yCol]) || 0);
  });
  const stackInput = xVals.map((xv) => ({ x: xv, ...pivoted[xv] }));
  const stacked = d3.stack<Record<string, unknown>>().keys(groups)(stackInput as any);
  const maxY = d3.max(stacked[stacked.length - 1], (d) => d[1]) ?? 1;
  const x = d3.scaleBand().domain(xVals).range([0, iw]).padding(0.24);
  const y = d3.scaleLinear().domain([0, maxY * 1.04]).nice().range([ih, 0]);

  if (showGrid) {
    chartG.append("g").call(d3.axisLeft(y).tickSize(-iw).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "hsl(220,13%,19%)").attr("stroke-dasharray", "2,4"));
  }

  stacked.forEach((layer, i) => {
    chartG.selectAll(`.layer-${i}`).data(layer).join("rect")
      .attr("x", (d) => x((d.data as any).x)!).attr("y", (d) => y(d[1]))
      .attr("height", (d) => y(d[0]) - y(d[1])).attr("width", x.bandwidth())
      .attr("fill", colors[i % colors.length]).attr("opacity", 0.88).attr("cursor", "crosshair")
      .on("mouseenter", function (event: MouseEvent, d: any) {
        d3.select(this).attr("opacity", 1).attr("filter", "brightness(1.2)");
        const seg = d[1] - d[0];
        showTip(event, [
          { label: xCol, value: String((d.data as any).x) },
          { label: groupCol, value: groups[i] },
          { label: yCol, value: fmtVal(seg) },
        ], "Stacked Bar");
      })
      .on("mousemove", function (event: MouseEvent, d: any) {
        const seg = d[1] - d[0];
        showTip(event, [
          { label: xCol, value: String((d.data as any).x) },
          { label: groupCol, value: groups[i] },
          { label: yCol, value: fmtVal(seg) },
        ], "Stacked Bar");
      })
      .on("mouseleave", function () { d3.select(this).attr("opacity", 0.88).attr("filter", null); hideTip(); });
  });

  root.append("g").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(3))
    .call(g => g.select(".domain").attr("stroke", "hsl(220,13%,24%)"))
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5).attr("dy", "1.3em"));
  root.append("g").call(d3.axisLeft(y).ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));

  if (showLegend) {
    const leg = d3svg.append("g").attr("transform", `translate(${M.left},${h - 14})`);
    groups.slice(0, 8).forEach((grp, i) => {
      leg.append("rect").attr("x", i * 100).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colors[i]);
      leg.append("text").attr("x", i * 100 + 14).attr("y", 9).attr("font-size", 10).attr("fill", "hsl(220,13%,52%)").text(grp.slice(0, 10));
    });
  }

  applyZoom(svg, chartG, iw, ih);
}

function renderPieChart(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip, isDonut = false) {
  const { xCol, yCol, showLegend, colorScheme } = cfg;
  const colors = getColors(colorScheme, 12);
  const d3svg = d3.select(svg);
  d3svg.selectAll("*").remove();

  const cx = w / 2; const cy = h / 2 - 8;
  const outerR = Math.min(cx, cy) - 28;
  const innerR = isDonut ? outerR * 0.52 : 0;
  const total = d3.sum(data, (d) => Number(d[yCol]) || 0);

  const pie = d3.pie<QueryRow>().value((d) => Number(d[yCol]) || 0).sort(null);
  const arc = d3.arc<d3.PieArcDatum<QueryRow>>().innerRadius(innerR).outerRadius(outerR);
  const hoverArc = d3.arc<d3.PieArcDatum<QueryRow>>().innerRadius(innerR).outerRadius(outerR + 8);
  const labelArc = d3.arc<d3.PieArcDatum<QueryRow>>().innerRadius(outerR * 0.76).outerRadius(outerR * 0.76);

  const g = d3svg.append("g").attr("transform", `translate(${cx},${cy})`);
  const arcs = pie(data);

  g.selectAll("path").data(arcs).join("path")
    .attr("d", arc).attr("fill", (_, i) => colors[i % colors.length])
    .attr("stroke", "hsl(220,13%,9%)").attr("stroke-width", 2).attr("opacity", 0.9)
    .attr("cursor", "pointer")
    .on("mouseenter", function (event: MouseEvent, d: d3.PieArcDatum<QueryRow>) {
      d3.select(this).attr("d", hoverArc(d)!).attr("opacity", 1);
      const pct = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
      showTip(event, [
        { label: xCol, value: String(d.data[xCol]) },
        { label: yCol, value: fmtVal(d.data[yCol]) },
        { label: "share", value: `${pct}%` },
      ], isDonut ? "Donut" : "Pie");
    })
    .on("mousemove", function (event: MouseEvent, d: d3.PieArcDatum<QueryRow>) {
      const pct = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
      showTip(event, [
        { label: xCol, value: String(d.data[xCol]) },
        { label: yCol, value: fmtVal(d.data[yCol]) },
        { label: "share", value: `${pct}%` },
      ], isDonut ? "Donut" : "Pie");
    })
    .on("mouseleave", function (_, d) { d3.select(this).attr("d", arc(d)!).attr("opacity", 0.9); hideTip(); });

  if (isDonut) {
    g.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em")
      .attr("font-size", 20).attr("font-weight", 700).attr("fill", "hsl(220,13%,88%)")
      .text(fmtVal(total));
    g.append("text").attr("text-anchor", "middle").attr("dy", "1.2em")
      .attr("font-size", 10).attr("fill", "hsl(220,13%,44%)").text("total");
  }

  arcs.forEach((d, i) => {
    const pct = (d.endAngle - d.startAngle) / (2 * Math.PI);
    if (pct > 0.07) {
      const [lx, ly] = labelArc.centroid(d);
      g.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", "middle")
        .attr("font-size", 10).attr("fill", "hsl(220,13%,92%)").attr("pointer-events", "none")
        .text(`${Math.round(pct * 100)}%`);
    }
  });

  if (showLegend) {
    const legG = d3svg.append("g").attr("transform", `translate(10,${h - Math.min(data.length, 6) * 18 - 10})`);
    data.slice(0, 6).forEach((row, i) => {
      legG.append("rect").attr("y", i * 18).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colors[i]);
      legG.append("text").attr("x", 14).attr("y", i * 18 + 9)
        .attr("font-size", 10).attr("fill", "hsl(220,13%,52%)").text(String(row[xCol]).slice(0, 20));
    });
  }
}

function renderHistogram(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip) {
  const { xCol, bins: binCount, showGrid, colorScheme } = cfg;
  const colors = getColors(colorScheme);
  const d3svg = d3.select(svg);
  d3svg.selectAll("*").remove();

  const iw = w - M.left - M.right;
  const ih = h - M.top - M.bottom;
  const clipId = `clip-hist-${Date.now()}`;
  d3svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", iw).attr("height", ih + 4).attr("y", -4);

  const root = d3svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
  const chartG = root.append("g").attr("clip-path", `url(#${clipId})`);

  const values = data.map((d) => Number(d[xCol])).filter((v) => !isNaN(v));
  const xExt = d3.extent(values) as [number, number];
  const x = d3.scaleLinear().domain(xExt).nice().range([0, iw]);
  const bins = d3.bin().domain(x.domain() as [number, number]).thresholds(x.ticks(binCount))(values);
  const y = d3.scaleLinear().domain([0, (d3.max(bins, (b) => b.length) ?? 1) * 1.06]).nice().range([ih, 0]);

  if (showGrid) {
    chartG.append("g").call(d3.axisLeft(y).tickSize(-iw).tickFormat(() => ""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "hsl(220,13%,19%)").attr("stroke-dasharray", "2,4"));
  }

  chartG.selectAll("rect").data(bins).join("rect")
    .attr("x", (d) => x(d.x0!) + 1).attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1!) - x(d.x0!) - 2)).attr("height", (d) => ih - y(d.length))
    .attr("rx", 2).attr("fill", colors[0]).attr("opacity", 0.85).attr("cursor", "crosshair")
    .on("mouseenter", function (event: MouseEvent, d: d3.Bin<number, number>) {
      d3.select(this).attr("opacity", 1).attr("filter", "brightness(1.2)");
      showTip(event, [
        { label: "range", value: `${fmtVal(d.x0)} – ${fmtVal(d.x1)}` },
        { label: "count", value: String(d.length) },
        { label: "column", value: xCol },
      ], "Histogram");
    })
    .on("mousemove", function (event: MouseEvent, d: d3.Bin<number, number>) {
      showTip(event, [
        { label: "range", value: `${fmtVal(d.x0)} – ${fmtVal(d.x1)}` },
        { label: "count", value: String(d.length) },
      ], "Histogram");
    })
    .on("mouseleave", function () { d3.select(this).attr("opacity", 0.85).attr("filter", null); hideTip(); });

  root.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(6))
    .call(g => g.select(".domain").attr("stroke", "hsl(220,13%,24%)"))
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));
  root.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((v) => String(Math.round(Number(v)))))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("fill", "hsl(220,13%,50%)").attr("font-size", 10.5));

  applyZoom(svg, chartG, iw, ih);
}

function renderChart(svg: SVGSVGElement, data: QueryRow[], cfg: ChartConfig, w: number, h: number, showTip: ShowTip, hideTip: HideTip) {
  switch (cfg.chartType) {
    case "bar": return renderBarChart(svg, data, cfg, w, h, showTip, hideTip);
    case "grouped_bar": return renderGroupedBarChart(svg, data, cfg, w, h, showTip, hideTip);
    case "stacked_bar": return renderStackedBarChart(svg, data, cfg, w, h, showTip, hideTip);
    case "line": return renderLineChart(svg, data, cfg, w, h, showTip, hideTip, false);
    case "area": return renderLineChart(svg, data, cfg, w, h, showTip, hideTip, true);
    case "scatter": return renderScatterChart(svg, data, cfg, w, h, showTip, hideTip);
    case "pie": return renderPieChart(svg, data, cfg, w, h, showTip, hideTip, false);
    case "donut": return renderPieChart(svg, data, cfg, w, h, showTip, hideTip, true);
    case "histogram": return renderHistogram(svg, data, cfg, w, h, showTip, hideTip);
  }
}

// ─── Tooltip component ────────────────────────────────────────────────────────

function Tooltip({ tip, containerRef }: { tip: TooltipState; containerRef: React.RefObject<HTMLDivElement | null> }) {
  if (!tip.visible) return null;
  const rect = containerRef.current?.getBoundingClientRect();
  const left = tip.x - (rect?.left ?? 0) + 14;
  const top = tip.y - (rect?.top ?? 0) - 12;

  return (
    <div style={{
      position: "absolute", left, top,
      background: "hsl(220,18%,11%)",
      border: "1px solid hsl(220,13%,22%)",
      borderRadius: 8,
      padding: "8px 12px",
      pointerEvents: "none",
      zIndex: 100,
      minWidth: 130,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
      backdropFilter: "blur(8px)",
    }}>
      <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(220,13%,38%)" }}>
        {tip.title}
      </p>
      {tip.rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: "hsl(220,13%,48%)", flexShrink: 0 }}>{r.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "hsl(220,13%,88%)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Validation banner ────────────────────────────────────────────────────────

function ValidationBanner({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  const levelColor = { error: "hsl(0,70%,55%)", warning: "hsl(35,90%,58%)", info: "hsl(220,60%,55%)" };
  const levelBg = { error: "hsl(0,60%,14%)", warning: "hsl(35,80%,12%)", info: "hsl(220,50%,13%)" };
  const levelIcon = { error: "⚠", warning: "△", info: "ℹ" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 20px 12px" }}>
      {issues.map((issue, i) => (
        <div key={i} style={{
          display: "flex", gap: 7, alignItems: "flex-start",
          padding: "6px 10px", borderRadius: 6,
          background: levelBg[issue.level],
          border: `1px solid ${levelColor[issue.level]}22`,
        }}>
          <span style={{ fontSize: 10, color: levelColor[issue.level], flexShrink: 0, marginTop: 1 }}>{levelIcon[issue.level]}</span>
          <span style={{ fontSize: 10.5, color: "hsl(220,13%,65%)", lineHeight: 1.4 }}>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Panel sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "hsl(220,13%,36%)", textTransform: "uppercase", margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

function PanelSelect({ label, value, onChange, options, disabled, hasError }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean; hasError?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10.5, color: "hsl(220,13%,46%)", fontWeight: 500 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{
        background: "hsl(220,13%,13%)",
        border: `1px solid ${hasError ? "hsl(0,65%,45%)" : "hsl(220,13%,21%)"}`,
        borderRadius: 7, padding: "6.5px 28px 6.5px 10px",
        color: value ? "hsl(220,13%,82%)" : "hsl(220,13%,38%)",
        fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
        outline: "none", appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 3.5l3 3 3-3' stroke='%23445' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center",
        opacity: disabled ? 0.45 : 1, transition: "border-color 150ms",
      }}>
        <option value="">— select —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11.5, color: "hsl(220,13%,56%)" }}>{label}</span>
      <button type="button" onClick={() => onChange(!checked)} style={{
        width: 34, height: 18, borderRadius: 9,
        background: checked ? "hsl(220,70%,52%)" : "hsl(220,13%,20%)",
        border: "none", cursor: "pointer", position: "relative", transition: "background 180ms",
        flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: "50%", background: "white",
          transition: "left 180ms", boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        }} />
      </button>
    </div>
  );
}

function colOptions(schema: ColumnSchema[] | null, dtypes?: string[]): { value: string; label: string }[] {
  if (!schema) return [];
  const filtered = dtypes ? schema.filter((c) => dtypes.includes(c.dtype)) : schema;
  return filtered.map((c) => ({ value: c.name, label: `${c.name} (${c.dtype.slice(0, 3).toUpperCase()})` }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function VisualizationBuilder() {
  const { data: datasetsData, isLoading: datasetsLoading } = useDatasets();
  const datasets = datasetsData?.items.filter((d) => d.status === "ready") ?? [];

  const [config, setConfig] = useState<ChartConfig>(getInitialConfig);
  const [appliedConfig, setAppliedConfig] = useState<ChartConfig | null>(null);
  const [queryData, setQueryData] = useState<QueryRow[] | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, rows: [], title: "" });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 700, h: 400 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const selectedDataset = datasets.find((d) => d.id === config.datasetId) ?? null;
  const appliedDataset = datasets.find((d) => d.id === appliedConfig?.datasetId) ?? null;
  const schema = selectedDataset?.schema ?? null;
  const renderedSchema = appliedDataset?.schema ?? null;

  useEffect(() => {
    cachedConfig = config;
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore persistence failures and keep the in-memory config.
    }
  }, [config]);

  const set = useCallback(<K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDatasetChange = useCallback((datasetId: string) => {
    setQueryError(null);
    setConfig((prev) => {
      if (!datasetId) {
        setAppliedConfig(null);
        setQueryData(null);
        return { ...prev, datasetId: "", xCol: "", yCol: "", groupCol: "" };
      }

      const nextDataset = datasets.find((dataset) => dataset.id === datasetId);
      if (!nextDataset) return { ...prev, datasetId };

      return {
        ...prev,
        datasetId,
        ...autoPopulate(nextDataset, prev.chartType),
        title: prev.title || nextDataset.name,
      };
    });
  }, [datasets]);

  const handleChartTypeChange = useCallback((chartType: ChartType) => {
    setQueryError(null);
    setConfig((prev) => {
      if (!selectedDataset) return { ...prev, chartType };
      return {
        ...prev,
        chartType,
        ...autoPopulate(selectedDataset, chartType),
      };
    });
  }, [selectedDataset]);

  const handleAutoPopulate = useCallback(() => {
    if (!selectedDataset) return;
    setConfig((prev) => ({
      ...prev,
      ...autoPopulate(selectedDataset, prev.chartType),
      title: prev.title || selectedDataset.name,
    }));
  }, [selectedDataset]);

  const showTip: ShowTip = useCallback((e, rows, title) => {
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, rows, title });
  }, []);
  const hideTip: HideTip = useCallback(() => {
    setTooltip((t) => ({ ...t, visible: false }));
  }, []);

  const runQuery = useCallback(async () => {
    if (!config.datasetId || !config.xCol) return;
    const nextConfig = cloneConfig(config);
    const sql = buildQuery(nextConfig);
    if (!sql) return;
    setQueryLoading(true); setQueryError(null);
    try {
      const result = await queryDatasetAction(nextConfig.datasetId, sql);
      setQueryData(result.rows ?? []);
      setAppliedConfig(nextConfig);
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setQueryLoading(false);
    }
  }, [config]);

  const renderedConfig = getRenderedConfig(config, appliedConfig);

  useEffect(() => {
    if (!svgRef.current || !queryData || queryData.length === 0 || !appliedConfig) return;
    renderChart(svgRef.current, queryData, renderedConfig, dims.w, dims.h, showTip, hideTip);
  }, [queryData, renderedConfig, appliedConfig, dims, showTip, hideTip]);

  const draftValidationIssues = useMemo(() => validateConfig(config, schema, null), [config, schema]);
  const renderedValidationIssues = useMemo(
    () => (appliedConfig && queryData ? validateConfig(appliedConfig, renderedSchema, queryData) : []),
    [appliedConfig, renderedSchema, queryData]
  );
  const hasErrors = draftValidationIssues.some((v) => v.level === "error");
  const hasPendingChanges = !!appliedConfig && requiresQueryUpdate(config, appliedConfig);

  const allCols = colOptions(schema);
  const numCols = colOptions(schema, ["integer", "float"]);
  const needsY = config.chartType !== "histogram";
  const needsGroup = ["grouped_bar", "stacked_bar", "line", "area", "scatter"].includes(config.chartType);
  const currentScheme = COLOR_SCHEMES.find((s) => s.id === renderedConfig.colorScheme) ?? COLOR_SCHEMES[0];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div style={{
      display: "flex", height: "100%",
      background: "hsl(220,14%,7%)",
      fontFamily: "'DM Sans', 'IBM Plex Sans', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 300, flexShrink: 0,
        borderRight: "1px solid hsl(220,13%,15%)",
        display: "flex", flexDirection: "column",
        overflowY: "auto", background: "hsl(220,14%,8%)",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid hsl(220,13%,14%)", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "hsl(220,13%,88%)", letterSpacing: "-0.01em" }}>
            Chart Builder
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "hsl(220,13%,38%)" }}>Scroll to zoom · Double-click to reset</p>
        </div>

        <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Dataset */}
          <div>
            <SectionLabel>Dataset</SectionLabel>
            <PanelSelect label="Source dataset" value={config.datasetId} onChange={handleDatasetChange}
              options={datasets.map((d) => ({ value: d.id, label: d.name }))} disabled={datasetsLoading} />
            {datasets.length === 0 && !datasetsLoading && (
              <p style={{ fontSize: 10.5, color: "hsl(35,85%,55%)", marginTop: 5 }}>No ready datasets — upload one first.</p>
            )}
          </div>

          {/* Chart type */}
          <div>
            <SectionLabel>Chart Type</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
              {CHART_TYPES.map((ct) => (
                <button type="button" key={ct.id} onClick={() => handleChartTypeChange(ct.id)} title={ct.desc} style={{
                  padding: "7px 4px", borderRadius: 7,
                  border: `1px solid ${config.chartType === ct.id ? "hsl(220,65%,52%)" : "hsl(220,13%,19%)"}`,
                  background: config.chartType === ct.id ? "hsl(220,65%,52%,0.12)" : "hsl(220,13%,11%)",
                  color: config.chartType === ct.id ? "hsl(220,70%,72%)" : "hsl(220,13%,46%)",
                  cursor: "pointer", fontSize: 9.5, fontWeight: 600,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  transition: "all 140ms",
                }}>
                  <span style={{ fontSize: 15 }}>{ct.icon}</span>
                  <span>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Axes */}
          {mounted && config.datasetId && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <SectionLabel>Axes</SectionLabel>
                <button type="button" onClick={handleAutoPopulate} style={{
                  fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                  border: "1px solid hsl(220,13%,23%)", background: "transparent",
                  color: "hsl(220,65%,62%)", cursor: "pointer", letterSpacing: "0.04em",
                }}>⚡ Auto</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <PanelSelect label="X axis" value={config.xCol} onChange={(v) => set("xCol", v)} options={allCols} />
                {needsY && (
                  <PanelSelect label="Y axis (numeric)" value={config.yCol} onChange={(v) => set("yCol", v)}
                    options={numCols}
                    hasError={!!(config.yCol && numCols.length > 0 && !numCols.find(c => c.value === config.yCol))} />
                )}
                {needsGroup && (
                  <PanelSelect label="Group by (optional)" value={config.groupCol} onChange={(v) => set("groupCol", v)} options={allCols} />
                )}
                {config.chartType === "histogram" && (
                  <div>
                    <label style={{ fontSize: 10.5, color: "hsl(220,13%,46%)", fontWeight: 500 }}>Bins: {config.bins}</label>
                    <input type="range" min={5} max={60} value={config.bins}
                      onChange={(e) => set("bins", Number(e.target.value))}
                      style={{ width: "100%", marginTop: 5, accentColor: "hsl(220,70%,50%)" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Colors */}
          <div>
            <SectionLabel>Color Scheme</SectionLabel>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {COLOR_SCHEMES.map((scheme) => (
                <button type="button" key={scheme.id} onClick={() => set("colorScheme", scheme.id)} title={scheme.label} style={{
                  display: "flex", alignItems: "center", padding: 2, borderRadius: 5,
                  border: `2px solid ${config.colorScheme === scheme.id ? "hsl(220,65%,55%)" : "transparent"}`,
                  background: "transparent", cursor: "pointer", overflow: "hidden",
                }}>
                  {scheme.colors.slice(0, 4).map((c, i) => (
                    <span key={i} style={{ width: 12, height: 20, background: c, display: "block" }} />
                  ))}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <SectionLabel>Options</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <Toggle label="Show legend" checked={config.showLegend} onChange={(v) => set("showLegend", v)} />
              <Toggle label="Show value labels" checked={config.showLabels} onChange={(v) => set("showLabels", v)} />
            </div>
          </div>

          {/* Row limit */}
          <div>
            <SectionLabel>Row limit</SectionLabel>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[100, 200, 500, 1000, 5000].map((n) => (
                <button type="button" key={n} onClick={() => set("limit", n)} style={{
                  padding: "3.5px 9px", borderRadius: 5,
                  border: `1px solid ${config.limit === n ? "hsl(220,65%,52%)" : "hsl(220,13%,19%)"}`,
                  background: config.limit === n ? "hsl(220,65%,52%,0.1)" : "transparent",
                  color: config.limit === n ? "hsl(220,65%,68%)" : "hsl(220,13%,46%)",
                  fontSize: 10.5, fontWeight: 500, cursor: "pointer",
                }}>
                  {n >= 1000 ? `${n / 1000}K` : n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Validation issues */}
        <ValidationBanner issues={draftValidationIssues} />

        {/* Run button */}
        <div style={{ padding: "10px 20px 18px", marginTop: "auto", flexShrink: 0 }}>
          <button type="button" onClick={runQuery}
            disabled={!config.datasetId || !config.xCol || queryLoading || hasErrors}
            style={{
              width: "100%", padding: "10px", borderRadius: 9, border: "none",
              background: (!config.datasetId || !config.xCol || hasErrors)
                ? "hsl(220,13%,16%)"
                : "hsl(220,70%,50%)",
              color: (!config.datasetId || !config.xCol || hasErrors) ? "hsl(220,13%,34%)" : "#fff",
              fontSize: 12.5, fontWeight: 700, cursor: (!config.datasetId || !config.xCol || queryLoading || hasErrors) ? "not-allowed" : "pointer",
              transition: "all 150ms",
              boxShadow: (config.datasetId && config.xCol && !hasErrors) ? "0 2px 12px hsl(220,70%,50%,0.28)" : "none",
              letterSpacing: "0.01em",
            }}>
            {queryLoading ? "Running…" : hasErrors ? "Fix errors above" : hasPendingChanges ? "Update Chart →" : "Generate Chart →"}
          </button>
          {queryError && (
            <p style={{ fontSize: 10.5, color: "hsl(0,68%,58%)", marginTop: 7, lineHeight: 1.4 }}>{queryError}</p>
          )}
          {hasPendingChanges && !queryLoading && (
            <p style={{ fontSize: 10.5, color: "hsl(35,85%,55%)", marginTop: 7, lineHeight: 1.4 }}>
              Draft changes are not applied to the chart until you click Update Chart.
            </p>
          )}
        </div>
      </div>

      {/* ── Right canvas ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "hsl(220,14%,7%)" }}>
        {/* Canvas header */}
        <div style={{
          padding: "13px 24px", borderBottom: "1px solid hsl(220,13%,14%)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "hsl(220,13%,88%)", letterSpacing: "-0.01em" }}>
              {renderedConfig.title || "Chart Preview"}
            </h2>
            {queryData && (
              <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "hsl(220,13%,38%)" }}>
                {queryData.length.toLocaleString()} rows · {CHART_TYPES.find((c) => c.id === renderedConfig.chartType)?.label}
                {renderedValidationIssues.length > 0 && (
                  <span style={{ marginLeft: 8, color: renderedValidationIssues.some(v => v.level === "error") ? "hsl(0,65%,55%)" : "hsl(35,85%,55%)" }}>
                    · {renderedValidationIssues.length} {renderedValidationIssues.length === 1 ? "notice" : "notices"}
                  </span>
                )}
                {hasPendingChanges && (
                  <span style={{ marginLeft: 8, color: "hsl(220,65%,62%)" }}>· preview not updated</span>
                )}
              </p>
            )}
          </div>
          {queryData && queryData.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {currentScheme.colors.slice(0, 4).map((c, i) => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
              ))}
              <span style={{ fontSize: 10.5, color: "hsl(220,13%,38%)", marginLeft: 2 }}>{currentScheme.label}</span>
            </div>
          )}
        </div>

        {/* SVG canvas area */}
        <div ref={canvasWrapRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div ref={containerRef} style={{
            position: "absolute", inset: "20px 24px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {!config.datasetId ? (
              <EmptyState type="no-dataset" />
            ) : !queryData && !queryLoading ? (
              <EmptyState type="no-query" onRun={runQuery} hasConfig={!!config.xCol} />
            ) : queryLoading ? (
              <LoadingSpinner />
            ) : queryData && queryData.length === 0 ? (
              <EmptyState type="no-data" />
            ) : (
              <svg ref={svgRef} width={dims.w} height={dims.h} style={{ overflow: "visible", display: "block", cursor: "grab" }} />
            )}
          </div>
          <Tooltip tip={tooltip} containerRef={canvasWrapRef} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty / Loading states ───────────────────────────────────────────────────

function EmptyState({ type, onRun, hasConfig }: {
  type: "no-dataset" | "no-query" | "no-data"; onRun?: () => void; hasConfig?: boolean;
}) {
  const cfg = {
    "no-dataset": { icon: "◈", title: "Select a dataset", body: "Choose a ready dataset from the builder panel to get started." },
    "no-query": {
      icon: "◉",
      title: hasConfig ? "Ready to chart" : "Configure your chart",
      body: hasConfig ? "Your axes are set. Click Generate Chart to render." : "Select your X and Y axes in the builder panel.",
    },
    "no-data": { icon: "◌", title: "No data returned", body: "The query returned no rows. Try changing your axis or row limit." },
  }[type];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", maxWidth: 280 }}>
      <span style={{ fontSize: 44, opacity: 0.12, color: "hsl(220,13%,70%)" }}>{cfg.icon}</span>
      <p style={{ fontSize: 14, fontWeight: 600, color: "hsl(220,13%,52%)", margin: 0 }}>{cfg.title}</p>
      <p style={{ fontSize: 12, color: "hsl(220,13%,36%)", margin: 0, lineHeight: 1.5 }}>{cfg.body}</p>
      {type === "no-query" && hasConfig && onRun && (
        <button type="button" onClick={onRun} style={{
          marginTop: 4, padding: "8px 18px", borderRadius: 8, border: "none",
          background: "hsl(220,70%,50%)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Generate Chart</button>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "2.5px solid hsl(220,13%,18%)", borderTopColor: "hsl(220,70%,55%)",
        animation: "vz-spin 0.75s linear infinite",
      }} />
      <style>{`@keyframes vz-spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 12, color: "hsl(220,13%,38%)", margin: 0 }}>Querying dataset…</p>
    </div>
  );
}
