function calculateFusionScore(passwordRisk, networkRisk) {
  const total = Math.round((passwordRisk * 0.4) + (networkRisk * 0.6));
  let status = 'SAFE';
  if (total >= 70) status = 'ISOLATED';
  else if (total >= 40) status = 'SUSPICIOUS';
  return { total_threat_score: Math.min(total, 100), status };
}

module.exports = { calculateFusionScore };