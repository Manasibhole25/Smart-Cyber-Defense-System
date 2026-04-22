const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [patterns] = await db.execute('SELECT * FROM attack_patterns ORDER BY occurrence_count DESC');
    res.json({ success: true, patterns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;