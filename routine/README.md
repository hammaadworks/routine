# Routine OS

A highly interactive, deeply synchronized daily planner and habit tracker. Visually map your high-level goals into an actionable minute-by-minute timeline using a seamless drag-and-drop workflow.

## Features

- **The 3-Pane Workflow**: A distinct left pane for high-level Sprint Goals, a central dynamic Timeline for scheduling, and a right pane for granular Routine/Atomic habits.
- **Precision Drag-and-Drop**: Drag any goal into the Timeline to instantly allocate it. The engine supports 15-minute grid snapping and visual overlapping for concurrent tasks (like Google Calendar).
- **Pro-Max UX**: Enjoy staggered `anime.js` load animations, responsive hover feedback, a distinct 12 PM Noon visual anchor, and progressive disclosure toggles to keep the interface flawlessly clean.
- **Bidirectional Cascade Deletion**: Deleting a master goal from the sidebar recursively purges all its scheduled instances from the timeline, keeping everything cleanly synced.
- **Smart Analytics**: Unallocated free time and open tasks are automatically calculated in real-time in the Insights pane.
- **Zero-Config Local Persistence**: Every keystroke and drag event is instantly saved to your local browser storage. Refresh safely without losing a single block.

## Installation

Getting Routine OS running locally takes just three commands:

```bash
# Clone or navigate to the directory
cd routine

# Install the required dependencies (Vite, React, Lucide, Anime.js)
npm install

# Boot up the blazing fast Vite dev server
npm run dev
```

Visit the displayed local URL (usually `http://localhost:5173`) in your browser.

## Quick Start

1. **Set your period**: In the top left pane, pick a start and end date for your current phase (e.g. your week or two-week sprint).
2. **Brainstorm tasks**: Click `+ Add Sprint Goal` on the left to add major project milestones, and `+ Add Daily Goal` on the right to add atomic habits (like "Read 10 pages" or "Meditation").
3. **Build your timeline**: Drag those cards right into the central timeline. Watch as the "Addressed" checkmark instantly turns green on the sidebar as you lock your goals into your daily schedule.

## Usage Guide

### Defining Durations
When creating a Routine Goal, ensure you specify a valid duration constraint. The timeline relies on this to draw the block.
* Example: `45 min` or `1.5 hr`. 

### Adjusting Time Blocks
You don't need to delete and recreate a block to shift its time.
1. Click any scheduled block in the central timeline to open the Edit modal.
2. Manually adjust its Start Time or Total Duration.
3. Click Save. The timeline will instantaneously repaint and repack the columns to fit the new block dimensions.

### Deleting Tasks
* **From the Timeline**: Clicking the `Trash` icon on a block inside the timeline removes only that specific instance. The source goal on the sidebar is unmarked, returning to an "unaddressed" state.
* **From the Sidebar**: Clicking the `Trash` icon on a master goal in the sidebar permanently deletes the source goal *and automatically deletes all instances of it currently scheduled on your timeline*.

## Documentation

For a deeper dive into the system's React lifted-state architecture and math-driven timeline coordinate system, see the [Architecture Documentation](docs/ARCHITECTURE.md).

## Technologies Used

- **Framework**: React 18 
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (CSS Variables, Flexbox, CSS Grid)
- **Icons**: Lucide React
- **Animations**: Anime.js

## License

MIT License
