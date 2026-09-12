# Mobile UI V2 & Financial Goals Architecture Spec

**Target Audience:** Junior Frontend Developer  
**Objective:** Implement a dedicated financial goals ecosystem and refactor the mobile UX to be native-app intuitive. Desktop (1400px+) layout remains unaffected by the structural pane changes.

---

## 1. The Independent "Money Goals" Tab
Currently, we have `Life Goals` (global) and `Routine Goals` (tied to a routine). We are introducing a 3rd global category: **Money Goals**.

### UI/Data Requirements:
*   **Tab Ordering:** In the Left Pane header, the tabs must strictly be ordered: `[ Life ] | [ Money ] | [ Routine ]`.
*   **Persistence:** `moneyGoals` must be saved to `localStorage` (e.g., `whatchadoin_money_goals`), completely independent of the active routine, exactly how `lifeGoals` operate.
*   **The `cost` Field:** 
    *   Add an optional `cost: number` property to `LifeGoal` and `RoutineGoal` interfaces.
    *   For the new `MoneyGoal` interface, `cost` is **REQUIRED** and non-null. The form to add a Money Goal must prevent saving if the cost is empty.

---

## 2. Global Aspirational Wallet & Aggregated View
We need a visual motivator on the `MyDay` (Timeline) screen.

### UI/Data Requirements:
*   **The Widget:** Build a small, sleek "Wallet" widget at the top of the `MyDay.tsx` view. It should display the sum total of all costs across all goals.
*   **The Aggregated View:** When the user clicks the Wallet widget, it should toggle an `isWalletViewActive` state.
*   **Logic for Aggregated View:** 
    *   Replace the `MyDay` timeline view with a list view.
    *   Collect ALL goals from `lifeGoals`, `routineGoals`, and `moneyGoals` where `cost > 0`.
    *   **Sort** the unified array in descending order based on `cost` (highest at the top).
    *   Render the list beautifully, showing the title, the category tag (Life/Routine/Money), and the cost.
    *   Include a "Close" button to return to the standard MyDay timeline.

---

## 3. Quick Tasks (Plans Pane)
The current `PlansPane.tsx` uses a heavy Markdown editor. We need a frictionless way to add one-off tasks.

### UI/Data Requirements:
*   At the very top of `PlansPane.tsx`, pin a **Quick Tasks** widget.
*   It should consist of a simple text input: `[ + Add Quick Task... ]`.
*   When the user types a task and hits `Enter`, it should immediately add a simple checkbox item below the input. 
*   *Implementation detail:* You can either store these in a dedicated `quickTasks` array in state/localStorage, or automatically append them as `[ ] Task name` to a hardcoded/pinned "Today's Tasks" markdown note.

---

## 4. Mobile Tab Smash & Bottom Bar (Mobile Only <= 1399px)
The core goal here is to reduce cognitive load on mobile by removing the top tabs from the Center pane and utilizing standard bottom-bar navigation.

### UI/CSS Requirements:
1.  **MobileTabBar Update:**
    *   Update `MobileTabBar.tsx` to have exactly 4 tabs: `[ Goals ]`, `[ MyDay ]`, `[ Calendar ]`, `[ Plans ]`.
    *   When these tabs are clicked, they must update the layout state in `App.tsx`:
        *   `Goals` -> Shows Left Pane.
        *   `MyDay` -> Shows Center Pane & sets `activeCenterTab = 'timeline'`.
        *   `Calendar` -> Shows Center Pane & sets `activeCenterTab = 'calendar'`.
        *   `Plans` -> Shows Center Pane & sets `activeCenterTab = 'plans'`.
2.  **Hide Native Center Tabs:**
    *   In `index.css`, hide the native Center Pane top tabs on mobile:
        ```css
        @media (max-width: 1399px) {
            .timeline-area .tabs { display: none !important; }
        }
        ```

### The Routine Drawer & Contextual FAB:
Since "Routine" (Habits) is removed from the bottom bar, it becomes a slide-over drawer on mobile.

1.  **Drawer CSS:** On mobile (`max-width: 1399px`), the `RoutinePane` (`.right-pane`) should be removed from the standard flex layout. Apply `position: fixed; right: -100%; z-index: 100; transition: right 0.3s ease;` to it.
2.  **Toggle Button:** Add a "Habits" button to the `Header.tsx` (or top of the Center pane) that is visible only on mobile. Clicking it toggles an `isRoutineDrawerOpen` state in `App.tsx`, which changes the `right` CSS property of the `RoutinePane` to `0`.
3.  **Contextual FAB Magic:**
    *   The Floating Action Button (FAB) behavior must be smart.
    *   If the user is on the `MyDay` tab and `isRoutineDrawerOpen` is **false**, the FAB dispatches the event to add a new MyDay block (`fab:add-myday`).
    *   If `isRoutineDrawerOpen` is **true**, the FAB instantly switches its behavior to dispatch the event to add a Habit (`fab:add-habits`).
