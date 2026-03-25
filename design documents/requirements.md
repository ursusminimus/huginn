# Requirements for the Huginn Suite

## Huginn Data
- use standard .json conventions to store data for all components
- should be human readable and editable insofar it does not hinder functionality
- should be versioned and version checked upon import/export
- should be easily importable and exportable
- no legacy support necessary as we are rapidly iterating on the design for the MVP

## Huginn Tasks
- core requirements are already implemented, focus on additional features

### Huginn Tasks Additional Feature Requests
- make the content of the table selectable so I can copy-paste it
- change edit mode to the following:
    - single task edit: open a popup with all fields so I can edit them there
    - bulk edit: select multiple tasks and edit with hotkey e which pops up a small window with only the fields that can be edited in bulk
- add a send mail icon to each task that opens a mail client with the task details prefilled
- in addition to the .json export, add a .csv export with the current view as is
- add a button to toggle between a reduced set of column only containing the most important fields () and the full set of columns
- add a dedicated button to filter to show overdue and due tasks only
- the whote state logic might be reviewed after we implement Huginn Plan (dependencies -> based on that we can derive if a task is blocked by another dependency or needs to be done to unblock another task), but here I am not quite sure how I want to handle this yet
    - currently I think we need: new (not started), started (in progress but not done), done (completed), stopped (completed without success
    - potentially we can consider "blocked", "blocker" and "running late" (started but exeeeding planned duration) as derived states that can be computed from the dependencies and due dates, but maybe this should be separate flags instead of the main state.

## Huginn Tasks Viz
Burndown chart visualisation for Huginn Tasks jsons
- already implemented, no additional feature requests at this moment

## Huginn Cal
- shows tasks and projects created from Huginn Tasks and Huginn Plan
- allows to add full-day "events" that are not tied to any task or project
- a single day can have multiple events, and events can span multiple days, such as vacations
- the edit mode should be super quick and function like a paintbrush with hotkeys based on predefined event types
    - I don't want to open a popup each time and select stuff
    - I want to be able to select a non-contiguous set of days and add or remove an event to all of them
- toggle between multiple visualisation views:
    - full-year compact list view, every line is a day with all events for that day
    - full-year weekly table view with each line containing a calendar week (with ISOWEEKNUM) and a column for each day of the week with all events for that day
        - filterable by week numbers
    - full-year monthly table view with each line containing a calendar month and a column for each day of the month with all events for that day. Each week within the month should be marked with the ISOWEEKNUM.
        - filterable by month numbers
    - same as the one before, but the week days should be aligned within columns, meaning each column should contain the same day of the week for all weeks in the month
        - filterable by month numbers
- in addition to the .json export, add a .csv export with the current view as is including filters
- add option to send an event to my mail client with the event details prefilled as .ics file

## Huginn Plan
- this is the most complex component of the suite
- the aim is to build a tool that help to handle the immense complexity of large projects and even project portfolios
- to start with, we only focus on what needs to be done (the work breakdown structure), and scheduling. We ignore other aspects of project management such as resource allocation, risk management, etc.
- the core idea that is different to other tools is to traverse abstraction levels seamlessly
    - a project can contain milestones, tasks and subprojects
    - a task is atomic by definition, as soon as we break it down it becomes a project (this is the same task that is used in Huginn Tasks)
    - Milestones are events in the same sense that Huginn Cal defines them
    - subprojects are just like projects, just one hierarchy level down
    - there can be any number of subprojects and/or tasks within a project on the same level
    - the project hierarchy then forms a tree structure
    - a project can have a (nearly, let's use a int64 or something) infinite number of hierarchy layers
    - we refer to each layer by layer ID (e.g. L3 project)
    - as soon as we create a project, it automatically gets a start milestone, and end milestone and a "do $projectname" task
- tasks, subprojects and milestones can be arranged in sequences by adding dependencies between them
- all atomic tasks created by Huginn Tasks should be automatically added to a "personal tasks" project on L1
- tasks & subprojects can be created on any layer within any project
- tasks & subprojects can be moved between projects on any hierarchy level
- a single task can be converted to a project via a "breakdown into project" action, which automatically creates a new layer
- projects can be converted to tasks, which automatically deletes the milestones and shifts all atomic tasks and subprojects to the parent project
- a group of tasks can be converted to a project via a "group to project" action, which automatically creates a new layer
- the visualisation should be a tree view of the project hierarchy, with the ability to expand and collapse projects, filter by layer, search via full-text-filter, etc.
- the tree view should be interactive and allow to edit tasks and milestones in place with a dedicated edit mode to avoid accidental changes. As usual, hotkeys should be used to speed up the workflow.
- in addition to the .json export, add a .csv export with the current view as is including filters

### Huginn Plan Scheduler
- timelines are planned via dependencies between tasks and milestones with the focus on constraints
- the scheduler is ran manually via a button and calculates the optimal schedule for all tasks based on the dependencies and constraints. If there are conflicts, it highlights them in the Gantt chart view
- the visualisation should be a Gantt chart view of the project hierarchy next to the tree view with the same features as described in the earlier section
- the scheduler assumes all tasks have not been started yet unless marked as "started". The "started" status can be set in Huginn Tasks or Huginn Plan and tracks the timestamp of when the status was set
- for tasks that were set to done without being started, the scheduler will assume they were started at the time they were set to done
- for tasks that are started but not done and the start date implies the duration of the tasks is exceeded, the scheduler will assume the planned duration was exceeded and highlight the task as overdue. The actual duration will be calculated from the start date and the done date.
- in case tasks are stopped (completed without success) we assume the project can continue without the task and treat it as if it was never there
- by default, all tasks have a start dependency on the start milestone of the project
- by default, and end milestone has a dependency on all tasks within the project
- tasks have a estimated duration (default 1 day), an optional start date and an optional end date
- any date (start or end) can be set as:
    - flexible (default) - will be scheduled based on dependencies
    - fixed (hard deadline) - will not be changed by scheduling
    - target (soft deadline) - will only be shifted by scheduling if shifting will successfully resolve a conflict
- tasks have a estimated duration (default 1 day), an optional start date and an optional end date
- the critical path should be highlighted in the Gantt chart view
- tasks that are not on the critical path should be shown in context of the available time to do them (e.g. colored bar for planned duration overlaid on a longer bar of a more muted color representing the available time window) and spaced out relatively homogeneously
- dependencies should be visualised as arrows in the Gantt chart view
- collapsing the tree view should collapse the Gantt chart view accordingly and treat the collapsed project as a single task with the same start and end dates
- the calculated implications for due dates etc. are written to the .json on export

### Huginn Planner Additional Feature Requests for the future
- LLM interface via API that assists with project planning by proposing
    - breakdown of projects into tasks and subprojects
    - unambiguous, deliverable-oriented naming and descriptions for milestones, tasks and subprojects
    - high level review of project plan with general feedback on quality, completeness, etc.
    - 

## Huginn Timekeeper
- keep track of time used for activities, e.g. how much time it took me to assemble a 3D printer over multiple evenings
- uses the data structure provided by Huginn Tasks or Huginn Plan, does not allow adding new tasks/projects
- core function is a start/stop button for each project and a running timer
    - only one timer can run at a time, the project hierarchy can represent nested activities (e.g. sub-assebmly is counted towards the overall project duration)
- when stop is pressed, the activity is terminated and another activity of the same type is created to be started again, so that each "activity" data structure only has a start and stop timestamp
- for each activity: tracks time elapsed, start time, end time
    - Decision against pause button to keep it simple. Just use top and start.
- visualisation the available data
    - single projects or multiple projects
    - calendar view to see when the work was done
    - statistics view like a histogram of activity lengths
- option to edit everything afer the fact, but will add edited tag automatically
    - move project assignment/subproject assignment
    - change start/end time if forgot to click button
- export to json as usual


### Muninn Thoughts
- this component is reserved for later, in general it is supposed to be a place for me to dump my thoughts and ideas and have them structured in a way that I can later use them to create tasks and projects
- I am currently reviewing competitor products (Obsidian Canvas and Whiteboard-like tools such as Miro)