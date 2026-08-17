const express = require('express');
const router = express.Router();
const { authenticate, authorizeProjectAccess } = require('../middleware/authMiddleware');
const {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  getMembers,
  getColumns
} = require('../controllers/projectsController');

// Apply authentication middleware to all project routes
router.use(authenticate);

router.get('/', getProjects);
router.post('/', createProject);

// The following routes all require specific project access
router.use('/:id', authorizeProjectAccess);
router.use('/:projectId', authorizeProjectAccess);

router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Project Members
router.get('/:id/members', getMembers);
router.post('/:id/members', addMember);

const { getTasks, createTask } = require('../controllers/tasksController');

// Columns
router.get('/:id/columns', getColumns);

// Tasks (nested under projects)
router.get('/:projectId/tasks', getTasks);
router.post('/:projectId/tasks', createTask);

module.exports = router;
