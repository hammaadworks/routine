import React, {useEffect, useMemo, useState} from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Award,
    BarChart3,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    Eye,
    EyeOff,
    Filter,
    Flame,
    Layers,
    Lightbulb,
    Lock,
    Pencil,
    PieChart as PieIcon,
    Plus,
    ShieldAlert,
    ShieldCheck,
    Target,
    Trash2,
    TrendingDown,
    TrendingUp,
    Upload,
    Wallet,
    X
} from "lucide-react";
import {useCurrency} from "../hooks/useCurrency";

export interface CoinsEntry {
    id: string;
    year: number;
    month: number;
    amount: number;
    source: string;
    notes: string;
}

export interface CoinsStats {
    total: number;
    avgPerCareerMonth: number;
    avgPerLoggedMonth: number;
    bestYear: { total: number; year: number };
    highest: { total: number; year: number; month: number; sources?: string[] };
    lowestNonZero: { total: number; year: number; month: number };
    careerMonths: number;
    monthsLogged: number;
    positiveMonthsLogged: number;
    zeroMonthsLogged: number;
    unloggedMonthsCount: number;
    coveragePct: number;
    yearTrend: Array<{ year: number; total: number }>;
    yoyGrowth: Array<{ year: number; pct: number }>;
    stackedByYear: any[];
    allSources: string[];
    missingRanges: any[];
    loggedSet: Set<string>;
    positiveMonthSet: Set<string>;
    zeroMonthSet: Set<string>;
    byMonthMap: Record<string, { total: number; sources: string[]; notes: string[] }>;
    sourceBreakdown: Array<{ name: string; value: number; pct: number }>;
    trendLine: Array<{ label: string; total: number; year: number; month: number }>;
    cumulative: Array<{ label: string; cumulative: number; year: number; month: number }>;
    longestGap: number;
    currentPositiveStreak: number;
    longestPositiveStreak: number;
    topSource?: { name: string; value: number; pct: number };
    sortedMonthTotals: Array<{ year: number; month: number; total: number; sources: string[] }>;
    trailing12Mean: number;
    trailing12StdDev: number;
    volatilityCV: number;
    momentum3MoAvg: number;
    momentum12MoAvg: number;
    momentumRatio: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CAREER_START_YEAR = 2015;
const CAREER_START_MONTH = 1;
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const TODAY_STR = NOW.toISOString().slice(0, 10);
const YEARS = Array.from({length: CURRENT_YEAR - CAREER_START_YEAR + 3}, (_, i) => CAREER_START_YEAR + i);
const SOURCE_PRESETS = ["Startup", "Dividend", "Job", "Freelance", "Consulting", "Investment", "Product", "Broke / Nil", "Other"];
const PALETTE = ["#C9A227", "#7FA87A", "#8AA9C9", "#C1665A", "#A78BC9", "#E5A84B", "#6FA3A0", "#D97706"];

function monthKey(y: number, m: number) {
    return `${y}-${m}`;
}

function addMonthsToToday(months: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
}

function emptyRangeDraft() {
    return {
        startYear: CAREER_START_YEAR,
        startMonth: 1,
        endYear: CURRENT_YEAR,
        endMonth: CURRENT_MONTH,
        amount: "",
        source: "Job",
        notes: ""
    };
}

function monthsBetween(sy: number, sm: number, ey: number, em: number) {
    const out: Array<{ year: number; month: number }> = [];
    let y = sy;
    let m = sm;
    const startIdx = sy * 12 + sm;
    const endIdx = ey * 12 + em;
    if (startIdx > endIdx) return out;
    while (y * 12 + m <= endIdx) {
        out.push({year: y, month: m});
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }
    return out;
}

export default function CoinsPane({
                                      isPublicView, walletTotal, onNavigateToMoneyGoals, walletGoals = []
                                  }: {
    isPublicView?: boolean; walletTotal?: number; onNavigateToMoneyGoals?: () => void; walletGoals?: any[];
}) {
    const {formatCurrency, currencySymbol} = useCurrency();

    const [coinsEntries, setEntries] = useState<CoinsEntry[]>([]);
    const [isRevealed, setIsRevealed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

    // Unified Form: No redundant single-stream tab!
    // Mode is either "monthly" (supports 1 or more streams seamlessly) or "range"
    const [mode, setMode] = useState<"monthly" | "range">("monthly");
    const [entryYear, setEntryYear] = useState(CURRENT_YEAR);
    const [entryMonth, setEntryMonth] = useState(CURRENT_MONTH);
    const [streamRows, setStreamRows] = useState<Array<{
        id: string;
        source: string;
        amount: string;
        notes: string
    }>>([{id: "1", source: "Job", amount: "", notes: ""}]);

    // Single entry editing state (when editing an existing entry from table)
    const [editingEntry, setEditingEntry] = useState<CoinsEntry | null>(null);

    const [rangeDraft, setRangeDraft] = useState(emptyRangeDraft());
    const [expandedYear, setExpandedYear] = useState<number | null>(CURRENT_YEAR);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [importMsg, setImportMsg] = useState("");
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [coinsTargets, setTargets] = useState<Record<string, number>>({});

    // Accordion states: independent open/close
    const [openSections, setOpenSections] = useState({
        form: true, overview: true, targets: true, ledger: true
    });

    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections(prev => ({...prev, [key]: !prev[key]}));
    };

    const setAllSections = (open: boolean) => {
        setOpenSections({
            form: open, overview: open, targets: open, ledger: open
        });
    };

    // Targets section view controls
    const [targetActiveTab, setTargetActiveTab] = useState<"yearly" | "wallet" | "career">("yearly");
    const [showAllTargetYears, setShowAllTargetYears] = useState(false);
    const [yearlyChartMode, setYearlyChartMode] = useState<"annual" | "monthly">("annual");

    // Wallet goals funding calculator state (MULTİ-SELECT, EDITABLE TARGET AMOUNT, EDITABLE DEADLINE)
    const pendingWalletGoals = useMemo(() => {
        return walletGoals.filter((g: any) => {
            const cost = Number(g.cost || 0);
            return cost > 0 && !g.isCompleted && !g.completed;
        });
    }, [walletGoals]);

    const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(() => {
        return new Set(pendingWalletGoals.map(g => g.id));
    });

    // Sync selectedGoalIds if goals are loaded late
    useEffect(() => {
        if (pendingWalletGoals.length > 0) {
            setSelectedGoalIds(prev => {
                if (prev.size === 0) {
                    return new Set(pendingWalletGoals.map(g => g.id));
                }
                return prev;
            });
        }
    }, [pendingWalletGoals]);

    const selectedGoalsSum = useMemo(() => {
        return pendingWalletGoals
            .filter(g => selectedGoalIds.has(g.id))
            .reduce((sum, g) => sum + (Number(g.cost) || 0), 0);
    }, [pendingWalletGoals, selectedGoalIds]);

    const [customTargetAmount, setCustomTargetAmount] = useState<string>("");
    const [targetDeadline, setTargetDeadline] = useState<string>(() => addMonthsToToday(6));

    const effectiveTargetAmount = useMemo(() => {
        if (customTargetAmount.trim() !== "") {
            const parsed = parseFloat(customTargetAmount);
            return isNaN(parsed) ? 0 : parsed;
        }
        return selectedGoalsSum;
    }, [customTargetAmount, selectedGoalsSum]);

    // Forward-Looking Wallet Funding Calculator (Strictly forward from TODAY, ZERO past run-rate account)
    const walletFundingCalc = useMemo(() => {
        if (effectiveTargetAmount <= 0) {
            return {
                targetAmount: 0,
                daysRemaining: 0,
                monthsRemaining: 0,
                neededPerMonth: 0,
                neededPerDay: 0,
                targetDateFormatted: "—",
                error: "Select at least one goal or enter a target amount."
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDateObj = new Date(targetDeadline);
        targetDateObj.setHours(23, 59, 59, 999);

        const msDiff = targetDateObj.getTime() - today.getTime();
        if (isNaN(msDiff) || msDiff <= 0) {
            return {
                targetAmount: effectiveTargetAmount,
                daysRemaining: 0,
                monthsRemaining: 0,
                neededPerMonth: 0,
                neededPerDay: 0,
                targetDateFormatted: "—",
                error: "Target deadline must be in the future."
            };
        }

        const daysRemaining = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
        const monthsRemaining = Math.max(0.1, daysRemaining / 30.4375);

        const neededPerDay = Math.round(effectiveTargetAmount / daysRemaining);
        const neededPerMonth = Math.round(effectiveTargetAmount / monthsRemaining);

        const targetDateFormatted = targetDateObj.toLocaleDateString("en-US", {
            day: "numeric", month: "short", year: "numeric"
        });

        return {
            targetAmount: effectiveTargetAmount,
            daysRemaining,
            monthsRemaining,
            neededPerMonth,
            neededPerDay,
            targetDateFormatted,
            error: null
        };
    }, [effectiveTargetAmount, targetDeadline]);

    // Career Average Target Calculator state
    const [calcTarget, setCalcTarget] = useState("");

    // Ledger filters
    const [filters, setFilters] = useState({
        source: "all", fromYear: CAREER_START_YEAR, toYear: CURRENT_YEAR + 1, minAmount: "", maxAmount: "", search: ""
    });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        setIsRevealed(false);
    }, [isPublicView]);

    useEffect(() => {
        const reload = () => {
            try {
                const res = localStorage.getItem("whatchadoin_coins_entries");
                if (res) setEntries(JSON.parse(res));
            } catch {
                // fresh ledger
            }
            try {
                const res2 = localStorage.getItem("whatchadoin_coins_targets");
                if (res2) setTargets(JSON.parse(res2));
            } catch {
                // no coinsTargets set yet
            } finally {
                setLoaded(true);
            }
        };

        reload();
        const handleStorage = (e: StorageEvent) => {
            if (e.key === "whatchadoin_coins_entries" && e.newValue) setEntries(JSON.parse(e.newValue));
            if (e.key === "whatchadoin_coins_targets" && e.newValue) setTargets(JSON.parse(e.newValue));
        };
        const handleCoinsUpdated = () => reload();
        const handleFab = () => {
            setMode("monthly");
            setEntryYear(CURRENT_YEAR);
            setEntryMonth(CURRENT_MONTH);
            setEditingEntry(null);
            setOpenSections(prev => ({...prev, form: true}));
            setTimeout(() => {
                const inputEl = document.getElementById("stream-amt-0");
                if (inputEl) {
                    inputEl.scrollIntoView({behavior: "smooth", block: "center"});
                    inputEl.focus();
                }
            }, 100);
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

    async function persistTargets(next: any) {
        setTargets(next);
        try {
            localStorage.setItem("whatchadoin_coins_targets", JSON.stringify(next));
            window.dispatchEvent(new Event("whatchadoin_coins_updated"));
        } catch {
            // failed
        }
    }

    async function persist(next: CoinsEntry[]) {
        setEntries(next);
        setSaveState("saving");
        try {
            localStorage.setItem("whatchadoin_coins_entries", JSON.stringify(next));
            window.dispatchEvent(new Event("whatchadoin_coins_updated"));
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 1200);
        } catch {
            setSaveState("error");
            setTimeout(() => setSaveState("idle"), 2000);
        }
    }

    function exportJSON() {
        const payload = {exportedAt: new Date().toISOString(), coinsEntries, coinsTargets};
        const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
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
        const blob = new Blob([csv], {type: "text/csv"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `coins-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function triggerImport() {
        setImportMsg("");
        fileInputRef.current?.click();
    }

    function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result as string);
                const incoming: any[] | null = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.coinsEntries) ? parsed.coinsEntries : null);
                if (!incoming) {
                    setImportMsg("Failed to parse JSON backup file.");
                    return;
                }
                const existingIds = new Set(coinsEntries.map(en => en.id));
                let added = 0;
                const toAdd: CoinsEntry[] = [];
                incoming.forEach((en: any) => {
                    if (!en || !en.year || !en.month || typeof en.amount !== "number") return;
                    const id = en.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                    if (existingIds.has(id)) return;
                    existingIds.add(id);
                    toAdd.push({
                        id,
                        year: Number(en.year),
                        month: Number(en.month),
                        amount: Number(en.amount),
                        source: String(en.source || "Other"),
                        notes: String(en.notes || "")
                    });
                    added++;
                });
                if (toAdd.length > 0) void persist([...coinsEntries, ...toAdd]);
                if (parsed.coinsTargets && typeof parsed.coinsTargets === "object") {
                    void persistTargets({...coinsTargets, ...parsed.coinsTargets});
                }
                setImportMsg(`Imported ${added} entries successfully.`);
                setTimeout(() => setImportMsg(""), 3500);
            } catch {
                setImportMsg("Failed to parse JSON backup file.");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    }

    // Unified Monthly Income submission (supports 1 or more stream rows seamlessly, including honest ₹0/broke entries!)
    function submitMonthlyStreams(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccessMsg("");

        const validStreams = streamRows.filter(s => {
            const trimmed = s.amount.trim();
            const a = parseFloat(trimmed);
            return !isNaN(a) && a >= 0 && s.source.trim().length > 0;
        });

        if (validStreams.length === 0) {
            setError("Please enter at least one stream with a valid amount (₹0 or greater) and source.");
            return;
        }

        const newEntries: CoinsEntry[] = validStreams.map((s, idx) => ({
            id: `${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
            year: entryYear,
            month: entryMonth,
            amount: parseFloat(s.amount),
            source: s.source.trim(),
            notes: s.notes.trim()
        }));

        const totalAdded = newEntries.reduce((s, en) => s + en.amount, 0);
        void persist([...coinsEntries, ...newEntries]);
        setExpandedYear(entryYear);
        if (totalAdded === 0) {
            setSuccessMsg(`Documented zero income (${formatCurrency(0)}) for ${MONTHS[entryMonth - 1]} ${entryYear}. Recorded as an honest, completed month!`);
        } else {
            setSuccessMsg(`Successfully logged ${newEntries.length} stream${newEntries.length === 1 ? "" : "s"} totaling ${formatCurrency(totalAdded)} for ${MONTHS[entryMonth - 1]} ${entryYear}!`);
        }

        // Reset stream rows to 1 clean row while keeping entryYear & entryMonth
        setStreamRows([{id: Date.now().toString(36), source: "Job", amount: "", notes: ""}]);
        setTimeout(() => setSuccessMsg(""), 4500);
    }

    // Single entry edit submission
    function submitEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingEntry) return;
        setError("");
        const amt = Number(editingEntry.amount);
        if (isNaN(amt) || amt < 0) {
            setError("Please enter a valid amount.");
            return;
        }
        const updated = coinsEntries.map(en => en.id === editingEntry.id ? editingEntry : en);
        void persist(updated);
        setExpandedYear(editingEntry.year);
        setSuccessMsg(`Updated ${MONTHS[editingEntry.month - 1]} ${editingEntry.year} (${editingEntry.source}).`);
        setEditingEntry(null);
        setTimeout(() => setSuccessMsg(""), 3500);
    }

    function addStreamRow(presetSource?: string, presetAmount?: string) {
        setStreamRows(prev => {
            const first = prev[0];
            if (prev.length === 1 && first && first.amount === "" && (first.source === "Job" || !first.source) && presetSource) {
                return [{
                    id: first.id,
                    source: presetSource,
                    amount: presetAmount !== undefined ? presetAmount : (presetSource === "Broke / Nil" ? "0" : ""),
                    notes: presetSource === "Broke / Nil" ? "Documented zero income (broke / gap)" : ""
                }];
            }
            return [...prev, {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                source: presetSource || "Other",
                amount: presetAmount !== undefined ? presetAmount : (presetSource === "Broke / Nil" ? "0" : ""),
                notes: presetSource === "Broke / Nil" ? "Documented zero income (broke / gap)" : ""
            }];
        });
    }

    function updateStreamRow(id: string, field: "source" | "amount" | "notes", val: string) {
        setStreamRows(prev => prev.map(row => row.id === id ? {...row, [field]: val} : row));
    }

    function removeStreamRow(id: string) {
        if (streamRows.length <= 1) return;
        setStreamRows(prev => prev.filter(row => row.id !== id));
    }

    function submitRange(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        const amt = parseFloat(rangeDraft.amount);
        if (isNaN(amt) || amt < 0) {
            setError("Enter a valid amount (₹0 or greater).");
            return;
        }
        const months = monthsBetween(rangeDraft.startYear, rangeDraft.startMonth, rangeDraft.endYear, rangeDraft.endMonth);
        if (months.length === 0) {
            setError("End month must be on or after start month.");
            return;
        }

        const newEntries: CoinsEntry[] = months.map(({year, month}, i) => ({
            id: `${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 5)}`,
            year,
            month,
            amount: amt,
            source: rangeDraft.source,
            notes: rangeDraft.notes
        }));
        void persist([...coinsEntries, ...newEntries]);
        setExpandedYear(rangeDraft.endYear);
        if (amt === 0) {
            setSuccessMsg(`Logged ${months.length} monthly entries of ₹0.00 each (${months.length} months documented as zero income).`);
        } else {
            setSuccessMsg(`Logged ${months.length} monthly entries of ${formatCurrency(amt)} each (${formatCurrency(amt * months.length)} total).`);
        }
        setRangeDraft(emptyRangeDraft());
        setTimeout(() => setSuccessMsg(""), 3500);
    }

    function startEdit(en: CoinsEntry) {
        setEditingEntry({...en});
        setOpenSections(prev => ({...prev, form: true}));
        setTimeout(() => {
            const inputEl = document.getElementById("edit-amount-input");
            if (inputEl) {
                inputEl.scrollIntoView({behavior: "smooth", block: "center"});
                inputEl.focus();
            }
        }, 100);
    }

    function removeEntry(id: string) {
        void persist(coinsEntries.filter(en => en.id !== id));
        if (editingEntry?.id === id) setEditingEntry(null);
    }

    const handleFillMissingRange = (r: {
        startYear: number;
        startMonth: number;
        endYear: number;
        endMonth: number
    }) => {
        setMode("range");
        setRangeDraft({
            startYear: r.startYear,
            startMonth: r.startMonth,
            endYear: r.endYear,
            endMonth: r.endMonth,
            amount: "",
            source: "Job",
            notes: ""
        });
        setEditingEntry(null);
        setOpenSections(prev => ({...prev, form: true}));
        setTimeout(() => {
            const inputEl = document.getElementById("coins-entry-form");
            if (inputEl) {
                inputEl.scrollIntoView({behavior: "smooth", block: "center"});
            }
        }, 100);
    };

    // Public / Private Visibility
    const isCoinPublic = (e: CoinsEntry) => (e.notes || "").includes("[public]") || (e.source || "").includes("[public]");
    const visibleEntries = useMemo(() => {
        if (!isPublicView || isRevealed) return coinsEntries;
        return coinsEntries.filter(isCoinPublic);
    }, [coinsEntries, isPublicView, isRevealed]);

    // Dynamic Timeline: smoothly extends up to max entry year/month (so Oct 2026 or future months are never cut off!)
    const dynamicTimeline = useMemo(() => {
        let maxYear = CURRENT_YEAR;
        let maxMonth = CURRENT_MONTH;
        visibleEntries.forEach(e => {
            if (e.year > maxYear) {
                maxYear = e.year;
                maxMonth = e.month;
            } else if (e.year === maxYear && e.month > maxMonth) {
                maxMonth = e.month;
            }
        });
        return monthsBetween(CAREER_START_YEAR, CAREER_START_MONTH, maxYear, maxMonth);
    }, [visibleEntries]);

    // Deep, Intelligent Financial Analytics Engine
    const stats: CoinsStats | null = useMemo(() => {
        if (visibleEntries.length === 0) return null;
        const total = visibleEntries.reduce((s: number, e: CoinsEntry) => s + e.amount, 0);

        // Group by month
        const byMonthTotals: Record<string, { total: number; sources: Set<string>; notes: string[] }> = {};
        visibleEntries.forEach(e => {
            const k = monthKey(e.year, e.month);
            if (!byMonthTotals[k]) byMonthTotals[k] = {total: 0, sources: new Set(), notes: []};
            byMonthTotals[k]!.total += e.amount;
            if (e.source) byMonthTotals[k]!.sources.add(e.source);
            if (e.notes) byMonthTotals[k]!.notes.push(e.notes);
        });

        const monthTotalsArr = Object.entries(byMonthTotals).map(([k, v]) => {
            const [y, m] = k.split("-").map(Number);
            return {
                year: y || CURRENT_YEAR,
                month: m || CURRENT_MONTH,
                total: v.total,
                sources: Array.from(v.sources),
                notes: v.notes
            };
        });

        const monthsLogged = monthTotalsArr.length;
        // Strictly positive earning months (amount > 0)
        const positiveMonthTotalsArr = monthTotalsArr.filter(m => m.total > 0);
        const positiveMonthsLogged = positiveMonthTotalsArr.length;
        // Documented zero-earning months (amount === 0 - honest broke / hiatus records)
        const zeroMonthTotalsArr = monthTotalsArr.filter(m => m.total === 0);
        const zeroMonthsLogged = zeroMonthTotalsArr.length;

        // Career average: all career timeline months count, unlogged or 0 count as $0
        const careerMonths = Math.max(1, dynamicTimeline.length);
        const avgPerCareerMonth = Math.round(total / careerMonths);
        const avgPerLoggedMonth = positiveMonthsLogged > 0 ? Math.round(total / positiveMonthsLogged) : 0;
        // Career logging coverage: all months the user took effort to document in ledger (including honest ₹0 entries)
        const coveragePct = Math.min(100, Math.round((monthsLogged / careerMonths) * 100));
        const unloggedMonthsCount = Math.max(0, careerMonths - monthsLogged);

        const byMonthMap: Record<string, { total: number; sources: string[]; notes: string[] }> = {};
        monthTotalsArr.forEach(m => {
            byMonthMap[monthKey(m.year, m.month)] = {
                total: m.total, sources: m.sources, notes: m.notes
            };
        });

        const highest = monthTotalsArr.reduce((a, b) => (b.total > a.total ? b : a), monthTotalsArr[0] || {
            year: CURRENT_YEAR, month: CURRENT_MONTH, total: 0, sources: [] as string[], notes: [] as string[]
        });

        const lowestNonZero = positiveMonthTotalsArr.reduce((a, b) => (b.total < a.total ? b : a), positiveMonthTotalsArr[0] || {
            year: CURRENT_YEAR, month: CURRENT_MONTH, total: 0
        });

        // Year totals & YoY growth
        const byYear: Record<number, number> = {};
        visibleEntries.forEach(e => {
            byYear[e.year] = (byYear[e.year] || 0) + e.amount;
        });

        const yearTrend = Object.keys(byYear).map(Number).sort((a, b) => a - b).map(y => ({
            year: y, total: Math.round(byYear[y] || 0)
        }));

        const yoyGrowth: Array<{ year: number; pct: number }> = [];
        for (let i = 1; i < yearTrend.length; i++) {
            const prev = yearTrend[i - 1];
            const cur = yearTrend[i];
            if (prev && cur && prev.total > 0) {
                yoyGrowth.push({
                    year: cur.year, pct: Math.round(((cur.total - prev.total) / prev.total) * 100)
                });
            }
        }

        const bestYear = yearTrend.reduce((a, b) => (b.total > a.total ? b : a), yearTrend[0] || {
            year: CURRENT_YEAR,
            total: 0
        });

        // Source breakdown
        const bySource: Record<string, number> = {};
        visibleEntries.forEach(e => {
            bySource[e.source] = (bySource[e.source] || 0) + e.amount;
        });
        const sourceBreakdown = Object.entries(bySource)
            .map(([name, value]) => ({
                name, value: Math.round(value), pct: (value / total) * 100
            }))
            .sort((a, b) => b.value - a.value);

        const sourceByYear: Record<number, Record<string, number>> = {};
        visibleEntries.forEach(e => {
            if (!sourceByYear[e.year]) sourceByYear[e.year] = {};
            const yObj = sourceByYear[e.year]!;
            yObj[e.source] = (yObj[e.source] || 0) + e.amount;
        });
        const allSources = [...new Set(visibleEntries.map(e => e.source))];
        const stackedByYear = Object.keys(sourceByYear).map(Number).sort((a, b) => a - b).map(y => {
            const row: Record<string, any> = {year: y};
            allSources.forEach(s => {
                row[s] = Math.round(sourceByYear[y]?.[s] || 0);
            });
            return row;
        });

        const sortedMonthTotals = [...monthTotalsArr].sort((a, b) => (a.year - b.year) || (a.month - b.month));
        const trendLine = sortedMonthTotals.map(m => ({
            label: `${MONTHS[m.month - 1]} '${String(m.year).slice(2)}`,
            total: Math.round(m.total),
            year: m.year,
            month: m.month
        }));

        let running = 0;
        const cumulative = dynamicTimeline.map(({year, month}) => {
            const k = monthKey(year, month);
            running += byMonthTotals[k]?.total || 0;
            return {
                label: `${MONTHS[month - 1]} '${String(year).slice(2)}`, cumulative: Math.round(running), year, month
            };
        });

        // Gaps & Streaks (STRICTLY checking amount > 0, 0 earning does NOT count as a positive streak!)
        const positiveMonthSet = new Set(positiveMonthTotalsArr.map(m => monthKey(m.year, m.month)));
        const zeroMonthSet = new Set(zeroMonthTotalsArr.map(m => monthKey(m.year, m.month)));
        const loggedSet = new Set(Object.keys(byMonthTotals));

        let longestGap = 0;
        let curGap = 0;
        dynamicTimeline.forEach(({year, month}) => {
            if (positiveMonthSet.has(monthKey(year, month))) {
                curGap = 0;
            } else {
                curGap++;
                longestGap = Math.max(longestGap, curGap);
            }
        });

        // Calculate active positive earning streak
        let currentPositiveStreak = 0;
        for (let i = dynamicTimeline.length - 1; i >= 0; i--) {
            const item = dynamicTimeline[i];
            if (item && positiveMonthSet.has(monthKey(item.year, item.month))) {
                currentPositiveStreak++;
            } else {
                break;
            }
        }

        // Longest positive earning streak in history
        let longestPositiveStreak = 0;
        let tempStreak = 0;
        dynamicTimeline.forEach(({year, month}) => {
            if (positiveMonthSet.has(monthKey(year, month))) {
                tempStreak++;
                longestPositiveStreak = Math.max(longestPositiveStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        const missingRanges: any[] = [];
        let curRange: any = null;
        dynamicTimeline.forEach(({year, month}) => {
            // A month is truly missing only if it is NOT logged in the ledger at all (honest ₹0 entries are NOT missing!)
            const isMissing = !loggedSet.has(monthKey(year, month));
            if (isMissing) {
                if (curRange && curRange.endYear * 12 + curRange.endMonth === year * 12 + month - 1) {
                    curRange.endYear = year;
                    curRange.endMonth = month;
                    curRange.count++;
                } else {
                    if (curRange) missingRanges.push(curRange);
                    curRange = {startYear: year, startMonth: month, endYear: year, endMonth: month, count: 1};
                }
            } else if (curRange) {
                missingRanges.push(curRange);
                curRange = null;
            }
        });
        if (curRange) missingRanges.push(curRange);

        // Advanced Statistical Indicators: Trailing 12-Month Volatility (CV) & 3-Month Momentum
        const trailing12Months = sortedMonthTotals.filter(m => m.total > 0).slice(-12);
        let trailing12Mean = 0;
        let trailing12StdDev = 0;
        let volatilityCV = 0;
        if (trailing12Months.length >= 3) {
            trailing12Mean = trailing12Months.reduce((s, m) => s + m.total, 0) / trailing12Months.length;
            const variance = trailing12Months.reduce((s, m) => s + Math.pow(m.total - trailing12Mean, 2), 0) / trailing12Months.length;
            trailing12StdDev = Math.sqrt(variance);
            volatilityCV = trailing12Mean > 0 ? (trailing12StdDev / trailing12Mean) * 100 : 0;
        }

        const recent3 = sortedMonthTotals.filter(m => m.total > 0).slice(-3);
        const momentum3MoAvg = recent3.length > 0 ? recent3.reduce((s, m) => s + m.total, 0) / recent3.length : 0;
        const momentum12MoAvg = trailing12Mean > 0 ? trailing12Mean : avgPerCareerMonth;
        const momentumRatio = momentum12MoAvg > 0 ? (momentum3MoAvg / momentum12MoAvg) : 1;

        return {
            total,
            monthsLogged,
            positiveMonthsLogged,
            zeroMonthsLogged,
            unloggedMonthsCount,
            avgPerLoggedMonth,
            avgPerCareerMonth,
            coveragePct,
            highest,
            lowestNonZero,
            bestYear,
            yearTrend,
            yoyGrowth,
            stackedByYear,
            allSources,
            sourceBreakdown,
            trendLine,
            cumulative,
            longestGap,
            currentPositiveStreak,
            longestPositiveStreak,
            topSource: sourceBreakdown[0],
            missingRanges,
            loggedSet,
            positiveMonthSet,
            zeroMonthSet,
            byMonthMap,
            careerMonths,
            sortedMonthTotals,
            trailing12Mean: Math.round(trailing12Mean),
            trailing12StdDev: Math.round(trailing12StdDev),
            volatilityCV: Math.round(volatilityCV),
            momentum3MoAvg: Math.round(momentum3MoAvg),
            momentum12MoAvg: Math.round(momentum12MoAvg),
            momentumRatio
        };
    }, [visibleEntries, dynamicTimeline]);

    // Truly Intelligent, Executive Financial Signals (Zero Bullshit)
    const smartInsights = useMemo(() => {
        if (!stats || visibleEntries.length === 0) return [];
        const list: Array<{
            icon: React.ReactNode; tag: string; title: string; desc: string; color: string;
        }> = [];

        // 1. Positive Cash-Flow Streak (Zero-Resistant)
        if (stats.currentPositiveStreak > 0) {
            list.push({
                icon: <Flame size={15} color="#7FA87A"/>,
                tag: "CASH FLOW STREAK",
                title: `Active ${stats.currentPositiveStreak}-Month Positive Earning Streak`,
                desc: `Maintained continuous positive income (>₹0) for ${stats.currentPositiveStreak} consecutive month${stats.currentPositiveStreak === 1 ? "" : "s"} with zero dry spells. (All-time peak streak: ${stats.longestPositiveStreak} months).`,
                color: "#7FA87A"
            });
        } else {
            const latestItem = dynamicTimeline[dynamicTimeline.length - 1];
            const latestMonthKey = latestItem ? monthKey(latestItem.year, latestItem.month) : "";
            const isLatestZero = stats.zeroMonthSet.has(latestMonthKey);
            list.push({
                icon: <Activity size={15} color="#F59E0B"/>,
                tag: "STREAK RESET",
                title: isLatestZero ? "Documented Zero-Income Month" : "No Active Positive Earning Streak",
                desc: isLatestZero ? `Latest period had documented ₹0 earnings. Your honesty preserves full ledger integrity at ${stats.coveragePct}% career coverage. Best all-time positive streak was ${stats.longestPositiveStreak} consecutive months.` : `The latest period had ₹0 or unlogged earnings. Your best all-time positive earning streak was ${stats.longestPositiveStreak} consecutive months.`,
                color: "#F59E0B"
            });
        }

        // Data Integrity & Honest Tracking Signal
        if (stats.zeroMonthsLogged > 0) {
            list.push({
                icon: <ShieldCheck size={15} color="#8AA9C9"/>,
                tag: "DATA INTEGRITY",
                title: `${stats.zeroMonthsLogged} Documented Zero-Income Month${stats.zeroMonthsLogged === 1 ? "" : "s"}`,
                desc: `You have honestly recorded ${stats.zeroMonthsLogged} month${stats.zeroMonthsLogged === 1 ? "" : "s"} with ₹0 earnings. True missing data is only ${stats.unloggedMonthsCount} months, giving you an authentic ${stats.coveragePct}% career coverage.`,
                color: "#8AA9C9"
            });
        }

        // 2. 3-Month Momentum vs 12-Month Trailing Velocity
        if (stats.momentum3MoAvg > 0 && stats.momentum12MoAvg > 0) {
            const diffPct = Math.round((stats.momentumRatio - 1) * 100);
            if (diffPct >= 10) {
                list.push({
                    icon: <TrendingUp size={15} color="#C9A227"/>,
                    tag: "ACCELERATING",
                    title: `Recent Velocity: +${diffPct}% Above 12-Mo Baseline`,
                    desc: `Recent 3 months averaged ${formatCurrency(stats.momentum3MoAvg)}/mo, outpacing your 12-month trailing baseline of ${formatCurrency(stats.momentum12MoAvg)}/mo. Earning power is expanding.`,
                    color: "#C9A227"
                });
            } else if (diffPct <= -10) {
                list.push({
                    icon: <TrendingDown size={15} color="#F59E0B"/>,
                    tag: "DECELERATING",
                    title: `Recent Velocity: ${diffPct}% Below 12-Mo Baseline`,
                    desc: `Recent 3 months averaged ${formatCurrency(stats.momentum3MoAvg)}/mo vs your 12-month trailing baseline of ${formatCurrency(stats.momentum12MoAvg)}/mo. Cash generation has softened.`,
                    color: "#F59E0B"
                });
            } else {
                list.push({
                    icon: <Activity size={15} color="#8AA9C9"/>,
                    tag: "STABLE VELOCITY",
                    title: `Steady Cash Generation (${formatCurrency(stats.momentum3MoAvg)}/mo)`,
                    desc: `Your 3-month velocity matches your 12-month baseline within ±10%, indicating predictable and consistent revenue generation.`,
                    color: "#8AA9C9"
                });
            }
        }

        // 3. Predictability & Volatility Index (Coefficient of Variation)
        if (stats.volatilityCV > 0) {
            if (stats.volatilityCV <= 15) {
                list.push({
                    icon: <ShieldCheck size={15} color="#7FA87A"/>,
                    tag: "HIGH PREDICTABILITY",
                    title: `Low Volatility (CV: ${stats.volatilityCV}%)`,
                    desc: `Monthly earnings exhibit tight consistency (±${formatCurrency(stats.trailing12StdDev)}), making cash flow highly dependable for long-term planning.`,
                    color: "#7FA87A"
                });
            } else if (stats.volatilityCV <= 35) {
                list.push({
                    icon: <Activity size={15} color="#8AA9C9"/>,
                    tag: "MODERATE VARIANCE",
                    title: `Balanced Income Variance (CV: ${stats.volatilityCV}%)`,
                    desc: `Monthly revenue fluctuates ±${formatCurrency(stats.trailing12StdDev)} around your ${formatCurrency(stats.trailing12Mean)}/mo mean, standard for dynamic earnings.`,
                    color: "#8AA9C9"
                });
            } else {
                list.push({
                    icon: <ShieldAlert size={15} color="#F59E0B"/>,
                    tag: "HIGH CYCLICALITY",
                    title: `Lumpy / Cyclical Cash Flow (CV: ${stats.volatilityCV}%)`,
                    desc: `Earnings swing widely (±${formatCurrency(stats.trailing12StdDev)}) between peak (${formatCurrency(stats.highest.total)}) and baseline months. Keep a robust buffer.`,
                    color: "#F59E0B"
                });
            }
        }

        // 4. Target Reality & Run-Rate
        const currentYearEntries = visibleEntries.filter(e => e.year === CURRENT_YEAR);
        const currentYearTotal = currentYearEntries.reduce((s, e) => s + e.amount, 0);
        const currentTargetMo = Number(coinsTargets[String(CURRENT_YEAR)] || 0);
        if (currentTargetMo > 0) {
            const annualTarget = currentTargetMo * 12;
            const remainingMonths = Math.max(1, 12 - CURRENT_MONTH);
            const neededTotal = Math.max(0, annualTarget - currentYearTotal);
            const neededPerMo = Math.round(neededTotal / remainingMonths);
            const pctMet = (currentYearTotal / annualTarget) * 100;

            if (currentYearTotal >= annualTarget) {
                list.push({
                    icon: <CheckCircle2 size={15} color="#7FA87A"/>,
                    tag: "TARGET HIT",
                    title: `${CURRENT_YEAR} Annual Target Achieved!`,
                    desc: `Reached ${formatCurrency(annualTarget)} (${pctMet.toFixed(0)}% funded) with ${remainingMonths} month${remainingMonths === 1 ? "" : "s"} remaining!`,
                    color: "#7FA87A"
                });
            } else if (neededPerMo <= stats.momentum3MoAvg) {
                list.push({
                    icon: <Target size={15} color="#7FA87A"/>,
                    tag: "ON TRACK",
                    title: `Target Pacing: ${formatCurrency(neededPerMo)}/mo Needed`,
                    desc: `Your current velocity (${formatCurrency(stats.momentum3MoAvg)}/mo) comfortably covers the ${formatCurrency(neededPerMo)}/mo required to reach ${formatCurrency(annualTarget)}.`,
                    color: "#7FA87A"
                });
            } else {
                const boost = Math.round(((neededPerMo - stats.momentum3MoAvg) / Math.max(1, stats.momentum3MoAvg)) * 100);
                list.push({
                    icon: <Target size={15} color="#F59E0B"/>,
                    tag: "STRETCH TARGET",
                    title: `Requires +${boost}% Boost to ${formatCurrency(neededPerMo)}/mo`,
                    desc: `Need ${formatCurrency(neededPerMo)}/mo over the next ${remainingMonths} months to reach your ${formatCurrency(annualTarget)} annual goal (${formatCurrency(currentYearTotal)} earned so far).`,
                    color: "#F59E0B"
                });
            }
        }

        // 5. Revenue Concentration & Single Point of Failure (SPOF)
        if (stats.topSource) {
            const topPct = stats.topSource.pct;
            const secondary = stats.sourceBreakdown[1];
            if (topPct >= 70) {
                list.push({
                    icon: <AlertCircle size={15} color="#F59E0B"/>,
                    tag: "CONCENTRATION RISK",
                    title: `${topPct.toFixed(0)}% Dependent on ${stats.topSource.name}`,
                    desc: `${formatCurrency(stats.topSource.value)} of ${formatCurrency(stats.total)} comes from a single source. Developing secondary streams like Freelance, Consulting, or Dividends mitigates downside risk.`,
                    color: "#F59E0B"
                });
            } else {
                list.push({
                    icon: <Layers size={15} color="#8AA9C9"/>,
                    tag: "DIVERSIFIED",
                    title: "Balanced Revenue Architecture",
                    desc: `Top stream (${stats.topSource.name}) accounts for ${topPct.toFixed(0)}%, supplemented by ${secondary ? `${secondary.name} (${secondary.pct.toFixed(0)}%)` : "multiple streams"}.`,
                    color: "#8AA9C9"
                });
            }
        }

        // 6. Earning Floor Power
        if (stats.lowestNonZero.total > 0 && stats.trailing12Mean > 0) {
            list.push({
                icon: <Award size={15} color="#C9A227"/>,
                tag: "EARNING FLOOR",
                title: `Solid Baseline: ${formatCurrency(stats.lowestNonZero.total)} Minimum`,
                desc: `Your non-zero monthly earnings have never dipped below ${formatCurrency(stats.lowestNonZero.total)}, establishing a dependable lower bound. Peak was ${formatCurrency(stats.highest.total)}.`,
                color: "#C9A227"
            });
        }

        return list;
    }, [stats, visibleEntries, coinsTargets, formatCurrency]);

    // Ledger filtered entries
    const filteredEntries = useMemo(() => {
        return visibleEntries.filter(e => {
            if (filters.source !== "all" && e.source !== filters.source) return false;
            if (e.year < filters.fromYear || e.year > filters.toYear) return false;
            if (filters.minAmount !== "" && e.amount < Number(filters.minAmount)) return false;
            if (filters.maxAmount !== "" && e.amount > Number(filters.maxAmount)) return false;
            if (filters.search.trim()) {
                const q = filters.search.toLowerCase();
                const matchNotes = (e.notes || "").toLowerCase().includes(q);
                const matchSrc = e.source.toLowerCase().includes(q);
                const matchMonth = MONTHS[e.month - 1]?.toLowerCase().includes(q);
                if (!matchNotes && !matchSrc && !matchMonth) return false;
            }
            return true;
        });
    }, [visibleEntries, filters]);

    const coinsEntriesByYear = useMemo(() => {
        const groups: Record<number, CoinsEntry[]> = {};
        filteredEntries.forEach(e => {
            if (!groups[e.year]) groups[e.year] = [];
            groups[e.year]!.push(e);
        });
        Object.keys(groups).forEach(y => {
            groups[Number(y)]!.sort((a, b) => a.month - b.month);
        });
        return groups;
    }, [filteredEntries]);

    const activeYears = useMemo(() => {
        return Object.keys(coinsEntriesByYear).map(Number).sort((a, b) => b - a);
    }, [coinsEntriesByYear]);

    const uniqueSources = useMemo(() => {
        return [...new Set(visibleEntries.map(e => e.source))].sort();
    }, [visibleEntries]);

    const filtersActive = filters.source !== "all" || filters.fromYear !== CAREER_START_YEAR || filters.toYear !== CURRENT_YEAR + 1 || filters.minAmount !== "" || filters.maxAmount !== "" || filters.search.trim() !== "";

    // Target vs actual chart data
    const targetComparisonData = useMemo(() => {
        if (!stats) return [];
        return stats.yearTrend.map(y => {
            const targetMo = Number(coinsTargets[String(y.year)] || 0);
            const annualTarget = targetMo * 12;
            const actual = y.total;
            let displayActual = actual;
            let displayTarget = annualTarget;

            if (yearlyChartMode === "monthly") {
                const monthsInYear = y.year === CURRENT_YEAR ? Math.max(1, CURRENT_MONTH) : 12;
                displayActual = Math.round(actual / monthsInYear);
                displayTarget = targetMo;
            }

            return {
                year: String(y.year),
                actual: displayActual,
                target: displayTarget > 0 ? displayTarget : null,
                isCurrent: y.year === CURRENT_YEAR
            };
        });
    }, [stats, coinsTargets, yearlyChartMode]);

    if (!loaded) {
        return (<div style={{padding: 40, textAlign: "center", color: "#8A8F98"}} className="mono">
                Loading Coins Ledger...
            </div>);
    }

    if (isPublicView && !isRevealed) {
        return (<div className="coins-pane"
                     style={{padding: "60px 24px", textAlign: "center", maxWidth: "600px", margin: "0 auto"}}>
                <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(201, 162, 39, 0.1)",
                    border: "1px solid rgba(201, 162, 39, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px"
                }}>
                    <Lock size={26} color="#C9A227"/>
                </div>

                <div style={{fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px"}}>
                    Coins Ledger is hidden in public view
                </div>

                <div style={{
                    fontSize: "13px",
                    maxWidth: "420px",
                    margin: "0 auto 24px",
                    lineHeight: 1.6,
                    color: "var(--text-secondary)"
                }}>
                    Your financial income and ledger entries are protected while in Public Mode.
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--panel-border)",
                        padding: "10px 18px",
                        borderRadius: "24px",
                        cursor: "pointer",
                        userSelect: "none"
                    }}
                    onClick={() => setIsRevealed(true)}
                >
                    <span style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                    }}>
                        <EyeOff size={14}/> Hidden
                    </span>
                    <label className="ios-switch" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isRevealed} onChange={(e) => setIsRevealed(e.target.checked)}/>
                        <span className="ios-slider"></span>
                    </label>
                    <span style={{
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                    }}>
                        <Eye size={14} color="var(--accent)"/> Reveal
                    </span>
                </div>
            </div>);
    }

    const currentYearTargetMonthly = Number(coinsTargets[String(CURRENT_YEAR)] || 0);
    const currentYearEarned = stats?.yearTrend.find(y => y.year === CURRENT_YEAR)?.total || 0;
    const currentYearTargetAnnual = currentYearTargetMonthly * 12;
    const currentYearPctMet = currentYearTargetAnnual > 0 ? (currentYearEarned / currentYearTargetAnnual) * 100 : 0;
    const missingMonthsCount = stats?.unloggedMonthsCount ?? Math.max(0, (stats?.careerMonths || 0) - (stats?.monthsLogged || 0));

    return (<div className="coins-pane" style={{padding: 0, flex: 1, overflowY: "auto", minHeight: 0, height: "100%"}}>
            {isPublicView && isRevealed && (<div style={{
                    background: "rgba(234, 179, 8, 0.1)",
                    borderBottom: "1px solid rgba(234, 179, 8, 0.3)",
                    padding: "10px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    fontSize: "12.5px",
                    color: "#EAB308",
                    fontFamily: "var(--font-mono)"
                }}>
                    <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                        <Eye size={15}/>
                        <span>Coins Ledger temporarily revealed in Public Mode</span>
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer"}}
                         onClick={() => setIsRevealed(false)}>
                        <span style={{
                            fontSize: "12px",
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                        }}>
                            <EyeOff size={13}/> Hide
                        </span>
                        <label className="ios-switch" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isRevealed}
                                   onChange={(e) => setIsRevealed(e.target.checked)}/>
                            <span className="ios-slider"></span>
                        </label>
                    </div>
                </div>)}

            <style>{`
                .coins-pane { flex: 1; overflow-y: auto; min-height: 0; height: 100%; }
                .coins-pane .row-btn { background: transparent; border: none; color: #8A8F98; padding: 6px; border-radius: 3px; display: flex; align-items: center; cursor: pointer; }
                .coins-pane .row-btn:hover { color: #EDE7D9; background: #262C33; }
                .coins-pane table { border-collapse: collapse; width: 100%; min-width: 460px; }
                .coins-pane th, .coins-pane td { text-align: left; padding: 9px 10px; font-size: 13.5px; white-space: nowrap; }
                .coins-pane td:nth-child(4) { white-space: normal; min-width: 140px; }
                .coins-pane th { color: #8A8F98; font-weight: 500; font-size: 11.5px; letter-spacing: 0.03em; border-bottom: 1px solid #2A3038; }
                .coins-pane tbody tr { border-bottom: 1px solid #1F252C; }
                .coins-pane tbody tr:hover { background: #1A1F25; }
                .coins-pane input, .coins-pane select, .coins-pane textarea { width: 100%; box-sizing: border-box; min-width: 0; }

                .page-header { padding: 24px 16px 20px; }
                .page-body { padding: 18px 12px 40px; box-sizing: border-box; width: 100%; }
                .page-title { font-size: clamp(22px, 4vw, 32px); }
                .header-row { display: flex; flex-direction: column; gap: 16px; }
                .header-actions { width: 100%; align-items: flex-start; }
                .toolbar-btns { display: flex; flex-wrap: wrap; gap: 6px; }

                .form-header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
                
                /* Edit single entry form grid */
                .edit-entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; width: 100%; box-sizing: border-box; }
                .edit-entry-field-notes { grid-column: 1 / -1; }
                @media (min-width: 720px) {
                    .edit-entry-grid { grid-template-columns: 100px 110px 140px 160px 1fr; align-items: end; }
                    .edit-entry-field-notes { grid-column: auto; }
                }

                /* Month Picker Banner */
                .month-picker-banner {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    align-items: center;
                    padding: 12px 14px;
                    background: #1A1F25;
                    border: 1px solid #2A3038;
                    border-radius: 4px;
                    margin-bottom: 16px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .month-picker-total {
                    grid-column: 1 / -1;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 8px;
                    border-top: 1px solid #242A32;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                @media (min-width: 640px) {
                    .month-picker-banner {
                        grid-template-columns: 140px 140px 1fr;
                    }
                    .month-picker-total {
                        grid-column: auto;
                        justify-content: flex-end;
                        padding-top: 0;
                        border-top: none;
                        text-align: right;
                    }
                }

                /* Stream Row Cards */
                .stream-row-card {
                    display: grid;
                    grid-template-columns: 1fr 1fr auto;
                    gap: 10px;
                    align-items: end;
                    background: #14181C;
                    border: 1px solid #2A3038;
                    padding: 10px 12px;
                    border-radius: 4px;
                    box-sizing: border-box;
                    width: 100%;
                }
                .stream-row-notes-col {
                    grid-column: 1 / -1;
                }
                .stream-row-delete-col {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                @media (max-width: 719px) {
                    .stream-row-card {
                        grid-template-columns: 1fr 1fr auto;
                    }
                    .stream-row-delete-col {
                        grid-column: 3;
                        grid-row: 1;
                        align-self: end;
                        height: 38px;
                    }
                    .stream-row-notes-col {
                        grid-column: 1 / -1;
                        grid-row: 2;
                    }
                }
                @media (min-width: 720px) {
                    .stream-row-card {
                        grid-template-columns: 140px 160px 1fr 36px;
                        align-items: center;
                        padding: 8px 12px;
                    }
                    .stream-row-notes-col {
                        grid-column: auto;
                        grid-row: auto;
                    }
                    .stream-row-delete-col {
                        grid-column: auto;
                        grid-row: auto;
                        height: auto;
                    }
                }

                /* Range Endpoints Form */
                .range-endpoints {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .range-field-endpoint {
                    grid-column: 1 / -1;
                }
                .range-endpoints-field-full {
                    grid-column: 1 / -1;
                }
                .range-endpoint-inner {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    width: 100%;
                }
                @media (min-width: 860px) {
                    .range-endpoints {
                        grid-template-columns: 1.25fr 1.25fr 1fr 1fr;
                        gap: 12px;
                    }
                    .range-field-endpoint {
                        grid-column: auto;
                    }
                    .range-endpoint-inner {
                        display: flex;
                        gap: 6px;
                    }
                }

                /* Tabs scrollable on mobile */
                .command-tabs-bar {
                    display: flex;
                    border-bottom: 1px solid #2A3038;
                    margin-bottom: 16px;
                    gap: 4px;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 2px;
                }
                .command-tabs-bar .nav-pill {
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .accordion-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 14px;
                    background: #1A1F25;
                    cursor: pointer;
                    user-select: none;
                    transition: background 0.15s ease;
                }

                .metrics-4-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px; width: 100%; box-sizing: border-box; }
                .metrics-4-tile { background: #1A1F25; border: 1px solid #2A3038; padding: 14px 16px; border-radius: 4px; min-width: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
                .metrics-4-tile .tile-title { font-size: 10.5px; color: #8A8F98; letter-spacing: 0.05em; line-height: 1.25; min-width: 0; }
                .target-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; width: 100%; box-sizing: border-box; }
                .target-kpi-grid > div { min-width: 0; overflow: hidden; }
                .charts-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; width: 100%; box-sizing: border-box; }
                .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; max-width: 100%; box-sizing: border-box; }
                .accordion-body-content { box-sizing: border-box; width: 100%; }

                @media (max-width: 480px) {
                    .metrics-4-grid { gap: 8px !important; }
                    .metrics-4-tile { padding: 10px 10px; }
                    .metrics-4-tile .tile-title { font-size: 9.5px; }
                    .accordion-body-content { padding: 14px 10px !important; }
                }

                @media (min-width: 640px) {
                    .accordion-header { padding: 13px 18px; }
                    .page-header { padding: 36px 28px 28px; }
                    .page-body { padding: 28px; }
                    .header-row { flex-direction: row; justify-content: space-between; align-items: flex-start; }
                    .header-actions { width: auto; align-items: flex-end; }
                    .target-kpi-grid { grid-template-columns: repeat(4, 1fr); }
                    .charts-grid-2 { grid-template-columns: 1fr 1fr; }
                }

                .tag-chip {
                    font-size: 10.5px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    padding: 2px 8px;
                    border-radius: 3px;
                }
                .nav-pill {
                    background: transparent;
                    border: none;
                    padding: 6px 12px;
                    font-size: 11.5px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .nav-pill.active {
                    background: #2A3038;
                    color: #EDE7D9;
                    font-weight: 600;
                }
                .nav-pill:not(.active) {
                    color: #8A8F98;
                }
            `}</style>

            {/* Mobile Wallet Banner */}
            {walletTotal !== undefined && onNavigateToMoneyGoals && (<div className="hide-on-desktop" style={{
                    background: "#1A1F25",
                    borderBottom: "1px solid #2A3038",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                        <Wallet size={16} color="#C9A227"/>
                        <span style={{fontSize: 13, color: "#D8D2C4"}}>
                            Wallet Goals: <strong style={{color: "#fff"}}>{formatCurrency(walletTotal)}</strong> remaining
                        </span>
                    </div>
                    <button onClick={onNavigateToMoneyGoals} style={{
                        background: "transparent",
                        border: "none",
                        color: "#C9A227",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                    }}>
                        View Goals <ArrowRight size={14}/>
                    </button>
                </div>)}

            {/* Dashboard Header & Controls */}
            <div className="page-header" style={{
                background: "#14181C", borderBottom: "1px solid #2A3038", position: "relative"
            }}>
                <div className="header-row" style={{maxWidth: 1080, margin: "0 auto"}}>
                    <div>
                        <div className="mono" style={{
                            fontSize: 11,
                            color: "#8A8F98",
                            letterSpacing: "0.08em",
                            marginBottom: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                        }}>
                            <span>{CAREER_START_YEAR} — {dynamicTimeline[dynamicTimeline.length - 1]?.year || CURRENT_YEAR}</span>
                            {saveState === "saving" && <span style={{color: "#C9A227"}}>Saving...</span>}
                            {saveState === "saved" && <span style={{color: "#7FA87A"}}>Saved</span>}
                        </div>
                        <h1 className="page-title" style={{
                            margin: 0,
                            fontFamily: "var(--font-serif)",
                            fontWeight: 400,
                            color: "#EDE7D9",
                            lineHeight: 1.1
                        }}>
                            Coins Ledger & Analytics
                        </h1>
                        <div style={{fontSize: 13, color: "#8A8F98", marginTop: 8}}>
                            Live financial record of all career months worked, source distribution, and target pacing.
                        </div>
                    </div>

                    <div className="header-actions" style={{display: "flex", flexDirection: "column", gap: 10}}>
                        <div className="toolbar-btns" style={{display: "flex", gap: 6}}>
                            <button onClick={() => setAllSections(true)} className="mono" style={{
                                background: "#1A1F25",
                                border: "1px solid #2A3038",
                                color: "#8A8F98",
                                padding: "7px 10px",
                                borderRadius: 3,
                                fontSize: 11,
                                cursor: "pointer"
                            }}>
                                Expand all
                            </button>
                            <button onClick={() => setAllSections(false)} className="mono" style={{
                                background: "#1A1F25",
                                border: "1px solid #2A3038",
                                color: "#8A8F98",
                                padding: "7px 10px",
                                borderRadius: 3,
                                fontSize: 11,
                                cursor: "pointer"
                            }}>
                                Collapse all
                            </button>
                            <button onClick={exportJSON} className="mono" title="Download JSON backup" style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                background: "#1A1F25",
                                border: "1px solid #2A3038",
                                color: "#8A8F98",
                                padding: "7px 10px",
                                borderRadius: 3,
                                fontSize: 11,
                                cursor: "pointer"
                            }}>
                                <Download size={12}/> JSON
                            </button>
                            <button onClick={exportCSV} className="mono" title="Download CSV spreadsheet" style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                background: "#1A1F25",
                                border: "1px solid #2A3038",
                                color: "#8A8F98",
                                padding: "7px 10px",
                                borderRadius: 3,
                                fontSize: 11,
                                cursor: "pointer"
                            }}>
                                <Download size={12}/> CSV
                            </button>
                            <button onClick={triggerImport} className="mono" title="Restore JSON backup" style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                background: "#1A1F25",
                                border: "1px solid #2A3038",
                                color: "#8A8F98",
                                padding: "7px 10px",
                                borderRadius: 3,
                                fontSize: 11,
                                cursor: "pointer"
                            }}>
                                <Upload size={12}/> Import
                            </button>
                            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile}
                                   style={{display: "none"}}/>
                        </div>
                        {importMsg && (<div className="mono" style={{fontSize: 10.5, color: "#8A8F98", maxWidth: 280}}>
                                {importMsg}
                            </div>)}
                    </div>
                </div>
            </div>

            <div className="page-body"
                 style={{maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20}}>

                {/* 1. SECTION: LOG EARNINGS (UNIFIED NON-REDUNDANT MONTHLY & RANGE FORM) */}
                <AccordionSection
                    id="coins-entry-form"
                    isOpen={openSections.form}
                    onToggle={() => toggleSection("form")}
                    icon={<Plus size={16} color="#C9A227"/>}
                    title="LOG EARNINGS / NEW ENTRY"
                    badge={<span className="mono tag-chip" style={{background: "#2A3038", color: "#8A8F98"}}>
                            {editingEntry ? "Editing Entry" : (mode === "monthly" ? "Monthly Income" : "Date Range")}
                        </span>}
                >
                    <div className="form-header-row">
                        <div className="mono"
                             style={{fontSize: 11.5, letterSpacing: "0.05em", color: "#8A8F98", fontWeight: 600}}>
                            {editingEntry ? "EDITING ENTRY" : "LOG MONTHLY EARNINGS"}
                        </div>
                        <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap"}}>
                            {!editingEntry && (<div style={{
                                    display: "flex",
                                    background: "#14181C",
                                    border: "1px solid #2A3038",
                                    borderRadius: 3,
                                    overflow: "hidden"
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode("monthly");
                                            setError("");
                                        }}
                                        className="mono"
                                        style={{
                                            border: "none",
                                            padding: "6px 14px",
                                            fontSize: 11.5,
                                            background: mode === "monthly" ? "#2A3038" : "transparent",
                                            color: mode === "monthly" ? "#EDE7D9" : "#8A8F98",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Monthly Income
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode("range");
                                            setError("");
                                        }}
                                        className="mono"
                                        style={{
                                            border: "none",
                                            padding: "6px 14px",
                                            fontSize: 11.5,
                                            background: mode === "range" ? "#2A3038" : "transparent",
                                            color: mode === "range" ? "#EDE7D9" : "#8A8F98",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Date Range
                                    </button>
                                </div>)}

                            {editingEntry && (
                                <button type="button" onClick={() => setEditingEntry(null)} className="row-btn"
                                        style={{gap: 4}}>
                                    <X size={13}/> Cancel Edit
                                </button>)}
                        </div>
                    </div>

                    {/* EDIT SINGLE ENTRY */}
                    {editingEntry && (<form onSubmit={submitEdit}>
                            <div className="edit-entry-grid">
                                <div>
                                    <Label>Year</Label>
                                    <select value={editingEntry.year} onChange={e => setEditingEntry({
                                        ...editingEntry,
                                        year: Number(e.target.value)
                                    })}>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>Month</Label>
                                    <select value={editingEntry.month} onChange={e => setEditingEntry({
                                        ...editingEntry,
                                        month: Number(e.target.value)
                                    })}>
                                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>Amount ({currencySymbol})</Label>
                                    <input
                                        id="edit-amount-input"
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={editingEntry.amount}
                                        onChange={e => setEditingEntry({
                                            ...editingEntry,
                                            amount: Number(e.target.value)
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label>Source</Label>
                                    <input
                                        list="sources-edit-list"
                                        value={editingEntry.source}
                                        onChange={e => setEditingEntry({...editingEntry, source: e.target.value})}
                                    />
                                    <datalist id="sources-edit-list">
                                        {SOURCE_PRESETS.map(s => <option key={s} value={s}/>)}
                                    </datalist>
                                </div>
                                <div className="edit-entry-field-notes">
                                    <Label>Notes</Label>
                                    <input
                                        value={editingEntry.notes}
                                        onChange={e => setEditingEntry({...editingEntry, notes: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div style={{display: "flex", gap: 10, flexWrap: "wrap"}}>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        minWidth: 140,
                                        background: "#C9A227",
                                        color: "#14181C",
                                        border: "none",
                                        padding: "10px 16px",
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        fontSize: 13,
                                        cursor: "pointer"
                                    }}
                                >
                                    Update Entry
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingEntry(null)}
                                    style={{
                                        background: "#1A1F25",
                                        border: "1px solid #2A3038",
                                        color: "#8A8F98",
                                        padding: "10px 16px",
                                        borderRadius: 3,
                                        fontSize: 13,
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>)}

                    {/* UNIFIED MONTHLY INCOME FORM (Supports 1 or more streams naturally!) */}
                    {mode === "monthly" && !editingEntry && (<form onSubmit={submitMonthlyStreams}>
                            <div className="month-picker-banner">
                                <div>
                                    <Label>Target Year</Label>
                                    <select value={entryYear} onChange={e => setEntryYear(Number(e.target.value))}>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>Target Month</Label>
                                    <select value={entryMonth} onChange={e => setEntryMonth(Number(e.target.value))}>
                                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="month-picker-total">
                                    <span className="mono" style={{fontSize: 12, color: "#8A8F98"}}>
                                        Month Total:{" "}
                                        <strong style={{color: "#C9A227", fontSize: 14}}>
                                            {formatCurrency(streamRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0))}
                                        </strong>
                                    </span>
                                    <span className="mono" style={{fontSize: 11, color: "#8A8F98"}}>
                                        across {streamRows.filter(s => parseFloat(s.amount) > 0).length} active
                                        stream{streamRows.filter(s => parseFloat(s.amount) > 0).length === 1 ? "" : "s"}
                                    </span>
                                </div>
                            </div>

                            <div style={{display: "flex", flexDirection: "column", gap: 10, marginBottom: 14}}>
                                {streamRows.map((stream, idx) => (<div key={stream.id} className="stream-row-card">
                                        <div>
                                            <Label>Source {streamRows.length > 1 ? `#${idx + 1}` : ""}</Label>
                                            <input
                                                list="sources-unified-list"
                                                placeholder="Startup, Dividend, Job…"
                                                value={stream.source}
                                                onChange={e => updateStreamRow(stream.id, "source", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Amount ({currencySymbol})</Label>
                                            <input
                                                id={`stream-amt-${idx}`}
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder="0"
                                                value={stream.amount}
                                                onChange={e => updateStreamRow(stream.id, "amount", e.target.value)}
                                            />
                                        </div>
                                        <div className="stream-row-notes-col">
                                            <Label>Notes (Optional)</Label>
                                            <input
                                                placeholder="e.g. Q3 dividend, contract retainer, bonus…"
                                                value={stream.notes}
                                                onChange={e => updateStreamRow(stream.id, "notes", e.target.value)}
                                            />
                                        </div>
                                        <div className="stream-row-delete-col">
                                            <button
                                                type="button"
                                                onClick={() => removeStreamRow(stream.id)}
                                                disabled={streamRows.length <= 1}
                                                className="row-btn"
                                                title="Remove Stream"
                                                style={{opacity: streamRows.length <= 1 ? 0.2 : 1}}
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>))}
                            </div>

                            <datalist id="sources-unified-list">
                                {SOURCE_PRESETS.map(s => <option key={s} value={s}/>)}
                            </datalist>

                            {/* Quick Add Stream Buttons */}
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 16,
                                flexWrap: "wrap"
                            }}>
                                <button
                                    type="button"
                                    onClick={() => addStreamRow()}
                                    className="mono"
                                    style={{
                                        background: "#1F252C",
                                        border: "1px dashed #2A3038",
                                        color: "#EDE7D9",
                                        padding: "5px 10px",
                                        borderRadius: 3,
                                        fontSize: 11,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4
                                    }}
                                >
                                    <Plus size={12}/> Add Stream Row
                                </button>
                                <button
                                    type="button"
                                    onClick={() => addStreamRow("Broke / Nil", "0")}
                                    className="mono"
                                    style={{
                                        background: "#3A281E",
                                        border: "1px solid #78350F",
                                        color: "#F59E0B",
                                        padding: "5px 10px",
                                        borderRadius: 3,
                                        fontSize: 11,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 5,
                                        fontWeight: 600
                                    }}
                                    title="Log honest zero earnings for this month (e.g. unemployed, broke, sabbatical, student)"
                                >
                                    + Log ₹0 (Broke / Nil)
                                </button>
                                <span className="mono" style={{fontSize: 11, color: "#5E6570", marginLeft: 4}}>Quick Add:</span>
                                {SOURCE_PRESETS.map(preset => (<button
                                        key={preset}
                                        type="button"
                                        onClick={() => addStreamRow(preset, preset === "Broke / Nil" ? "0" : undefined)}
                                        className="mono"
                                        style={{
                                            background: preset === "Broke / Nil" ? "#2B1E17" : "#1A1F25",
                                            border: preset === "Broke / Nil" ? "1px solid #78350F" : "1px solid #2A3038",
                                            color: preset === "Broke / Nil" ? "#F59E0B" : "#D8D2C4",
                                            padding: "4px 8px",
                                            borderRadius: 3,
                                            fontSize: 11,
                                            cursor: "pointer"
                                        }}
                                    >
                                        + {preset}
                                    </button>))}
                            </div>

                            {error && (
                                <div style={{color: "#C1665A", fontSize: 12.5, marginBottom: 12}} className="mono">
                                    {error}
                                </div>)}

                            {successMsg && (
                                <div style={{color: "#7FA87A", fontSize: 12.5, marginBottom: 12}} className="mono">
                                    {successMsg}
                                </div>)}

                            <button
                                type="submit"
                                style={{
                                    width: "100%",
                                    background: "#C9A227",
                                    color: "#14181C",
                                    border: "none",
                                    padding: "11px 16px",
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    letterSpacing: "0.03em"
                                }}
                            >
                                {streamRows.filter(s => {
                                    const a = parseFloat(s.amount.trim());
                                    return !isNaN(a) && a >= 0 && s.source.trim().length > 0;
                                }).length > 0 && streamRows.reduce((acc, s) => {
                                    const a = parseFloat(s.amount.trim());
                                    return !isNaN(a) && a >= 0 ? acc + a : acc;
                                }, 0) === 0 ? `Record Honest Zero Income (₹0) for ${MONTHS[entryMonth - 1]} ${entryYear}` : `Save Income for ${MONTHS[entryMonth - 1]} ${entryYear}`}
                            </button>
                        </form>)}

                    {/* DATE RANGE ENTRY */}
                    {mode === "range" && !editingEntry && (<form onSubmit={submitRange}>
                            <div className="range-endpoints" style={{marginBottom: 10}}>
                                <div className="range-field-endpoint">
                                    <Label>Start</Label>
                                    <div className="range-endpoint-inner">
                                        <select value={rangeDraft.startMonth} onChange={e => setRangeDraft({
                                            ...rangeDraft,
                                            startMonth: Number(e.target.value)
                                        })}>
                                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                        </select>
                                        <select value={rangeDraft.startYear} onChange={e => setRangeDraft({
                                            ...rangeDraft,
                                            startYear: Number(e.target.value)
                                        })}>
                                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="range-field-endpoint">
                                    <Label>End</Label>
                                    <div className="range-endpoint-inner">
                                        <select value={rangeDraft.endMonth} onChange={e => setRangeDraft({
                                            ...rangeDraft,
                                            endMonth: Number(e.target.value)
                                        })}>
                                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                        </select>
                                        <select value={rangeDraft.endYear} onChange={e => setRangeDraft({
                                            ...rangeDraft,
                                            endYear: Number(e.target.value)
                                        })}>
                                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Amount per Month ({currencySymbol})</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0"
                                        value={rangeDraft.amount}
                                        onChange={e => setRangeDraft({...rangeDraft, amount: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <Label>Source</Label>
                                    <input
                                        list="sources-range"
                                        value={rangeDraft.source}
                                        onChange={e => setRangeDraft({...rangeDraft, source: e.target.value})}
                                    />
                                    <datalist id="sources-range">
                                        {SOURCE_PRESETS.map(s => <option key={s} value={s}/>)}
                                    </datalist>
                                </div>
                            </div>
                            <div style={{marginBottom: 14}}>
                                <Label>Notes</Label>
                                <input
                                    placeholder="Optional note for all entries in range"
                                    value={rangeDraft.notes}
                                    onChange={e => setRangeDraft({...rangeDraft, notes: e.target.value})}
                                />
                            </div>
                            {error && (
                                <div style={{color: "#C1665A", fontSize: 12.5, marginBottom: 10}} className="mono">
                                    {error}
                                </div>)}
                            {successMsg && (
                                <div style={{color: "#7FA87A", fontSize: 12.5, marginBottom: 10}} className="mono">
                                    {successMsg}
                                </div>)}
                            <button
                                type="submit"
                                style={{
                                    width: "100%",
                                    background: "#C9A227",
                                    color: "#14181C",
                                    border: "none",
                                    padding: "11px 16px",
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    letterSpacing: "0.03em"
                                }}
                            >
                                Populate Range
                            </button>
                        </form>)}
                </AccordionSection>

                {/* 2. SECTION: OVERVIEW METRICS, KEY INSIGHTS & SOURCE BREAKDOWN */}
                <AccordionSection
                    id="coins-overview-insights"
                    isOpen={openSections.overview}
                    onToggle={() => toggleSection("overview")}
                    icon={<BarChart3 size={16} color="#C9A227"/>}
                    title="OVERVIEW METRICS, INSIGHTS & REVENUE MIX"
                    badge={<span className="mono tag-chip" style={{background: "#2A3038", color: "#C9A227"}}>
                            {formatCurrency(stats?.total || 0)} lifetime • {formatCurrency(stats?.avgPerCareerMonth || 0)}/mo
                        </span>}
                >
                    {/* The 4 Core Metric Tiles */}
                    <div className="metrics-4-grid" style={{marginBottom: 20}}>
                        <div className="metrics-4-tile">
                            <div>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                    gap: 6
                                }}>
                                    <span className="mono tile-title">
                                        TOTAL EARNED
                                    </span>
                                    <Wallet size={14} color="#C9A227" style={{flexShrink: 0}}/>
                                </div>
                                <div className="mono" style={{fontSize: "clamp(17px, 2.2vw, 22px)", fontWeight: 700, color: "#EDE7D9", overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.2}}>
                                    {formatCurrency(stats?.total || 0)}
                                </div>
                            </div>
                            <div className="mono" style={{fontSize: 11, color: "#5E6570", marginTop: 6, overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.3}}>
                                {stats?.positiveMonthsLogged || 0} active earning months
                                {stats && stats.zeroMonthsLogged > 0 ? ` • ${stats.zeroMonthsLogged} broke / ₹0` : ""}
                            </div>
                        </div>

                        <div className="metrics-4-tile">
                            <div>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                    gap: 6
                                }}>
                                    <span className="mono tile-title">
                                        AVG / MO (CAREER)
                                    </span>
                                    <TrendingUp size={14} color="#7FA87A" style={{flexShrink: 0}}/>
                                </div>
                                <div className="mono" style={{fontSize: "clamp(17px, 2.2vw, 22px)", fontWeight: 700, color: "#7FA87A", overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.2}}>
                                    {formatCurrency(stats?.avgPerCareerMonth || 0)}<span
                                    style={{fontSize: 12, fontWeight: 400}}>/mo</span>
                                </div>
                            </div>
                            <div className="mono" style={{fontSize: 11, color: "#5E6570", marginTop: 6, overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.3}}>
                                across all {stats?.careerMonths || 0} career mos (unlogged & ₹0 count as $0)
                            </div>
                        </div>

                        <div className="metrics-4-tile">
                            <div>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                    gap: 6
                                }}>
                                    <span className="mono tile-title">
                                        BEST MONTH
                                    </span>
                                    <Award size={14} color="#8AA9C9" style={{flexShrink: 0}}/>
                                </div>
                                <div className="mono" style={{fontSize: "clamp(17px, 2.2vw, 22px)", fontWeight: 700, color: "#EDE7D9", overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.2}}>
                                    {formatCurrency(stats?.highest.total || 0)}
                                </div>
                            </div>
                            <div className="mono" style={{fontSize: 11, color: "#5E6570", marginTop: 6, overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.3}}>
                                {stats && stats.highest.total > 0 ? `${MONTHS[stats.highest.month - 1]} ${stats.highest.year} (peak record)` : "—"}
                            </div>
                        </div>

                        <div className="metrics-4-tile">
                            <div>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                    gap: 6
                                }}>
                                    <span className="mono tile-title">
                                        MISSING MONTHS
                                    </span>
                                    <Calendar size={14} color="#C99A5B" style={{flexShrink: 0}}/>
                                </div>
                                <div className="mono" style={{fontSize: "clamp(17px, 2.2vw, 22px)", fontWeight: 700, color: "#EDE7D9", overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.2}}>
                                    {missingMonthsCount} <span style={{fontSize: 12, fontWeight: 400, color: "#8A8F98"}}>mos unlogged</span>
                                </div>
                            </div>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 6,
                                flexWrap: "wrap",
                                gap: "4px 8px"
                            }}>
                                <span className="mono" style={{fontSize: 11, color: "#5E6570", overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.3}}>
                                    {stats?.coveragePct || 0}% coverage ({stats?.monthsLogged || 0} of {stats?.careerMonths || 0} mos)
                                </span>
                                {missingMonthsCount > 0 && (<button
                                        onClick={() => {
                                            setOpenSections(prev => ({...prev, ledger: true}));
                                            setTimeout(() => {
                                                document.getElementById("career-streak-heatmap")?.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "start"
                                                });
                                            }, 100);
                                        }}
                                        className="mono"
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#C9A227",
                                            fontSize: 11,
                                            cursor: "pointer",
                                            padding: 0,
                                            whiteSpace: "nowrap",
                                            textDecoration: "underline"
                                        }}
                                    >
                                        view gaps &rarr;
                                    </button>)}
                            </div>
                        </div>
                    </div>

                    {/* Executive Insights & Signals */}
                    <div style={{marginBottom: 24}}>
                        <div className="mono" style={{
                            fontSize: 11,
                            letterSpacing: "0.06em",
                            color: "#8A8F98",
                            marginBottom: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}>
                            <Lightbulb size={13} color="#C9A227"/> EXECUTIVE FINANCIAL SIGNALS ({smartInsights.length})
                        </div>

                        {smartInsights.length === 0 ? (<div style={{color: "#5E6570", fontSize: 13, padding: "12px 0"}}>
                                Log your monthly earnings above to generate automated financial insights.
                            </div>) : (<div style={{
                                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12
                            }}>
                                {smartInsights.map((insight, idx) => (<div
                                        key={idx}
                                        style={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            borderLeft: `3px solid ${insight.color}`,
                                            borderRadius: 4,
                                            padding: "12px 14px"
                                        }}
                                    >
                                        <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 5}}>
                                            {insight.icon}
                                            <span className="mono tag-chip" style={{
                                                background: `${insight.color}22`, color: insight.color
                                            }}>
                                                {insight.tag}
                                            </span>
                                            <span style={{fontSize: 13, fontWeight: 600, color: "#EDE7D9"}}>
                                                {insight.title}
                                            </span>
                                        </div>
                                        <div style={{fontSize: 12.5, color: "#8A8F98", lineHeight: 1.5}}>
                                            {insight.desc}
                                        </div>
                                    </div>))}
                            </div>)}
                    </div>

                    {/* INTERWEAVED CHARTS: SOURCE PIE & ANNUAL SOURCE MIX */}
                    {stats && stats.sourceBreakdown.length > 0 && (<div style={{
                            background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: "16px 20px"
                        }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 16,
                                flexWrap: "wrap",
                                gap: 8
                            }}>
                                <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                    <PieIcon size={15} color="#C9A227"/>
                                    <span className="mono" style={{
                                        fontSize: 11.5,
                                        letterSpacing: "0.06em",
                                        color: "#EDE7D9",
                                        fontWeight: 700
                                    }}>
                                        INCOME STREAM DISTRIBUTION & ARCHITECTURE
                                    </span>
                                </div>
                                <span className="mono" style={{fontSize: 11, color: "#8A8F98"}}>
                                    {stats.allSources.length} distinct income stream{stats.allSources.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            <div className="charts-grid-2">
                                {/* Donut Breakdown */}
                                <div style={{
                                    background: "#14181C",
                                    border: "1px solid #2A3038",
                                    borderRadius: 4,
                                    padding: 14
                                }}>
                                    <div className="mono" style={{fontSize: 10.5, color: "#8A8F98", marginBottom: 10}}>
                                        LIFETIME REVENUE BREAKDOWN
                                    </div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={stats.sourceBreakdown}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={48}
                                                outerRadius={75}
                                                paddingAngle={3}
                                            >
                                                {stats.sourceBreakdown.map((_, i) => (
                                                    <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    background: "#1A1F25",
                                                    border: "1px solid #2A3038",
                                                    borderRadius: 4,
                                                    fontSize: 11.5
                                                }}
                                                formatter={(val: any) => [formatCurrency(Number(val)), "Earnings"]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                        justifyContent: "center",
                                        marginTop: 8
                                    }}>
                                        {stats.sourceBreakdown.map((s, i) => (<div key={s.name} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                                fontSize: 11
                                            }}>
                                                <span style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 2,
                                                    background: PALETTE[i % PALETTE.length]
                                                }}></span>
                                                <span style={{color: "#8A8F98"}}>{s.name} ({s.pct.toFixed(0)}%)</span>
                                            </div>))}
                                    </div>
                                </div>

                                {/* Stacked Bar Chart by Year */}
                                <div style={{
                                    background: "#14181C",
                                    border: "1px solid #2A3038",
                                    borderRadius: 4,
                                    padding: 14
                                }}>
                                    <div className="mono" style={{fontSize: 10.5, color: "#8A8F98", marginBottom: 10}}>
                                        SOURCE EVOLUTION BY YEAR
                                    </div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={stats.stackedByYear}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1F252C" vertical={false}/>
                                            <XAxis dataKey="year" stroke="#5E6570" tick={{fontSize: 10}}/>
                                            <YAxis stroke="#5E6570" tick={{fontSize: 10}}
                                                   tickFormatter={v => `${Math.round(v / 1000)}k`}/>
                                            <Tooltip
                                                contentStyle={{
                                                    background: "#1A1F25",
                                                    border: "1px solid #2A3038",
                                                    borderRadius: 4,
                                                    fontSize: 11.5
                                                }}
                                                formatter={(val: any, name: any) => [formatCurrency(Number(val)), String(name)]}
                                            />
                                            {stats.allSources.map((source, i) => (
                                                <Bar key={source} dataKey={source} stackId="a"
                                                     fill={PALETTE[i % PALETTE.length]}/>))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                        justifyContent: "center",
                                        marginTop: 8
                                    }}>
                                        {stats.allSources.map((source, i) => (<div key={source} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                                fontSize: 11
                                            }}>
                                                <span style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 2,
                                                    background: PALETTE[i % PALETTE.length]
                                                }}></span>
                                                <span style={{color: "#8A8F98"}}>{source}</span>
                                            </div>))}
                                    </div>
                                </div>
                            </div>
                        </div>)}
                </AccordionSection>

                {/* 3. SECTION: TARGETS & GOALS COMMAND CENTER */}
                <AccordionSection
                    id="coins-targets-command"
                    isOpen={openSections.targets}
                    onToggle={() => toggleSection("targets")}
                    icon={<Target size={16} color="#7FA87A"/>}
                    title="TARGETS & GOALS COMMAND CENTER"
                    badge={<span className="mono tag-chip" style={{
                        background: currentYearPctMet >= 100 ? "#7FA87A22" : "#2A3038",
                        color: currentYearPctMet >= 100 ? "#7FA87A" : "#8A8F98"
                    }}>
                            {currentYearTargetMonthly > 0 ? `${CURRENT_YEAR}: ${formatCurrency(currentYearTargetMonthly)}/mo (${currentYearPctMet.toFixed(0)}% met)` : `Set ${CURRENT_YEAR} Target`}
                        </span>}
                >
                    {/* Command Tabs */}
                    <div className="command-tabs-bar">
                        <button
                            type="button"
                            onClick={() => setTargetActiveTab("yearly")}
                            className={`mono nav-pill ${targetActiveTab === "yearly" ? "active" : ""}`}
                        >
                            Yearly Targets & Run-Rate
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetActiveTab("wallet")}
                            className={`mono nav-pill ${targetActiveTab === "wallet" ? "active" : ""}`}
                        >
                            Wallet Goals Funding
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetActiveTab("career")}
                            className={`mono nav-pill ${targetActiveTab === "career" ? "active" : ""}`}
                        >
                            Career Average Target
                        </button>
                    </div>

                    {/* TAB 1: YEARLY TARGETS & RUN-RATE */}
                    {targetActiveTab === "yearly" && (<div>
                            {/* Current Year Target Hero Card */}
                            <div style={{
                                background: "#1A1F25",
                                border: "1px solid #2A3038",
                                borderRadius: 4,
                                padding: "16px 18px",
                                marginBottom: 18
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 12,
                                    flexWrap: "wrap",
                                    gap: 10
                                }}>
                                    <div>
                                        <span style={{fontSize: 14, fontWeight: 700, color: "#EDE7D9"}}>
                                            {CURRENT_YEAR} ANNUAL TARGET
                                        </span>
                                        {currentYearTargetMonthly > 0 && (<span className="mono" style={{
                                                fontSize: 12,
                                                color: "#8A8F98",
                                                marginLeft: 8
                                            }}>
                                                ({formatCurrency(currentYearTargetMonthly)}/mo &times; 12 = {formatCurrency(currentYearTargetAnnual)})
                                            </span>)}
                                    </div>
                                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                        <span className="mono"
                                              style={{fontSize: 11, color: "#8A8F98"}}>Target / mo:</span>
                                        <div style={{display: "flex", alignItems: "center", width: 140}}>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder="₹ / mo"
                                                value={coinsTargets[String(CURRENT_YEAR)] ?? ""}
                                                onChange={e => {
                                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                                    void persistTargets({...coinsTargets, [String(CURRENT_YEAR)]: val});
                                                }}
                                                style={{fontSize: 12.5, padding: "5px 8px"}}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {currentYearTargetMonthly > 0 ? (<>
                                        <div style={{marginBottom: 10}}>
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                fontSize: 11.5,
                                                marginBottom: 5
                                            }} className="mono">
                                                <span style={{color: "#8A8F98"}}>Earned so far: <strong
                                                    style={{color: "#EDE7D9"}}>{formatCurrency(currentYearEarned)}</strong></span>
                                                <span style={{
                                                    color: currentYearPctMet >= 100 ? "#7FA87A" : "#C9A227",
                                                    fontWeight: 600
                                                }}>
                                                    {currentYearPctMet.toFixed(1)}% of {formatCurrency(currentYearTargetAnnual)}
                                                </span>
                                            </div>
                                            <div style={{
                                                height: 7,
                                                background: "#14181C",
                                                borderRadius: 3,
                                                overflow: "hidden"
                                            }}>
                                                <div style={{
                                                    width: `${Math.min(100, currentYearPctMet)}%`,
                                                    height: "100%",
                                                    background: currentYearPctMet >= 100 ? "#7FA87A" : "#C9A227",
                                                    transition: "width 0.3s ease"
                                                }}/>
                                            </div>
                                        </div>

                                        <div className="target-kpi-grid">
                                            <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                                <div className="mono"
                                                     style={{fontSize: 10, color: "#8A8F98"}}>RUN-RATE
                                                </div>
                                                <div className="mono" style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: "#EDE7D9",
                                                    marginTop: 2
                                                }}>
                                                    {formatCurrency(Math.round(currentYearEarned / Math.max(1, CURRENT_MONTH)))}/mo
                                                </div>
                                            </div>
                                            <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                                <div className="mono" style={{fontSize: 10, color: "#8A8F98"}}>TARGET
                                                    NEEDED
                                                </div>
                                                <div className="mono" style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: "#C9A227",
                                                    marginTop: 2
                                                }}>
                                                    {formatCurrency(currentYearTargetMonthly)}/mo
                                                </div>
                                            </div>
                                            <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                                <div className="mono" style={{fontSize: 10, color: "#8A8F98"}}>REMAINING
                                                    PACE
                                                </div>
                                                <div className="mono" style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: currentYearEarned >= currentYearTargetAnnual ? "#7FA87A" : "#F59E0B",
                                                    marginTop: 2
                                                }}>
                                                    {currentYearEarned >= currentYearTargetAnnual ? "Target Achieved!" : formatCurrency(Math.round((currentYearTargetAnnual - currentYearEarned) / Math.max(1, 12 - CURRENT_MONTH))) + "/mo"}
                                                </div>
                                            </div>
                                            <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                                <div className="mono" style={{fontSize: 10, color: "#8A8F98"}}>YEAR-END
                                                    PROJECTED
                                                </div>
                                                <div className="mono" style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: "#EDE7D9",
                                                    marginTop: 2
                                                }}>
                                                    {formatCurrency(Math.round((currentYearEarned / Math.max(1, CURRENT_MONTH)) * 12))}
                                                </div>
                                            </div>
                                        </div>
                                    </>) : (<div style={{color: "#8A8F98", fontSize: 12.5}}>
                                        Set a monthly target for {CURRENT_YEAR} above to track your annual progress bar
                                        and monthly pacing.
                                    </div>)}
                            </div>

                            {/* Collapsible Past/Future Target Years */}
                            <div style={{marginBottom: 18}}>
                                <button
                                    onClick={() => setShowAllTargetYears(s => !s)}
                                    className="mono"
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#C9A227",
                                        fontSize: 12,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 5,
                                        padding: 0
                                    }}
                                >
                                    <Target
                                        size={13}/> {showAllTargetYears ? "Hide past / future target years" : "Set targets for past or future years..."}
                                </button>

                                {showAllTargetYears && (<div style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                                        gap: 10,
                                        marginTop: 12,
                                        background: "#1A1F25",
                                        border: "1px solid #2A3038",
                                        borderRadius: 4,
                                        padding: 14
                                    }}>
                                        {YEARS.map(y => (<div key={y} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: 8
                                            }}>
                                                <span className="mono" style={{
                                                    fontSize: 12,
                                                    color: y === CURRENT_YEAR ? "#C9A227" : "#8A8F98"
                                                }}>
                                                    {y}:
                                                </span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="—"
                                                    value={coinsTargets[String(y)] ?? ""}
                                                    onChange={e => {
                                                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                                                        void persistTargets({...coinsTargets, [String(y)]: val});
                                                    }}
                                                    style={{fontSize: 11.5, padding: "4px 8px", width: 95}}
                                                />
                                            </div>))}
                                    </div>)}
                            </div>
                        </div>)}

                    {/* TAB 2: WALLET GOALS FUNDING CALCULATOR (MULTISELECT, EDITABLE TARGET & DEADLINE, ZERO PAST RATE ACCOUNT) */}
                    {targetActiveTab === "wallet" && (<div style={{
                            background: "#1A1F25",
                            border: "1px solid #2A3038",
                            borderRadius: 4,
                            padding: "16px 18px",
                            marginBottom: 18
                        }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 14,
                                flexWrap: "wrap",
                                gap: 10
                            }}>
                                <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                    <Wallet size={16} color="#C9A227"/>
                                    <span style={{fontSize: 14, fontWeight: 700, color: "#EDE7D9"}}>
                                        WALLET GOALS FUNDING CALCULATOR
                                    </span>
                                </div>
                                <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedGoalIds(new Set(pendingWalletGoals.map(g => g.id)))}
                                        className="mono row-btn"
                                        style={{fontSize: 11, color: "#C9A227"}}
                                    >
                                        Select All
                                    </button>
                                    <span style={{color: "#2A3038"}}>•</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedGoalIds(new Set())}
                                        className="mono row-btn"
                                        style={{fontSize: 11, color: "#8A8F98"}}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* Goal Multiselect Checklist */}
                            <div style={{
                                background: "#14181C",
                                border: "1px solid #2A3038",
                                borderRadius: 4,
                                padding: "12px 14px",
                                marginBottom: 16
                            }}>
                                <div className="mono" style={{fontSize: 10.5, color: "#8A8F98", marginBottom: 10}}>
                                    GOAL SCOPE ({selectedGoalIds.size} of {pendingWalletGoals.length} selected):
                                </div>
                                {pendingWalletGoals.length === 0 ? (<div style={{color: "#5E6570", fontSize: 12.5}}>
                                        No pending wallet goals found. You can enter a custom target amount below.
                                    </div>) : (<div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
                                        {pendingWalletGoals.map((g: any) => {
                                            const isSelected = selectedGoalIds.has(g.id);
                                            return (<label
                                                    key={g.id}
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        padding: "6px 12px",
                                                        borderRadius: 3,
                                                        background: isSelected ? "#1F252C" : "transparent",
                                                        border: `1px solid ${isSelected ? "#C9A227" : "#2A3038"}`,
                                                        cursor: "pointer",
                                                        userSelect: "none"
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setSelectedGoalIds(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(g.id)) next.delete(g.id); else next.add(g.id);
                                                                return next;
                                                            });
                                                        }}
                                                        style={{margin: 0, width: "auto", cursor: "pointer"}}
                                                    />
                                                    <span style={{
                                                        fontSize: 12.5,
                                                        color: isSelected ? "#EDE7D9" : "#8A8F98",
                                                        fontWeight: isSelected ? 600 : 400
                                                    }}>
                                                        {g.name || g.text || "Goal"}
                                                    </span>
                                                    <span className="mono" style={{
                                                        fontSize: 11.5,
                                                        color: isSelected ? "#C9A227" : "#5E6570",
                                                        fontWeight: 600
                                                    }}>
                                                        {formatCurrency(Number(g.cost || 0))}
                                                    </span>
                                                </label>);
                                        })}
                                    </div>)}
                            </div>

                            {/* Direct Target Amount & Direct Target Deadline Controls */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                                gap: 14,
                                marginBottom: 16
                            }}>
                                <div style={{
                                    background: "#14181C",
                                    border: "1px solid #2A3038",
                                    borderRadius: 4,
                                    padding: "12px 14px"
                                }}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 6
                                    }}>
                                        <Label>Target Amount ({currencySymbol}) — Directly Editable</Label>
                                        {customTargetAmount !== "" && (<button
                                                type="button"
                                                onClick={() => setCustomTargetAmount("")}
                                                className="mono"
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "#C9A227",
                                                    fontSize: 10.5,
                                                    cursor: "pointer",
                                                    padding: 0
                                                }}
                                            >
                                                Reset to selected ({formatCurrency(selectedGoalsSum)})
                                            </button>)}
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0"
                                        value={customTargetAmount !== "" ? customTargetAmount : (selectedGoalsSum > 0 ? selectedGoalsSum : "")}
                                        onChange={e => setCustomTargetAmount(e.target.value)}
                                        style={{fontSize: 14, fontWeight: 700, color: "#C9A227"}}
                                    />
                                    <div className="mono" style={{fontSize: 10.5, color: "#5E6570", marginTop: 5}}>
                                        Selected goals sum: {formatCurrency(selectedGoalsSum)}
                                    </div>
                                </div>

                                <div style={{
                                    background: "#14181C",
                                    border: "1px solid #2A3038",
                                    borderRadius: 4,
                                    padding: "12px 14px"
                                }}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 6
                                    }}>
                                        <Label>Target Deadline — Directly Editable</Label>
                                        <span className="mono" style={{fontSize: 10.5, color: "#8A8F98"}}>
                                            {walletFundingCalc.daysRemaining} days from today
                                        </span>
                                    </div>
                                    <input
                                        type="date"
                                        value={targetDeadline}
                                        min={TODAY_STR}
                                        onChange={e => setTargetDeadline(e.target.value)}
                                        style={{fontSize: 12.5, color: "#EDE7D9"}}
                                    />
                                    {/* Quick Deadline Pills */}
                                    <div style={{display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap"}}>
                                        <button type="button" onClick={() => setTargetDeadline(addMonthsToToday(3))}
                                                className="mono tag-chip" style={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            color: "#8A8F98",
                                            cursor: "pointer"
                                        }}>+3 Mo
                                        </button>
                                        <button type="button" onClick={() => setTargetDeadline(addMonthsToToday(6))}
                                                className="mono tag-chip" style={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            color: "#8A8F98",
                                            cursor: "pointer"
                                        }}>+6 Mo
                                        </button>
                                        <button type="button" onClick={() => setTargetDeadline(`${CURRENT_YEAR}-12-31`)}
                                                className="mono tag-chip" style={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            color: "#8A8F98",
                                            cursor: "pointer"
                                        }}>End of {CURRENT_YEAR}</button>
                                        <button type="button" onClick={() => setTargetDeadline(addMonthsToToday(12))}
                                                className="mono tag-chip" style={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            color: "#8A8F98",
                                            cursor: "pointer"
                                        }}>+1 Year
                                        </button>
                                        <button type="button" onClick={() => setTargetDeadline(addMonthsToToday(24))}
                                                className="mono tag-chip" style={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            color: "#8A8F98",
                                            cursor: "pointer"
                                        }}>+2 Years
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* The 4 Pure Forward-Looking Calculation Cards */}
                            {walletFundingCalc.error ? (
                                <div style={{color: "#8A8F98", fontSize: 13, padding: "12px 0"}}>
                                    {walletFundingCalc.error}
                                </div>) : (<div>
                                    <div className="target-kpi-grid">
                                        <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                            <div className="mono" style={{fontSize: 10, color: "#8A8F98"}}>TARGET
                                                SCOPE
                                            </div>
                                            <div className="mono" style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: "#EDE7D9",
                                                marginTop: 2
                                            }}>
                                                {formatCurrency(walletFundingCalc.targetAmount)}
                                            </div>
                                            <div className="mono"
                                                 style={{fontSize: 10.5, color: "#5E6570", marginTop: 2}}>
                                                across {selectedGoalIds.size} selected
                                                goal{selectedGoalIds.size === 1 ? "" : "s"}
                                            </div>
                                        </div>

                                        <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                            <div className="mono" style={{fontSize: 10, color: "#8A8F98"}}>TIME
                                                HORIZON
                                            </div>
                                            <div className="mono" style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: "#8AA9C9",
                                                marginTop: 2
                                            }}>
                                                {walletFundingCalc.daysRemaining} days
                                            </div>
                                            <div className="mono"
                                                 style={{fontSize: 10.5, color: "#5E6570", marginTop: 2}}>
                                                by {walletFundingCalc.targetDateFormatted}
                                            </div>
                                        </div>

                                        <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                            <div className="mono" style={{fontSize: 10, color: "#8A8F98"}}>NEEDED /
                                                MONTH
                                            </div>
                                            <div className="mono" style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: "#C9A227",
                                                marginTop: 2
                                            }}>
                                                {formatCurrency(walletFundingCalc.neededPerMonth)}<span
                                                style={{fontSize: 11, fontWeight: 400}}>/mo</span>
                                            </div>
                                            <div className="mono"
                                                 style={{fontSize: 10.5, color: "#5E6570", marginTop: 2}}>
                                                over {walletFundingCalc.monthsRemaining.toFixed(1)} months
                                            </div>
                                        </div>

                                        <div style={{background: "#14181C", padding: "10px 12px", borderRadius: 3}}>
                                            <div className="mono" style={{fontSize: 10, color: "#8A8F98"}}>NEEDED / DAY
                                                FROM TODAY
                                            </div>
                                            <div className="mono" style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: "#7FA87A",
                                                marginTop: 2
                                            }}>
                                                {formatCurrency(walletFundingCalc.neededPerDay)}<span
                                                style={{fontSize: 11, fontWeight: 400}}>/day</span>
                                            </div>
                                            <div className="mono"
                                                 style={{fontSize: 10.5, color: "#5E6570", marginTop: 2}}>
                                                daily funding required
                                            </div>
                                        </div>
                                    </div>
                                </div>)}
                        </div>)}

                    {/* TAB 3: CAREER AVERAGE TARGET CALCULATOR */}
                    {targetActiveTab === "career" && (<div style={{
                            background: "#1A1F25",
                            border: "1px solid #2A3038",
                            borderRadius: 4,
                            padding: "16px 18px",
                            marginBottom: 18
                        }}>
                            <div style={{fontSize: 14, fontWeight: 700, color: "#EDE7D9", marginBottom: 8}}>
                                CAREER AVERAGE TARGET CALCULATOR
                            </div>
                            <div style={{fontSize: 12.5, color: "#8A8F98", lineHeight: 1.5, marginBottom: 14}}>
                                Your current lifetime career average is <strong
                                style={{color: "#C9A227"}}>{formatCurrency(stats?.avgPerCareerMonth || 0)}/mo</strong> across
                                all {stats?.careerMonths || 0} elapsed career months since Jan 2015.
                            </div>
                            <div style={{display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap"}}>
                                <div style={{flex: 1, minWidth: 200}}>
                                    <Label>Desired Lifetime Career Average ({currencySymbol}/mo)</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 50000"
                                        value={calcTarget}
                                        onChange={e => setCalcTarget(e.target.value)}
                                    />
                                </div>
                                {parseFloat(calcTarget) > 0 && stats && (<div
                                        style={{flex: 2, background: "#14181C", padding: "10px 14px", borderRadius: 3}}>
                                        <div className="mono" style={{fontSize: 11, color: "#8A8F98"}}>REQUIRED LIFETIME
                                            ACCUMULATION
                                        </div>
                                        <div className="mono"
                                             style={{fontSize: 16, fontWeight: 700, color: "#EDE7D9", marginTop: 2}}>
                                            {formatCurrency(parseFloat(calcTarget) * stats.careerMonths)}
                                        </div>
                                        <div style={{fontSize: 11.5, color: "#8A8F98", marginTop: 4}}>
                                            Current
                                            gap: {formatCurrency(Math.max(0, (parseFloat(calcTarget) * stats.careerMonths) - stats.total))}
                                        </div>
                                    </div>)}
                            </div>
                        </div>)}

                    {/* INTERWEAVED CHARTS: TARGET VS ACTUAL BENCHMARK & CUMULATIVE TRAJECTORY */}
                    <div className="charts-grid-2">
                        {/* Target Benchmark Chart */}
                        <div style={{background: "#14181C", border: "1px solid #2A3038", borderRadius: 4, padding: 14}}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 10
                            }}>
                                <div className="mono" style={{fontSize: 10.5, color: "#8A8F98"}}>
                                    YEARLY EARNINGS VS TARGET BENCHMARK
                                </div>
                                <div style={{display: "flex", gap: 4}}>
                                    {(["annual", "monthly"] as const).map(m => (<button
                                            key={m}
                                            onClick={() => setYearlyChartMode(m)}
                                            className="mono"
                                            style={{
                                                background: yearlyChartMode === m ? "#2A3038" : "transparent",
                                                color: yearlyChartMode === m ? "#EDE7D9" : "#8A8F98",
                                                border: "none",
                                                padding: "3px 7px",
                                                borderRadius: 2,
                                                fontSize: 10,
                                                cursor: "pointer"
                                            }}
                                        >
                                            {m === "annual" ? "Annual" : "Monthly Pace"}
                                        </button>))}
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <ComposedChart data={targetComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1F252C" vertical={false}/>
                                    <XAxis dataKey="year" stroke="#5E6570" tick={{fontSize: 10}}/>
                                    <YAxis stroke="#5E6570" tick={{fontSize: 10}}
                                           tickFormatter={v => `${Math.round(v / 1000)}k`}/>
                                    <Tooltip
                                        contentStyle={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            borderRadius: 4,
                                            fontSize: 11.5
                                        }}
                                        formatter={(val: any, name: any) => [formatCurrency(Number(val)), name === "actual" ? "Actual Earned" : "Target Benchmark"]}
                                    />
                                    <Bar dataKey="actual" fill="#C9A227" radius={[2, 2, 0, 0]}/>
                                    <Line type="stepAfter" dataKey="target" stroke="#8AA9C9" strokeWidth={2}
                                          strokeDasharray="4 4" dot={{r: 3, fill: "#8AA9C9"}}/>
                                </ComposedChart>
                            </ResponsiveContainer>
                            <div className="mono"
                                 style={{fontSize: 10, color: "#8A8F98", textAlign: "center", marginTop: 6}}>
                                Dashed line = Target Benchmark • Yellow bars = Actual Earned
                            </div>
                        </div>

                        {/* Cumulative Lifetime Trajectory Curve */}
                        <div style={{background: "#14181C", border: "1px solid #2A3038", borderRadius: 4, padding: 14}}>
                            <div className="mono" style={{fontSize: 10.5, color: "#8A8F98", marginBottom: 10}}>
                                CUMULATIVE LIFETIME WEALTH TRAJECTORY
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={stats?.cumulative || []}>
                                    <defs>
                                        <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#C9A227" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#C9A227" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1F252C" vertical={false}/>
                                    <XAxis dataKey="label" stroke="#5E6570" tick={{fontSize: 10}} minTickGap={30}/>
                                    <YAxis stroke="#5E6570" tick={{fontSize: 10}}
                                           tickFormatter={v => `${Math.round(v / 1000)}k`}/>
                                    <Tooltip
                                        contentStyle={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            borderRadius: 4,
                                            fontSize: 11.5
                                        }}
                                        formatter={(val: any) => [formatCurrency(Number(val)), "Cumulative Total"]}
                                    />
                                    <Area type="monotone" dataKey="cumulative" stroke="#C9A227" strokeWidth={2}
                                          fill="url(#wealthGrad)"/>
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="mono"
                                 style={{fontSize: 10, color: "#8A8F98", textAlign: "center", marginTop: 6}}>
                                Total wealth curve accumulated over career timeline
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                {/* 4. SECTION: EARNINGS LEDGER & CAREER TIMELINE */}
                <AccordionSection
                    id="coins-ledger-timeline"
                    isOpen={openSections.ledger}
                    onToggle={() => toggleSection("ledger")}
                    icon={<Calendar size={16} color="#8AA9C9"/>}
                    title="EARNINGS LEDGER & CAREER TIMELINE"
                    badge={<span className="mono tag-chip" style={{background: "#2A3038", color: "#8A8F98"}}>
                            {visibleEntries.length} entries • {missingMonthsCount} unlogged
                        </span>}
                >
                    {/* GITHUB-STYLE CAREER STREAK HEATMAP */}
                    <div id="career-streak-heatmap" style={{
                        background: "#1A1F25",
                        border: "1px solid #2A3038",
                        borderRadius: 4,
                        padding: "16px 20px",
                        marginBottom: 20
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 14,
                            flexWrap: "wrap",
                            gap: 10
                        }}>
                            <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                <Flame size={15} color="#C9A227"/>
                                <span className="mono" style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    color: "#EDE7D9"
                                }}>
                                    CAREER TIMELINE & LOGGED MONTHS ({stats?.monthsLogged || 0} of {stats?.careerMonths || 0} logged{stats && stats.zeroMonthsLogged > 0 ? ` • ${stats.positiveMonthsLogged} positive, ${stats.zeroMonthsLogged} broke/₹0` : ""})
                                </span>
                            </div>
                            <div style={{display: "flex", alignItems: "center", gap: "6px 14px", flexWrap: "wrap", fontSize: 11}}
                                 className="mono">
                                <span style={{display: "flex", alignItems: "center", gap: 5, color: "#8A8F98"}}>
                                    <span style={{width: 9, height: 9, background: "#C9A227", borderRadius: 2}}></span> logged (&gt;₹0)
                                </span>
                                <span style={{display: "flex", alignItems: "center", gap: 5, color: "#8A8F98"}}>
                                    <span style={{
                                        width: 9,
                                        height: 9,
                                        background: "#78350F",
                                        border: "1px solid #F59E0B",
                                        borderRadius: 2
                                    }}></span> logged (₹0 / broke)
                                </span>
                                <span style={{display: "flex", alignItems: "center", gap: 5, color: "#8A8F98"}}>
                                    <span style={{
                                        width: 9,
                                        height: 9,
                                        background: "#14181C",
                                        border: "1px solid #2A3038",
                                        borderRadius: 2
                                    }}></span> unlogged
                                </span>
                            </div>
                        </div>

                        {/* Heatmap Grid */}
                        <div style={{overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 6}}>
                            <div style={{display: "flex", flexDirection: "column", gap: 4, minWidth: 320}}>
                                {YEARS.filter(y => y <= (dynamicTimeline[dynamicTimeline.length - 1]?.year || CURRENT_YEAR)).map(y => (
                                    <div key={y} style={{display: "flex", alignItems: "center", gap: 6}}>
                                        <span className="mono" style={{fontSize: 10.5, color: "#8A8F98", width: 34}}>
                                            {y}
                                        </span>
                                        <div style={{display: "flex", gap: 4}}>
                                            {MONTHS.map((m, idx) => {
                                                const mm = idx + 1;
                                                const isPastOrPresent = y < CURRENT_YEAR || (y === CURRENT_YEAR && mm <= CURRENT_MONTH) || dynamicTimeline.some(d => d.year === y && d.month === mm);
                                                const k = monthKey(y, mm);
                                                const isPositive = stats?.positiveMonthSet.has(k);
                                                const isZeroLogged = stats?.zeroMonthSet.has(k);
                                                const monthData = stats?.byMonthMap?.[k];

                                                const cellBg = isPositive ? "#C9A227" : isZeroLogged ? "#78350F" : (isPastOrPresent ? "#14181C" : "transparent");

                                                const cellBorder = isPositive ? "1px solid #E0B838" : isZeroLogged ? "1px solid #F59E0B" : (isPastOrPresent ? "1px solid #2A3038" : "1px dashed #1F252C");

                                                const cellTitle = isPositive ? `${m} ${y}: Logged ${formatCurrency(monthData?.total || 0)} (${monthData?.sources.join(", ") || "Income"})` : isZeroLogged ? `${m} ${y}: Logged ₹0.00 (Broke / Zero Income - ${monthData?.sources.join(", ") || "Nil"})` : (isPastOrPresent ? `${m} ${y}: Unlogged (Missing record)` : `${m} ${y}: Future`);

                                                return (<div
                                                        key={mm}
                                                        title={cellTitle}
                                                        onClick={() => {
                                                            setMode("monthly");
                                                            setEntryYear(y);
                                                            setEntryMonth(mm);
                                                            setOpenSections(prev => ({...prev, form: true}));
                                                            setTimeout(() => {
                                                                document.getElementById("coins-entry-form")?.scrollIntoView({behavior: "smooth"});
                                                            }, 100);
                                                        }}
                                                        style={{
                                                            width: 14,
                                                            height: 14,
                                                            borderRadius: 2,
                                                            background: cellBg,
                                                            border: cellBorder,
                                                            cursor: "pointer",
                                                            transition: "transform 0.1s ease"
                                                        }}
                                                    />);
                                            })}
                                        </div>
                                    </div>))}
                            </div>
                        </div>

                        {/* Missing Spans with 1-Click Backfill */}
                        {stats && stats.missingRanges.length > 0 && (
                            <div style={{marginTop: 14, paddingTop: 12, borderTop: "1px solid #2A3038"}}>
                                <div className="mono" style={{fontSize: 11, color: "#8A8F98", marginBottom: 8}}>
                                    UNLOGGED RANGES (CLICK TO AUTOFİLL FORM):
                                </div>
                                <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
                                    {stats.missingRanges.slice(0, 5).map((r, i) => (<div
                                            key={i}
                                            style={{
                                                background: "#14181C",
                                                border: "1px solid #2A3038",
                                                borderRadius: 3,
                                                padding: "4px 8px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                fontSize: 11,
                                                flexWrap: "wrap"
                                            }}
                                            className="mono"
                                        >
                                            <span style={{color: "#EDE7D9"}}>
                                                {MONTHS[r.startMonth - 1]} {r.startYear} &ndash; {MONTHS[r.endMonth - 1]} {r.endYear}
                                            </span>
                                            <span style={{color: "#8A8F98"}}>({r.count} mos)</span>
                                            <button
                                                onClick={() => handleFillMissingRange(r)}
                                                className="tag-chip"
                                                style={{
                                                    background: "#2A3038",
                                                    color: "#C9A227",
                                                    border: "none",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Fill
                                            </button>
                                        </div>))}
                                </div>
                            </div>)}
                    </div>

                    {/* INTERWEAVED CHARTS: MONTHLY TRENDLINE & YOY GROWTH */}
                    <div className="charts-grid-2" style={{marginBottom: 20}}>
                        {/* Month by month trend */}
                        <div style={{background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: 14}}>
                            <div className="mono" style={{fontSize: 10.5, color: "#8A8F98", marginBottom: 10}}>
                                HISTORICAL MONTH-BY-MONTH TREND
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={stats?.trendLine || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1F252C" vertical={false}/>
                                    <XAxis dataKey="label" stroke="#5E6570" tick={{fontSize: 9}} minTickGap={25}/>
                                    <YAxis stroke="#5E6570" tick={{fontSize: 10}}
                                           tickFormatter={v => `${Math.round(v / 1000)}k`}/>
                                    <Tooltip
                                        contentStyle={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            borderRadius: 4,
                                            fontSize: 11.5
                                        }}
                                        formatter={(val: any) => [formatCurrency(Number(val)), "Monthly Total"]}
                                    />
                                    <Line type="monotone" dataKey="total" stroke="#7FA87A" strokeWidth={2} dot={false}/>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* YoY Growth % */}
                        <div style={{background: "#1A1F25", border: "1px solid #2A3038", borderRadius: 4, padding: 14}}>
                            <div className="mono" style={{fontSize: 10.5, color: "#8A8F98", marginBottom: 10}}>
                                YEAR-OVER-YEAR REVENUE GROWTH (%)
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={stats?.yoyGrowth || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1F252C" vertical={false}/>
                                    <XAxis dataKey="year" stroke="#5E6570" tick={{fontSize: 10}}/>
                                    <YAxis stroke="#5E6570" tick={{fontSize: 10}} tickFormatter={v => `${v}%`}/>
                                    <Tooltip
                                        contentStyle={{
                                            background: "#1A1F25",
                                            border: "1px solid #2A3038",
                                            borderRadius: 4,
                                            fontSize: 11.5
                                        }}
                                        formatter={(val: any) => [`${Number(val)}%`, "YoY Growth"]}
                                    />
                                    <Bar dataKey="pct" fill="#7FA87A" radius={[2, 2, 0, 0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                        flexWrap: "wrap",
                        gap: 10
                    }}>
                        <div className="mono"
                             style={{fontSize: 11, color: "#8A8F98", letterSpacing: "0.06em", fontWeight: 600}}>
                            FILTER & SEARCH ENTRIES
                        </div>
                        <button
                            onClick={() => setShowFilters(s => !s)}
                            className="mono"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                background: showFilters || filtersActive ? "#2A3038" : "#1A1F25",
                                border: "1px solid #2A3038",
                                color: "#D8D2C4",
                                padding: "6px 10px",
                                borderRadius: 3,
                                fontSize: 11,
                                cursor: "pointer"
                            }}
                        >
                            <Filter size={12}/> Filter{filtersActive ? " (Active)" : ""}
                        </button>
                    </div>

                    {showFilters && (<div style={{
                            background: "#1A1F25",
                            border: "1px solid #2A3038",
                            borderRadius: 4,
                            padding: 14,
                            marginBottom: 16
                        }}>
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                                gap: 10,
                                marginBottom: 10
                            }}>
                                <div>
                                    <Label>Source</Label>
                                    <select value={filters.source}
                                            onChange={e => setFilters({...filters, source: e.target.value})}>
                                        <option value="all">All Sources</option>
                                        {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>From Year</Label>
                                    <select value={filters.fromYear}
                                            onChange={e => setFilters({...filters, fromYear: Number(e.target.value)})}>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>To Year</Label>
                                    <select value={filters.toYear}
                                            onChange={e => setFilters({...filters, toYear: Number(e.target.value)})}>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label>Min Amount ({currencySymbol})</Label>
                                    <input type="number" min="0" placeholder="—" value={filters.minAmount}
                                           onChange={e => setFilters({...filters, minAmount: e.target.value})}/>
                                </div>
                                <div>
                                    <Label>Max Amount ({currencySymbol})</Label>
                                    <input type="number" min="0" placeholder="—" value={filters.maxAmount}
                                           onChange={e => setFilters({...filters, maxAmount: e.target.value})}/>
                                </div>
                                <div>
                                    <Label>Search Notes</Label>
                                    <input placeholder="startup, dividend, raise…" value={filters.search}
                                           onChange={e => setFilters({...filters, search: e.target.value})}/>
                                </div>
                            </div>

                            {filtersActive && (<button
                                    onClick={() => setFilters({
                                        source: "all",
                                        fromYear: CAREER_START_YEAR,
                                        toYear: CURRENT_YEAR + 1,
                                        minAmount: "",
                                        maxAmount: "",
                                        search: ""
                                    })}
                                    className="row-btn mono"
                                    style={{fontSize: 11.5, gap: 4}}
                                >
                                    <X size={12}/> Clear Filters
                                </button>)}
                        </div>)}

                    {/* Year-by-Year Collapsible Ledger Tables */}
                    {activeYears.length === 0 ? (
                        <div style={{color: "#5E6570", fontSize: 13.5, padding: "20px 0", textAlign: "center"}}>
                            {visibleEntries.length === 0 ? "No entries found. Log your first month above." : "No entries match these filters."}
                        </div>) : (activeYears.map(year => {
                            const list = coinsEntriesByYear[year] || [];
                            const yearTotal = list.reduce((s, e) => s + e.amount, 0);
                            const isOpen = expandedYear === year;
                            return (<div key={year} style={{
                                    border: "1px solid #2A3038",
                                    borderRadius: 4,
                                    marginBottom: 10,
                                    overflow: "hidden"
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedYear(isOpen ? null : year)}
                                        style={{
                                            width: "100%",
                                            background: "#1A1F25",
                                            border: "none",
                                            padding: "12px 16px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            color: "#EDE7D9",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0}}>
                                            <ChevronRight size={14} style={{
                                                transform: isOpen ? "rotate(90deg)" : "none",
                                                transition: "transform 0.15s ease",
                                                color: "#8A8F98"
                                            }}/>
                                            <span style={{fontSize: 15, fontWeight: 600}}>{year}</span>
                                            <span className="mono" style={{
                                                fontSize: 11,
                                                color: "#8A8F98"
                                            }}>({list.length} {list.length === 1 ? "stream entry" : "stream entries"})</span>
                                        </div>
                                        <span className="mono"
                                              style={{fontSize: 13, color: "#C9A227", fontWeight: 600}}>
                                            {formatCurrency(yearTotal)}
                                        </span>
                                    </button>

                                    {isOpen && (<div className="table-scroll">
                                            <table>
                                                <thead>
                                                <tr>
                                                    <th style={{width: 80}}>Month</th>
                                                    <th style={{width: 130}}>Amount</th>
                                                    <th style={{width: 130}}>Source</th>
                                                    <th>Notes</th>
                                                    <th style={{width: 64}}></th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {list.map(en => (<tr key={en.id}>
                                                        <td>
                                                                <span className="mono"
                                                                      style={{fontWeight: 600, color: "#EDE7D9"}}>
                                                                    {MONTHS[en.month - 1]}
                                                                </span>
                                                        </td>
                                                        <td className="mono" style={{
                                                            fontWeight: 600,
                                                            color: en.amount === 0 ? "#8A8F98" : "#C9A227"
                                                        }}>
                                                            {formatCurrency(en.amount)}
                                                            {en.amount === 0 && (<span style={{
                                                                    fontSize: 9.5,
                                                                    marginLeft: 6,
                                                                    padding: "1px 5px",
                                                                    background: "#3A281E",
                                                                    color: "#F59E0B",
                                                                    borderRadius: 2,
                                                                    border: "1px solid #78350F"
                                                                }}>
                                                                        Broke / Nil
                                                                    </span>)}
                                                        </td>
                                                        <td>
                                                                <span className="mono tag-chip" style={{
                                                                    background: en.amount === 0 ? "#2B1E17" : "#2A3038",
                                                                    color: en.amount === 0 ? "#F59E0B" : "#EDE7D9",
                                                                    border: en.amount === 0 ? "1px solid #78350F" : "none"
                                                                }}>
                                                                    {en.source}
                                                                </span>
                                                        </td>
                                                        <td style={{
                                                            color: "#8A8F98",
                                                            fontSize: 13
                                                        }}>{en.notes || "—"}</td>
                                                        <td>
                                                            <div style={{display: "flex", gap: 2}}>
                                                                <button className="row-btn"
                                                                        onClick={() => startEdit(en)}
                                                                        title="Edit entry">
                                                                    <Pencil size={13}/>
                                                                </button>
                                                                <button className="row-btn"
                                                                        onClick={() => removeEntry(en.id)}
                                                                        title="Delete entry">
                                                                    <Trash2 size={13}/>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>))}
                                                </tbody>
                                            </table>
                                        </div>)}
                                </div>);
                        }))}
                </AccordionSection>

            </div>
        </div>);
}

export function AccordionSection({
                              id, isOpen, onToggle, icon, title, badge, children, headerRight
                          }: {
    id?: string;
    isOpen: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
    title: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
    headerRight?: React.ReactNode;
}) {
    return (
        <div id={id} style={{borderRadius: 4, overflow: "hidden", border: "1px solid #2A3038", background: "#14181C"}}>
            <div
                className="accordion-header"
                onClick={onToggle}
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#1A1F25",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: isOpen ? "1px solid #2A3038" : "none",
                    transition: "background 0.15s ease"
                }}
            >
                <div style={{display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap"}}>
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                        {icon}
                        <span className="mono"
                              style={{fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#EDE7D9"}}>
                            {title}
                        </span>
                    </div>
                    {badge && (<div>{badge}</div>)}
                </div>

                <div style={{display: "flex", alignItems: "center", gap: 10, flexShrink: 0}}>
                    {headerRight}
                    <ChevronDown
                        size={16}
                        style={{
                            color: "#8A8F98",
                            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                            transition: "transform 0.2s ease"
                        }}
                    />
                </div>
            </div>

            {isOpen && (<div className="accordion-body-content" style={{padding: "18px 20px"}}>
                    {children}
                </div>)}
        </div>);
}

export function Label({children}: { children: React.ReactNode }) {
    return <div className="mono" style={{fontSize: 10.5, color: "#5E6570", marginBottom: 4}}>{children}</div>;
}
