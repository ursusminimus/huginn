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