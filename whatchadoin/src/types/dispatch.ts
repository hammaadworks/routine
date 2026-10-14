export type PlatformType =
    | 'instagram'
    | 'youtube'
    | 'x'
    | 'threads'
    | 'facebook'
    | 'linkedin'
    | 'tiktok'
    | 'custom';

export interface BaseSlotTemplate {
    id: string;
    title: string;
    defaultNotes?: string;
}

export interface PlatformConfig {
    id: string;
    platform: PlatformType;
    label: string; // e.g. "Instagram Reels", "YouTube Shorts"
    composeUrl: string; // Direct compose URL
    chromeProfile?: string; // Optional per-platform profile override (defaults to persona profile)
    color?: string;
    // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    weeklySchedule: Record<number, BaseSlotTemplate[]>;
}

export interface CreatorPersona {
    id: string;
    handle: string; // e.g. "hammaadrawx"
    name: string; // e.g. "Hammaad Rawx"
    chromeProfile: string; // Default Chrome profile directory e.g. "Profile 1"
    color?: string;
    platforms: PlatformConfig[];
}

export interface ActiveSlot {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string;
    isAdHoc?: boolean;
    notes?: string;
}

export interface CompactDayRecord {
    completedSlotIds: string[];
    adHocSlots?: ActiveSlot[];
}

export interface ContentDispatchStorage {
    personas: CreatorPersona[];
    days: Record<string, CompactDayRecord>;
    selectedPersonaId?: string;
}

export interface DailyMetrics {
    completed: number;
    total: number;
    remaining: number;
    percentage: number;
    isAllComplete: boolean;
}
