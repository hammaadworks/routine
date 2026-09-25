export interface CoinsEntry {
    id: string;
    date: string; // YYYY-MM
    amount: number;
    source: string;
    notes?: string;
    createdAt?: number;
    [key: string]: unknown;
}

export interface CoinsTarget {
    [year: string]: number;
}

export interface CoinsStats {
    totalAllTime: number;
    monthsLogged: number;
    careerMonths: number;
    coveragePct: number;
    avgPerLoggedMonth: number;
    avgPerCareerMonth: number;
    bestYear?: { year: number; total: number };
    latestYoy?: { year: number; pct: number };
    topSource?: { name: string; pct: number };
    longestGap: number;
    streak: number;
}

export interface CoinsDraft {
    date: string;
    amount: string;
    source: string;
    notes: string;
}

export interface CareerTimelineMonth {
    key: string;
    year: number;
    month: number;
    label: string;
    total: number;
    entries: CoinsEntry[];
    target: number;
}
