# Huginn Shared Data Model — Schema Specification (Revised)

## Top-Level Structure

```json
{
  "huginnVersion": "2.0",
  "tasks": [],
  "projects": [],
  "events": [],
  "dependencies": [],
  "timekeeping": {
    "activities": [],
    "activeActivityId": null
  }
}
```

All collections use **integer IDs** generated via `Date.now()`.

---

## Entity Definitions

### Task

Atomic unit of work. Cannot be decomposed — if broken down, it becomes a project.

```json
{
  "id": 1742860800000,
  "text": "Draft Q2 report",
  "description": "Include KPI summary and risk section",
  "status": "new",
  "createdAt": "2026-03-25T00:00:00.000Z",
  "startedAt": null,
  "finishedAt": null,
  "projectId": null,
  "effort": 1,
  "order": 1.0,
  "nextActionDate": "2026-03-28",
  "deadline": null,
  "estimatedDurationDays": 1,
  "startDate": null,
  "startDateType": "flexible",
  "endDate": null,
  "endDateType": "flexible",
  "scheduledStart": null,
  "scheduledEnd": null
}
```

| Field | Type | Notes |
|---|---|---|
| `status` | `"new" \| "started" \| "done" \| "stopped"` | Core states. Derived states (blocked, blocker, running late) computed at runtime |
| `projectId` | `int \| null` | Parent project. `null` → belongs to "Personal Tasks" L1 project |
| `effort` | `int ≥ 1` | Relative effort estimate |
| `order` | `float` | Sort order within context |
| `startDateType` / `endDateType` | `"flexible" \| "fixed" \| "target"` | Scheduler constraint type |
| `scheduledStart` / `scheduledEnd` | `string \| null` | Computed by scheduler, written on export |
| `startedAt` | `ISO string \| null` | Timestamp when status changed to "started" |

### Project

Contains tasks, events, and subprojects. On creation, auto-generates a start event, end event, and default "do $name" task.

```json
{
  "id": 1742860800001,
  "name": "Q2 Planning",
  "parentId": null,
  "layer": 1,
  "startEventId": 1742860800010,
  "endEventId": 1742860800011,
  "defaultTaskId": 1742860800012
}
```

| Field | Type | Notes |
|---|---|---|
| `parentId` | `int \| null` | Parent project. `null` = root (L1) |
| `layer` | `int ≥ 1` | Auto-computed from parent chain |
| `startEventId` | `int` | Reference to the auto-created start event |
| `endEventId` | `int` | Reference to the auto-created end event |
| `defaultTaskId` | `int` | Reference to the auto-created default task |

### Event (Unified Milestones + Calendar Events)

A single entity type for both project milestones and calendar events. Project milestones participate in the dependency graph; calendar events do not.

```json
{
  "id": 1742860800010,
  "name": "Q2 Planning Kickoff",
  "projectId": 1742860800001,
  "type": "milestone",
  "date": null,
  "dateType": "flexible",
  "scheduledDate": null
}
```

**Type values:**

| `type` | Participates in scheduler? | Notes |
|---|---|---|
| `"milestone"` | ✅ Yes | Project milestone, linked via dependencies |
| `"vacation"` | ❌ No | Calendar event |
| `"trip"` | ❌ No | Calendar event |
| `"sick"` | ❌ No | Calendar event |
| `"overtime"` | ❌ No | Calendar event |
| `"holiday"` | ❌ No | Calendar event |
| `"mobile"` | ❌ No | Calendar event |
| `"event"` | ❌ No | Generic calendar event |

Calendar events with no natural project link are assigned to the **"Personal Tasks" project** (`projectId` = that project's ID, or `null` as shorthand).

Multi-day events are stored as **one entry per day** with the same `name` to group them.

| Field | Type | Notes |
|---|---|---|
| `dateType` | `"flexible" \| "fixed" \| "target"` | Only relevant for milestones |
| `scheduledDate` | `string \| null` | Computed by scheduler for milestones |

### Dependency

Ordering constraints between tasks and events.

```json
{
  "id": 1742860800020,
  "fromId": 1742860800010,
  "fromType": "event",
  "toId": 1742860800000,
  "toType": "task",
  "type": "finish-to-start"
}
```

| Field | Type | Notes |
|---|---|---|
| `fromType` / `toType` | `"task" \| "event"` | What kind of entity is referenced |
| `type` | `"finish-to-start"` | `to` cannot start before `from` finishes/occurs |

**Default dependencies** (auto-created with project):
- Project start event → every task in the project
- Every task → project end event

### Timekeeping Activity

Strictly linked to tasks. Project-level durations aggregated at runtime.

```json
{
  "id": 1742860800040,
  "taskId": 1742860800000,
  "start": "2026-03-25T09:00:00.000Z",
  "end": "2026-03-25T10:30:00.000Z",
  "edited": false
}
```

| Field | Type | Notes |
|---|---|---|
| `taskId` | `int` | Required — time is always tracked against a task |
| `edited` | `bool` | Auto-set when timestamps are manually changed |

---

## Special Behaviors

### "Personal Tasks" Project
- Auto-created as L1 project if it doesn't exist
- Tasks with `projectId: null` treated as belonging here
- Calendar events with `projectId: null` also belong here

### Preserving Unknown Data
When a component imports JSON but only uses a subset:
1. Parse the full JSON
2. Modify only its own collections
3. Re-serialize full JSON on export, preserving untouched collections

---

## Migration Notes

### Tasks v7.4 → v8.0
- `status: "open"` → `"new"`
- `status: "completed"` → `"done"`
- Drop `category` field (replaced by `projectId`)
- Add defaults: `startedAt: null`, `estimatedDurationDays: 1`, `*DateType: "flexible"`, `scheduledStart/End: null`

### Cal v1.0 → v2.0
- `{ "YYYY-MM-DD": "status" }` map → array of event objects
- Each entry becomes `{ id, name: null, projectId: null, date: key, type: value, dateType: "fixed" }`

### Timekeeper v0.1 → v1.0
- `data.projects` → merge into top-level `projects`
- `data.activities` → merge into `timekeeping.activities`
- Remove `projectId` from activities, map to `taskId` (create stub tasks if needed)
