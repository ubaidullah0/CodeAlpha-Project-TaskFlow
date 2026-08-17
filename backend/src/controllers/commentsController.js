const db = require('../config/db');

const getComments = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const query = `
      SELECT c.*, u.name as user_name 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `;
    const result = await db.query(query, [taskId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error fetching comments' });
  }
};

const addComment = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await db.query(
      'INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [taskId, userId, content]
    );

    const newComment = result.rows[0];

    // Fetch user name for real-time emission
    const userResult = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
    newComment.user_name = userResult.rows[0].name;

    // Get task details to emit to correct project room and notify assigned user
    const taskResult = await db.query('SELECT project_id, assigned_to, title FROM tasks WHERE id = $1', [taskId]);
    const task = taskResult.rows[0];

    if (task) {
      if (req.io) {
        req.io.to(`project_${task.project_id}`).emit('comment_added', newComment);
      }

      // Notify task assignee if they didn't write the comment
      if (task.assigned_to && task.assigned_to !== userId) {
        await db.query(
          'INSERT INTO notifications (user_id, type, content, related_id) VALUES ($1, $2, $3, $4)',
          [task.assigned_to, 'comment_added', `New comment on task: ${task.title}`, taskId]
        );
        if (req.io) {
          req.io.emit(`notification_${task.assigned_to}`, { message: `New comment on task: ${task.title}` });
        }
      }
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error adding comment' });
  }
};

module.exports = {
  getComments,
  addComment,
};
