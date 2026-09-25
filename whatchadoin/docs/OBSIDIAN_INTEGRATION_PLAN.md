# Obsidian Integration & Life OS Vision Blueprint

> **Strategic Objective:** Transform `whatchadoin` into a local-first, AI-ready visual execution engine by using an Obsidian Vault as the core database, backup engine, and strategy layer.

---

## 1. Executive Summary

`whatchadoin` provides a high-velocity 3-pane visual daily planner (Life/Routine Goals, Timeline Grid, Atomic Habits). Obsidian provides a markdown-based personal knowledge graph for long-term thinking, notes, and project planning.

By integrating both apps via **WebMCP** and direct Vault access, we convert abstract integration potential into **kinetic execution energy**:
* **Obsidian** acts as the **Brain** (Strategy, Projects, Journaling, Lifelong Heatmaps).
* **`whatchadoin`** acts as the **Engine** (15-Minute Timeline Grid, 1-Click Habit Tracking, Daily Execution).
* **WebMCP AI Agents** act as the **Chief of Staff** (Reading notes, scheduling tasks, and adjusting timelines dynamically).

---

## 2. Kinetic User Benefits (From Potential to Real Value)

To deliver immediate user value, the integration focuses on three kinetic outcomes:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            KINETIC OUTCOMES                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1. Zero-Effort Life Heatmap                                                 │
│    1-Click habit checkmarks in whatchadoin automatically log structured      │
│    frontmatter entries in Obsidian Daily Notes for lifetime tracking.        │
│                                                                              │
│ 2. Dream-to-Timeline Pipeline                                               │
│    High-level Life & Money Milestones written in Obsidian notes are pulled   │
│    into whatchadoin's goal sidebar to be locked into 15-min time blocks.      │
│                                                                              │
│ 3. Context-Aware AI Rescheduling                                            │
│    AI agents read mood/energy journals in Obsidian via WebMCP and adjust     │
│    the whatchadoin timeline schedule in real-time.                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Architectural Paradigm: The Vault IS the Database

Instead of hosting a custom cloud database or requiring GitHub Gist sync tokens, `whatchadoin` leverages the local Obsidian Vault as its persistence layer.

### Architectural Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OBSIDIAN VAULT                                   │
│    (Handles Multi-Device Sync via Obsidian Sync / Git / iCloud / Drive)     │
│                                                                             │
│    ├── 📁 .whatchadoin/                                                     │
│    │   └── 📄 state.json              <── Vault-backed state storage        │
│    ├── 📁 Goals/                      <── Frontmatter .md Notes             │
│    │   ├── 📄 Q3_Product_Launch.md                                          │
│    │   └── 📄 Fitness_Goal.md                                               │
│    └── 📁 Daily Notes/                <── End-of-day time audit markdown    │
│        └── 📄 2026-09-25.md                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ Local File System Access API / REST API
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WHATCHADOIN                                    │
│    (Standalone Web / PWA App + WebMCP Agent Tools + Interactive Timeline)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Advantages:
1. **Zero-Infrastructure Cloud Sync:** Obsidian users already use Obsidian Sync, Git, or iCloud. Saving data to the vault provides free, instant cross-device sync across Mac, PC, iOS, and Android.
2. **Unified Data:** Markdown notes matching `whatchadoin_type: goal | habit` automatically populate `whatchadoin`'s left and right sidebars.
3. **No Vendor Lock-In:** Data remains standard JSON and human-readable Markdown.

---

## 4. Product Distribution Strategy: The Hybrid Model

To maximize market reach without compromising UX or technical architecture:

```
                  ┌────────────────────────────────────────┐
                  │    WHATCHADOIN STANDALONE WEB / PWA    │
                  │  (Core App for All Users & Non-Obsidian)│
                  └───────────────────┬────────────────────┘
                                      │
                                      │ Connected via Local API / WebSockets
                                      ▼
                  ┌────────────────────────────────────────┐
                  │   OBSIDIAN COMPANION PLUGIN (COMMUNITY) │
                  │     "whatchadoin Sync & Companion"     │
                  └────────────────────────────────────────┘
```

* **Standalone Web/PWA App:** Remains the core product, keeping full UI flexibility, fluid animations, and mobile tab navigation for all users.
* **Lightweight Obsidian Companion Plugin:** Published to the official Obsidian Community Plugin Store. Acts as a bridge for 1-click vault connection, ribbon tab shortcuts, and local API authentication.

---

## 5. Technical Implementation Roadmap

### Phase 1: Vault Storage Adapter (`src/sync.ts`)
- Implement a `VaultStorageAdapter` using the browser `File System Access API` (`window.showDirectoryPicker()`) or `Obsidian Local REST API`.
- Read and write `whatchadoin` application state directly into `.whatchadoin/state.json`.

### Phase 2: Markdown Frontmatter Schema & Parser (`src/utils.ts`)
- Define standard YAML frontmatter for goals and habits:
  ```yaml
  ---
  whatchadoin_type: routine_goal # routine_goal | life_goal | habit
  duration: 45m
  color: "#3498db"
  cost: 0
  ---
  # Read 20 pages of Deep Work
  ```
- Parse matching vault files into `whatchadoin` goal cards dynamically.

### Phase 3: End-of-Day Time Audit Writer
- Append daily completed tasks, habits, and timeline metrics into Obsidian `Daily Notes/YYYY-MM-DD.md` on day end:
  ```markdown
  ## ⏱️ Whatchadoin Time Audit
  - [x] **09:00 AM - 10:30 AM**: Product Strategy Deep Work (90m)
  - [x] **11:00 AM - 11:30 AM**: Meditation & Atomic Habit (30m)
  ```

### Phase 4: Obsidian Companion Plugin Shell
- Build a lightweight TypeScript Obsidian plugin that exposes a ribbon icon, embeds `whatchadoin` in an iframe/view tab, and handles local vault file authorization.

---

## 6. Summary Pitch

> **"whatchadoin is the visual execution engine for your life — drag your Obsidian goals into a 15-minute daily timeline, track habits in 1-click, and let AI keep your life vault in perfect sync."**
