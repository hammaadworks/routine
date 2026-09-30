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



