const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/stats', async (req, res) => {
  try {
    const [[{ total_users }]] = await db.execute('SELECT COUNT(*) as total_users FROM users');
    const [[{ isolated_count }]] = await db.execute('SELECT COUNT(*) as isolated_count FROM isolated_nodes');
    const [[{ avg_threat }]] = await db.execute('SELECT AVG(total_threat_score) as avg_threat FROM fusion_scores');
    const [[{ attack_count }]] = await db.execute('SELECT SUM(occurrence_count) as attack_count FROM attack_patterns');

    const [recentUsers] = await db.execute(`
      SELECT u.id, u.email, f.total_threat_score, f.password_risk, f.network_risk, d.status
      FROM users u
      LEFT JOIN fusion_scores f ON u.id = f.user_id
      LEFT JOIN decisions d ON u.id = d.user_id
      ORDER BY f.created_at DESC LIMIT 10
    `);

    const [suspiciousNodes] = await db.execute(`
      SELECT sn.*, n.node_label, n.risk_status, u.email
      FROM suspicious_nodes sn
      JOIN nodes n ON sn.node_id = n.id
      JOIN users u ON n.user_id = u.id
      ORDER BY sn.detected_at DESC LIMIT 10
    `);

    const [attackPatterns] = await db.execute('SELECT * FROM attack_patterns ORDER BY occurrence_count DESC LIMIT 5');
    const [logs] = await db.execute('SELECT l.*, u.email FROM logs l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 15');
    const [threatTrend] = await db.execute(`
      SELECT DATE(created_at) as date, AVG(total_threat_score) as avg_score
      FROM fusion_scores GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7
    `);

    res.json({
      stats: { total_users, isolated_count, avg_threat: Math.round(avg_threat || 0), attack_count: attack_count || 0 },
      recentUsers, suspiciousNodes, attackPatterns, logs,
      threatTrend: threatTrend.reverse()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;