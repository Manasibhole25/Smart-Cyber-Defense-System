function analyzeNetwork(activity) {
  let riskScore = 0;
  const anomalies = [];

  if (activity.failed_logins >= 5) {
    riskScore += 30;
    anomalies.push('High failed login count');
  } else if (activity.failed_logins >= 3) {
    riskScore += 15;
    anomalies.push('Moderate failed logins');
  }

  if (activity.requests_per_minute >= 100) {
    riskScore += 25;
    anomalies.push('High request rate - possible DDoS');
  } else if (activity.requests_per_minute >= 50) {
    riskScore += 10;
    anomalies.push('Elevated request rate');
  }

  if (activity.location_jump) {
    riskScore += 30;
    anomalies.push(`Location jump: ${activity.previous_location} → ${activity.current_location}`);
  }

  if (activity.login_hour >= 0 && activity.login_hour <= 5) {
    riskScore += 10;
    anomalies.push('Unusual login hour (midnight-5AM)');
  }

  if (activity.connection_degree >= 15) {
    riskScore += 5;
    anomalies.push('High connection degree');
  }

  return {
    network_risk: Math.min(riskScore, 100),
    anomalies
  };
}

module.exports = { analyzeNetwork };