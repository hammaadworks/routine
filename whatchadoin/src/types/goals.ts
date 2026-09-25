export interface Goal {
    id: string;
    name: string;
    color?: string;
    cost?: number;
    notes?: string;
    targetDate?: string;
    isPublic?: boolean;
    addressed?: boolean;
    linkedHabits?: string[];
    [key: string]: unknown;
}

export interface LifeGoal extends Goal {
    type?: 'life';
}

export interface MoneyGoal extends Goal {
    type?: 'money';
}

export interface WalletGoal extends Goal {
    category: 'Life' | 'Routine' | 'Money' | string;
    type: 'life' | 'routine' | 'money' | string;
}
