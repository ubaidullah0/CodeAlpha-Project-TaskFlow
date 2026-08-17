const db = require('../config/db');

// Get all projects for the authenticated user
const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    // User gets projects they created or are a member of
    const query = `
      SELECT p.id, p.name, p.description, p.created_at, p.created_by,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t JOIN columns c ON t.column_id = c.id WHERE t.project_id = p.id AND (c.name ILIKE '%done%' OR t.status = 'done')) as completed_task_count
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.created_by = $1 OR pm.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
};

// Create a new project
const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    await db.query('BEGIN');

    // Create project
    const projectResult = await db.query(
      'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, description, userId]
    );
    const project = projectResult.rows[0];

    // Add creator as project owner in members
    await db.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, userId, 'owner']
    );

    // Create default columns
    const defaultColumns = ['To Do', 'In Progress', 'Review', 'Done'];
    for (let i = 0; i < defaultColumns.length; i++) {
      await db.query(
        'INSERT INTO columns (project_id, name, position) VALUES ($1, $2, $3)',
        [project.id, defaultColumns[i], i]
      );
    }

    await db.query('COMMIT');

    res.status(201).json(project);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error creating project' });
  }
};

// Get a single project
const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    // Check access
    const accessCheck = await db.query(
      `SELECT 1 FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND (p.created_by = $2 OR pm.user_id = $2)`,
      [projectId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get project by id error:', error);
    res.status(500).json({ error: 'Server error fetching project' });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const { name, description } = req.body;

    // Verify owner
    const projectCheck = await db.query('SELECT created_by FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (projectCheck.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only project owner can update' });
    }

    const result = await db.query(
      'UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, projectId]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error updating project' });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    // Verify owner
    const projectCheck = await db.query('SELECT created_by FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (projectCheck.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only project owner can delete' });
    }

    await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error deleting project' });
  }
};

// Add Member
const addMember = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id; // The one making request
    const { email, role } = req.body;

    // Verify owner/admin
    const projectCheck = await db.query('SELECT created_by FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0 || projectCheck.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only project owner can add members' });
    }

    // Find user to add
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User with this email not found' });
    }
    const newMemberId = userResult.rows[0].id;

    // Check if already member
    const memberCheck = await db.query('SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, newMemberId]);
    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    await db.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [projectId, newMemberId, role || 'member']
    );

    // Also send a notification
    await db.query(
      'INSERT INTO notifications (user_id, type, content, related_id) VALUES ($1, $2, $3, $4)',
      [newMemberId, 'project_invite', `You have been added to a new project`, projectId]
    );
    
    // Broadcast notification if online
    if (req.io) {
      req.io.emit(`notification_${newMemberId}`, { message: 'You have been added to a new project' });
    }

    res.status(200).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error adding member' });
  }
};

// Get members
const getMembers = async (req, res) => {
  try {
    const projectId = req.params.id;
    const query = `
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `;
    const result = await db.query(query, [projectId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Server error fetching members' });
  }
};

// Get columns for a project
const getColumns = async (req, res) => {
  try {
    const projectId = req.params.id;
    const query = 'SELECT * FROM columns WHERE project_id = $1 ORDER BY position ASC';
    const result = await db.query(query, [projectId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({ error: 'Server error fetching columns' });
  }
};

module.exports = {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  getMembers,
  getColumns,
};
