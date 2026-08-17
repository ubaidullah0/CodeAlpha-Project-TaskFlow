const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getNotifications, markAsRead } = require('../controllers/notificationsController');

router.use(authenticate);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

module.exports = router;
