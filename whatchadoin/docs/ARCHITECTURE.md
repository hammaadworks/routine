# Routine OS Architecture

Routine OS is built on a unified, lifted-state React architecture. The goal of this architecture is to ensure deep interconnectedness between the three primary spaces (Routine Pane, Timeline, and Routine Pane) while maintaining high performance and precise drag-and-drop physics.

## State Management

State is centrally managed in `App.jsx` and distributed down to the panes via props.

### Core State Trees

- **`routineGoals`**: Array of broad objective objects for the defined period.
- **`habits`**: Object mapping `{ daily: [], weekly: [] }` containing recurring atomic habits or tasks.
- **`templates`**: The most complex data structure. An array of day-template objects. Each template has an `id`, `name`, and `blocks` array. `blocks` contain all scheduled timeline events.
- **`activeTemplateId`**: Pointer to the currently viewed template in the Timeline.
- **`dayMapping`**: Dictates which template is assigned to which day of the week.

### Persistence

The entire state tree is cached into the browser's `localStorage` via isolated `useEffect` hooks in `App.jsx`. Every mutation automatically syncs to disk to ensure robust persistence across sessions and hard reloads.

## The Timeline Engine

The timeline is a custom-built 24-hour vertical grid.

### Coordinate Mathematics

- The grid is fundamentally mathematically scaled: `1 minute = 1 pixel`. 
- 1 Hour = `60px`. 24 Hours = `1440px` total height.
- The `handleDrop` calculation translates `clientX/Y` pixel coordinates relative to the grid bounding box into a minute offset from `12:00 AM`.

### Drag & Drop Physics

When a habit is dragged into the timeline:
1. `onDragStart` intercepts the event, attaching the source (`routine` or `timeline`) and the item `id`.
2. A ghost preview follows the cursor, snapping in 15-minute (`15px`) intervals.
3. On `drop`, the engine parses the `id`, looks up the source block, calculates the exact mathematical Y offset, and constructs a new block inside `templates`.

### Overlap Packing Algorithm (GCal Style)

To handle concurrent events cleanly:
1. The engine sorts blocks chronologically by start time.
2. It assigns blocks to "columns" recursively by checking if the block overlaps with the last item in the current column.
3. If an overlap occurs, it shifts the block into a new column.
4. Finally, it calculates width percentages (`width = 100% / columns.length`) to neatly pack overlapping elements without obscuring them.

## Bidirectional Reactivity & Cascade Updates

### The "Addressed" Badge Check
The UI uses string-matching checks to figure out if a goal in the side panes has been scheduled in the timeline.
If `block.task` exactly matches `goal.task`, the item-card in the side pane lights up with a green checkmark badge.

### Cascade Deletion
When a user deletes an overarching goal from the side pane (e.g., deleting "Workout" from Daily Routine), a `cascadeDelete` function scans the entire `templates` tree and purges every scheduled block that matches that task name, keeping the system deeply synchronized.

## Styling & Animations

- **Animations**: The app utilizes `anime.js` for staggered, physics-based entry animations. Layouts and blocks elegantly float into place on mount.
- **Progressive Disclosure**: Adding goals is hidden behind interactive expanding toggles to reduce cognitive load and preserve negative space.
