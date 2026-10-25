# Habit Bundles - Feature Specification & Architecture

## 1. Overview & Motivation

**Habit Bundles** (also known as Habit Stacking or Combo Routines) allow users to club multiple atomic habits together into a single, ordered sequence and allocate the entire sequence onto the timeline in a single drag-and-drop action.

### Example
A user has three individual habits:
* **Boxing** (default: 30m)
* **FPV** (default: 15m)
* **IMJD** (default: 20m)

The user creates a habit bundle named **`bd`**:
1. `Boxing` (5m)
2. `FPV` (5m)
3. `IMJD` (20m)

When the user drags **`bd`** onto the timeline at 10:00 AM, a **30-minute bundle container** is created from 10:00 AM to 10:30 AM containing all three sub-habits in strict order.

---

## 2. Core Principles & Rules

1. **Strictly 1-Layer Hierarchy**:
   * Bundles can only contain habits.
   * Bundles cannot contain other bundles.
2. **References, Not Duplicate Habits**:
   * A habit inside a bundle is **not** a new habit. It is a reference to the existing habit entity (`habitId`).
   * The bundle specifies a context-specific duration override (e.g., 5m Boxing instead of the default 30m).
   * Color, goal links, streak counts, and timelogs inherit directly from the referenced habit.
3. **Rigid Container on Timeline**:
   * The container on the timeline is an atomic unit.
   * Dragging or moving the container shifts the entire bundle (`startTime`), preserving all internal offsets.
   * Total container duration is **strictly locked** to the sum of its sub-habits. Resizing the container is disallowed; duration edits must be made in the bundle recipe.
4. **YouTube Comments-Style Accordion UI**:
   * On the timeline, the bundle container displays as a sleek header with an accordion toggle (`▾ 3 habits`).
   * When expanded, it reveals a clean, delimiter-styled mini-list (`↳ Boxing 5m`, `↳ FPV 5m`, `↳ IMJD 20m`).
5. **Bi-Directional Completion Sync**:
   * Ticking all individual habits inside a bundle auto-ticks the bundle.
   * Ticking the bundle auto-ticks all habits inside it.
   * The day is marked complete when all single habits and all bundles are marked complete.
6. **Public / Private Visibility Rules**:
   * **All habits private** $\rightarrow$ Entire bundle container is private / masked.
   * **All habits public** $\rightarrow$ Entire bundle container is public.
   * **Mixed** $\rightarrow$ Bundle container is public, but private sub-habits inside are hidden in public mode.

---

## 3. Data Structures

### TypeScript Interfaces (`src/types/routine.ts`)

```typescript
// 1. Habit Item inside a bundle recipe
export interface HabitBundleItem {
    id: string;              // unique item id in bundle
    habitId: string;         // reference to existing Habit (e.g. "rg-boxing")
    name: string;            // habit name
    duration: number;        // duration in minutes (e.g. 5)
    color?: string;          // inherited or custom hex
    isPublic?: boolean;      // inherited habit visibility
}

// 2. Habit Bundle definition stored on Routine
export interface HabitBundle {
    id: string;              // e.g. "bundle-179..."
    name: string;            // e.g. "bd"
    desc?: string;
    color?: string;          // optional bundle accent color
    items: HabitBundleItem[]; // ordered array (order strictly matters!)
}

// 3. Sub-block inside a scheduled timeline container
export interface TemplateSubBlock {
    id: string;
    habitId: string;
    name: string;
    duration: number;
    color?: string;
    startTimeOffset: number; // minutes from container start (e.g. 0, 5, 10)
    isPublic?: boolean;
}

// 4. Extended TemplateBlock for Timeline Containers
export interface TemplateBlock {
    id: string;
    name: string;
    startTime: number;       // minutes from midnight (0-1439)
    duration: number;        // sum of subBlocks (strictly locked)
    color?: string;
    routineGoalId?: string;
    // Bundle fields:
    isBundle?: boolean;
    bundleId?: string;
    subBlocks?: TemplateSubBlock[];
}

// 5. Extended Routine
export interface Routine {
    // ...existing fields
    habitBundles?: HabitBundle[];
}
```

---

## 4. Timeline Engine & Layout

### 1. Drag & Drop Physics
* Bundles are draggable from the Habits pane (`source = 'bundle'`).
* When dropped onto the timeline grid at snapped minute $T$:
  $$\text{startTime} = T$$
  $$\text{duration} = \sum_{i} \text{item}_i.\text{duration}$$
  $$\text{startTimeOffset}_i = \sum_{k=0}^{i-1} \text{item}_k.\text{duration}$$
* The container block is pushed into the active template's `blocks` array.

### 2. Timeline Accordion Rendering
```
Collapsed:
┌─────────────────────────────────────────────────────────────┐
│ ▌▌▌ [📦 bd]  10:00 AM - 10:30 AM (30m)         [▾ 3 habits] [✕] │
└─────────────────────────────────────────────────────────────┘

Expanded (YouTube reply style):
┌─────────────────────────────────────────────────────────────┐
│ ▌▌▌ [📦 bd]  10:00 AM - 10:30 AM (30m)             [▴ Hide] [✕] │
│ ─────────────────────────────────────────────────────────── │
│   ↳ 🔴 Boxing   5m   (10:00 - 10:05)                    [✓] │
│   ↳ 🟠 FPV      5m   (10:05 - 10:10)                        │
│   ↳ 🔵 IMJD     20m  (10:10 - 10:30)                        │
└─────────────────────────────────────────────────────────────┘
```
* **Multi-Color Segmented Strip**: The left border shows proportional color segments corresponding to each habit's color and duration.
* **Inline Checkmarks**: Sub-habits display a checkmark if marked completed in `dailyLogs` for the viewed date.

---

## 5. Cross-System Coherence Engine

To ensure that the **Weekly Pie Chart** (`HabitWeeklyPieView`), **Habits Pane**, **Milestones**, and **Goal Trackers** remain 100% mathematically consistent without code duplication, all analytical views use the `getEffectiveHabitBlocks` utility.

### Utility Helper (`src/utils.ts`)

```typescript
export function getEffectiveHabitBlocks(blocks: TemplateBlock[]) {
    const result: Array<{
        id: string;
        name: string;
        startTime: number;
        duration: number;
        routineGoalId?: string;
        color?: string;
        bundleName?: string;
        isPublic?: boolean;
    }> = [];

    (blocks || []).forEach(b => {
        if (b.isBundle && Array.isArray(b.subBlocks) && b.subBlocks.length > 0) {
            b.subBlocks.forEach(sub => {
                result.push({
                    id: `${b.id}-${sub.id}`,
                    name: sub.name,
                    startTime: b.startTime + (sub.startTimeOffset || 0),
                    duration: sub.duration,
                    routineGoalId: sub.habitId,
                    color: sub.color || b.color,
                    bundleName: b.name,
                    isPublic: sub.isPublic
                });
            });
        } else {
            result.push(b);
        }
    });

    return result;
}
```

### System Coherence Matrix

| System | Integration Point | Result |
| :--- | :--- | :--- |
| **Weekly Pie Chart** | Uses `getEffectiveHabitBlocks` | Boxing gets +5m, FPV gets +5m, IMJD gets +20m. Slices and weekly totals are exact. |
| **Habit List Tracking** | Matches `routineGoalId === habit.id` | Scheduled minutes and block counts reflect the 5m bundle block accurately. |
| **Goal Linking** | Inherited from `habitId` | Sub-habits contribute to their parent Routine, Life, and Money goals. |
| **Daily Completion** | `dailyLogs[date][habit.id]` | Marking all sub-habits completes the bundle; marking bundle completes all sub-habits. |
| **Public View Masking** | Evaluates habit visibilities | Private sub-habits are hidden while public sub-habits remain visible in public view. |

---

## 6. UI in Habits Tab

* **No Sub-tabs**: Bundles live directly inside the **Habits** tab.
* **Header Button**: `+ Bundle` button placed next to `+ Habit`.
* **Bundles Accordion Section**: Positioned at the top of the Habits list:
  `📦 Bundles (N)` with an accordion expand/collapse toggle.
* **Bundle Card**:
  - Displays bundle name, total duration badge, and the ordered habit chips:
    `1. Boxing (5m) → 2. FPV (5m) → 3. IMJD (20m)`.
  - Draggable directly onto the timeline grid.
  - Action buttons: `[Edit]` and `[Delete]`.
