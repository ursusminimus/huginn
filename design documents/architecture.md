# Architecture Definition File

Huginn is a suite of productivity tool MVPs.

It contains the following components:
- Huginn Data - .json file that contains the shared data structure for all components
- Huginn Tasks - task manager
- Huginn Tasks Viz - burndown chart visualisation for Huginn Tasks
- Huginn Cal - calendar view and event planning
- Huginn Plan - complex project planning and management
- Huginn Timekeeper - time tracking for activities

Read the requirements.md carefully to understand the requirements for each component. Start with creating a shared data structure that all components can use.

## Key Architecture Decisions

This repository is a MVP to try out some ideas and is not intended to be a production-ready application. We will iterate on the design and implementation as we go. In addition, a core focus is to learn about agentic engineering/vibe coding.

As I want to use the solutions we build on a highly restricted work laptop, all the files should be self-contained .html files with javascript that can be run locally on any machine with a browser.

Avoid adding dependencies as much as feasible, but do no re-invent the wheel. Ask me if you think adding a new dependency makes sense rather than writing the functions yourself.

At a (much) later stage, we will rewrite the code as a server-based application with multi-user support, but for now we want to validate some core ideas in the MVP.

Each core functionality should be in its own .html file as described in requirements.md. Since the functionalities are related, they should all share be able to lead and export their data in a common .json file that contained a shared data structure. Between import and export, we use LocalStorage to persist the data. When exporting the data, all info that was part of the imported data and never used (because of the shared data model) should be preserved in the original state.

### Approved dependencies

- plotly.js

## Repository Structure

To get the most of the educational purposes, the repo is structures as follows:

- design documents contain all relevant instructions what and how to develop. Read them first.
- agent_artifacts contain all the artifacts that the agents created during previous sessions. You can use agent_todo.md to keep track of what still needs to be done and agent_scratchpad.md to take any notes you need to help you work. Previous agents left a lot of useful information there, especially in agent_scratchpad.md which is used to share context between sessions.
- all the development happens in the experimental folder. You can change the files here as you please
- stable contains the latest human-tested versions. I will manually copy certain snapshots there as I see fit as we make progress in the experimental folder. Do not change them by yourself without asking.
- archived contains versions of the software that I found interesting for some educational or sentimental reasons and should never be changed by agents.