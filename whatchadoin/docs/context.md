# whatchadoin - Application Context & Documentation

Welcome to the definitive manual and documentation for **whatchadoin** (domain: `whatchado.in`), a highly interactive, local-first daily planner, habit tracker, and time-boxing application. 

This document serves as the single source of truth for the application's rules, architecture, features, and underlying logic. Any developer contributing to this repository must read this file to understand the system.

---

## 1. Core Philosophy & Rules

### Local-First Data Architecture
whatchadoin is strictly a **local-first** application. The entire database is synchronously persisted to the browser's `localStorage`. 
- **No backend server** or traditional database (e.g., PostgreSQL, MongoDB) is used.
- Data never leaves the browser unless explicitly synced by the user.
- **Rule:** Do not introduce network calls for state management. All state must remain lifted within the React component tree and synced to `localStorage`.

### Syncing via GitHub Gist
The **only** supported method for Cloud Sync is the custom **GitHub Gist Sync** feature (`src/sync.js`).
- The user provides a GitHub Personal Access Token (PAT) and a Gist ID.
- The app serializes the `localStorage` state into a single JSON file (default: `whatchadoin_data.json`) and patches it to the Gist.
- **Rule:** The sync logic debounces `localStorage.setItem` by 5 seconds to prevent rate-limiting the GitHub API. 
- **Rule:** When new remote data is detected (via the `window.onfocus` event), the local state is overwritten, and the app automatically triggers a `window.location.reload()` to rehydrate the React state.

### Naming Conventions
- **App Name:** whatchadoin
- **Domain:** whatchado.in
- **Prefixes:** All `localStorage` keys and cross-tab communication channels MUST use the `whatchadoin_` prefix (e.g., `whatchadoin_routines`, `whatchadoin_ai_channel`).

---

## 2. Features & The 3-Pane Workflow

whatchadoin utilizes a progressive, horizontal 3-pane layout designed for granular time-boxing.

### Pane 1: Strategy & Goals (Left Pane)
This pane is split into two sub-tabs:
1. **Life Goals:** High-level, long-term aspirations (e.g., "Get in shape", "Learn Spanish"). These provide contextual motivation.
2. **Routine Goals:** Short-term, actionable projects (e.g., "Build MVP", "Run 5k"). 
   - **Logic:** Deleting a Routine Goal triggers a **cascade deletion**. It will sever the link to any routine habits associated with it and clear associated calendar blocks.

### Pane 2: The Timeline / Calendar (Middle Pane)
The core operating theater. It features a vertical, minute-by-minute timeline mapping a 24-hour day.
- **Drag-and-Drop:** Users can drag goals from the left/right panes directly onto the timeline to schedule them. 
- **Grid Snapping:** Blocks snap to 15-minute intervals. 
- **Overlapping Logic:** If two scheduled blocks intersect in time, the timeline dynamically calculates their overlap and indents them horizontally (similar to Google Calendar) so both remain clickable and visible.
- **Templates:** Users can define "Templates" (e.g., "Vanilla whatchadoin", "Weekend Schedule") and map specific templates to specific days of the week.

### Pane 3: Habits (Right Pane)
This pane holds the atomic, daily executable actions (e.g., "Read 10 pages", "Workout for 45 mins"). 
- **Logic:** Habits MUST be assigned a time duration (e.g., 45m). Without a duration, they cannot be accurately rendered on the middle Timeline.
- **Markdown Support:** Descriptions support markdown. Typing `@` opens a mention menu to explicitly link a habit back to a broader Life Goal or Routine Goal.

---

## 3. System Architecture & UI Logic

### React Lifted State
The entire application state is lifted to the root `App.jsx` component. 
- **`activeRoutine`:** The app supports "Routines" (like branching in Git), allowing users to experiment with completely different routines and periods without destroying their current setup.
- **State Updates:** State updates are propagated downward via props. The `updateActiveRoutine` function (wrapped in `useCallback` to prevent render loops) is passed deeply into the component tree to mutate the global state.

### Modals & Prompts
- **Rule:** Never use native browser `alert()` or `confirm()` dialogs. 
- All alerts and destructive confirmations MUST use the unified `ConfirmModal` (`src/components/ConfirmModal.jsx`) via the `confirmConfig` state object in `App.jsx`.
- Standard popups must use `BaseModal` to ensure consistent ESC-key listeners and background scrolling locks.

### AI Agent Integration
whatchadoin features an integrated AI Assistant (`AIAgentApp.jsx`).
- Uses `BroadcastChannel` (`whatchadoin_ai_channel`) to communicate between the main app window and the AI pop-out window.
- The AI has access to a set of defined "tools" (e.g., `navigate_app`, `add_routine_goal`) which are transmitted via the broadcast channel, executed in `App.jsx`, and visually reflected instantly in the UI.

### Animations & Styling
- **Anime.js:** Used for staggered, fluid entrance animations when panes and cards mount.
- **CSS:** Vanilla CSS (`index.css`) utilizing CSS Variables (for easy themeability), CSS Grid, and Flexbox. 
- **Icons:** `lucide-react` is the exclusive icon library.

---

## 4. Developer Contribution Guide

If you are a developer tasked with adding a feature or fixing a bug, follow this workflow:

1. **State Modifications:** If your feature requires new data, determine if it belongs to the global `activeRoutine` object (period-specific data) or independent global state (like `lifeGoals`). Modify the initialization logic inside `App.jsx`'s `useState` hooks.
2. **Prop Drilling:** Because state is lifted, be prepared to drill props (or update functions) down to your target component. 
3. **Linting:** The project uses `oxlint`. Run `npm run lint` before committing to ensure there are no unused variables, unused imports, or missing React hook dependencies.
4. **Data Sync Testing:** When modifying data structures, ensure that `sync.js` properly serializes the new state. Since `sync.js` watches the generic `localStorage.setItem`, most new state additions will be automatically picked up by the GitHub Gist sync engine without requiring explicit sync code.

---
*End of Documentation*
