import { createClient } from '@supabase/supabase-js';
import './style.css';

// =========================================
// 1. CONFIGURATION
// =========================================
const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SB_URL || !SB_KEY) {
  console.warn('[BEL Task Manager] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Auth and data features will not work until environment variables are set.');
}
const sb = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;

// =========================================
// 2. GLOBAL STATE
// =========================================
let currentUser = null;
let currentProfile = null;
let viewingUserId = null;
let activeTaskId = null;
let isSignUpMode = false;
let allUsers = [];
let targetManageUser = null;

// =========================================
// 3. SETTINGS & PROFILE MANAGEMENT
// =========================================

// Apply saved preferences on load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    if (localStorage.getItem('density') === 'compact') document.body.setAttribute('data-density', 'compact');
    wireEventListeners();
});

function wireEventListeners() {
    // Auth screen
    document.getElementById('theme-toggle-auth')?.addEventListener('click', toggleTheme);
    document.getElementById('auth-btn')?.addEventListener('click', handleAuth);
    document.getElementById('toggle-auth')?.addEventListener('click', toggleAuthMode);

    // List panel
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('create-task-btn')?.addEventListener('click', createTask);

    // Settings modal
    document.getElementById('open-settings-btn')?.addEventListener('click', openSettings);
    document.getElementById('close-settings-btn')?.addEventListener('click', closeSettings);
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
    document.getElementById('theme-toggle')?.addEventListener('change', toggleTheme);
    document.getElementById('density-toggle')?.addEventListener('change', toggleDensity);

    // User modal
    document.getElementById('close-user-modal-btn')?.addEventListener('click', closeUserModal);
    document.getElementById('save-manager-btn')?.addEventListener('click', saveManager);
    document.getElementById('promote-admin-btn')?.addEventListener('click', () => promoteUser('admin'));
    document.getElementById('promote-employee-btn')?.addEventListener('click', () => promoteUser('employee'));
    document.getElementById('delete-user-btn')?.addEventListener('click', deleteUser);
}

async function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    
    // Sync Toggles
    document.getElementById('theme-toggle').checked = document.body.getAttribute('data-theme') === 'dark';
    document.getElementById('density-toggle').checked = document.body.getAttribute('data-density') === 'compact';

    if (!sb) return;
    // Load Profile Data
    const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    if(profile) {
        document.getElementById('edit-fullname').value = profile.full_name || '';
        document.getElementById('edit-designation').value = profile.designation || '';
        document.getElementById('edit-department').value = profile.department || '';
        document.getElementById('edit-phone').value = profile.phone || '';
    }
}

function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); }

async function saveProfile() {
    if (!sb) return alert('Supabase is not configured.');
    const updates = {
        full_name: document.getElementById('edit-fullname').value,
        designation: document.getElementById('edit-designation').value,
        department: document.getElementById('edit-department').value,
        phone: document.getElementById('edit-phone').value
    };
    
    if(!updates.full_name) return alert("Full Name is required.");

    const { error } = await sb.from('profiles').update(updates).eq('id', currentUser.id);
    
    if(error) alert(error.message);
    else {
        alert("Profile Updated Successfully.");
        document.getElementById('current-user-name').innerText = updates.full_name;
        closeSettings();
        if(currentProfile.role === 'admin') loadDirectory();
    }
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (!isDark) {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        const toggle = document.getElementById('theme-toggle');
        if(toggle) toggle.checked = true;
    } else {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        const toggle = document.getElementById('theme-toggle');
        if(toggle) toggle.checked = false;
    }
}

function toggleDensity() {
    if (document.body.getAttribute('data-density') === 'compact') {
        document.body.removeAttribute('data-density');
        localStorage.setItem('density', 'normal');
    } else {
        document.body.setAttribute('data-density', 'compact');
        localStorage.setItem('density', 'compact');
    }
}

// =========================================
// 4. AUTHENTICATION
// =========================================
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('signup-fields').classList.toggle('hidden');
    document.getElementById('auth-title').innerText = isSignUpMode ? "Create Account" : "Task Command";
    document.getElementById('auth-btn').innerText = isSignUpMode ? "Sign Up" : "Access Portal";
    document.getElementById('toggle-auth').innerText = isSignUpMode ? "Already have an account? Log In" : "New Personnel? Create Account";
}

async function handleAuth() {
    if (!sb) return alert('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        if (isSignUpMode) {
            const fullName = document.getElementById('fullname').value;
            if (!fullName) return alert("Enter Full Name");
            
            const { data, error } = await sb.auth.signUp({ 
                email, password, options: { data: { full_name: fullName } } 
            });
            if (error) throw error;
            alert("Account Created! Logging in...");
            initApp(data.user);
        } else {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            initApp(data.user);
        }
    } catch (err) { alert("Auth Error: " + err.message); }
}

async function handleLogout() { if (sb) await sb.auth.signOut(); location.reload(); }

// Auto-login if session exists
if (sb) {
    sb.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) initApp(session.user);
    });
}

// =========================================
// 5. INITIALIZATION (Self-Healing)
// =========================================
async function initApp(user) {
    if (!sb) return;
    currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Self-Healing Profile Check
    let { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
    
    if (!profile) {
        console.log("Repairing missing profile...");
        const { data: newProfile } = await sb.from('profiles').insert({
            id: user.id, 
            email: user.email,
            full_name: user.user_metadata.full_name || user.email.split('@')[0],
            role: 'employee'
        }).select().single();
        profile = newProfile;
    }
    
    currentProfile = profile;
    document.getElementById('current-user-name').innerText = profile.full_name;

    // Admin Sidebar Visibility
    if (profile.role === 'admin') {
        document.getElementById('dir-sidebar').classList.remove('hidden');
        loadDirectory();
    } else {
        document.getElementById('dir-sidebar').classList.add('hidden');
    }
    loadMyTasks();
}

// =========================================
// 6. ADMIN DIRECTORY & USER MANAGEMENT
// =========================================
async function loadDirectory() {
    if (!sb) return;
    const { data: users } = await sb.from('profiles').select('*').order('full_name');
    allUsers = users || [];
    renderDirectory(allUsers);
}

function renderDirectory(users) {
    document.getElementById('user-list').innerHTML = users.map(u => {
        const warning = (!u.manager_id && u.role !== 'admin') ? '<span style="color:#f59e0b;" title="No Manager Assigned">⚠</span>' : '';
        
        return `
        <div class="dir-item" style="display:flex; justify-content:space-between; align-items:center;">
            <div onclick="viewUser('${u.id}', '${u.full_name}')" style="flex-grow:1;">
                <div style="font-weight:600;">${u.full_name} ${warning}</div>
                <div style="font-size:0.7em; opacity:0.7;">${u.role.toUpperCase()} • ${u.email}</div>
            </div>
            <button class="btn-icon" onclick="openUserModal('${u.id}')"><i class="ph ph-gear"></i></button>
        </div>`;
    }).join('');
}

function filterDirectory() {
    const term = document.getElementById('search-input').value.toLowerCase();
    renderDirectory(allUsers.filter(u => u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
}

// --- ADMIN MODAL ACTIONS ---
function openUserModal(userId) {
    targetManageUser = allUsers.find(u => u.id === userId);
    if(!targetManageUser) return;

    document.getElementById('user-modal').classList.remove('hidden');
    document.getElementById('manage-user-email').innerText = targetManageUser.email;

    const select = document.getElementById('manager-select');
    select.innerHTML = '<option value="">Select Manager...</option>';
    
    allUsers.forEach(u => {
        if((u.role === 'admin' || u.role === 'manager') && u.id !== targetManageUser.id) {
            const selected = targetManageUser.manager_id === u.id ? 'selected' : '';
            select.insertAdjacentHTML('beforeend', `<option value="${u.id}" ${selected}>${u.full_name}</option>`);
        }
    });

    const superPanel = document.getElementById('super-admin-controls');
    // Only Admin@bel.com gets the Super Admin buttons
    if(currentUser.email === 'admin@bel.com') {
        superPanel.classList.remove('hidden');
    } else {
        superPanel.classList.add('hidden');
    }
}

function closeUserModal() { document.getElementById('user-modal').classList.add('hidden'); }

async function saveManager() {
    if (!sb) return;
    const mgr = document.getElementById('manager-select').value;
    await sb.from('profiles').update({ manager_id: mgr || null }).eq('id', targetManageUser.id);
    alert("Manager Assignment Saved"); 
    closeUserModal(); 
    loadDirectory();
}

async function promoteUser(role) {
    if (!sb) return;
    if(currentUser.email !== 'admin@bel.com') return alert("Permission Denied");
    await sb.from('profiles').update({ role: role }).eq('id', targetManageUser.id);
    alert("Role Updated"); closeUserModal(); loadDirectory();
}

async function deleteUser() {
    if (!sb) return;
    if(currentUser.email !== 'admin@bel.com') return alert("Permission Denied");
    if(confirm("Permanently Delete User?")) {
        await sb.from('profiles').delete().eq('id', targetManageUser.id);
        alert("Deleted"); closeUserModal(); loadDirectory();
    }
}

// =========================================
// 7. TASK ENGINE (Robust Loading)
// =========================================
function loadMyTasks() {
    viewingUserId = currentUser.id;
    document.getElementById('list-title').innerText = "My Tasks";
    refreshList();
}

function viewUser(id, name) {
    viewingUserId = id;
    document.getElementById('list-title').innerText = `${name}'s Tasks`;
    refreshList();
}

async function createTask() {
    if (!sb) return;
    const title = document.getElementById('new-task-title').value;
    if(!title) return;
    
    await sb.from('tasks').insert({ 
        title, 
        status: 'pending', 
        assigned_to: viewingUserId, 
        created_by: currentUser.id 
    });
    document.getElementById('new-task-title').value = '';
    refreshList();
}

async function refreshList() {
    if (!sb) return;
    const list = document.getElementById('task-list');
    list.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">Loading...</div>`;

    try {
        // 1. Fetch ALL tasks allowed by RLS
        let { data: tasks, error } = await sb.from('tasks')
            .select('*')
            .order('created_at', {ascending: false});

        if (error) throw error;

        // 2. Client-Side Filter (Safest for permissions)
        if (viewingUserId === currentUser.id) {
            // Show MY tasks + Tasks I am collaborating on
            tasks = tasks.filter(t => 
                t.assigned_to === currentUser.id || 
                (t.collaborators && t.collaborators.includes(currentUser.id))
            );
        } else {
            // Admin viewing someone else -> Show only THEIR tasks
            tasks = tasks.filter(t => t.assigned_to === viewingUserId);
        }

        // 3. Render
        if (!tasks || tasks.length === 0) {
            list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted); margin-top:50px;">
                <i class="ph ph-notepad" style="font-size:3em; margin-bottom:10px; opacity:0.3;"></i>
                <div>No active operations</div>
            </div>`;
            return;
        }

        list.innerHTML = tasks.map(t => {
            const color = getStatusColor(t.status);
            const isActive = activeTaskId === t.id ? 'selected' : '';
            const isGroup = t.collaborators && t.collaborators.length > 0;
            return `
            <div class="task-item ${isActive}" onclick="selectTask(${t.id})">
                <div>
                    <span class="status-indicator" style="background:${color}; box-shadow: 0 0 5px ${color};"></span>
                    <strong style="color:var(--text-main);">${t.title}</strong>
                    ${isGroup ? '<i class="ph ph-users" style="float:right; opacity:0.5;" title="Group Task"></i>' : ''}
                </div>
                <div style="margin-top:6px; margin-left:18px;">
                    <span class="badge" style="background:${color}15; color:${color}; border:1px solid ${color}30;">${t.status}</span>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error(err);
        list.innerHTML = `<div style="padding:20px; color:red; text-align:center;">Error: ${err.message}</div>`;
    }
}

function getStatusColor(s) { 
    if(s === 'completed') return '#10b981'; 
    if(s === 'review') return '#8b5cf6'; 
    if(s === 'in-progress') return '#3b82f6'; 
    return '#f59e0b'; 
}

// =========================================
// 8. INSPECTOR PANEL (DETAILS)
// =========================================
async function selectTask(taskId) {
    if (!sb) return;
    try {
        activeTaskId = taskId;
        refreshList(); // Highlight selected
        
        const panel = document.getElementById('detail-panel');
        panel.classList.remove('empty');
        panel.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">Loading details...</div>';

        // Fetch Data
        const { data: task } = await sb.from('tasks').select('*').eq('id', taskId).single();
        const { data: subtasks } = await sb.from('subtasks').select('*').eq('task_id', taskId).order('created_at');
        const { data: logs } = await sb.from('task_logs').select('*, profiles(full_name)').eq('task_id', taskId).order('created_at', {ascending: false});

        // Collab UI
        let collabHTML = '';
        if(task.collaborators && task.collaborators.length > 0) {
             collabHTML = task.collaborators.map(() => `<div class="collab-avatar">👤</div>`).join('');
        }
        
        // Render
        panel.innerHTML = `
            <div class="detail-header">
                <div style="flex-grow:1;">
                    <h2 style="margin:0 0 10px 0; color:var(--text-main); font-size:1.5em;">${task.title}</h2>
                    <div style="display:flex; gap:8px; margin-top:15px;">
                        ${renderStatusButtons(task)}
                    </div>
                </div>
                <div style="text-align:right;">
                    <small style="color:var(--text-muted); font-weight:700;">TEAM</small>
                    <div class="collab-section">${collabHTML}<div class="add-collab-btn" onclick="addCollaborator()" title="Add person"><i class="ph ph-plus"></i></div></div>
                </div>
            </div>

            <div class="detail-body">
                <div class="section-header">Operational Checklist</div>
                <div>
                    ${(subtasks||[]).map(st => `
                        <div class="subtask-item">
                            <input type="checkbox" ${st.is_completed?'checked':''} onchange="toggleSubtask(${st.id},this.checked)">
                            <span class="${st.is_completed?'st-done':''}" style="color:var(--text-main);">${st.title}</span>
                        </div>`).join('')}
                    ${(!subtasks || subtasks.length === 0) ? '<div style="color:var(--text-muted); font-style:italic;">No checklist items yet.</div>' : ''}
                </div>
                
                <div style="display:flex; gap:8px; margin-top:15px;">
                    <input type="text" id="new-subtask" placeholder="Add checkpoint..." style="flex-grow:1;">
                    <button class="btn-primary" onclick="addSubtask()"><i class="ph ph-plus"></i></button>
                </div>

                <div class="section-header">Activity & Logs</div>
                <div>
                    ${(logs||[]).map(l => `
                        <div class="log-item">
                            <div class="log-avatar">${l.profiles.full_name.charAt(0)}</div>
                            <div class="log-content">
                                <div class="log-meta">
                                    <span>${l.profiles.full_name}</span>
                                    <span>${new Date(l.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                </div>
                                <div style="color:var(--text-main); line-height:1.4;">${l.note||''}</div>
                                ${l.file_url ? `<div style="margin-top:8px;"><a href="${l.file_url}" target="_blank" style="color:var(--accent);">📎 Attachment</a></div>` : ''}
                            </div>
                        </div>`).join('')}
                </div>
            </div>

            <div class="detail-footer">
                <textarea id="log-note" placeholder="Log an update or attach evidence..."></textarea>
                <div style="display:flex; justify-content:space-between; margin-top:12px; align-items:center;">
                    <input type="file" id="log-file" style="font-size:0.9em; color:var(--text-muted);">
                    <button class="btn-primary" onclick="postLog()">Post Log</button>
                </div>
            </div>
        `;
    } catch(err) { console.error(err); }
}

function renderStatusButtons(task) {
    if (task.status === 'pending') return `<button class="btn-primary" onclick="updateTaskStatus('in-progress')">Start</button>`;
    if (task.status === 'in-progress') return `<button class="btn-success" onclick="updateTaskStatus('review')">Review</button><button class="btn-outline" onclick="updateTaskStatus('pending')">Reset</button>`;
    if (task.status === 'review') return `<button class="btn-success" onclick="updateTaskStatus('completed')">Approve</button><button class="btn-danger" onclick="updateTaskStatus('in-progress')">Reject</button>`;
    return `<span class="badge" style="background:var(--success); color:white;">Done</span><button class="btn-outline" onclick="updateTaskStatus('in-progress')">Reopen</button>`;
}

// =========================================
// 9. ACTIONS (UPDATES & UPLOADS)
// =========================================
async function updateTaskStatus(s) { 
    if (!sb) return;
    await sb.from('tasks').update({status:s}).eq('id', activeTaskId); 
    selectTask(activeTaskId); 
}

async function addSubtask() { 
    if (!sb) return;
    const t = document.getElementById('new-subtask').value; 
    if(t) await sb.from('subtasks').insert({task_id:activeTaskId, title:t}); 
    selectTask(activeTaskId); 
}

async function toggleSubtask(id, c) { 
    if (!sb) return;
    await sb.from('subtasks').update({is_completed:c}).eq('id',id); 
}

async function postLog() {
    if (!sb) return;
    const note = document.getElementById('log-note').value;
    const fileInput = document.getElementById('log-file');
    let fileUrl = null;

    if (!note && fileInput.files.length === 0) return alert("Please enter text or file.");

    // ROBUST FILE UPLOAD
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        // Sanitize filename to prevent bucket errors
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
        
        const { error: upErr } = await sb.storage.from('attachments').upload(fileName, file);
        if (upErr) return alert("Upload Error: " + upErr.message);
        
        const { data } = sb.storage.from('attachments').getPublicUrl(fileName);
        fileUrl = data.publicUrl;
    }

    // Insert Log Record
    const { error } = await sb.from('task_logs').insert({
        task_id: activeTaskId, 
        user_id: currentUser.id, 
        note, 
        file_url: fileUrl
    });

    if(error) alert(error.message);
    else selectTask(activeTaskId);
}

// --- COLLABORATION ---
async function addCollaborator() {
    if (!sb) return;
    const email = prompt("Enter email of collaborator:");
    if(!email) return;

    // 1. Find User by Email
    const { data: users } = await sb.from('profiles').select('id').eq('email', email);
    if(!users || users.length === 0) return alert("User not found!");
    const newId = users[0].id;

    // 2. Get current list
    const { data: task } = await sb.from('tasks').select('collaborators').eq('id', activeTaskId).single();
    let current = task.collaborators || [];

    if(current.includes(newId)) return alert("User already added.");
    
    // 3. Update Database
    current.push(newId);
    const { error } = await sb.from('tasks').update({ collaborators: current }).eq('id', activeTaskId);
    
    if(error) alert(error.message);
    else {
        alert("Collaborator Added!");
        selectTask(activeTaskId);
    }
}

// Expose functions needed by inline HTML handlers
window.toggleTheme = toggleTheme;
window.toggleAuthMode = toggleAuthMode;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveProfile = saveProfile;
window.handleLogout = handleLogout;
window.viewUser = viewUser;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.saveManager = saveManager;
window.promoteUser = promoteUser;
window.deleteUser = deleteUser;
window.createTask = createTask;
window.selectTask = selectTask;
window.updateTaskStatus = updateTaskStatus;
window.addSubtask = addSubtask;
window.toggleSubtask = toggleSubtask;
window.postLog = postLog;
window.addCollaborator = addCollaborator;
window.filterDirectory = filterDirectory;
