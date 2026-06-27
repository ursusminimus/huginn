/**
 * Huginn Online Data Layer
 * ------------------------------------------------------------------
 * Replaces the localStorage persistence of the offline huginn_data.js
 * with a Supabase (Postgres + Auth + RLS) backend.
 *
 * Exposes the global `HuginnOnline` object: auth helpers, async CRUD for
 * tasks/projects, and the handful of pure helpers the Tasks UI needs.
 *
 * Requires the Supabase JS client (UMD global `supabase`) loaded first:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */
const HuginnOnline = (() => {
    'use strict';

    // --- Config -----------------------------------------------------------
    // The publishable key is the new-style PUBLIC client key — safe to ship
    // in frontend code. Never put the secret / service_role key here.
    const SUPABASE_URL = 'https://xiuraewulrofvlcyrlgt.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M0H8V1XC0HIinMxzOuz6cw_rkTe8puD';

    const PERSONAL_PROJECT_NAME = 'Personal Tasks';
    const TASK_STATUSES = ['new', 'started', 'done', 'stopped'];
    const DATE_TYPES = ['flexible', 'fixed', 'target'];

    // Columns we send on insert/update — keeps us from accidentally pushing
    // derived UI fields. id/user_id/createdAt are managed by the DB.
    const TASK_COLUMNS = [
        'text', 'description', 'status', 'startedAt', 'finishedAt', 'projectId',
        'effort', 'order', 'nextActionDate', 'deadline', 'estimatedDurationDays',
        'startDate', 'startDateType', 'endDate', 'endDateType',
        'scheduledStart', 'scheduledEnd'
    ];

    let client = null;
    let currentUserId = null;

    // --- Init -------------------------------------------------------------
    function init() {
        if (client) return client;
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            throw new Error('Supabase JS client not loaded. Include @supabase/supabase-js before this file.');
        }
        client = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        return client;
    }

    // --- Auth -------------------------------------------------------------
    async function getSession() {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        currentUserId = data.session ? data.session.user.id : null;
        return data.session;
    }

    async function signIn(email, password) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUserId = data.user ? data.user.id : null;
        return data;
    }

    async function signUp(email, password) {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        // currentUserId only set once a session exists (depends on email-confirm setting)
        if (data.session) currentUserId = data.user.id;
        return data;
    }

    async function signOut() {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        currentUserId = null;
    }

    function onAuthChange(cb) {
        client.auth.onAuthStateChange((_event, session) => {
            currentUserId = session ? session.user.id : null;
            cb(session);
        });
    }

    // --- Data: load -------------------------------------------------------
    // RLS already scopes rows to the current user; we don't filter manually.
    async function loadAll() {
        const [tasksRes, projectsRes] = await Promise.all([
            client.from('tasks').select('*'),
            client.from('projects').select('*')
        ]);
        if (tasksRes.error) throw tasksRes.error;
        if (projectsRes.error) throw projectsRes.error;
        return { tasks: tasksRes.data || [], projects: projectsRes.data || [] };
    }

    // --- Data: tasks ------------------------------------------------------
    function pickTaskColumns(fields) {
        const out = {};
        for (const col of TASK_COLUMNS) {
            if (col in fields) out[col] = fields[col];
        }
        return out;
    }

    async function createTask(fields) {
        if (!currentUserId) throw new Error('Not signed in.');
        const row = { ...pickTaskColumns(fields), user_id: currentUserId };
        const { data, error } = await client.from('tasks').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async function updateTask(id, fields) {
        const { data, error } = await client
            .from('tasks')
            .update(pickTaskColumns(fields))
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // Apply the same update payload to many tasks (bulk edit / recalc order).
    async function updateTasksEach(updates) {
        // updates: [{ id, fields }] — run in parallel, return updated rows
        const results = await Promise.all(updates.map(u => updateTask(u.id, u.fields)));
        return results;
    }

    // Bulk insert (used by JSON import). Rows get user_id stamped; DB assigns UUIDs.
    async function createTasks(fieldsList) {
        if (!currentUserId) throw new Error('Not signed in.');
        const rows = fieldsList.map(f => ({ ...pickTaskColumns(f), user_id: currentUserId }));
        const { data, error } = await client.from('tasks').insert(rows).select();
        if (error) throw error;
        return data || [];
    }

    // --- Data: projects ---------------------------------------------------
    async function createProject(name, parentId) {
        if (!currentUserId) throw new Error('Not signed in.');
        const row = { name, parentId: parentId || null, user_id: currentUserId };
        const { data, error } = await client.from('projects').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    // --- Status transitions (mirrors offline setTaskStatus) ---------------
    // Returns the changed fields to persist, after mutating `task` in place.
    function applyStatus(task, newStatus) {
        const now = new Date().toISOString();
        task.status = newStatus;
        if (newStatus === 'started' && !task.startedAt) {
            task.startedAt = now;
        } else if (newStatus === 'done') {
            task.finishedAt = now;
            if (!task.startedAt) task.startedAt = now;
        } else if (newStatus === 'new') {
            task.startedAt = null;
            task.finishedAt = null;
        } else if (newStatus === 'stopped') {
            task.finishedAt = now;
        }
        return { status: task.status, startedAt: task.startedAt, finishedAt: task.finishedAt };
    }

    // --- Pure helpers (no DB) ---------------------------------------------
    function getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    function formatDateISO(dateString) {
        if (!dateString) return '';
        return String(dateString).split('T')[0];
    }

    function isRunningLate(task) {
        if (task.status !== 'started' || !task.startedAt) return false;
        const expectedEnd = new Date(task.startedAt);
        expectedEnd.setDate(expectedEnd.getDate() + (task.estimatedDurationDays || 1));
        return new Date() > expectedEnd;
    }

    function getProjectPath(projectId, projects) {
        const parts = [];
        let current = projects.find(p => p.id === projectId);
        while (current) {
            parts.unshift(current.name);
            current = current.parentId ? projects.find(p => p.id === current.parentId) : null;
            if (parts.length > 20) break;
        }
        return parts.join(' › ');
    }

    // --- Public API -------------------------------------------------------
    return {
        // constants
        PERSONAL_PROJECT_NAME, TASK_STATUSES, DATE_TYPES,
        // lifecycle
        init,
        // auth
        getSession, signIn, signUp, signOut, onAuthChange,
        get userId() { return currentUserId; },
        // data
        loadAll, createTask, updateTask, updateTasksEach, createTasks, createProject,
        // logic
        applyStatus,
        // helpers
        getTodayDateString, formatDateISO, isRunningLate, getProjectPath
    };
})();
