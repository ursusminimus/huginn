# Huginn Suite

## Overall Concept
Huginn is a suite of independent productivity tools.

The core design philosophy is:
- simplicity - as simple as possible, as complex as necessary
- independence/portability - standalone files with no installation
- usability - clear and fast

This also allows us to rapidly iterate features. Once it is feature complete, we will rebuild it from scratch as a server-based solutions for multiple users and tools.

### Simplicity
We want to make simple tools, but with advanced professional capability. So we use out "complexity budget" on advanced core functionality, not on UX fluff.

### Independence
We need to share this with people that are heavily blocked by IT department restrictions.
Therefore the concept is:
- Each tool is a standalone HTML file ("Huginn xxx.html") with javascript, using limited external libraries for complex functionalities (e.g. plotly)
- data is stored in LocalStorage
- Additionally, data is exported/imported to a local .json or .csv (e.g. "Muninn xxx.json", depending on the data structure complexity)
Interactions between tools are limited to passing through the .json/.csv data structures manually.

### Usability
I really hate laggy interfaces.
- the interface should be exteremly responsive/snappy (targeting no visible lag between interaction and response)
- all functions should have hotkeys assigned to them
- there should be as few interactions (clicks/buttons) as possible to achieve a target, but not so few that the user keeps making accidental mistakes
The color scheme is described in color scheme.md.


## Suite components

### Huginn Tasks
Task/Todo list manager
- already implemented

### Huginn Tasks Viz
Burndown chart visualisation for Huginn Tasks jsons
- already implemented

### Huginn Cal
Calendar for long term planning
- early prototype, future features will be implemented later

### Huginn Timekeeper
- keep track of time used for activities, e.g. how much time it took me to assemble a 3D printer over multiple evenings
- activities are assigned to projects with multi-level subproject hierarchy
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