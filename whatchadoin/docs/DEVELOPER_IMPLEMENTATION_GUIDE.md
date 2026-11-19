# whatchadoin: Unified Storage, Sync Engine & Architecture Reference

> **Audience:** Core Engineering Team  
> **Status:** Production Ready & Fully Verified (Ponytail Senior Sign-Off)  
> **Target Systems:** Web / PWA (Mobile Safari, Mobile Chrome), Desktop (macOS / Chrome / Safari), Antigravity CLI / Claude Code (MCP Stdio Server)  

---

## 1. Architecture Overview & Status Matrix

All 8 phases of the unified data flow, canonical file storage, and sync engine are **completed, tested, and verified**:

| Component | Status | Implementation Summary |
| :--- | :---: | :--- |
| **Phase 1: Canonical Schema** | ✅ **VERIFIED** | Single source of truth in `src/types/schema.ts` and `mcp-server/types.ts`. Monotonic `revision` counter and strict types. |
| **Phase 2: Canonical File Storage** | ✅ **VERIFIED** | State anchored to `data/routine.json`. Obsolete root `routine.json` removed. `.gitignore` and `.mcp.json` updated. |
| **Phase 3: StorageManager Reactive Store** | ✅ **VERIFIED** | `src/services/storageManager.ts` provides a reactive single-key store with legacy key monkeypatching and Ponytail change-detection guard. |
| **Phase 4: Sync Engine & Rate Limiter** | ✅ **VERIFIED** | 2-minute batch interval, SHA-256 idempotency, Pure Local Mode (0 network calls when unconfigured), mobile keepalive flush (<60KB limit). |
| **Phase 5: Localhost Dev Bridge** | ✅ **VERIFIED** | `vite.config.ts` dev bridge serving `/api/state` with atomic `.tmp` writes. |
| **Phase 6: Top-Bar Voice Command Agent** | ✅ **VERIFIED** | Dead Gemini API key removed, 3.5s natural speech pause, audio pre-warming for Safari, and local fuzzy intent classifier. |
| **Phase 7: Optional Habit Experience** | ✅ **VERIFIED** | `HabitExperienceModal.tsx` and calendar reflection/proof badges. Strictly optional. |
| **Phase 8: Automated Verification** | ✅ **VERIFIED** | `scripts/verify-sync-and-schema.ts` wired as `npm run test:sync`. All assertions pass. |

---

## 2. Canonical State Schema (`src/types/schema.ts`)

Browser `localStorage['whatchadoin_state']`, `data/routine.json`, GitHub Gist (`whatchadoin_data.json`), and backups share this exact nested structure:

```typescript
export interface WhatchadoinState {
    version: number;                        // 1
    updatedAt: string;                      // ISO-8601 string
    revision?: number;                      // Monotonic counter
    activeRoutineId: string;
    routines: Routine[];
    plans: {
        byRoutine: Record<string, NoteItem[]>;
        foldersByRoutine: Record<string, FolderItem[]>;
        lifePlans: NoteItem[];
        lifeFolders: FolderItem[];
    };
    goals: {
        life: LifeGoal[];
        money: MoneyGoal[];
    };
    tasks: {
        quick: QuickTask[];
    };
    counters: CounterItem[];
    milestones: Record<string, string>;
    coins: {
        entries: CoinsEntry[];
        targets: Record<string, number>;
    };
    quotes: QuoteItem[];
    settings: {
        currency: string;
        aiConfig: AIConfig;
    };
    contentDispatch: any | null;
}
```

### Optional Habit Experience
Inside `Routine`, habit reflection notes and media links are stored per date and per habit ID:
```typescript
export interface HabitExperience {
    note?: string;                          // Optional reflection journal
    mediaUrl?: string;                      // Optional link to proof (YouTube, Loom, TikTok, photo)
    mediaType?: 'video' | 'image' | 'link' | 'social';
    rating?: number;                        // 1 to 5 stars
    recordedAt?: string;                    // ISO timestamp
}

export interface Routine {
    // ...
    habitExperiences?: Record<string, Record<string, HabitExperience>>; // dateStr -> habitId -> HabitExperience
}
```

---

## 3. StorageManager Reactive Store (`src/services/storageManager.ts`)

### 3.1 Ponytail Change-Detection Guard
To prevent infinite state echo loops between React state and the storage singleton, `updateState` skips storage writes and notifications if data did not actually change:

```typescript
private updateState(updater: (prev: WhatchadoinState) => WhatchadoinState): WhatchadoinState {
    const current = this.getState();
    const nextState = updater(current);

    // Bail out if data didn't actually change (ignore updatedAt and revision)
    if (JSON.stringify({ ...current, updatedAt: '', revision: 0 }) === JSON.stringify({ ...nextState, updatedAt: '', revision: 0 })) {
        return current;
    }

    nextState.updatedAt = new Date().toISOString();
    nextState.revision = (nextState.revision || 1) + 1;
    this.state = nextState;

    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(nextState));
            localStorage.setItem(STORAGE_KEYS.HAS_UNPUSHED, 'true');
            localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED_AT, nextState.updatedAt);
        } catch (e) {
            console.error('[StorageManager] Failed to persist state:', e);
        }
    }

    this.notifyListeners(nextState);
    this.queueLocalApiWrite(nextState);
    return nextState;
}
```

### 3.2 React Integration (`src/App.tsx`)
In `App.tsx`, incoming store updates are flagged with `isIncomingFromStoreRef` to prevent local `useEffect` hooks from re-triggering store writes:

```typescript
const isIncomingFromStoreRef = useRef(false);

useEffect(() => {
    const unsub = storageManager.subscribe((st) => {
        isIncomingFromStoreRef.current = true;
        setRoutines(st.routines);
        setActiveRoutineId(st.activeRoutineId);
        setLifeGoals(st.goals.life);
        setMoneyGoals(st.goals.money);
        setMilestones(st.milestones);
        if (st.settings?.aiConfig) setAiConfig(st.settings.aiConfig);
        queueMicrotask(() => {
            isIncomingFromStoreRef.current = false;
        });
    });
    return () => unsub();
}, []);

// Component-level effects skip when update originated from store:
useEffect(() => {
    if (isIncomingFromStoreRef.current) return;
    storageManager.updateLifeGoals(lifeGoals);
}, [lifeGoals]);
```

---

## 4. Sync Engine Specifications (`src/sync.ts`)

1. **Pure Local Mode:** When `!gistToken || !gistId`, sync status is `unconfigured`. 0 network calls, 0 errors, no timers.
2. **2-Minute Batching:** Local edits reset a 120-second debounce timer (`SYNC_TIMINGS.BATCH_INTERVAL_MS = 120_000`).
3. **Idempotency Check:** If payload string matches `lastSyncedStr`, skip the HTTP push request.
4. **Mobile Lifecycle Flush:** `visibilitychange` (`hidden`) and `pagehide` trigger `pushToGist(true, { keepalive: true })`.
   - *Browser constraint handled:* Only apply `keepalive: true` when `payloadBody.length < 60_000` to prevent WebKit/Blink 64KB `TypeError`.
5. **Non-Destructive Startup Protection:** On boot, if `whatchadoin_has_unpushed_changes === 'true'`, push local state up instead of pulling and overwriting.
6. **Granular Additive Union Merge:** If both remote and local changed offline:
   - Completed habits (`true`) on either device remain `true`.
   - Habit experiences deep-merge by `[dateStr][habitId]`.
   - TimeLogs, Tasks, Coins union by unique `id`.
   - Counters union events by timestamp and recompute high-water counts.

---

## 5. Directory Structure & Path Anchoring

- **State File:** `data/routine.json` (canonical). Root `routine.json` is deleted.
- **Git Ignore:** `data/` and `.sync_config.json` are ignored.
- **MCP Server Stdio Path:** Anchored in `mcp-server/store.ts` using `fileURLToPath`:
  ```typescript
  export const PROJECT_ROOT = path.resolve(__dirname, '..');
  export const DEFAULT_STATE_PATH = path.resolve(PROJECT_ROOT, 'data/routine.json');
  ```
- **CLI Registration (`.mcp.json`):** Absolute path to `mcp-server/index.ts` allows Antigravity CLI and Claude Code to connect from any CWD.

---

## 6. Verification & Quality Gates

Run these commands to verify system health:

```bash
# 1. Automated sync, schema, and non-destructive merge suite
npm run test:sync

# 2. Production build verification (TypeScript + Vite)
npm run build

# 3. Static code quality lint
npm run lint

# 4. MCP Stdio Server verification
npm run mcp
```

### Sign-off Checklist
- [x] **1. Guard `updateState` in `src/services/storageManager.ts`** against false dirty stamps.
- [x] **2. Guard React state effects in `src/App.tsx`** with `isIncomingFromStoreRef` and delete duplicate listeners.
- [x] **3. Delete root `routine.json`** (`rm routine.json`).
- [x] **4. Create `scripts/verify-sync-and-schema.ts`** and add `"test:sync"` script to `package.json`.
- [x] **5. Run `npm run build`** (Exits cleanly in ~400ms with 0 errors).
- [x] **6. Run `npm run test:sync`** (All 5 test suites pass cleanly).
