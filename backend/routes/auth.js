const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashed]
    );
    res.json({ success: true, userId: result.insertId, message: 'User registered successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid password' });

    const [isolated] = await db.execute(
      `SELECT i.* FROM isolated_nodes i
       JOIN nodes n ON i.node_id = n.id
       WHERE n.user_id = ? ORDER BY i.isolated_at DESC LIMIT 1`,
      [user.id]
    );

    if (isolated.length > 0) {
      return res.status(403).json({
        success: false,
        blocked: true,
        message: '🚨 Access Denied: Your node is ISOLATED due to high threat score.'
      });
    }

    res.json({ success: true, userId: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;