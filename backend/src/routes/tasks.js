const express = require('express');
const router = express.Router();
const { authenticate, authorizeTaskAccess } = require('../middleware/authMiddleware');
const { updateTask, deleteTask, getAssignedTasks } = require('../controllers/tasksController');

router.use(authenticate);

// Get assigned tasks for current user
router.get('/assigned', getAssignedTasks);

// The following routes all require task access authorization
router.use('/:id', authorizeTaskAccess);
router.use('/:taskId', authorizeTaskAccess);

router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Comments will be nested here
const { getComments, addComment } = require('../controllers/commentsController');
router.get('/:taskId/comments', getComments);
router.post('/:taskId/comments', addComment);

module.exports = router;
