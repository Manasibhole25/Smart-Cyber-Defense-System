const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { analyzePassword } = require('../services/passwordAnalyzer');

router.post('/analyze', async (req, res) => {
  const { userId, password } = req.body;
  try {
    const result = analyzePassword(password);
    await db.execute(
      'INSERT INTO password_security (user_id, strength_score, dictionary_match, brute_force_time, password_risk) VALUES (?, ?, ?, ?, ?)',
      [userId, result.strength_score, result.dictionary_match, result.brute_force_time, result.password_risk]
    );
    await db.execute(
      'INSERT INTO logs (user_id, action, severity) VALUES (?, ?, ?)',
      [userId, `Password analyzed - Risk: ${result.password_risk}`, result.password_risk > 60 ? 'HIGH' : result.password_risk > 30 ? 'MEDIUM' : 'LOW']
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;