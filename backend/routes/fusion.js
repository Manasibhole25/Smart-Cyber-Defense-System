const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { calculateFusionScore } = require('../services/fusionEngine');

router.post('/evaluate', async (req, res) => {
  const { userId, passwordRisk, networkRisk, nodeId } = req.body;
  try {
    const { total_threat_score, status } = calculateFusionScore(passwordRisk, networkRisk);

    await db.execute(
      'INSERT INTO fusion_scores (user_id, password_risk, network_risk, total_threat_score) VALUES (?, ?, ?, ?)',
      [userId, passwordRisk, networkRisk, total_threat_score]
    );

    await db.execute(
      'INSERT INTO decisions (user_id, threat_score, status) VALUES (?, ?, ?)',
      [userId, total_threat_score, status]
    );

    if (status === 'ISOLATED') {
      await db.execute(
        'INSERT INTO isolated_nodes (node_id, reason) VALUES (?, ?)',
        [nodeId, `Threat score ${total_threat_score} exceeded isolation threshold of 70`]
      );
      await db.execute(
        'INSERT INTO logs (user_id, action, severity) VALUES (?, ?, ?)',
        [userId, `Node ISOLATED - Threat Score: ${total_threat_score}`, 'CRITICAL']
      );

      const patternKey = `PWD:${passwordRisk > 60 ? 'HIGH' : 'LOW'}_NET:${networkRisk > 60 ? 'HIGH' : 'LOW'}`;
      const [existing] = await db.execute('SELECT id FROM attack_patterns WHERE pattern = ?', [patternKey]);
      if (existing.length > 0) {
        await db.execute('UPDATE attack_patterns SET occurrence_count = occurrence_count + 1, last_seen = NOW() WHERE pattern = ?', [patternKey]);
      } else {
        await db.execute('INSERT INTO attack_patterns (pattern, occurrence_count) VALUES (?, 1)', [patternKey]);
      }
    }

    res.json({ success: true, total_threat_score, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;