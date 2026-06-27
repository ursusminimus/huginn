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
- whitelisted users can send messages (which channel? email? whatsapp?) to the system like
- transition from tasks to tickets with multiuser interactions and workflows, while managing to keep it simple enough for daily todo lists (what the tool is currently good at)