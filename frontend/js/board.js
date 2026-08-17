let currentProjectId = null;
let currentColumns = [];
let currentMembers = [];
let currentTasks = [];
let socket = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = JSON.parse(localStorage.getItem('user'));
  if (currentUser && document.getElementById('user-name')) {
    document.getElementById('user-name').textContent = currentUser.name;
  }

  const urlParams = new URLSearchParams(window.location.search);
  currentProjectId = urlParams.get('id');

  if (!currentProjectId) {
    window.location.href = 'dashboard.html';
    return;
  }

  await loadProjectDetails();
  await loadMembers();
  await loadColumns();
  await loadTasks();
  
  const taskParam = urlParams.get('task');
  if (taskParam) {
    const taskToOpen = currentTasks.find(t => t.id === taskParam);
    if (taskToOpen) {
      openTaskModal(taskToOpen);
      // Clean up URL so refresh doesn't reopen it unnecessarily
      window.history.replaceState({}, document.title, `project.html?id=${currentProjectId}`);
    }
  }
  
  setupSocket();
  setupEventListeners();
  loadNotifications();
});

async function loadProjectDetails() {
  try {
    const project = await api.get(`/projects/${currentProjectId}`);
    document.getElementById('project-title').textContent = project.name;
    document.getElementById('project-desc').textContent = project.description || '';
  } catch (error) {
    showToast('Error loading project details', 'error');
    window.location.href = 'dashboard.html';
  }
}

async function loadMembers() {
  try {
    currentMembers = await api.get(`/projects/${currentProjectId}/members`);
    const list = document.getElementById('team-members-list');
    list.innerHTML = '';
    const assigneeSelect = document.getElementById('task-assignee');
    assigneeSelect.innerHTML = '<option value="">Unassigned</option>';

    currentMembers.forEach(m => {
      const li = document.createElement('li');
      li.textContent = `${m.name} (${m.role})`;
      list.appendChild(li);

      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      assigneeSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading members', error);
  }
}

async function loadColumns() {
  try {
    currentColumns = await api.get(`/projects/${currentProjectId}/columns`);
    const container = document.getElementById('board-container');
    container.innerHTML = '';
    
    const columnSelect = document.getElementById('task-column-select');
    columnSelect.innerHTML = '';

    currentColumns.forEach(col => {
      // Setup UI column
      const colDiv = document.createElement('div');
      colDiv.className = 'board-column';
      colDiv.dataset.id = col.id;
      colDiv.innerHTML = `
        <div class="column-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${escapeHtml(col.name)}</span>
            <span id="col-count-${col.id}" class="badge" style="background: #e5e7eb; color: #4b5563; font-size: 0.75rem;">0</span>
          </div>
        </div>
        <div class="task-list" id="col-${col.id}"></div>
      `;
      container.appendChild(colDiv);

      // Setup drag and drop for task list
      const taskList = colDiv.querySelector('.task-list');
      taskList.addEventListener('dragover', e => {
        e.preventDefault();
        taskList.style.background = 'rgba(0,0,0,0.05)';
      });
      taskList.addEventListener('dragleave', e => {
        taskList.style.background = 'transparent';
      });
      taskList.addEventListener('drop', async e => {
        e.preventDefault();
        taskList.style.background = 'transparent';
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          await moveTask(taskId, col.id);
        }
      });

      // Setup select options
      const option = document.createElement('option');
      option.value = col.id;
      option.textContent = col.name;
      columnSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading columns', error);
  }
}

async function loadTasks() {
  try {
    currentTasks = await api.get(`/projects/${currentProjectId}/tasks`);
    renderTasks();
  } catch (error) {
    console.error('Error loading tasks', error);
  }
}

function renderTasks() {
  // Clear columns and reset counts
  currentColumns.forEach(col => {
    const list = document.getElementById(`col-${col.id}`);
    if (list) list.innerHTML = '';
    
    const countBadge = document.getElementById(`col-count-${col.id}`);
    if (countBadge) {
      const count = currentTasks.filter(t => t.column_id === col.id).length;
      countBadge.textContent = count;
    }
  });

  currentTasks.forEach(task => {
    const list = document.getElementById(`col-${task.column_id}`);
    if (!list) return;

    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.id = task.id;
    
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', task.id);
    });

    card.addEventListener('click', () => openTaskModal(task));

    let priorityColor = task.priority === 'high' ? 'badge-priority-high' : 
                        task.priority === 'low' ? 'badge-priority-low' : 'badge-priority-medium';

    card.innerHTML = `
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <span class="badge ${priorityColor}">${task.priority}</span>
        ${task.assigned_to_name ? `<span style="font-size: 0.75rem; color: var(--text-muted);">👤 ${escapeHtml(task.assigned_to_name.split(' ')[0])}</span>` : ''}
      </div>
    `;
    list.appendChild(card);
  });
}

// Socket.io Setup
function setupSocket() {
  const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://codealpha-project-taskflow.onrender.com';
  
  socket = io(SOCKET_URL, {
    auth: {
      token: localStorage.getItem('token')
    }
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('join_project', currentProjectId);
    
    const statusDot = document.getElementById('realtime-dot');
    const statusText = document.getElementById('realtime-text');
    if (statusDot && statusText) {
      statusDot.style.backgroundColor = '#10b981';
      statusText.textContent = 'Live';
      statusText.style.color = '#10b981';
    }
  });

  socket.on('disconnect', () => {
    const statusDot = document.getElementById('realtime-dot');
    const statusText = document.getElementById('realtime-text');
    if (statusDot && statusText) {
      statusDot.style.backgroundColor = '#ef4444';
      statusText.textContent = 'Reconnecting...';
      statusText.style.color = '#ef4444';
    }
  });

  socket.on('task_created', task => {
    // Need to fetch assignee name manually or reload all tasks. Let's just reload tasks for simplicity in this MVP.
    loadTasks();
  });

  socket.on('task_updated', task => {
    loadTasks();
  });

  socket.on('task_deleted', taskId => {
    currentTasks = currentTasks.filter(t => t.id !== taskId);
    renderTasks();
  });

  socket.on(`notification_${currentUser.id}`, (notification) => {
    showToast(notification.message || notification.content, 'info');
    loadNotifications();
  });

  socket.on('comment_added', comment => {
    if (document.getElementById('task-modal').classList.contains('hidden') === false) {
      const currentTaskId = document.getElementById('task-id').value;
      if (currentTaskId === comment.task_id) {
        appendComment(comment);
      }
    }
  });
}

// Task Actions
async function moveTask(taskId, newColumnId) {
  try {
    // Optimistic UI update
    const taskIndex = currentTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
      currentTasks[taskIndex].column_id = newColumnId;
      renderTasks();
    }
    
    await api.put(`/tasks/${taskId}`, { column_id: newColumnId });
  } catch (error) {
    console.error('Error moving task', error);
    loadTasks(); // revert
  }
}

function openCreateTaskModal() {
  document.getElementById('task-modal-title').textContent = 'Create Task';
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('delete-task-btn').classList.add('hidden');
  document.getElementById('comments-section').classList.add('hidden');
  document.getElementById('task-modal').classList.remove('hidden');
}

async function openTaskModal(task) {
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-desc-input').value = task.description || '';
  document.getElementById('task-column-select').value = task.column_id;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-assignee').value = task.assigned_to || '';
  
  document.getElementById('delete-task-btn').classList.remove('hidden');
  document.getElementById('comments-section').classList.remove('hidden');
  document.getElementById('task-modal').classList.remove('hidden');

  loadComments(task.id);
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
}

async function saveTask(e) {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const payload = {
    title: document.getElementById('task-title-input').value,
    description: document.getElementById('task-desc-input').value,
    column_id: document.getElementById('task-column-select').value,
    priority: document.getElementById('task-priority').value,
    assigned_to: document.getElementById('task-assignee').value || null
  };

  try {
    if (id) {
      await api.put(`/tasks/${id}`, payload);
    } else {
      await api.post(`/projects/${currentProjectId}/tasks`, payload);
    }
    closeTaskModal();
    loadTasks();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteTask() {
  const id = document.getElementById('task-id').value;
  if (!id || !confirm('Are you sure you want to delete this task?')) return;

  try {
    await api.delete(`/tasks/${id}`);
    closeTaskModal();
    loadTasks();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Comments
async function loadComments(taskId) {
  try {
    const comments = await api.get(`/tasks/${taskId}/comments`);
    const list = document.getElementById('comments-list');
    list.innerHTML = '';
    comments.forEach(appendComment);
  } catch (error) {
    console.error('Error loading comments', error);
  }
}

function appendComment(comment) {
  const list = document.getElementById('comments-list');
  const div = document.createElement('div');
  div.style.background = '#f3f4f6';
  div.style.padding = '0.75rem';
  div.style.borderRadius = 'var(--radius)';
  div.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
      <strong style="font-size: 0.875rem;">${escapeHtml(comment.user_name)}</strong>
      <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(comment.created_at).toLocaleString()}</span>
    </div>
    <div style="font-size: 0.875rem;">${escapeHtml(comment.content)}</div>
  `;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

// Event Listeners
function setupEventListeners() {
  document.getElementById('task-form').addEventListener('submit', saveTask);
  
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('notif-dropdown').classList.toggle('hidden');
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notif-dropdown') && !e.target.closest('#notif-btn')) {
        document.getElementById('notif-dropdown').classList.add('hidden');
      }
    });
    
    document.getElementById('mark-all-read').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const notifs = await api.get('/notifications');
        const unread = notifs.filter(n => !n.is_read);
        await Promise.all(unread.map(n => api.put(`/notifications/${n.id}/read`, {})));
        await loadNotifications();
      } catch (err) {
        showToast('Error marking notifications as read', 'error');
      }
    });
  }

  document.getElementById('add-member-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('member-email').value;
    try {
      await api.post(`/projects/${currentProjectId}/members`, { email, role: 'member' });
      document.getElementById('add-member-modal').classList.add('hidden');
      document.getElementById('member-email').value = '';
      loadMembers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  document.getElementById('add-comment-form').addEventListener('submit', async e => {
    e.preventDefault();
    const content = document.getElementById('comment-input').value;
    const taskId = document.getElementById('task-id').value;
    if (!content || !taskId) return;

    try {
      await api.post(`/tasks/${taskId}/comments`, { content });
      document.getElementById('comment-input').value = '';
      // Event will be caught by socket
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

// Notification
async function loadNotifications() {
  const list = document.getElementById('notif-list');
  try {
    const notifs = await api.get('/notifications');
    const unread = notifs.filter(n => !n.is_read).length;
    
    const countBadge = document.getElementById('notif-badge');
    if (unread > 0) {
      countBadge.textContent = unread;
      countBadge.classList.remove('hidden');
    } else {
      countBadge.classList.add('hidden');
    }

    if (notifs.length === 0) {
      list.innerHTML = '<p style="padding: 1rem; text-align: center;" class="text-muted">No notifications</p>';
      return;
    }

    list.innerHTML = '';
    notifs.forEach(n => {
      const div = document.createElement('div');
      div.className = `notif-item ${!n.is_read ? 'unread' : ''}`;
      // Basic inline styling to match dashboard dropdown items if needed, or rely on style.css (added earlier)
      div.style.padding = '1rem';
      div.style.borderBottom = '1px solid var(--border-color)';
      div.style.cursor = 'pointer';
      if (!n.is_read) div.style.backgroundColor = '#eff6ff';

      div.innerHTML = `
        <p style="margin: 0; font-size: 0.875rem;">${escapeHtml(n.content)}</p>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(n.created_at).toLocaleString()}</span>
      `;
      div.addEventListener('click', async () => {
        if (!n.is_read) {
          await api.put(`/notifications/${n.id}/read`, {});
          loadNotifications();
        }
      });
      list.appendChild(div);
    });
  } catch (error) {
    list.innerHTML = '<p style="padding: 1rem; text-align: center; color: red;">Error loading</p>';
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
