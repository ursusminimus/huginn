# Agent Scratchpad

## Session: 2026-03-25

### What was accomplished

1. **Full repository exploration** — read all design docs, all existing code (Tasks v7.4, Tasks Viz v1.0, Cal v1.0, Timekeeper v0.1), understood current data models and architecture.

2. **Implementation plan created** (`design documents/implementation_plan.md`) — 5-phase approach approved by user:
   - Phase 1: Unified data model (in progress)
   - Phase 4: Huginn Plan (new component — most complex)
   - Phase 2: Tasks enhancements
   - Phase 3: Cal overhaul
   - Phase 5: Timekeeper updates
   - Phase 6: Tasks Viz cleanup (deferred)

3. **Data model schema designed** (`design documents/data_model_schema.md`) — approved by user with revisions:
   - Unified `events` collection (merges milestones + calendar events)
   - Timekeeping linked strictly to tasks only (not projects)
   - No start/end milestone type distinction (dependencies handle topology)
   - Projects still store `startEventId`/`endEventId` for quick lookup

4. **`huginn_data.js` created** (`experimental/huginn_data.js`) — ~370 lines implementing:
   - Schema normalization for all entity types
   - ID generation with uniqueness guarantee
   - Project creation with auto-generated events/tasks/dependencies
   - "Personal Tasks" auto-project
   - Task status management with timestamp tracking
   - `isRunningLate()` derived state computation
   - `getProjectPath()` for displaying project ancestry
   - localStorage persistence
   - JSON import/export with file download
   - CSV export helper
   - Legacy migration from all 3 old localStorage keys (`muninnData`, `huginn_calendar_v1`, `muninnTimekeeperData`)

5. **`muninn_test_fixture.json` created** (`experimental/muninn_test_fixture.json`) — reference test data:
   - 14 tasks across 5 projects (including "Personal Tasks")
   - All 4 task statuses (new, started, done, stopped)
   - Task 100007 is "running late" (started 15 days ago, estimated 3 days)
   - Dependency chain: budget review → draft report → Q2 Budget Review milestone
   - Calendar events: vacation week, holidays, sick day, multi-day trip, generic event
   - Milestones with different date constraint types (fixed, target, flexible)
   - 5 timekeeping sessions, one marked as edited

6. **`task.md` created** (`design documents/task.md`) — master checklist for all phases

### Key decisions made by user

- ✅ Use shared `huginn_data.js` (not inline duplication)
- ✅ Drop categories from Tasks → replace with parent project reference
- ✅ Tasks Viz CDN cleanup → Phase 6
- ✅ Merge milestones and calendar events into one `events` collection
- ✅ Timekeeping links to tasks only (aggregate to projects at runtime)
- ✅ Version Tasks as v8.0, Timekeeper as v1.0
- ✅ Create reference test fixture JSON for reproducible testing

### What needs to happen next

#### Immediate: Verify huginn_data.js (was interrupted)
- The browser verification test was cancelled. Need to verify that:
  - `huginn_data.js` loads correctly as a `<script src>`
  - `normalizeData()` handles the test fixture correctly
  - `createProject()` generates all expected entities
  - `isRunningLate()` detects task 100007
  - Legacy migration functions work
- Simplest approach: create a tiny `test_harness.html` in `experimental/` that loads the module and fixture, runs assertions, and displays results

#### Phase 1 remaining items
- [ ] Migrate Tasks v7.4 to use `huginn_data.js` → create v8.0
  - Replace `muninnData` localStorage key with shared module
  - Replace `normalizeTodo()` with `HuginnData.normalizeTask()`
  - Drop `category` field, add `projectId` + parent project display column
  - Update status values: `open`→`new`, `completed`→`done`
  - Use `HuginnData.saveToLocalStorage()` / `loadFromLocalStorage()`
  - Use `HuginnData.exportToJSON()` / `importFromJSON()` for file operations
  - Use `HuginnData.exportToCSV()` for CSV export
  - Add `<script src="huginn_data.js">` at top of file
- [ ] Migrate Cal v1.0 to use shared module → create v2.0
  - Convert `{ date: status }` map to `events` array
  - Replace bespoke storage/export/import functions
- [ ] Migrate Timekeeper v0.1 → create v1.0
  - Move project tree and activities into shared data structure
  - Remove project creation (use projects from shared data)
- [ ] Verify roundtrip: export from one component → import in another

#### Then Phase 4: Huginn Plan (new component — largest piece of work)
- See `task.md` and `implementation_plan.md` for full breakdown

### File locations

| File | Path |
|---|---|
| Implementation plan | `design documents/implementation_plan.md` |
| Data model schema | `design documents/data_model_schema.md` |
| Task checklist | `design documents/task.md` |
| Shared data module | `experimental/huginn_data.js` |
| Test fixture | `experimental/muninn_test_fixture.json` |
| Tasks (latest) | `experimental/huginn tasks v7.4.html` |
| Timekeeper (latest) | `experimental/huginn timekeeper v0.1.html` |
| Cal (stable) | `stable/huginn cal v1.0.html` |
| Tasks Viz (stable) | `stable/huginn tasks viz v1.0.html` |

### Notes on existing code quirks
- Tasks v7.4 uses `user-select: none` on the table — needs to be removed per requirements (make content selectable)
- Tasks Viz uses TailwindCSS + PapaParse via CDN (will be cleaned up in Phase 6)
- Cal v1.0 has hardcoded Niedersachsen holidays
- Timekeeper v0.1 has its own project tree with `parentId` references — these map cleanly to the shared `projects` array
- All existing components use `Date.now()` for IDs — consistent with `huginn_data.js`

---

## Session: 2026-03-25 (Session 2)

### What was accomplished

1. **Huginn Tasks v8.0 created** (`experimental/huginn tasks v8.0.html`) — full rewrite of v7.4 integrating `huginn_data.js`:
   - Replaced bespoke data handling with shared data module
   - Status values migrated: `open`→`new`, `completed`→`done`
   - `category` field dropped → replaced with `projectId` + project ancestry display
   - All new task fields integrated (startedAt, estimatedDurationDays, date constraints, etc.)
   - Edit modal popup for single task editing (all fields)
   - Bulk edit modal (hotkey E) — overwrites all fields unconditionally
   - Mail icon (✉️) → mailto: with task details
   - CSV export of current filtered view
   - Column toggle: reduced view (Order, Task, Project, Next Action, Deadline) vs full
   - Overdue/Due filter button
   - Running late indicator (subtle red left border, no emoji)
   - Done button directly marks task as done (no need to start first)
   - Quick add bar for fast task entry
   - Legacy import support (detects flat array from v7.x)

2. **Design documents updated**:
   - `requirements.md` — added clarifications from user feedback
   - `agent_scratchpad.md` — session 2 notes

### Key decisions made by user (Session 2)

- ✅ Bulk edit should overwrite all fields unconditionally (main use case: schedule all to same date)
- ✅ Allow marking tasks as done directly (new→done) without going through started
- ✅ Reduced view keeps Order column, hides Effort
- ✅ No decorative emojis — clean high-density UI; emojis only as space-saving button icons
- ✅ Running late → subtle red left border, not emoji prefix

### What needs to happen next (Session 2 — part 1)

- [x] User manually tests Tasks v8.0 with test fixture import and real data
- [x] Migrate Cal v2.0 and Timekeeper v1.0 to shared data model
- [ ] Phase 4: Huginn Plan v1.0 (complex — project hierarchy, dependencies, scheduler, Gantt chart)

---

## Session: 2026-03-25 (Session 2 — continued)

### What was accomplished (Part 2: Cal v2.0 + Timekeeper v1.0)

3. **Huginn Cal v2.0 created** (`experimental/huginn cal v2.0.html`):
   - Migrated from flat `{ "YYYY-MM-DD": "status" }` map to shared `events[]` array
   - Old localStorage key `huginn_calendar_v1` replaced with `huginnData_v2`
   - Legacy import auto-detected (if JSON keys are all date strings)
   - 4 view modes: Monthly grid (original), Day List, Weekly table, Week-Aligned (month-grouped)
   - Filter by `W#` (ISO week) or `M#` (month number)
   - Paintbrush selection preserved (click/drag + hotkeys V,T,S,O,M,H,E,C)
   - CSV export of current view, ICS file download for selected dates
   - Niedersachsen holiday auto-fill preserved
   - Hotkeys 1-4 for view switching

4. **Huginn Timekeeper v1.0 created** (`experimental/huginn timekeeper v1.0.html`):
   - Project tree now read-only — reads from shared `data.projects` and `data.tasks`
   - Activities use `taskId` (not `projectId`), mapped via `normalizeActivity()` in huginn_data.js
   - Timer state persisted via `data.timekeeping.activeActivityId`
   - "Add Project" button removed (projects come from Tasks/Plan)
   - Activity log shows task name + project path
   - Stats table shows time aggregated per task with project context
   - Plotly.js charts preserved (timeline + histogram)
   - Legacy timekeeper import auto-detected

5. **Tasks v8.0 reduced view fixed**: Added Description column per updated requirements.md

6. **Cross-Component Improvements**:
   - Added `formatDateTimeISO` and `formatTimeISO` to `huginn_data.js`
   - Updated Timekeeper v1.0 to use ISO 8601 formatting for start/end times instead of locale strings
   - Added a compact, fixed navigation bar at the bottom of all 3 components (Tasks v8.0, Cal v2.0, Timekeeper v1.0) to easily switch between them

### File locations (updated)

| File | Path |
|---|---|
| Tasks v8.0 | `experimental/huginn tasks v8.0.html` |
| Cal v2.0 | `experimental/huginn cal v2.0.html` |
| Timekeeper v1.0 | `experimental/huginn timekeeper v1.0.html` |
| Shared data module | `experimental/huginn_data.js` |
| Test fixture | `experimental/muninn_test_fixture.json` |
| Tasks v7.4 (legacy) | `experimental/huginn tasks v7.4.html` |
| Cal v1.0 (legacy) | `stable/huginn cal v1.0.html` |
| Timekeeper v0.1 (legacy) | `experimental/huginn timekeeper v0.1.html` |
| Tasks Viz v1.0 | `stable/huginn tasks viz v1.0.html` |

---

## Session: 2026-03-25 (Session 3)

### What was accomplished

1. **Huginn Plan v1.0 created** (`experimental/huginn plan v1.0.html`, ~1300 lines) — the final major component:
   - **Tree View**: Hierarchical project/task/milestone display with expand/collapse, layer labels (L1/L2/...), status icons (○ new, ◐ started, ● done, ✕ stopped, ◆ milestone), text search/filter, layer depth filter
   - **CRUD**: Add/edit/delete projects, subprojects, tasks, milestones via modals; project dropdown for reassigning tasks; validation guards (can't delete Personal Tasks, can't delete project start/end milestones, can't delete default tasks)
   - **Task↔project conversions**: Breakdown (task→project) and Flatten (project→task) buttons calling `huginn_data.js` helpers
   - **Dependency management**: Add dependency modal (selects from all tasks/milestones as predecessors, creates finish-to-start dependency)
   - **Scheduler UI**: Button (+ hotkey S) calls `runScheduler()`, displays scheduling conflict banner when constraints are violated, highlights critical path items (gold border in tree, gold bars in Gantt)
   - **Gantt chart**: Synchronized with tree panel (scroll-linked), task bars with status coloring (green=normal, gold=critical, red=late, grey=done), milestone diamonds, dependency arrows (SVG bezier curves with arrowheads), today line, available-window visualization for non-critical tasks, 3 zoom levels (day/week/month)
   - **Panel resize**: Draggable divider between tree and Gantt panels
   - **Keyboard shortcuts**: ↑↓ navigate tree, ←→ collapse/expand, Enter toggle, E=edit, Del=delete, S=schedule, D=add dependency, T/P/M=add task/project/milestone, ?=help overlay
   - **Import/Export**: JSON import/export (shared data format), CSV export of current tree view
   - **Earth-tone dark theme**: Consistent with suite (dark green-grey background, A27B5C accents, DCD7C9 text)

2. **`huginn_data.js` expanded** — 8 new Plan-specific helper functions added (~200 lines):
   - **CRUD/Hierarchy**: `addTaskToProject`, `deleteProject` (recursive — removes all children, tasks, events, dependencies), `flattenProject`, `groupTasksToProject`, `breakdownTaskToProject`
   - **Scheduling**: `topologicalSort` (Kahn's algorithm for DAG ordering), `runScheduler` (forward/backward pass, earliest/latest times, float calculation, critical path identification, constraint handling for flexible/fixed/target date types)
   - **Querying**: `getDependenciesFor` (finds all dependencies involving a given entity)

3. **Navigation bar updated** on all 4 components — Tasks, Cal, Plan, Timekeeper all link to each other in the bottom nav bar

### Browser verification results
- ✅ No console errors on load
- ✅ Tree renders all existing projects/tasks from localStorage (picked up test data from Sessions 1-2)
- ✅ Scheduler runs and correctly reports fixed-date conflicts in the banner
- ✅ Gantt chart renders task bars, milestone diamonds, and dependency arrows
- ✅ Keyboard navigation (↑/↓) works to move selection through tree
- ✅ Status coloring correct (done=strikethrough, started=green, late=red border)

### File locations (updated)

| File | Path |
|---|---|
| Plan v1.0 | `experimental/huginn plan v1.0.html` |
| Tasks v8.0 | `experimental/huginn tasks v8.0.html` |
| Cal v2.0 | `experimental/huginn cal v2.0.html` |
| Timekeeper v1.0 | `experimental/huginn timekeeper v1.0.html` |
| Shared data module | `experimental/huginn_data.js` |
| Test fixture | `experimental/muninn_test_fixture.json` |

---

## Pre-Review TODO List

Items to address before the big human user testing review and next iteration:

### Must-fix (likely bugs or incomplete features)
- [ ] **Scheduler conflict messages show raw IDs** — e.g. "event 300001 finishes after task 100003 fixed start". Should show human-readable names instead
- [ ] **`buildProjectForm` return bug** — the `setTimeout` for setting parent dropdown value runs after the `return` statement (dead code). Same issue in `buildTaskForm` for project dropdown. Both forms work because the `setTimeout` fires before modal is used, but it's technically a code smell
- [ ] **Group button** — shows "not yet implemented" alert. Either implement multi-select in tree + group, or remove the button
- [ ] **Gantt scroll sync** — currently only tree→gantt vertical sync (via marginTop hack). No gantt→tree reverse sync. Tree scroll can go out of bounds if Gantt panel is scrolled independently

### Should-do (polish before review)
- [ ] **Test with clean localStorage** — verify Plan works correctly with zero data (fresh start)
- [ ] **Test roundtrip** — export JSON from Plan, import in Tasks (and vice versa), verify data integrity
- [ ] **Verify Breakdown/Flatten** — these call `huginn_data.js` helpers that were written but not browser-tested
- [ ] **Edit modal project dropdown** — verify it correctly pre-selects the current project when editing existing tasks
- [ ] **Gantt date header formatting** — at Week zoom, only Mondays show date numbers. Could be confusing. Consider adding month labels
- [ ] **Empty Gantt state** — if no tasks have dates, Gantt shows only the today line with no bars. Could benefit from a "Run scheduler first" hint
- [ ] **`exportToCSV` call** — the Plan CSV export calls `HuginnData.exportToCSV()` which may not exist (verify — may need to add this helper or use inline logic)

### Nice-to-have (next iteration candidates)
- [ ] Drag & drop reordering in tree
- [ ] Task progress % visualization on Gantt bars
- [ ] Undo/redo for CRUD operations
- [ ] Details sidebar panel (was in CSS but not implemented in JS)
- [ ] Multi-select in tree for bulk operations
- [ ] Gantt bar drag-to-resize (change duration)
- [ ] Print/PDF view for Gantt chart
- [ ] Tasks Viz v1.0 cleanup (Phase 6 — still uses TailwindCSS + PapaParse CDN)