import re

with open('src/components/HabitsPane.tsx', 'r') as f:
    content = f.read()

# Add imports
imports = """
import HabitList from './habits/HabitList';
import MilestonesView from './habits/MilestonesView';
import TimelogView from './habits/TimelogView';
"""

# add imports near the top
content = content.replace("import type {CalendarSubTab} from '../types/ui';", "import type {CalendarSubTab} from '../types/ui';" + imports)

# Replace HabitList part
habit_list_regex = re.compile(r"\{calendarSubTab === 'mark_goals' && \(<>.*?(?=\{calendarSubTab === 'milestones' && \()", re.DOTALL)
habit_list_replacement = """{calendarSubTab === 'mark_goals' && (
    <HabitList
        openAddHabit={openAddHabit}
        isCalendarTab={isCalendarTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortByName={sortByName}
        setSortByName={setSortByName}
        habitFilterRoutineGoalId={habitFilterRoutineGoalId}
        setHabitFilterRoutineGoalId={setHabitFilterRoutineGoalId}
        habitFilterLifeGoalId={habitFilterLifeGoalId}
        setHabitFilterLifeGoalId={setHabitFilterLifeGoalId}
        effectiveDate={effectiveDate}
        dailyLogs={dailyLogs}
        displayedRoutineGoals={displayedRoutineGoals}
        checkRoutineAddressed={checkRoutineAddressed}
        routineGoals={routineGoals}
        lifeGoals={lifeGoals}
        moneyGoals={moneyGoals}
        currentTemplate={currentTemplate}
        goalCounts={goalCounts}
        isRoutineDrawerOpen={isRoutineDrawerOpen}
        handleDragStart={handleDragStart}
        toggleDailyGoal={toggleDailyGoal}
        duplicateHabit={duplicateHabit}
        openEditHabit={openEditHabit}
        setConfirmConfig={setConfirmConfig}
        habits={habits}
        setHabits={setHabits}
    />
)}
"""
content = habit_list_regex.sub(habit_list_replacement, content)


# Replace MilestonesView part
milestone_regex = re.compile(r"\{calendarSubTab === 'milestones' && \(<>.*?(?=\{calendarSubTab === 'timelog' && \()", re.DOTALL)
milestone_replacement = """{calendarSubTab === 'milestones' && (
    <MilestonesView
        effectiveDate={effectiveDate}
        isCalendarTab={isCalendarTab}
        allGoals={allGoals}
        currentMilestones={currentMilestones}
        milestoneDates={milestoneDates}
        isPublicView={isPublicView}
        isMilestoneBlockPublic={isMilestoneBlockPublic}
        setSelectedTargetDate={setSelectedTargetDate}
        openEditMilestone={openEditMilestone}
        setEditingMilestoneIdx={setEditingMilestoneIdx}
        setMilestoneForm={setMilestoneForm}
        setShowMilestoneModal={setShowMilestoneModal}
        showAllMilestones={showAllMilestones}
        setShowAllMilestones={setShowAllMilestones}
    />
)}
"""
content = milestone_regex.sub(milestone_replacement, content)

# Replace TimelogView part
timelog_regex = re.compile(r"\{calendarSubTab === 'timelog' && \(<div className=\"timelog-tab-container\" style=\{\{.*?</div>\)}", re.DOTALL)
timelog_replacement = """{calendarSubTab === 'timelog' && (
    <TimelogView
        isCalendarTab={isCalendarTab}
        timelogDate={timelogDate}
        dayTimeLogs={dayTimeLogs}
        allGoals={allGoals}
        currentTimeLogs={currentTimeLogs}
        updateActiveRoutine={updateActiveRoutine}
        formatHeaderDate={formatHeaderDate}
        setConfirmConfig={setConfirmConfig}
    />
)}"""
content = timelog_regex.sub(timelog_replacement, content)

# Remove unused imports and state? Actually let's leave them if TS compiler allows or just fix lint later.
# Also need to remove the customMarkdownComponents from HabitsPane if we want to avoid unused vars.
custom_md_regex = re.compile(r"const customMarkdownComponents = React\.useMemo\(\(\) => \(\{.*?\n    \}\), \[allGoals\]\);\n", re.DOTALL)
content = custom_md_regex.sub("", content)


with open('src/components/HabitsPane.tsx', 'w') as f:
    f.write(content)
