
import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ReferenceLine, ComposedChart
} from "recharts";
import { Plus, Trash2, Pencil, X, TrendingUp, Wallet, Calendar, Award, Lightbulb, Download, Upload, Target, Calculator, Filter, ChevronDown, ArrowRight } from "lucide-react";
import { useCurrency } from "../hooks/useCurrency";


export interface CoinsEntry { id: string; year: number; month: number; amount: number; source: string; notes: string; }
export interface CoinsStats { total: number; avgPerCareerMonth: number; avgPerLoggedMonth: number; bestYear: { total: number, year: number }; highest: { total: number, year: number, month: number }; careerMonths: number; monthsLogged: number; yearTrend: any[]; stackedByYear: any[]; allSources: string[]; missingRanges: any[]; }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CAREER_START_YEAR = 2015;
const CAREER_START_MONTH = 1;
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const YEARS = Array.from({ length: CURRENT_YEAR - CAREER_START_YEAR + 2 }, (_, i) => CAREER_START_YEAR + i);
const SOURCE_PRESETS = ["Job", "Freelance", "Product", "Consulting", "Investment", "Other"];
const PALETTE = ["#C9A227", "#7FA87A", "#8AA9C9", "#C1665A", "#A78BC9", "#C99A5B", "#6FA3A0"];

function monthKey(y: number, m: number) { return `${y}-${m}`; }

function emptyDraft() {
  return { id: null, year: CURRENT_YEAR, month: CURRENT_MONTH, amount: "", source: "Job", notes: "" };
}

function emptyRangeDraft() {
  return {
    startYear: CAREER_START_YEAR, startMonth: 1,
    endYear: CURRENT_YEAR, endMonth: CURRENT_MONTH,
    amount: "", source: "Job", notes: ""
  };
}

// Inclusive list of {year, month} between two points, in order.
function monthsBetween(sy: number, sm: number, ey: number, em: number) {
  const out: any[] = [];
  let y = sy, m = sm;
  const startIdx = sy * 12 + sm, endIdx = ey * 12 + em;
  if (startIdx > endIdx) return out;
  while (y * 12 + m <= endIdx) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

// Every calendar month from career start to the current month, inclusive.
function buildFullTimeline() {
  const out = [];
  let y = CAREER_START_YEAR, m = CAREER_START_MONTH;
  while (y < CURRENT_YEAR || (y === CURRENT_YEAR && m <= CURRENT_MONTH)) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}
const FULL_TIMELINE = buildFullTimeline();

export default function CoinsPane({ walletTotal, onNavigateToMoneyGoals }: { walletTotal?: number, onNavigateToMoneyGoals?: () => void, }) {

  const { formatCurrency, currency } = useCurrency();
  const currencySymbol = (() => { try { return (0).toLocaleString(undefined, {style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0}).replace(/\d/g, '').trim(); } catch { return currency; } })();
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "whatchadoin_coins_entries") {
        if (e.newValue) setEntries(JSON.parse(e.newValue));
      }
      if (e.key === "whatchadoin_coins_targets") {
        if (e.newValue) setTargets(JSON.parse(e.newValue));
      }
    };
    const handleCoinsUpdated = () => {
      try {
        const rawEntries = localStorage.getItem("whatchadoin_coins_entries");
        if (rawEntries) setEntries(JSON.parse(rawEntries));
        const rawTargets = localStorage.getItem("whatchadoin_coins_targets");
        if (rawTargets) setTargets(JSON.parse(rawTargets));
      } catch (err) {
        console.error("Error refreshing coins:", err);
      }
    };
    const handleFab = () => {
      setMode("single");
      setDraft(emptyDraft() as any);
      setEditingId(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => document.getElementById("entry-amount-input")?.focus(), 50);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("whatchadoin_coins_updated", handleCoinsUpdated);
    window.addEventListener("fab:add-coins", handleFab);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("whatchadoin_coins_updated", handleCoinsUpdated);
      window.removeEventListener("fab:add-coins", handleFab);
    };
  }, []);
  const [coinsEntries, setEntries] = useState<CoinsEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [draft, setDraft] = useState(emptyDraft());
  const [rangeDraft, setRangeDraft] = useState(emptyRangeDraft());
  const [mode, setMode] = useState("single"); // "single" | "range"
  const [editingId, setEditingId] = useState(null);
  const [expandedYear, setExpandedYear] = useState(CURRENT_YEAR);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = React.useRef(null);
  const [coinsTargets, setTargets] = useState({}); // { [year]: amount }
  const [showTargets, setShowTargets] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcMode, setCalcMode] = useState("career"); // "forward" | "career"
  const [calcTarget, setCalcTarget] = useState("150000");
  const [calcEndYear, setCalcEndYear] = useState(CURRENT_YEAR + 1);
  const [calcEndMonth, setCalcEndMonth] = useState(CURRENT_MONTH);
  const [filters, setFilters] = useState({ source: "all", fromYear: CAREER_START_YEAR, toYear: CURRENT_YEAR, minAmount: "", maxAmount: "", search: "" });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = localStorage.getItem("whatchadoin_coins_entries");
        if (res) setEntries(JSON.parse(res));
      } catch (e) {
        // no data yet — fresh ledger
      }
      try {
        const res2 = localStorage.getItem("whatchadoin_coins_targets");
      if (res2) setTargets(JSON.parse(res2));
      } catch (e) {
        // no coinsTargets set yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function persistTargets(next: any) {
    setTargets(next);
    try {
      localStorage.setItem("whatchadoin_coins_targets", JSON.stringify(next));
    } catch (e) {
      // coinsTargets are a nice-to-have; a failed save here doesn't affect coinsEntries
    }
  }

  async function persist(next: any) {
    setEntries(next);
    setSaveState("saving");
    try {
      localStorage.setItem("whatchadoin_coins_entries", JSON.stringify(next));
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
    }
  }

  function resetDraft() {
    setDraft(emptyDraft());
    setEditingId(null);
  }

  function exportJSON() {
    const payload = { exportedAt: new Date().toISOString(), coinsEntries };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coins-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(v: any) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCSV() {
    const rows = [["Year", "Month", "Amount", "Source", "Notes"]];
    [...coinsEntries].sort((a, b) => (a.year - b.year) || (a.month - b.month)).forEach(e => {
      rows.push([e.year as any, MONTHS[e.month - 1], e.amount as any, e.source, e.notes || ""]);
    });
    const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coins-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerImport() {
    setImportMsg("");
    (fileInputRef.current as any)?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const incoming = Array.isArray(parsed) ? parsed : parsed.coinsEntries;
        if (!Array.isArray(incoming)) throw new Error("bad shape");
        const existingKeys = new Set(coinsEntries.map(en => `${en.year}-${en.month}-${en.source}`));
        let added = 0, skipped = 0;
        const toAdd: CoinsEntry[] = [];
        incoming.forEach(en => {
          if (!en || !en.year || !en.month || typeof en.amount !== "number") return;
          const key = `${en.year}-${en.month}-${en.source}`;
          if (existingKeys.has(key)) { skipped++; return; }
          existingKeys.add(key);
          toAdd.push({ id: `${Date.now().toString(36)}-${added}`, year: en.year, month: en.month, amount: en.amount, source: en.source || "Other", notes: en.notes || "" });
          added++;
        });
        if (toAdd.length > 0) persist([...coinsEntries, ...toAdd]);
        setImportMsg(`Imported ${added} ${added === 1 ? "entry" : "entries"}${skipped ? `, skipped ${skipped} already on file` : ""}.`);
      } catch (err) {
        setImportMsg("Couldn't read that file — expecting a JSON backup exported from this ledger.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = parseFloat(draft.amount);
    if (!draft.year || !draft.month || isNaN(amt) || amt < 0) {
      setError("Enter a valid year, month, and amount.");
      return;
    }
    const key = monthKey(draft.year, draft.month);
    const dupe = coinsEntries.find(en => monthKey(en.year, en.month) === key && en.id !== editingId && en.source === draft.source);
    if (dupe) {
      setError(`You already have a "${draft.source}" entry for ${MONTHS[draft.month - 1]} ${draft.year}. Edit it instead, or use a different source.`);
      return;
    }
    let next;
    if (editingId) {
      next = coinsEntries.map(en => en.id === editingId ? { ...draft, amount: amt, id: editingId } : en);
    } else {
      next = [...coinsEntries, { ...draft, amount: amt, id: Date.now().toString(36) }];
    }
    persist(next);
    setExpandedYear(draft.year);
    resetDraft();
  }

  function submitRange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = parseFloat(rangeDraft.amount);
    if (isNaN(amt) || amt < 0) {
      setError("Enter a valid amount.");
      return;
    }
    const months = monthsBetween(rangeDraft.startYear, rangeDraft.startMonth, rangeDraft.endYear, rangeDraft.endMonth);
    if (months.length === 0) {
      setError("End month must be on or after the start month.");
      return;
    }
    const conflicts = months.filter(({ year, month }) =>
      coinsEntries.some(en => en.year === year && en.month === month && en.source === rangeDraft.source)
    );
    if (conflicts.length > 0) {
      const first = conflicts[0];
      setError(`"${rangeDraft.source}" already has an entry for ${MONTHS[first.month - 1]} ${first.year} (and ${conflicts.length - 1} other month${conflicts.length - 1 === 1 ? "" : "s"} in this range, if any). Pick a different source or a non-overlapping range.`);
      return;
    }
    const newEntries = months.map(({ year, month }, i) => ({
      id: `${Date.now().toString(36)}-${i}`,
      year, month, amount: amt, source: rangeDraft.source, notes: rangeDraft.notes
    }));
    persist([...coinsEntries, ...newEntries]);
    setExpandedYear(rangeDraft.endYear);
    setRangeDraft(emptyRangeDraft());
  }

  function startEdit(en: CoinsEntry) {
    setDraft({ ...en, amount: String(en.amount) } as any);
    setEditingId(en.id as any);
    setExpandedYear(en.year);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeEntry(id: string) {
    persist(coinsEntries.filter(en => en.id !== id));
    if (editingId === id) resetDraft();
  }

  // ---- Analytics ----
  const stats = useMemo(() => {
    if (coinsEntries.length === 0) return null;
    const total = coinsEntries.reduce((s: number, e: CoinsEntry) => s + e.amount, 0);

    const byMonthKeyTotals: Record<string, number> = {};
    coinsEntries.forEach(e => {
      const k = monthKey(e.year, e.month);
      byMonthKeyTotals[k] = (byMonthKeyTotals[k] || 0) + e.amount;
    });
    const monthsLogged = Object.keys(byMonthKeyTotals).length;
    const avgPerLoggedMonth = total / monthsLogged;

    // Career-wide average — every month since Jan 2015 counts, filled or not.
    const careerMonths = FULL_TIMELINE.length;
    const avgPerCareerMonth = total / careerMonths;
    const coveragePct = (monthsLogged / careerMonths) * 100;

    const monthTotalsArr = Object.entries(byMonthKeyTotals).map(([k, v]) => {
      const [y, m] = k.split("-").map(Number);
      return { year: y, month: m, total: v };
    });
    const highest = monthTotalsArr.reduce((a, b) => (b.total > a.total ? b : a));
    const lowest = monthTotalsArr.reduce((a, b) => (b.total < a.total ? b : a));

    const byYear: Record<number, number> = {};
    coinsEntries.forEach(e => { byYear[e.year] = (byYear[e.year] || 0) + e.amount; });
    const yearTrend = Object.entries(byYear).map(([y, v]: [string, any]) => ({ year: Number(y), total: Math.round(v as number) })).sort((a, b) => a.year - b.year);

    // Year-over-year growth (only between consecutive years that both have data)
    const yoyGrowth: any[] = [];
    for (let i = 1; i < yearTrend.length; i++) {
      const prev = yearTrend[i - 1], cur = yearTrend[i];
      if ((cur?.year || 0) === (prev?.year || 0) + 1 && (prev?.total || 0) > 0) {
        yoyGrowth.push({ year: (cur?.year || 0), pct: (((cur?.total || 0) - (prev?.total || 0)) / (prev?.total || 0)) * 100 });
      }
    }

    const bySource: Record<string, number> = {};
    coinsEntries.forEach(e => { bySource[e.source] = (bySource[e.source] || 0) + e.amount; });
    const sourceBreakdown = Object.entries(bySource)
      .map(([name, value]: [string, any]) => ({ name, value: Math.round(value as number), pct: ((value as number) / total) * 100 })) // ({ name, value: Math.round(value), pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);

    // Source totals per year, for the stacked view
    const sourceByYear: Record<number, Record<string, number>> = {};
    coinsEntries.forEach(e => {
      (sourceByYear[e.year] as any) = (sourceByYear[e.year] as any) || {};
      (sourceByYear[e.year] as any)[e.source] = ((sourceByYear[e.year] as any)[e.source] || 0) + e.amount;
    });
    const allSources = [...new Set(coinsEntries.map(e => e.source))];
    const stackedByYear = Object.keys(sourceByYear).map(Number).sort((a, b) => a - b).map(y => {
      const row: Record<string, any> = { year: y };
      allSources.forEach(s => { row[s] = Math.round((sourceByYear[y] as any)[s] || 0); });
      return row;
    });

    const sortedMonthTotals = [...monthTotalsArr].sort((a: any, b: any) => (a.year - b.year) || (a.month - b.month));
    const trendLine = sortedMonthTotals.map(m => ({
      label: `${MONTHS[(m as any).month - 1]} '${String((m as any).year).slice(2)}`,
      total: Math.round((m as any).total)
    }));

    // Cumulative coins across the *entire* real timeline (unfilled months count as 0)
    let running = 0;
    const cumulative = FULL_TIMELINE.map(({ year, month }) => {
      running += byMonthKeyTotals[monthKey(year, month)] || 0;
      return { label: `${MONTHS[month - 1]} '${String(year).slice(2)}`, cumulative: Math.round(running), year, month };
    });

    // Longest gap of consecutive unlogged months within the real timeline
    let longestGap = 0, curGap = 0;
    FULL_TIMELINE.forEach(({ year, month }) => {
      if (byMonthKeyTotals[monthKey(year, month)]) { curGap = 0; }
      else { curGap++; longestGap = Math.max(longestGap, curGap); }
    });

    // Current streak of consecutive logged months, counting back from the latest entry
    const loggedSet = new Set(Object.keys(byMonthKeyTotals));
    let streak = 0;
    for (let i = FULL_TIMELINE.length - 1; i >= 0; i--) {
      const k = monthKey(FULL_TIMELINE[i]!.year, FULL_TIMELINE[i]!.month);
      if (loggedSet.has(k)) streak++;
      else break;
    }

    // Missing months, grouped into consecutive ranges for easy backfilling
    const missingRanges: any[] = [];
    let curRange: any = null;
    FULL_TIMELINE.forEach(({ year, month }) => {
      const isMissing = !loggedSet.has(monthKey(year, month));
      if (isMissing) {
        if (curRange && curRange.endYear * 12 + curRange.endMonth === year * 12 + month - 1) {
          curRange.endYear = year; curRange.endMonth = month; curRange.count++;
        } else {
          if (curRange) missingRanges.push(curRange);
          curRange = { startYear: year, startMonth: month, endYear: year, endMonth: month, count: 1 };
        }
      } else if (curRange) {
        missingRanges.push(curRange);
        curRange = null;
      }
    });
    if (curRange) missingRanges.push(curRange);

    const careerYears = CURRENT_YEAR - CAREER_START_YEAR + 1;
    const bestYear = yearTrend.reduce((a: any, b: any) => (b.total > a.total ? b : a), yearTrend[0] as any);
    const latestYoy = yoyGrowth[yoyGrowth.length - 1];
    const topSource = sourceBreakdown[0];

    return {
      total, monthsLogged, avgPerLoggedMonth, avgPerCareerMonth, coveragePct,
      highest, lowest, yearTrend, yoyGrowth, sourceBreakdown, stackedByYear, allSources,
      trendLine, cumulative, careerYears, careerMonths, longestGap, streak, bestYear, latestYoy, topSource,
      loggedSet, missingRanges
    };
  }, [coinsEntries]);

  const yearlyWithTargets = useMemo(() => {
    if (!stats) return [];
    return stats.yearTrend.map(y => ({
      ...y,
      target: (coinsTargets as any)[y.year] ? Number((coinsTargets as any)[y.year]) * 12 : null
    }));
  }, [stats, coinsTargets]);

  const targetSummary = useMemo(() => {
    if (!stats) return null;
    const withTargets = stats.yearTrend.filter(y => (coinsTargets as any)[y.year]);
    if (withTargets.length === 0) return null;
    const hit = withTargets.filter(y => y.total >= Number((coinsTargets as any)[y.year]) * 12).length;
    return { total: withTargets.length, hit };
  }, [stats, coinsTargets]);

  const goalResult = useMemo(() => {
    const target = parseFloat(calcTarget);
    if (isNaN(target) || target < 0) return { error: "Enter a valid target amount." };
    if (calcMode === "forward") {
      return { forward: true, target };
    }
    if (!stats) return { error: "Log at least one month first — the career-wide calculator needs a starting total." };
    const monthsToTarget = monthsBetween(CAREER_START_YEAR, CAREER_START_MONTH, calcEndYear, calcEndMonth).length;
    const remainingMonths = monthsToTarget - stats.careerMonths;
    if (remainingMonths <= 0) return { error: "Pick a target date after the current month." };
    const requiredTotal = target * monthsToTarget;
    const stillNeeded = requiredTotal - stats.total;
    const neededPerMonth = stillNeeded / remainingMonths;
    return { forward: false, target, monthsToTarget, remainingMonths, requiredTotal, stillNeeded, neededPerMonth };
  }, [calcMode, calcTarget, calcEndYear, calcEndMonth, stats]);

  const uniqueSources = useMemo(() => [...new Set(coinsEntries.map(e => e.source))].sort(), [coinsEntries]);

  const filteredEntries = useMemo(() => {
    return coinsEntries.filter(en => {
      if (filters.source !== "all" && en.source !== filters.source) return false;
      if (en.year < filters.fromYear || en.year > filters.toYear) return false;
      if (filters.minAmount !== "" && en.amount < Number(filters.minAmount)) return false;
      if (filters.maxAmount !== "" && en.amount > Number(filters.maxAmount)) return false;
      if (filters.search && !(en.notes || "").toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [coinsEntries, filters]);

  const filtersActive = filters.source !== "all" || filters.fromYear !== CAREER_START_YEAR || filters.toYear !== CURRENT_YEAR || filters.minAmount !== "" || filters.maxAmount !== "" || filters.search !== "";

  const coinsEntriesByYear = useMemo(() => {
    const g: Record<number, CoinsEntry[]> = {};
    filteredEntries.forEach(e => { (g[e.year] = g[e.year] || []).push(e); });
    Object.values(g).forEach(list => list.sort((a, b) => a.month - b.month));
    return g;
  }, [filteredEntries]);

  
  useEffect(() => {
    const handleUpdate = () => {
      try {
        setEntries(JSON.parse(localStorage.getItem("whatchadoin_coins_entries") || "[]"));
      } catch {}
    };
    window.addEventListener("whatchadoin_coins_updated", handleUpdate);
    return () => window.removeEventListener("whatchadoin_coins_updated", handleUpdate);
  }, []);

  const activeYears = Object.keys(coinsEntriesByYear).map(Number).sort((a, b) => b - a);

  


  const insights = useMemo(() => {
    if (!stats) return [];
    const list = [];
    list.push(`You've logged ${stats.monthsLogged} of ${stats.careerMonths} months since Jan ${CAREER_START_YEAR} — ${stats.coveragePct.toFixed(0)}% coverage of your career.`);
    list.push(`Career-wide, that averages to ${formatCurrency(Math.round(stats.avgPerCareerMonth))}/month across every month since you started, including gaps. Among just the months you logged, the average is ${formatCurrency(Math.round(stats.avgPerLoggedMonth))}.`);
    if (stats.bestYear) list.push(`${stats.bestYear.year} was your strongest year on record, at ${formatCurrency(stats.bestYear.total)}.`);
    if (stats.latestYoy) {
      list.push(stats.latestYoy.pct >= 0
        ? `${stats.latestYoy.year} grew ${stats.latestYoy.pct.toFixed(0)}% over the year before.`
        : `${stats.latestYoy.year} was down ${Math.abs(stats.latestYoy.pct).toFixed(0)}% from the year before.`);
    }
    if (stats.topSource) list.push(`${stats.topSource.name} is your largest income source — ${stats.topSource.pct.toFixed(0)}% of everything logged.`);
    if (stats.longestGap > 0) list.push(`Longest unlogged stretch: ${stats.longestGap} consecutive month${stats.longestGap === 1 ? "" : "s"} with no entry.`);
    if (stats.streak > 0) list.push(`Current streak: ${stats.streak} consecutive month${stats.streak === 1 ? "" : "s"} logged, ending most recently.`);
    return list;
  }, [stats]);

  if (!loaded) {
    return <div style={{ fontFamily: "'JetBrains Mono', monospace", color: "#8A8F98", padding: 40 }}>Loading ledger…</div>;
  }



  return (
    <div className="coins-pane" style={{ padding: "0" }}>
      <style>{`
        .coins-pane .row-btn { background: transparent; border: none; color: #8A8F98; padding: 6px; border-radius: 3px; display: flex; align-items: center; }
        .coins-pane .row-btn:hover { color: #EDE7D9; background: #262C33; }
        .coins-pane table { border-collapse: collapse; width: 100%; min-width: 460px; }
        .coins-pane th, .coins-pane td { text-align: left; padding: 9px 10px; font-size: 13.5px; white-space: nowrap; }
        .coins-pane td:nth-child(4) { white-space: normal; min-width: 140px; }
        .coins-pane th { color: #8A8F98; font-weight: 500; font-size: 11.5px; letter-spacing: 0.03em; border-bottom: 1px solid #2A3038; }
        .coins-pane tbody tr { border-bottom: 1px solid #1F252C; }
        .coins-pane tbody tr:hover { background: #1A1F25; }
        .coins-pane input, .coins-pane select, .coins-pane textarea { width: 100%; box-sizing: border-box; min-width: 0; }

        /* --- Layout primitives (mobile-first: base rules are the small-screen layout) --- */
        .page-header { padding: 24px 16px 20px; }
        .page-body { padding: 20px 16px 40px; }
        .page-title { font-size: 26px; }
        .header-row { display: flex; flex-direction: column; gap: 16px; }
        .header-actions { width: 100%; align-items: flex-start; }
        .toolbar-btns { flex-wrap: wrap; }

        .form-header-row { flex-wrap: wrap; gap: 10px; }
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .range-endpoints { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .range-endpoint-inner { display: flex; gap: 6px; }

        .summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .charts-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .missing-grid-row { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .filters-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

        @media (min-width: 640px) {
          .page-header { padding: 36px 28px 28px; }
          .page-body { padding: 28px; }
          .page-title { font-size: 32px; }
          .header-row { flex-direction: row; justify-content: space-between; align-items: flex-start; }
          .header-actions { width: auto; align-items: flex-end; }
          .form-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
          .range-endpoints { grid-template-columns: 1fr 1fr 1fr 1fr; }
          .summary-grid { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)) !important; }
          .charts-grid-2 { grid-template-columns: 1.3fr 1fr; }
          .filters-grid { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
        }
        @media (min-width: 860px) {
          .charts-grid-2.even { grid-template-columns: 1fr 1fr; }
        }

      `}</style>

      {/* Header */}
      
      {/* Wallet Goal Banner (Mobile) */}
      {walletTotal !== undefined && onNavigateToMoneyGoals && (
        <div className="hide-on-desktop" style={{ background: '#1A1F25', borderBottom: '1px solid #2A3038', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={16} color="#C9A227" />
            <span style={{ fontSize: 13, color: '#D8D2C4' }}>Wallet Goal: <strong style={{ color: '#fff' }}>{formatCurrency(walletTotal)}</strong> remaining</span>
          </div>
          <button onClick={onNavigateToMoneyGoals} style={{ background: 'transparent', border: 'none', color: '#C9A227', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            View Money Goals <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="page-header" style={{ borderBottom: "1px solid #2A3038" }}>
        <div className="header-row" style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div>
            <div className="mono" style={{ color: "#C9A227", fontSize: 12, letterSpacing: "0.08em", marginBottom: 6 }}>
              {CAREER_START_YEAR} — {CURRENT_YEAR}
            </div>
            <h1 className="page-title" style={{ fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>Coins Ledger</h1>
            <p style={{ color: "#8A8F98", marginTop: 8, fontSize: 15, maxWidth: 560 }}>
              A running record of every month worked, what it paid, and where it came from.
            </p>
          </div>
          <div className="header-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="mono" style={{ fontSize: 11, color: saveState === "error" ? "#C1665A" : "#5E6570", whiteSpace: "nowrap" }}>
              {saveState === "saving" && "saving…"}
              {saveState === "saved" && "saved"}
              {saveState === "error" && "save failed"}
              {saveState === "idle" && " "}
            </div>
            <div className="toolbar-btns" style={{ display: "flex", gap: 6 }}>
              <button onClick={exportJSON} className="mono" title="Download a full backup (JSON)"
                style={{ display: "flex", alignItems: "center", gap: 5, background: "#1A1F25", border: "1px solid #2A3038", color: "#8A8F98", padding: "7px 10px", borderRadius: 3, fontSize: 11 }}>
                <Download size={12} /> JSON
              </button>
              <button onClick={exportCSV} className="mono" title="Download as spreadsheet (CSV)"
                style={{ display: "flex", alignItems: "center", gap: 5, background: "#1A1F25", border: "1px solid #2A3038", color: "#8A8F98", padding: "7px 10px", borderRadius: 3, fontSize: 11 }}>
                <Download size={12} /> CSV
              </button>
              <button onClick={triggerImport} className="mono" title="Restore from a JSON backup"
                style={{ display: "flex", alignItems: "center", gap: 5, background: "#1A1F25", border: "1px solid #2A3038", color: "#8A8F98", padding: "7px 10px", borderRadius: 3, fontSize: 11 }}>
                <Upload size={12} /> Import
              </button>
              <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: "none" }} />
            </div>
            {importMsg && <div className="mono" style={{ fontSize: 10.5, color: "#8A8F98", maxWidth: 260, textAlign: "left" }}>{importMsg}</div>}
          </div>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 1040, margin: "0 auto" }}>

        {/* Entry form */}
        <div style={{ background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: "18px 20px", marginBottom: 32 }}>
          
              <div className="form-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="mono" style={{ fontSize: 11.5, letterSpacing: "0.05em", color: "#8A8F98" }}>
              {editingId ? "EDIT ENTRY" : "NEW ENTRY"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {!editingId && (
                <div style={{ display: "flex", background: "#14181C", border: "1px solid #2A3038", borderRadius: 3, overflow: "hidden" }}>
                  {["single", "range"].map(m => (
                    <button key={m} type="button" onClick={() => { setMode(m); setError(""); }}
                      className="mono"
                      style={{
                        border: "none", padding: "6px 12px", fontSize: 11.5,
                        background: mode === m ? "#2A3038" : "transparent",
                        color: mode === m ? "#EDE7D9" : "#8A8F98"
                      }}>
                      {m === "single" ? "Single month" : "Date range"}
                    </button>
                  ))}
                </div>
              )}
           
              {editingId && (
                <button type="button" onClick={resetDraft} className="row-btn" style={{ gap: 4 }}>
                  <X size={13} /> cancel
                </button>
              )}
           
            </div>
          </div>

          {mode === "single" || editingId ? (
            <form onSubmit={submitDraft}>
              <div className="form-grid" style={{ marginBottom: 10 }}>
                <div>
                  <Label>Year</Label>
                  <select value={draft.year} onChange={e => setDraft({ ...draft, year: Number(e.target.value) })}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Month</Label>
                  <select value={draft.month} onChange={e => setDraft({ ...draft, month: Number(e.target.value) })}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Amount ({currencySymbol})</Label>
                  <input type="number" min="0" step="any" placeholder="0" value={draft.amount}
                    onChange={e => setDraft({ ...draft, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Source</Label>
                  <input list="sources-single" value={draft.source} onChange={e => setDraft({ ...draft, source: e.target.value })} />
                  <datalist id="sources-single">
                    {SOURCE_PRESETS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Label>Notes</Label>
                <input placeholder="Optional — e.g. client name, bonus, raise…" value={draft.notes}
                  onChange={e => setDraft({ ...draft, notes: e.target.value })} />
              </div>
              {error && <div style={{ color: "#C1665A", fontSize: 12.5, marginBottom: 10 }} className="mono">{error}</div>}
              <button type="submit" style={{
                background: "#C9A227", color: "#14181C", border: "none", borderRadius: 3,
                padding: "10px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center"
              }}>
                <Plus size={14} /> {editingId ? "Save changes" : "Add entry"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitRange}>
              <div className="range-endpoints" style={{ marginBottom: 10 }}>
                <div>
                  <Label>From</Label>
                  <div className="range-endpoint-inner">
                    <select value={rangeDraft.startMonth} onChange={e => setRangeDraft({ ...rangeDraft, startMonth: Number(e.target.value) })}>
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={rangeDraft.startYear} onChange={e => setRangeDraft({ ...rangeDraft, startYear: Number(e.target.value) })}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>To</Label>
                  <div className="range-endpoint-inner">
                    <select value={rangeDraft.endMonth} onChange={e => setRangeDraft({ ...rangeDraft, endMonth: Number(e.target.value) })}>
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={rangeDraft.endYear} onChange={e => setRangeDraft({ ...rangeDraft, endYear: Number(e.target.value) })}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Amount / month ({currencySymbol})</Label>
                  <input type="number" min="0" step="any" placeholder="0" value={rangeDraft.amount}
                    onChange={e => setRangeDraft({ ...rangeDraft, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Source</Label>
                  <input list="sources-range" value={rangeDraft.source} onChange={e => setRangeDraft({ ...rangeDraft, source: e.target.value })} />
                  <datalist id="sources-range">
                    {SOURCE_PRESETS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Label>Notes</Label>
                <input placeholder="Optional — applied to every month in the range" value={rangeDraft.notes}
                  onChange={e => setRangeDraft({ ...rangeDraft, notes: e.target.value })} />
              </div>
              {error && <div style={{ color: "#C1665A", fontSize: 12.5, marginBottom: 10 }} className="mono">{error}</div>}
              <button type="submit" style={{
                background: "#C9A227", color: "#14181C", border: "none", borderRadius: 3,
                padding: "10px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center"
              }}>
                <Plus size={14} /> Add {(() => {
                  const n = monthsBetween(rangeDraft.startYear, rangeDraft.startMonth, rangeDraft.endYear, rangeDraft.endMonth).length;
                  return n > 0 ? `${n} month${n === 1 ? "" : "s"}` : "range";
                })()}
              </button>
            </form>
          )}
           
        </div>

        {/* Targets & Goal Calculator toggles */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setShowTargets(s => !s)} className="mono"
            style={{ display: "flex", alignItems: "center", gap: 6, background: showTargets ? "#2A3038" : "#1A1F25", border: "1px solid #2A3038", color: "#D8D2C4", padding: "7px 12px", borderRadius: 3, fontSize: 12 }}>
            <Target size={13} /> Yearly Targets <ChevronDown size={12} style={{ transform: showTargets ? "rotate(180deg)" : "none" }} />
          </button>
          <button onClick={() => setShowCalculator(s => !s)} className="mono"
            style={{ display: "flex", alignItems: "center", gap: 6, background: showCalculator ? "#2A3038" : "#1A1F25", border: "1px solid #2A3038", color: "#D8D2C4", padding: "7px 12px", borderRadius: 3, fontSize: 12 }}>
            <Calculator size={13} /> Goal calculator <ChevronDown size={12} style={{ transform: showCalculator ? "rotate(180deg)" : "none" }} />
          </button>
        </div>

        {showTargets && (
          <div style={{ background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: "16px 20px", marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#8A8F98", marginBottom: 12 }}>
              MONTHLY TARGET, BY YEAR — leave blank for no target
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
              {YEARS.filter(y => y <= CURRENT_YEAR).map(y => (
                <div key={y}>
                  <Label>{y}</Label>
                  <input type="number" min="0" placeholder={`${currencySymbol} / mo`} value={(coinsTargets as any)[y] ?? ""}
                    onChange={e => {
                      const v = e.target.value;
                      const next: Record<number, string> = { ...coinsTargets } as any;
                      if (v === "") delete next[y]; else next[y] = v;
                      persistTargets(next);
                    }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {showCalculator && (
          <div style={{ background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: "16px 20px", marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#8A8F98", marginBottom: 12 }}>
              REVERSE GOAL CALCULATOR
            </div>
            <div style={{ display: "flex", background: "#14181C", border: "1px solid #2A3038", borderRadius: 3, overflow: "hidden", width: "fit-content", marginBottom: 14 }}>
              {[["forward", "Going forward"], ["career", "Career-wide by a date"]].map(([m, l]) => (
                <button key={m} type="button" onClick={() => setCalcMode(m as any)} className="mono"
                  style={{ border: "none", padding: "6px 12px", fontSize: 11.5, background: calcMode === m ? "#2A3038" : "transparent", color: calcMode === m ? "#EDE7D9" : "#8A8F98" }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ width: 160, maxWidth: "100%", flex: "1 1 140px" }}>
                <Label>Target avg / month ({currencySymbol})</Label>
                <input type="number" min="0" value={calcTarget} onChange={e => setCalcTarget(e.target.value)} />
              </div>
              {calcMode === "career" && (
                <div>
                  <Label>By</Label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select value={calcEndMonth} onChange={e => setCalcEndMonth(Number(e.target.value))}>
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={calcEndYear} onChange={e => setCalcEndYear(Number(e.target.value))}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}
           
            </div>

            {(goalResult.error || '') && <div className="mono" style={{ color: "#C1665A", fontSize: 12.5 }}>{(goalResult.error || '')}</div>}

            {!(goalResult.error || '') && goalResult.forward && (
              <div style={{ fontSize: 14, color: "#D8D2C4", lineHeight: 1.6 }}>
                This one's direct — average {formatCurrency((goalResult.target || 0))}/month from here on, no catch-up needed since it only looks forward, not at past months.
              </div>
            )}
           

            {!(goalResult.error || '') && !goalResult.forward && (
              <div style={{ fontSize: 14, color: "#D8D2C4", lineHeight: 1.6 }}>
                To average {formatCurrency((goalResult.target || 0))}/month across your <em>entire</em> career ({CAREER_START_YEAR}–{calcEndYear}) by {MONTHS[calcEndMonth - 1]} {calcEndYear},
                you'd need {formatCurrency(Math.round((goalResult.requiredTotal || 0)))} total. You've logged {formatCurrency(Math.round((stats?.total || 0) as number))} so far, so that's
                {formatCurrency(Math.round((goalResult.stillNeeded || 0) as number))} still needed over the {(goalResult.remainingMonths || 0)} months remaining —
                <strong style={{ color: "#C9A227" }}> {formatCurrency(Math.round((goalResult.neededPerMonth || 0) as number))}/month</strong> from here.
              </div>
            )}
           
          </div>
        )}

        {/* Summary strip */}
        {stats && (
          <div className="summary-grid" style={{ display: "grid", gap: 1, background: "#2A3038", marginBottom: 32, border: "1px solid #2A3038" }}>
            <SummaryCell icon={<Wallet size={15} />} label="Total earned" value={`${formatCurrency(stats.total)}`} sub="" />
            <SummaryCell icon={<Calendar size={15} />} label="Career avg / mo" value={`${formatCurrency(Math.round(stats.avgPerCareerMonth))}`} sub={`all ${stats.careerMonths} months since 2015`} />
            <SummaryCell icon={<TrendingUp size={15} />} label="Avg / logged mo" value={`${formatCurrency(Math.round(stats.avgPerLoggedMonth))}`} sub={`${stats.monthsLogged} months logged`} />
            <SummaryCell icon={<Award size={15} />} label="Best month" value={`${formatCurrency(Math.round((stats.highest?.total || 0)))}`} sub={`${MONTHS[(stats.highest?.month || 1) - 1]} ${(stats.highest?.year || 2015)}`} />
            <SummaryCell icon={<Calendar size={15} />} label="Coverage" value={`${stats.coveragePct.toFixed(0)}%`} sub="of career logged" />
          </div>
        )}

        {/* Key insights */}
        {insights.length > 0 && (
          <div style={{ background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: "18px 20px", marginBottom: 32 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#8A8F98", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Lightbulb size={13} /> KEY INSIGHTS
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.map((line, i) => (
                <li key={i} style={{ fontSize: 14, color: "#D8D2C4", lineHeight: 1.5 }}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing months */}
        {stats && stats.missingRanges.length > 0 && (
          <div style={{ background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: "18px 20px", marginBottom: 32 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#8A8F98", marginBottom: 14 }}>
              MISSING MONTHS — {stats.careerMonths - stats.monthsLogged} of {stats.careerMonths}
            </div>

            {/* Year x month grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16, overflowX: "auto" }}>
              {YEARS.filter(y => y <= CURRENT_YEAR).map(y => (
                <div key={y} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="mono" style={{ width: 30, fontSize: 10, color: "#5E6570", flexShrink: 0 }}>{y}</div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {MONTHS.map((m, i) => {
                      const mm = i + 1;
                      const inCareer = y > CAREER_START_YEAR || (y === CAREER_START_YEAR && mm >= CAREER_START_MONTH);
                      const inPast = y < CURRENT_YEAR || (y === CURRENT_YEAR && mm <= CURRENT_MONTH);
                      const relevant = inCareer && inPast;
                      const logged = relevant && stats.loggedSet.has(monthKey(y, mm));
                      return (
                        <div key={m} title={relevant ? `${m} ${y} — ${logged ? "logged" : "missing"}` : ""}
                          style={{
                            width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                            background: !relevant ? "transparent" : logged ? "#C9A227" : "#2A3038",
                            border: relevant && !logged ? "1px solid #3A424C" : "none"
                          }} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
              <div className="mono" style={{ fontSize: 10.5, color: "#8A8F98", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#C9A227", display: "inline-block" }} /> logged
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "#8A8F98", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, border: "1px solid #3A424C", display: "inline-block" }} /> missing
              </div>
            </div>

            {/* List of gaps, easiest to act on with the range form above */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stats.missingRanges.map((r, i) => {
                const label = r.count === 1
                  ? `${MONTHS[r.startMonth - 1]} ${r.startYear}`
                  : `${MONTHS[r.startMonth - 1]} ${r.startYear} – ${MONTHS[r.endMonth - 1]} ${r.endYear}`;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#D8D2C4", borderTop: "1px solid #1F252C", paddingTop: 6 }}>
                    <span>{label}</span>
                    <span className="mono" style={{ color: "#5E6570", fontSize: 11.5 }}>{r.count} mo</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analytics charts */}
        {stats && stats.yearTrend.length > 0 && (
          <div className="charts-grid-2" style={{ marginBottom: 20 }}>
            <ChartCard title="Yearly total">
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={yearlyWithTargets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3038" vertical={false} />
                  <XAxis dataKey="year" stroke="#5E6570" fontSize={11} tickLine={false} axisLine={{ stroke: "#2A3038" }} />
                  <YAxis stroke="#5E6570" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
                  <Tooltip contentStyle={{ background: "#1E242A", border: "1px solid #333B44", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                    formatter={(v, name) => [`${formatCurrency(Number(v) || 0)}`, name === "target" ? "Target" : "Total"]} />
                  <Bar dataKey="total" fill="#C9A227" radius={[2, 2, 0, 0]} />
                  {targetSummary && <Line type="stepAfter" dataKey="target" stroke="#8AA9C9" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: "#8AA9C9" }} connectNulls />}
                </ComposedChart>
              </ResponsiveContainer>
              {targetSummary && (
                <div className="mono" style={{ fontSize: 11, color: "#8A8F98", marginTop: 8 }}>
                  Hit target in {targetSummary.hit} of {targetSummary.total} years with a target set · dashed line = target
                </div>
              )}
           
            </ChartCard>
            <ChartCard title="By source">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stats.sourceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={38}>
                    {stats.sourceBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1E242A", border: "1px solid #333B44", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                    formatter={v => `${formatCurrency(Number(v) || 0)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 4, justifyContent: "center" }}>
                {stats.sourceBreakdown.map((s, i) => (
                  <div key={s.name} className="mono" style={{ fontSize: 11, color: "#8A8F98", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
                    {s.name} · {s.pct.toFixed(0)}%
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        )}

        {stats && stats.cumulative.length > 1 && (
          <ChartCard title="Cumulative career coins" style={{ marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={stats.cumulative}>
                <defs>
                  <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3038" vertical={false} />
                <XAxis dataKey="label" stroke="#5E6570" fontSize={10} tickLine={false} axisLine={{ stroke: "#2A3038" }}
                  interval={Math.ceil(stats.cumulative.length / 8)} />
                <YAxis stroke="#5E6570" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
                <Tooltip contentStyle={{ background: "#1E242A", border: "1px solid #333B44", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  formatter={v => [`${formatCurrency(Number(v) || 0)}`, "Cumulative"]} />
                <Area type="monotone" dataKey="cumulative" stroke="#C9A227" strokeWidth={2} fill="url(#cumFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <div className={`charts-grid-2 ${stats && stats.yoyGrowth.length > 0 ? "even" : ""}`} style={{ marginBottom: 32 }}>
          {stats && stats.trendLine.length > 1 && (
            <ChartCard title="Month-by-month trend">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={stats.trendLine}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3038" vertical={false} />
                  <XAxis dataKey="label" stroke="#5E6570" fontSize={10} tickLine={false} axisLine={{ stroke: "#2A3038" }}
                    interval={Math.ceil(stats.trendLine.length / 8)} />
                  <YAxis stroke="#5E6570" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
                  <Tooltip contentStyle={{ background: "#1E242A", border: "1px solid #333B44", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                    formatter={v => [`${formatCurrency(Number(v) || 0)}`, "Total"]} />
                  <Line type="monotone" dataKey="total" stroke="#7FA87A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
           
          {stats && stats.yoyGrowth.length > 0 && (
            <ChartCard title="Year-over-year growth">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={stats.yoyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3038" vertical={false} />
                  <XAxis dataKey="year" stroke="#5E6570" fontSize={11} tickLine={false} axisLine={{ stroke: "#2A3038" }} />
                  <YAxis stroke="#5E6570" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#1E242A", border: "1px solid #333B44", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                    formatter={v => [`${Number(v).toFixed(0)}%`, "Growth"]} />
                  <ReferenceLine y={0} stroke="#333B44" />
                  <Bar dataKey="pct" radius={[2, 2, 2, 2]}>
                    {stats.yoyGrowth.map((entry, i) => (
                      <Cell key={i} fill={entry.pct >= 0 ? "#7FA87A" : "#C1665A"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
           
        </div>

        {stats && stats.allSources.length > 1 && stats.stackedByYear.length > 0 && (
          <ChartCard title="Source mix by year" style={{ marginBottom: 32 }}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={stats.stackedByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3038" vertical={false} />
                <XAxis dataKey="year" stroke="#5E6570" fontSize={11} tickLine={false} axisLine={{ stroke: "#2A3038" }} />
                <YAxis stroke="#5E6570" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
                <Tooltip contentStyle={{ background: "#1E242A", border: "1px solid #333B44", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  formatter={v => `${formatCurrency(Number(v) || 0)}`} />
                {stats.allSources.map((s, i) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={PALETTE[i % PALETTE.length]} radius={i === stats.allSources.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, justifyContent: "center" }}>
              {stats.allSources.map((s, i) => (
                <div key={s} className="mono" style={{ fontSize: 11, color: "#8A8F98", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
                  {s}
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* Ledger table */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div className="mono" style={{ fontSize: 11.5, letterSpacing: "0.05em", color: "#8A8F98" }}>
            LEDGER {coinsEntries.length > 0 && `— ${filteredEntries.length}${filtersActive ? ` of ${coinsEntries.length}` : ""} ${filteredEntries.length === 1 ? "entry" : "entries"}`}
          </div>
          {coinsEntries.length > 0 && (
            <button onClick={() => setShowFilters(s => !s)} className="mono"
              style={{ display: "flex", alignItems: "center", gap: 6, background: showFilters || filtersActive ? "#2A3038" : "#1A1F25", border: "1px solid #2A3038", color: "#D8D2C4", padding: "6px 10px", borderRadius: 3, fontSize: 11 }}>
              <Filter size={12} /> Filter{filtersActive ? " (active)" : ""}
            </button>
          )}
           
        </div>

        {showFilters && (
          <div style={{ background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 10 }}>
              <div>
                <Label>Source</Label>
                <select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })}>
                  <option value="all">All sources</option>
                  {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>From year</Label>
                <select value={filters.fromYear} onChange={e => setFilters({ ...filters, fromYear: Number(e.target.value) })}>
                  {YEARS.filter(y => y <= CURRENT_YEAR).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <Label>To year</Label>
                <select value={filters.toYear} onChange={e => setFilters({ ...filters, toYear: Number(e.target.value) })}>
                  {YEARS.filter(y => y <= CURRENT_YEAR).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <Label>Min amount ({currencySymbol})</Label>
                <input type="number" min="0" placeholder="—" value={filters.minAmount} onChange={e => setFilters({ ...filters, minAmount: e.target.value })} />
              </div>
              <div>
                <Label>Max amount ({currencySymbol})</Label>
                <input type="number" min="0" placeholder="—" value={filters.maxAmount} onChange={e => setFilters({ ...filters, maxAmount: e.target.value })} />
              </div>
              <div>
                <Label>Search notes</Label>
                <input placeholder="e.g. bonus, client name…" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
              </div>
            </div>
            {filtersActive && (
              <button onClick={() => setFilters({ source: "all", fromYear: CAREER_START_YEAR, toYear: CURRENT_YEAR, minAmount: "", maxAmount: "", search: "" })}
                className="row-btn mono" style={{ fontSize: 11.5, gap: 4 }}>
                <X size={12} /> clear filters
              </button>
            )}
           
            <div className="mono" style={{ fontSize: 10.5, color: "#5E6570", marginTop: 8 }}>
              Filters only affect the table below — charts and totals above still reflect everything logged.
            </div>
          </div>
        )}

        {activeYears.length === 0 && (
          <div style={{ color: "#5E6570", fontSize: 14, padding: "24px 0", borderTop: "1px solid #2A3038" }}>
            {coinsEntries.length === 0
              ? "No entries yet. Add your first month above — start wherever you have records, no need to go in order."
              : "No entries match these filters."}
          </div>
        )}

        {activeYears.map(year => {
          const list = coinsEntriesByYear[year] || [];
          const yearTotal = list.reduce((s: number, e: CoinsEntry) => s + e.amount, 0);
          const isOpen = expandedYear === year;
          return (
            <div key={year} style={{ border: "1px solid #2A3038", borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
              <button
                onClick={() => setExpandedYear(isOpen ? null : (year as any))}
                style={{
                  width: "100%", background: "#1A1F25", border: "none", padding: "12px 16px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", color: "#EDE7D9"
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600 }}>{year}</span>
                <span className="mono" style={{ fontSize: 13, color: "#C9A227" }}>{formatCurrency(yearTotal)}</span>
              </button>
              {isOpen && (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Month</th>
                        <th style={{ width: 110 }}>Amount</th>
                        <th style={{ width: 110 }}>Source</th>
                        <th>Notes</th>
                        <th style={{ width: 64 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((en: CoinsEntry) => (
                        <tr key={en.id}>
                          <td>{MONTHS[en.month - 1]}</td>
                          <td className="mono">{formatCurrency(en.amount)}</td>
                          <td style={{ color: "#8A8F98" }}>{en.source}</td>
                          <td style={{ color: "#8A8F98", fontSize: 13 }}>{en.notes || "—"}</td>
                          <td>
                            <div style={{ display: "flex", gap: 2 }}>
                              <button className="row-btn" onClick={() => startEdit(en as CoinsEntry)}><Pencil size={13} /></button>
                              <button className="row-btn" onClick={() => removeEntry(en.id)}><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCell({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub?: string }) {
  return (
    <div style={{ background: "#1A1F25", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8A8F98", marginBottom: 8 }}>
        {icon}
        <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 11, color: "#5E6570", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, style }: { title: string, children: React.ReactNode, style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: "16px 18px", ...style }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#8A8F98", marginBottom: 10 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mono" style={{ fontSize: 10.5, color: "#5E6570", marginBottom: 4 }}>{children}</div>;
}
