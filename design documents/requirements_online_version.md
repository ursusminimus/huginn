# Requirements for Online Version

## General Premises

- offline MVP did the job to understand what I want UI-wise
- online version would be interesting for multi-device handling (e.g. work phone)
- for quick experimentation I want to host it somewhere cheap (ideally free) with some basic access rights control -> might use the chance to include some basic multi-user functionality?
- I need no domain or anything for now, being hard to find is a feature not a bug
- I don't mind restarting from scratch later on again when we learn more about what works and what doesn't. Let's make the system fit the current needs and not anticipate future needs that might never materialize.
- Tech stack unclear - needs to be defined as the first step

## Additional features for the online version

- since this is hosted somewhere, we can run scheduled tasks to e.g. re-create repeating tasks
- ability to send emails (reminders for overdue tasks, basic .ics calendar events when creating events, ...)
- basic multi-user functionality (multiple logins possible, each one has their isolated space)


## Ideas for future

- LLM API for advanced functions such as "structure this todo and create actionable subtasks"
    - cluster related todos into a project
    - propose rewording for badly phrased todos
    - propose prio/order based on semantic understanding
    - populate efforts
- time-wise distribution (weekly schedule -> use order to reassign all overdue tasks)
- whitelisted users can send messages (which channel? email? whatsapp?) to the system like
- transition from tasks to tickets with multiuser interactions and workflows, while managing to keep it simple enough for daily todo lists (what the tool is currently good at)


## 2026-07-26 Feedback after using it for a few weeks
Usability changes:
- [x] make reduced view the default view on desktop
- [x] add "mobile view" as a 3rd option for mobile devices (automatically pick it from mobile devices) that only includes actions, tasks and next action date
- [x] add deep link functionality by exposing all filter/view settings as URL parameters
- [x] make "today" the default next action date for all newly created tasks
- [x] move import/export, recalc order and sign out buttons to their own collapsable "advanced actions" area between the new task bar and the filter bar
- [x] add an "view" action on double click (long tap on mobile) that opens a popup similar to the edit view except it only shows the information for all fields and you can't edit anything
