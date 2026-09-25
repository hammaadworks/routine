import type { AppEventType } from '../types/events';

export function dispatchAppEvent<T = unknown>(type: AppEventType, detail?: T): void {
    window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function addAppEventListener<T = unknown>(
    type: AppEventType,
    handler: (event: CustomEvent<T>) => void
): () => void {
    const listener = (e: Event) => handler(e as CustomEvent<T>);
    window.addEventListener(type, listener);
    return () => window.removeEventListener(type, listener);
}
