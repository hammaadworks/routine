type StorageListener = () => void;

const listeners = new Set<StorageListener>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function notifyListeners() {
    listeners.forEach(listener => listener());
}

export const StorageService = {
    subscribe(listener: StorageListener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    getItem<T>(key: string, defaultValue: T): T {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;
            return JSON.parse(raw) as T;
        } catch {
            return defaultValue;
        }
    },

    getString(key: string, defaultValue = ''): string {
        return localStorage.getItem(key) ?? defaultValue;
    },

    setItemImmediate<T>(key: string, value: T): void {
        const timer = debounceTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            debounceTimers.delete(key);
        }
        try {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serialized);
            notifyListeners();
        } catch (e) {
            console.error(`Failed to write to storage for key "${key}":`, e);
        }
    },

    setItemDebounced<T>(key: string, value: T, delayMs = 300): void {
        const existingTimer = debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
            debounceTimers.delete(key);
            try {
                const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, serialized);
                notifyListeners();
            } catch (e) {
                console.error(`Failed to debounced-write to storage for key "${key}":`, e);
            }
        }, delayMs);

        debounceTimers.set(key, timer);
    },

    removeItem(key: string): void {
        const timer = debounceTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            debounceTimers.delete(key);
        }
        localStorage.removeItem(key);
        notifyListeners();
    },

    flush(): void {
        debounceTimers.forEach((timer) => clearTimeout(timer));
        debounceTimers.clear();
    }
};
