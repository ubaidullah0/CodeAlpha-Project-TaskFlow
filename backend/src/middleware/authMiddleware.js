const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, etc. }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const authorizeProjectAccess = async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;
  if (!projectId) return next();

  try {
    const accessCheck = await db.query(
      `SELECT 1 FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND (p.created_by = $2 OR pm.user_id = $2)`,
      [projectId, req.user.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    }
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Server error during authorization' });
  }
};

const authorizeTaskAccess = async (req, res, next) => {
  const taskId = req.params.taskId || req.params.id;
  if (!taskId) return next();

  try {
    const accessCheck = await db.query(
      `SELECT 1 FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE t.id = $1 AND (p.created_by = $2 OR pm.user_id = $2)`,
      [taskId, req.user.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a member of the project for this task.' });
    }
    next();
  } catch (error) {
    console.error('Authorization error for task:', error);
    res.status(500).json({ error: 'Server error during task authorization' });
  }
};

module.exports = { authenticate, authorizeProjectAccess, authorizeTaskAccess };
