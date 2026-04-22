const API = 'http://localhost:3000/api';

Chart.defaults.color = '#5a8aaa';
Chart.defaults.borderColor = 'rgba(0,200,255,0.08)';
Chart.defaults.font.family = "'Share Tech Mono', monospace";

async function loadDashboard() {
  try {
    const r = await fetch(`${API}/dashboard/stats`);
    const d = await r.json();

    // Stats
    document.getElementById('st-users').textContent = d.stats.total_users;
    document.getElementById('st-isolated').textContent = d.stats.isolated_count;
    document.getElementById('st-threat').textContent = d.stats.avg_threat;
    document.getElementById('st-attacks').textContent = d.stats.attack_count;

    // Trend Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: d.threatTrend.map(t => t.date),
        datasets: [{
          label: 'Avg Threat Score',
          data: d.threatTrend.map(t => Math.round(t.avg_score)),
          borderColor: '#00c8ff',
          backgroundColor: 'rgba(0,200,255,0.05)',
          borderWidth: 2,
          pointBackgroundColor: '#00c8ff',
          pointRadius: 4,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(0,200,255,0.05)' }, ticks: { font: { size: 10 } } },
          y: { min: 0, max: 100, grid: { color: 'rgba(0,200,255,0.05)' }, ticks: { font: { size: 10 } } }
        }
      }
    });

    // Risk Distribution Chart
    const safe = d.recentUsers.filter(u => u.status === 'SAFE').length;
    const susp = d.recentUsers.filter(u => u.status === 'SUSPICIOUS').length;
    const isol = d.recentUsers.filter(u => u.status === 'ISOLATED').length;
    const other = d.recentUsers.length - safe - susp - isol;
    const riskCtx = document.getElementById('riskChart').getContext('2d');
    new Chart(riskCtx, {
      type: 'doughnut',
      data: {
        labels: ['SAFE', 'SUSPICIOUS', 'ISOLATED', 'UNSCANNED'],
        datasets: [{
          data: [safe, susp, isol, other],
          backgroundColor: ['rgba(0,255,136,0.7)', 'rgba(255,102,0,0.7)', 'rgba(255,34,68,0.7)', 'rgba(90,138,170,0.3)'],
          borderColor: ['#00ff88','#ff6600','#ff2244','#2a4a5a'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { font: { size: 10 }, padding: 12 } } },
        cutout: '65%'
      }
    });

    // Users table
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = d.recentUsers.length ? d.recentUsers.map(u => {
      const sc = u.total_threat_score ?? '—';
      const cls = u.status === 'ISOLATED' ? 'badge-isolated' : u.status === 'SUSPICIOUS' ? 'badge-suspicious' : u.status === 'SAFE' ? 'badge-safe' : '';
      return `<tr>
        <td>${u.email}</td>
        <td style="color:${threatColor(u.total_threat_score)}">${sc}</td>
        <td>${u.password_risk ?? '—'}</td>
        <td>${u.network_risk ?? '—'}</td>
        <td>${u.status ? `<span class="badge ${cls}">${u.status}</span>` : '—'}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:2rem;">No threat data yet</td></tr>';

    // Suspicious nodes
    const snList = document.getElementById('suspicious-list');
    snList.innerHTML = d.suspiciousNodes.length ? d.suspiciousNodes.map(n => `
      <div class="anomaly-item">
        <div class="anomaly-dot"></div>
        <div>
          <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-primary);">${n.node_label}</div>
          <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px;">${n.email} — Risk: ${n.risk_score}</div>
          <div style="font-size:0.65rem;color:var(--neon-red);margin-top:2px;">${n.reason}</div>
        </div>
      </div>
    `).join('') : '<div style="color:var(--text-dim);font-family:var(--font-mono);font-size:0.75rem;text-align:center;padding:2rem;">No suspicious nodes</div>';

    // Attack patterns
    const ptList = document.getElementById('patterns-list');
    ptList.innerHTML = d.attackPatterns.length ? d.attackPatterns.map((p, i) => `
      <div class="metric-row">
        <div>
          <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--neon-cyan);">${p.pattern}</div>
          <div style="font-size:0.6rem;color:var(--text-dim);margin-top:2px;">Last seen: ${new Date(p.last_seen).toLocaleString()}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-display);font-size:1.2rem;color:var(--neon-red);">${p.occurrence_count}</div>
          <div style="font-size:0.55rem;color:var(--text-dim);">OCCURRENCES</div>
        </div>
      </div>
    `).join('') : '<div style="color:var(--text-dim);font-family:var(--font-mono);font-size:0.75rem;text-align:center;padding:2rem;">No patterns learned yet</div>';

    // Logs
    const logsList = document.getElementById('logs-list');
    logsList.innerHTML = d.logs.length ? d.logs.map(l => `
      <div class="log-entry">
        <span class="log-sev ${l.severity}">${l.severity}</span>
        <span class="log-action">${l.action} <span style="color:var(--text-secondary);">(${l.email})</span></span>
        <span class="log-time">${new Date(l.created_at).toLocaleTimeString()}</span>
      </div>
    `).join('') : '<div style="color:var(--text-dim);font-family:var(--font-mono);font-size:0.75rem;text-align:center;padding:2rem;">No logs yet</div>';

  } catch(e) {
    console.error('Dashboard error:', e);
  }
}

function threatColor(score) {
  if (!score) return 'var(--text-secondary)';
  return score >= 70 ? 'var(--neon-red)' : score >= 40 ? 'var(--neon-orange)' : 'var(--neon-green)';
}

loadDashboard();
setInterval(loadDashboard, 30000); // auto-refresh every 30s