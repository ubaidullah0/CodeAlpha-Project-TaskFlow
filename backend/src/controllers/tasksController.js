const db = require('../config/db');

// Get all tasks for a project
const getTasks = async (req, res) => {
  try {
    const projectId = req.params.projectId; // Wait, route will be /api/projects/:id/tasks or /api/tasks?
    // According to spec: GET /api/projects/:id/tasks
    const query = `
      SELECT t.*, u.name as assigned_to_name, u2.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.project_id = $1
      ORDER BY t.position ASC
    `;
    const result = await db.query(query, [projectId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error fetching tasks' });
  }
};

// Get assigned tasks for current user
const getAssignedTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT t.*, p.name as project_name, c.name as column_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN columns c ON t.column_id = c.id
      WHERE t.assigned_to = $1
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get assigned tasks error:', error);
    res.status(500).json({ error: 'Server error fetching assigned tasks' });
  }
};

// Create a new task
const createTask = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const { column_id, title, description, priority, due_date, assigned_to } = req.body;

    if (!title || !column_id) {
      return res.status(400).json({ error: 'Title and column are required' });
    }

    // Get max position for column to append at bottom
    const posResult = await db.query('SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM tasks WHERE column_id = $1', [column_id]);
    const position = posResult.rows[0].next_pos;

    const result = await db.query(
      `INSERT INTO tasks (project_id, column_id, title, description, priority, assigned_to, created_by, due_date, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [projectId, column_id, title, description, priority || 'medium', assigned_to, userId, due_date, position]
    );

    const newTask = result.rows[0];

    // Notification for assignee
    if (assigned_to && assigned_to !== userId) {
      await db.query(
        'INSERT INTO notifications (user_id, type, content, related_id) VALUES ($1, $2, $3, $4)',
        [assigned_to, 'task_assigned', `You have been assigned to task: ${title}`, newTask.id]
      );
      if (req.io) {
        req.io.emit(`notification_${assigned_to}`, { message: `You have been assigned to task: ${title}` });
      }
    }

    if (req.io) {
      req.io.to(`project_${projectId}`).emit('task_created', newTask);
    }

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error creating task' });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, priority, column_id, status, assigned_to, due_date, position } = req.body;

    // Get old task to check if we need to emit socket event or notifications
    const oldTaskResult = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (oldTaskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const oldTask = oldTaskResult.rows[0];

    const result = await db.query(
      `UPDATE tasks SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        priority = COALESCE($3, priority),
        column_id = COALESCE($4, column_id),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        due_date = COALESCE($7, due_date),
        position = COALESCE($8, position),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [title, description, priority, column_id, status, assigned_to, due_date, position, taskId]
    );

    const updatedTask = result.rows[0];

    // Emit socket event
    if (req.io) {
      req.io.to(`project_${updatedTask.project_id}`).emit('task_updated', updatedTask);
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error updating task' });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // Need project_id for socket emission
    const taskResult = await db.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const projectId = taskResult.rows[0].project_id;

    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    if (req.io) {
      req.io.to(`project_${projectId}`).emit('task_deleted', taskId);
    }

    res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error deleting task' });
  }
};

module.exports = {
  getAssignedTasks,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
