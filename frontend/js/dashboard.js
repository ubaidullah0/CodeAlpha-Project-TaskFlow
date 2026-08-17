let socket;
let currentProjects = [];
let assignedTasks = [];
let notifications = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user'));
  if (user && document.getElementById('user-name')) {
    document.getElementById('user-name').textContent = user.name;
  }

  setupSocket();
  loadDashboardData();
  setupEventListeners();
});

async function loadDashboardData() {
  await Promise.all([
    loadProjects(),
    loadAssignedTasks(),
    loadNotifications()
  ]);
  updateStats();
}

function setupEventListeners() {
  const createForm = document.getElementById('create-project-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('project-name').value;
      const description = document.getElementById('project-desc').value;
      const btn = createForm.querySelector('button[type="submit"]');
      
      const originalText = btn.textContent;
      btn.textContent = 'Creating...';
      btn.disabled = true;

      try {
        const data = await api.post('/projects', { name, description });
        document.getElementById('create-project-modal').classList.add('hidden');
        showToast('Project created successfully!', 'success');
        setTimeout(() => window.location.href = `project.html?id=${data.id}`, 500);
      } catch (error) {
        showToast(error.message, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

    // Notification Toggle
  document.getElementById('notif-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('notif-dropdown').classList.toggle('hidden');
  });

  const editForm = document.getElementById('edit-project-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-project-id').value;
      const name = document.getElementById('edit-project-name').value;
      const description = document.getElementById('edit-project-desc').value;
      const btn = editForm.querySelector('button[type="submit"]');
      
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      try {
        await api.put(`/projects/${id}`, { name, description });
        document.getElementById('edit-project-modal').classList.add('hidden');
        showToast('Project updated successfully!', 'success');
        loadDashboardData(); // Refresh list immediately
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notif-dropdown') && !e.target.closest('#notif-btn')) {
      document.getElementById('notif-dropdown').classList.add('hidden');
    }
  });

  // Mark all read
  document.getElementById('mark-all-read').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => api.put(`/notifications/${n.id}/read`, {})));
      await loadNotifications();
      updateStats();
    } catch (err) {
      showToast('Error marking notifications as read', 'error');
    }
  });
}

function setupSocket() {
  const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://your-backend-app-name.onrender.com';
  
  socket = io(SOCKET_URL, {
    auth: { token: localStorage.getItem('token') }
  });
  
  const statusDot = document.getElementById('realtime-dot');
  const statusText = document.getElementById('realtime-text');

  socket.on('connect', () => {
    statusDot.style.backgroundColor = '#10b981';
    statusText.textContent = 'Live';
    statusText.style.color = '#10b981';
  });

  socket.on('disconnect', () => {
    statusDot.style.backgroundColor = '#ef4444';
    statusText.textContent = 'Reconnecting...';
    statusText.style.color = '#ef4444';
  });

  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    socket.on(`notification_${user.id}`, (notification) => {
      showToast(notification.message, 'info');
      loadDashboardData(); // Refresh data on notification
    });
  }
}

async function loadProjects() {
  const container = document.getElementById('projects-list');
  try {
    currentProjects = await api.get('/projects');
    
    if (currentProjects.length === 0) {
      container.innerHTML = '<p class="text-muted" style="padding: 1rem;">No projects found. Create one to get started!</p>';
      return;
    }

    container.innerHTML = '';
    const user = JSON.parse(localStorage.getItem('user'));

    currentProjects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'list-item';
      card.style.position = 'relative'; // For absolute positioning of buttons
      
      const isOwner = project.created_by === user.id;
      const taskCount = parseInt(project.task_count || 0);
      const completedCount = parseInt(project.completed_task_count || 0);
      const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; padding-right: ${isOwner ? '60px' : '0'};">
          <h3 style="margin: 0;">${escapeHtml(project.name)}</h3>
          <span class="badge" style="background: var(--bg-color); color: var(--text-color);">${progress}%</span>
        </div>
        <p class="text-muted" style="font-size: 0.875rem; margin-bottom: 1rem;">${escapeHtml(project.description || 'No description')}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
          <span>${completedCount} / ${taskCount} tasks completed</span>
          <span>Created: ${new Date(project.created_at).toLocaleDateString()}</span>
        </div>
        ${isOwner ? `
          <div style="position: absolute; top: 1rem; right: 1rem; display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-secondary edit-project-btn" style="padding: 0.25rem 0.5rem;" title="Edit Project">✏️</button>
            <button class="btn btn-sm btn-danger delete-project-btn" style="padding: 0.25rem 0.5rem;" title="Delete Project">🗑️</button>
          </div>
        ` : ''}
      `;
      
      // Card click opens project
      card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-project-btn') || e.target.closest('.edit-project-btn')) return;
        window.location.href = `project.html?id=${project.id}`;
      });

      if (isOwner) {
        const deleteBtn = card.querySelector('.delete-project-btn');
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return;
          try {
            await api.delete(`/projects/${project.id}`);
            showToast('Project deleted successfully', 'success');
            loadDashboardData();
          } catch (error) {
            showToast(error.message, 'error');
          }
        });

        const editBtn = card.querySelector('.edit-project-btn');
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.getElementById('edit-project-id').value = project.id;
          document.getElementById('edit-project-name').value = project.name;
          document.getElementById('edit-project-desc').value = project.description || '';
          document.getElementById('edit-project-modal').classList.remove('hidden');
        });
      }

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Error loading projects</div>`;
  }
}

async function loadAssignedTasks() {
  const container = document.getElementById('assigned-tasks-list');
  try {
    assignedTasks = await api.get('/tasks/assigned');
    
    if (assignedTasks.length === 0) {
      container.innerHTML = '<p class="text-muted" style="padding: 1rem;">No tasks assigned to you right now.</p>';
      return;
    }

    container.innerHTML = '';
    assignedTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'list-item';
      
      let priorityColor = 'badge-priority-medium';
      if (task.priority === 'high') priorityColor = 'badge-priority-high';
      if (task.priority === 'low') priorityColor = 'badge-priority-low';

      const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h4 style="margin: 0 0 0.25rem 0;">${escapeHtml(task.title)}</h4>
          <span class="badge ${priorityColor}">${escapeHtml(task.priority)}</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem;">
          <span>📁 Project: <strong>${escapeHtml(task.project_name)}</strong></span>
          <span>📌 Status: ${escapeHtml(task.column_name)}</span>
          <span>📅 Due: ${dueDate}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        window.location.href = `project.html?id=${task.project_id}&task=${task.id}`;
      });
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Error loading tasks</div>`;
  }
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  const feed = document.getElementById('activity-feed');
  try {
    notifications = await api.get('/notifications');
    
    // Render Dropdown
    if (notifications.length === 0) {
      list.innerHTML = '<p style="padding: 1rem; text-align: center;" class="text-muted">No notifications</p>';
      feed.innerHTML = '<p class="text-muted">No recent activity</p>';
      return;
    }

    list.innerHTML = '';
    feed.innerHTML = '';

    notifications.forEach((n, index) => {
      // Add to dropdown
      const div = document.createElement('div');
      div.className = `notif-item ${!n.is_read ? 'unread' : ''}`;
      div.innerHTML = `
        <p style="margin: 0; font-size: 0.875rem;">${escapeHtml(n.content)}</p>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(n.created_at).toLocaleString()}</span>
      `;
      div.addEventListener('click', async () => {
        if (!n.is_read) {
          await api.put(`/notifications/${n.id}/read`, {});
          loadNotifications();
        }
        if (n.related_id) {
          if (n.type.includes('task') || n.type.includes('comment')) {
            // Need to figure out project from task. Actually better to just go to dashboard or fetch.
            // For MVP, if it's task assignment, we can see if related_id exists in our assigned tasks
            const task = assignedTasks.find(t => t.id === n.related_id);
            if (task) {
               window.location.href = `project.html?id=${task.project_id}&task=${task.id}`;
            }
          } else if (n.type === 'project_invite') {
            window.location.href = `project.html?id=${n.related_id}`;
          }
        }
      });
      list.appendChild(div);

      // Add to Recent Activity feed (limit to 10)
      if (index < 10) {
        const act = document.createElement('div');
        act.className = 'activity-item';
        act.innerHTML = `
          <div class="activity-dot"></div>
          <div class="activity-content" style="flex: 1;">
            <p>${escapeHtml(n.content)}</p>
            <div class="activity-time">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        `;
        feed.appendChild(act);
      }
    });

  } catch (error) {
    list.innerHTML = '<p style="padding: 1rem; text-align: center; color: red;">Error loading</p>';
    feed.innerHTML = '<p style="color: red;">Error loading activity</p>';
  }
}

function updateStats() {
  document.getElementById('stat-projects').textContent = currentProjects.length;
  
  // Count active vs completed in assigned tasks
  const activeTasks = assignedTasks.filter(t => !t.column_name.toLowerCase().includes('done') && t.status !== 'done');
  const completedTasks = assignedTasks.length - activeTasks.length;
  
  document.getElementById('stat-assigned').textContent = activeTasks.length;
  document.getElementById('stat-completed').textContent = completedTasks;

  const unreadCount = notifications.filter(n => !n.is_read).length;
  document.getElementById('stat-alerts').textContent = unreadCount;
  
  const badge = document.getElementById('notif-badge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function escapeHtml(unsafe) {
  return (unsafe || '').toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
