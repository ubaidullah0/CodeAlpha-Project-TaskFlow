const db = require('../config/db');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Server error updating notification' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
