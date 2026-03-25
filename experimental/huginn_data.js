/**
 * Huginn Data Module v2.0
 * Shared data layer for all Huginn productivity suite components.
 * 
 * Usage: <script src="huginn_data.js"></script>
 * Provides the global `HuginnData` object with schema, validation,
 * normalization, localStorage persistence, and import/export helpers.
 */

const HuginnData = (() => {
    'use strict';

    // --- Constants ---
    const VERSION = '2.0';
    const STORAGE_KEY = 'huginnData_v2';
    const PERSONAL_PROJECT_NAME = 'Personal Tasks';

    const TASK_STATUSES = ['new', 'started', 'done', 'stopped'];
    const DATE_TYPES = ['flexible', 'fixed', 'target'];
    const EVENT_TYPES = ['milestone', 'vacation', 'trip', 'sick', 'overtime', 'holiday', 'mobile', 'event'];
    const CALENDAR_EVENT_TYPES = EVENT_TYPES.filter(t => t !== 'milestone');
    const DEPENDENCY_TYPES = ['finish-to-start'];

    // --- ID Generation ---
    let _idCounter = 0;
    function generateId() {
        // Ensure unique IDs even when called in rapid succession
        const now = Date.now();
        _idCounter = (_idCounter < now) ? now : _idCounter + 1;
        return _idCounter;
    }

    // --- Default / Empty Data ---
    function createEmptyData() {
        return {
            huginnVersion: VERSION,
            tasks: [],
            projects: [],
            events: [],
            dependencies: [],
            timekeeping: {
                activities: [],
                activeActivityId: null
            }
        };
    }

    // --- Normalization Functions ---
    // Each normalizer ensures an entity has all required fields with valid defaults.

    function normalizeTask(t) {
        const status = normalizeTaskStatus(t.status, t.completed);
        return {
            id: t.id || generateId(),
            text: t.text || 'Unnamed Task',
            description: t.description || '',
            status: status,
            createdAt: t.createdAt || new Date().toISOString(),
            startedAt: t.startedAt || null,
            finishedAt: t.finishedAt || null,
            projectId: (t.projectId != null) ? Number(t.projectId) : null,
            effort: Math.max(1, parseInt(t.effort, 10) || 1),
            order: parseFloat(t.order) || 0,
            nextActionDate: t.nextActionDate || null,
            deadline: t.deadline || null,
            estimatedDurationDays: Math.max(1, parseInt(t.estimatedDurationDays, 10) || 1),
            startDate: t.startDate || null,
            startDateType: DATE_TYPES.includes(t.startDateType) ? t.startDateType : 'flexible',
            endDate: t.endDate || null,
            endDateType: DATE_TYPES.includes(t.endDateType) ? t.endDateType : 'flexible',
            scheduledStart: t.scheduledStart || null,
            scheduledEnd: t.scheduledEnd || null
        };
    }

    function normalizeTaskStatus(status, legacyCompleted) {
        // Migration from v7.x status values
        if (status === 'open') return 'new';
        if (status === 'completed') return 'done';
        if (TASK_STATUSES.includes(status)) return status;
        // Legacy boolean 'completed' field
        if (legacyCompleted === true) return 'done';
        return 'new';
    }

    function normalizeProject(p) {
        return {
            id: p.id || generateId(),
            name: p.name || 'Unnamed Project',
            parentId: (p.parentId != null) ? Number(p.parentId) : null,
            layer: Math.max(1, parseInt(p.layer, 10) || 1),
            startEventId: p.startEventId || null,
            endEventId: p.endEventId || null,
            defaultTaskId: p.defaultTaskId || null
        };
    }

    function normalizeEvent(e) {
        return {
            id: e.id || generateId(),
            name: e.name || '',
            projectId: (e.projectId != null) ? Number(e.projectId) : null,
            type: EVENT_TYPES.includes(e.type) ? e.type : 'event',
            date: e.date || null,
            dateType: DATE_TYPES.includes(e.dateType) ? e.dateType : 'flexible',
            scheduledDate: e.scheduledDate || null
        };
    }

    function normalizeDependency(d) {
        return {
            id: d.id || generateId(),
            fromId: Number(d.fromId),
            fromType: (d.fromType === 'task' || d.fromType === 'event') ? d.fromType : 'task',
            toId: Number(d.toId),
            toType: (d.toType === 'task' || d.toType === 'event') ? d.toType : 'task',
            type: DEPENDENCY_TYPES.includes(d.type) ? d.type : 'finish-to-start'
        };
    }

    function normalizeActivity(a) {
        return {
            id: a.id || generateId(),
            taskId: Number(a.taskId || a.projectId), // Migration: map old projectId to taskId
            start: a.start || new Date().toISOString(),
            end: a.end || null,
            edited: !!a.edited
        };
    }

    // --- Full Data Normalization ---
    function normalizeData(raw) {
        if (!raw || typeof raw !== 'object') {
            return createEmptyData();
        }

        const data = {
            huginnVersion: VERSION,
            tasks: Array.isArray(raw.tasks) ? raw.tasks.map(normalizeTask) : [],
            projects: Array.isArray(raw.projects) ? raw.projects.map(normalizeProject) : [],
            events: Array.isArray(raw.events) ? raw.events.map(normalizeEvent) : [],
            dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.map(normalizeDependency) : [],
            timekeeping: {
                activities: [],
                activeActivityId: null
            }
        };

        // Normalize timekeeping
        if (raw.timekeeping && typeof raw.timekeeping === 'object') {
            data.timekeeping.activities = Array.isArray(raw.timekeeping.activities)
                ? raw.timekeeping.activities.map(normalizeActivity) : [];
            data.timekeeping.activeActivityId = raw.timekeeping.activeActivityId || null;
        }

        // Preserve any extra top-level keys we don't recognize (future-proofing)
        for (const key of Object.keys(raw)) {
            if (!(key in data)) {
                data[key] = raw[key];
            }
        }

        return data;
    }

    // --- Project Helpers ---

    function computeLayer(projectId, projects) {
        let layer = 1;
        let current = projects.find(p => p.id === projectId);
        while (current && current.parentId != null) {
            layer++;
            current = projects.find(p => p.id === current.parentId);
            if (layer > 100) break; // Safety against circular references
        }
        return layer;
    }

    function recomputeLayers(data) {
        data.projects.forEach(p => {
            p.layer = computeLayer(p.id, data.projects);
        });
    }

    /**
     * Create a new project with auto-generated start event, end event, and default task.
     * Returns { project, startEvent, endEvent, defaultTask, dependencies[] }.
     */
    function createProject(name, parentId, data) {
        const startEvent = normalizeEvent({
            id: generateId(),
            name: `${name} — Start`,
            projectId: null, // will be set after project is created
            type: 'milestone',
            dateType: 'flexible'
        });

        const endEvent = normalizeEvent({
            id: generateId(),
            name: `${name} — End`,
            projectId: null,
            type: 'milestone',
            dateType: 'flexible'
        });

        const defaultTask = normalizeTask({
            id: generateId(),
            text: `Do ${name}`,
            projectId: null,
            status: 'new'
        });

        const project = normalizeProject({
            id: generateId(),
            name: name,
            parentId: parentId || null,
            startEventId: startEvent.id,
            endEventId: endEvent.id,
            defaultTaskId: defaultTask.id
        });

        // Set projectId back-references
        startEvent.projectId = project.id;
        endEvent.projectId = project.id;
        defaultTask.projectId = project.id;
        project.layer = computeLayer(project.id, [...data.projects, project]);

        // Default dependencies: start → default task → end
        const deps = [
            normalizeDependency({
                id: generateId(),
                fromId: startEvent.id,
                fromType: 'event',
                toId: defaultTask.id,
                toType: 'task',
                type: 'finish-to-start'
            }),
            normalizeDependency({
                id: generateId(),
                fromId: defaultTask.id,
                fromType: 'task',
                toId: endEvent.id,
                toType: 'event',
                type: 'finish-to-start'
            })
        ];

        return { project, startEvent, endEvent, defaultTask, dependencies: deps };
    }

    /**
     * Ensure the "Personal Tasks" L1 project exists. Create it if missing.
     * Returns the project (existing or newly created), and any new entities to add.
     */
    function ensurePersonalProject(data) {
        let personal = data.projects.find(p => p.name === PERSONAL_PROJECT_NAME && p.parentId === null);
        if (personal) {
            return { project: personal, newEntities: null };
        }

        const result = createProject(PERSONAL_PROJECT_NAME, null, data);
        return {
            project: result.project,
            newEntities: result
        };
    }

    // --- Task Helpers ---

    function setTaskStatus(task, newStatus) {
        const now = new Date().toISOString();
        task.status = newStatus;

        if (newStatus === 'started' && !task.startedAt) {
            task.startedAt = now;
        } else if (newStatus === 'done') {
            task.finishedAt = now;
            if (!task.startedAt) {
                // Done without being started — assume started at finish time
                task.startedAt = now;
            }
        } else if (newStatus === 'new') {
            task.startedAt = null;
            task.finishedAt = null;
        }
        // 'stopped' — keep existing timestamps
        if (newStatus === 'stopped') {
            task.finishedAt = now;
        }
    }

    /**
     * Check if a task is "running late": started but estimated duration exceeded.
     */
    function isRunningLate(task) {
        if (task.status !== 'started' || !task.startedAt) return false;
        const startDate = new Date(task.startedAt);
        const expectedEnd = new Date(startDate);
        expectedEnd.setDate(expectedEnd.getDate() + (task.estimatedDurationDays || 1));
        return new Date() > expectedEnd;
    }

    /**
     * Get the project ancestry path for a task (project name > parent name > ...).
     */
    function getProjectPath(projectId, projects) {
        const parts = [];
        let current = projects.find(p => p.id === projectId);
        while (current) {
            parts.unshift(current.name);
            current = current.parentId ? projects.find(p => p.id === current.parentId) : null;
            if (parts.length > 20) break; // Safety
        }
        return parts.join(' › ');
    }

    // --- LocalStorage Persistence ---

    function saveToLocalStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('HuginnData: Error saving to localStorage:', error);
        }
    }

    function loadFromLocalStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return createEmptyData();
            return normalizeData(JSON.parse(raw));
        } catch (error) {
            console.error('HuginnData: Error loading from localStorage:', error);
            return createEmptyData();
        }
    }

    // --- Import / Export ---

    function exportToJSON(data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `muninn_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importFromJSON(file, callback) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const raw = JSON.parse(e.target.result);
                const data = normalizeData(raw);
                callback(null, data);
            } catch (error) {
                console.error('HuginnData: Error importing JSON:', error);
                callback(error, null);
            }
        };
        reader.onerror = () => callback(new Error('File read error'), null);
        reader.readAsText(file);
    }

    /**
     * Export the current filtered/visible data as CSV.
     * @param {Array<Object>} rows - Array of flat objects (one per row)
     * @param {string[]} headers - Column headers / keys
     * @param {string} filename - Download filename
     */
    function exportToCSV(rows, headers, filename) {
        const escapeCsvCell = (cell) => {
            const str = String(cell === null || cell === undefined ? '' : cell).replace(/[\n\r]/g, ' ');
            return `"${str.replace(/"/g, '""')}"`;
        };

        const csvRows = [headers.join(',')];
        rows.forEach(row => {
            csvRows.push(headers.map(h => escapeCsvCell(row[h])).join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `muninn_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- Migration Helpers ---

    /**
     * Migrate legacy Tasks v7.x data (flat array from 'muninnData' localStorage key).
     * Returns a partial HuginnData object with tasks populated.
     */
    function migrateLegacyTasks() {
        try {
            const raw = localStorage.getItem('muninnData');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return null;

            const tasks = parsed.map(t => {
                const task = normalizeTask(t);
                // Drop legacy 'category' field (no longer used)
                return task;
            });
            return { tasks };
        } catch (e) {
            console.error('HuginnData: Error migrating legacy tasks:', e);
            return null;
        }
    }

    /**
     * Migrate legacy Cal v1.0 data (date→status map from 'huginn_calendar_v1' localStorage key).
     * Returns a partial HuginnData object with events populated.
     */
    function migrateLegacyCalendar() {
        try {
            const raw = localStorage.getItem('huginn_calendar_v1');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (typeof parsed !== 'object' || Array.isArray(parsed)) return null;

            const events = Object.entries(parsed).map(([date, status]) => {
                return normalizeEvent({
                    id: generateId(),
                    name: null,
                    projectId: null,
                    date: date,
                    type: CALENDAR_EVENT_TYPES.includes(status) ? status : 'event',
                    dateType: 'fixed'
                });
            });
            return { events };
        } catch (e) {
            console.error('HuginnData: Error migrating legacy calendar:', e);
            return null;
        }
    }

    /**
     * Migrate legacy Timekeeper v0.1 data from 'muninnTimekeeperData' localStorage key.
     * Returns a partial HuginnData object with projects and timekeeping.activities populated.
     */
    function migrateLegacyTimekeeper() {
        try {
            const raw = localStorage.getItem('muninnTimekeeperData');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;

            const projects = Array.isArray(parsed.projects)
                ? parsed.projects.map(p => normalizeProject(p)) : [];

            const activities = Array.isArray(parsed.activities)
                ? parsed.activities.map(a => normalizeActivity(a)) : [];

            return { projects, timekeeping: { activities, activeActivityId: null } };
        } catch (e) {
            console.error('HuginnData: Error migrating legacy timekeeper:', e);
            return null;
        }
    }

    /**
     * Perform a full migration: check for legacy data in all old localStorage keys,
     * merge into a unified HuginnData structure, save to new key, and return.
     * Does NOT delete old keys (user can do that manually).
     */
    function migrateAllLegacyData() {
        // Only migrate if we have no existing v2 data
        const existingRaw = localStorage.getItem(STORAGE_KEY);
        if (existingRaw) {
            return normalizeData(JSON.parse(existingRaw));
        }

        const data = createEmptyData();

        const legacyTasks = migrateLegacyTasks();
        if (legacyTasks && legacyTasks.tasks.length > 0) {
            data.tasks = legacyTasks.tasks;
            console.log(`HuginnData: Migrated ${data.tasks.length} tasks from legacy storage.`);
        }

        const legacyCal = migrateLegacyCalendar();
        if (legacyCal && legacyCal.events.length > 0) {
            data.events.push(...legacyCal.events);
            console.log(`HuginnData: Migrated ${legacyCal.events.length} calendar events from legacy storage.`);
        }

        const legacyTK = migrateLegacyTimekeeper();
        if (legacyTK) {
            if (legacyTK.projects.length > 0) {
                data.projects.push(...legacyTK.projects);
                console.log(`HuginnData: Migrated ${legacyTK.projects.length} projects from legacy timekeeper.`);
            }
            if (legacyTK.timekeeping.activities.length > 0) {
                data.timekeeping.activities = legacyTK.timekeeping.activities;
                console.log(`HuginnData: Migrated ${legacyTK.timekeeping.activities.length} activities from legacy timekeeper.`);
            }
        }

        // Ensure Personal Tasks project exists
        const { project: personal, newEntities } = ensurePersonalProject(data);
        if (newEntities) {
            data.projects.push(newEntities.project);
            data.events.push(newEntities.startEvent, newEntities.endEvent);
            data.tasks.push(newEntities.defaultTask);
            data.dependencies.push(...newEntities.dependencies);
        }

        // Save migrated data
        if (data.tasks.length > 0 || data.projects.length > 0 || data.events.length > 0) {
            saveToLocalStorage(data);
        }

        return data;
    }

    // --- Date Helpers ---

    function formatDateISO(dateString) {
        if (!dateString) return '';
        return dateString.split('T')[0];
    }

    function getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    // --- Lookup Helpers ---

    function findById(collection, id) {
        return collection.find(item => item.id === id);
    }

    function getTasksForProject(projectId, tasks) {
        return tasks.filter(t => t.projectId === projectId);
    }

    function getEventsForProject(projectId, events) {
        return events.filter(e => e.projectId === projectId);
    }

    function getChildProjects(parentId, projects) {
        return projects.filter(p => p.parentId === parentId);
    }

    /**
     * Get all descendant project IDs (recursive).
     */
    function getDescendantProjectIds(parentId, projects) {
        const ids = [];
        const children = getChildProjects(parentId, projects);
        children.forEach(child => {
            ids.push(child.id);
            ids.push(...getDescendantProjectIds(child.id, projects));
        });
        return ids;
    }

    // --- Public API ---
    return {
        // Constants
        VERSION,
        STORAGE_KEY,
        PERSONAL_PROJECT_NAME,
        TASK_STATUSES,
        DATE_TYPES,
        EVENT_TYPES,
        CALENDAR_EVENT_TYPES,
        DEPENDENCY_TYPES,

        // Core functions
        generateId,
        createEmptyData,

        // Normalization
        normalizeTask,
        normalizeProject,
        normalizeEvent,
        normalizeDependency,
        normalizeActivity,
        normalizeData,

        // Project helpers
        computeLayer,
        recomputeLayers,
        createProject,
        ensurePersonalProject,

        // Task helpers
        setTaskStatus,
        isRunningLate,
        getProjectPath,

        // Persistence
        saveToLocalStorage,
        loadFromLocalStorage,

        // Import / Export
        exportToJSON,
        importFromJSON,
        exportToCSV,

        // Migration
        migrateLegacyTasks,
        migrateLegacyCalendar,
        migrateLegacyTimekeeper,
        migrateAllLegacyData,

        // Date helpers
        formatDateISO,
        getTodayDateString,

        // Lookups
        findById,
        getTasksForProject,
        getEventsForProject,
        getChildProjects,
        getDescendantProjectIds
    };
})();
