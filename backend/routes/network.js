const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { analyzeNetwork } = require('../services/networkAnalyzer');

router.post('/analyze', async (req, res) => {
  const { userId, ip_address, requests_per_minute, failed_logins, connection_degree, login_hour, current_location, previous_location, location_jump } = req.body;
  try {
    const { network_risk, anomalies } = analyzeNetwork({ requests_per_minute, failed_logins, connection_degree, login_hour, current_location, previous_location, location_jump });

    await db.execute(
      'INSERT INTO network_activity (user_id, ip_address, requests_per_minute, failed_logins, connection_degree, login_hour, current_location, previous_location, location_jump) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, ip_address, requests_per_minute, failed_logins, connection_degree, login_hour, current_location, previous_location, location_jump ? 1 : 0]
    );

    const [nodeResult] = await db.execute(
      'INSERT INTO nodes (user_id, node_label, risk_status) VALUES (?, ?, ?)',
      [userId, `Node-${userId}-${Date.now()}`, network_risk >= 70 ? 'HIGH' : network_risk >= 40 ? 'MEDIUM' : 'LOW']
    );
    const nodeId = nodeResult.insertId;

    if (anomalies.length > 0) {
      await db.execute(
        'INSERT INTO suspicious_nodes (node_id, reason, risk_score) VALUES (?, ?, ?)',
        [nodeId, anomalies.join('; '), network_risk]
      );
    }

    res.json({ success: true, network_risk, anomalies, nodeId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;