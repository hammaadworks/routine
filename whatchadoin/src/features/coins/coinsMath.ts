import type {CoinsEntry} from '@/types/coins.ts';

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const CAREER_START_YEAR = 2015;
export const CAREER_START_MONTH = 1;
export const NOW = new Date();
export const CURRENT_YEAR = NOW.getFullYear();
export const CURRENT_MONTH = NOW.getMonth() + 1;
export const YEARS = Array.from({length: CURRENT_YEAR - CAREER_START_YEAR + 2}, (_, i) => CAREER_START_YEAR + i);
export const SOURCE_PRESETS = ["Job", "Freelance", "Product", "Consulting", "Investment", "Other"];
export const PALETTE = ["#C9A227", "#7FA87A", "#8AA9C9", "#C1665A", "#A78BC9", "#C99A5B", "#6FA3A0"];

export function monthKey(y: number, m: number): string {
    return `${y}-${m}`;
}

export function emptyDraft() {
    return {id: null as string | null, year: CURRENT_YEAR, month: CURRENT_MONTH, amount: "", source: "Job", notes: ""};
}

export function emptyRangeDraft() {
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

export function monthsBetween(sy: number, sm: number, ey: number, em: number): Array<{ year: number; month: number }> {
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

export function buildFullTimeline(): Array<{ year: number; month: number }> {
    const out: Array<{ year: number; month: number }> = [];
    let y = CAREER_START_YEAR;
    let m = CAREER_START_MONTH;
    while (y < CURRENT_YEAR || (y === CURRENT_YEAR && m <= CURRENT_MONTH)) {
        out.push({year: y, month: m});
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }
    return out;
}

export const FULL_TIMELINE = buildFullTimeline();

export function isCoinPublic(e: CoinsEntry): boolean {
    return (e.notes || '').includes('[public]') || (e.source || '').includes('[public]');
}
