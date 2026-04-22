const API = 'http://localhost:3000/api';
let currentUserId = null;
let currentPasswordRisk = null;
let currentNetworkRisk = null;
let currentNodeId = null;

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['register','login'][i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
}

function hideAlert(id) {
  document.getElementById(id).className = 'alert';
}

function setStep(n) {
  for (let i = 1; i <= 5; i++) {
    const s = document.getElementById('step' + i);
    s.classList.remove('active', 'done');
    if (i < n) s.classList.add('done');
    else if (i === n) s.classList.add('active');
  }
}

function previewStrength(pwd) {
  if (!pwd) {
    document.getElementById('previewBar').style.width = '0%';
    document.getElementById('previewLabel').textContent = 'Awaiting input...';
    document.getElementById('previewScore').textContent = '';
    return;
  }
  let s = 0;
  if (pwd.length >= 8) s += 10; if (pwd.length >= 12) s += 15; if (pwd.length >= 16) s += 15;
  if (/[A-Z]/.test(pwd)) s += 10; if (/[a-z]/.test(pwd)) s += 10;
  if (/[0-9]/.test(pwd)) s += 10; if (/[^A-Za-z0-9]/.test(pwd)) s += 20;
  if (pwd.length > 20) s += 10;
  s = Math.min(s, 100);
  const bar = document.getElementById('previewBar');
  bar.style.width = s + '%';
  const color = s >= 70 ? 'var(--neon-green)' : s >= 40 ? 'var(--neon-orange)' : 'var(--neon-red)';
  bar.style.background = color;
  const labels = ['CRITICAL', 'WEAK', 'MODERATE', 'STRONG', 'EXCELLENT'];
  const idx = Math.floor(s / 20);
  document.getElementById('previewLabel').textContent = labels[Math.min(idx, 4)];
  document.getElementById('previewLabel').style.color = color;
  document.getElementById('previewScore').textContent = s + '/100';
}

async function registerUser() {
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!email || !password) return showAlert('reg-alert', 'Email and password are required.', 'warning');
  hideAlert('reg-alert');
  const sp = document.getElementById('reg-spinner');
  sp.classList.add('show');

  try {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!d.success) return showAlert('reg-alert', d.message, 'danger');
    currentUserId = d.userId;
    showAlert('reg-alert', `✓ User registered (ID: ${d.userId}). Running password analysis...`, 'success');
    setStep(2);
    await analyzePassword(password);
  } catch(e) {
    showAlert('reg-alert', 'Connection failed: ' + e.message, 'danger');
  } finally { sp.classList.remove('show'); }
}

async function analyzePassword(password) {
  try {
    const r = await fetch(`${API}/password/analyze`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ userId: currentUserId, password })
    });
    const d = await r.json();
    if (!d.success) return;
    currentPasswordRisk = d.password_risk;
    const color = d.strength_score >= 70 ? 'var(--neon-green)' : d.strength_score >= 40 ? 'var(--neon-orange)' : 'var(--neon-red)';
    document.getElementById('pwd-result').innerHTML = `
      <div class="strength-bar-wrapper">
        <div class="strength-bar-track">
          <div class="strength-bar-fill" style="width:${d.strength_score}%;background:${color};"></div>
        </div>
        <div class="strength-label">
          <span style="color:${color};">STRENGTH: ${d.strength_score}/100</span>
          <span>RISK: ${d.password_risk}/100</span>
        </div>
      </div>
      <div class="metric-row"><span class="metric-key">DICTIONARY MATCH</span>
        <span class="badge ${d.dictionary_match ? 'badge-high' : 'badge-low'}">${d.dictionary_match ? '⚠ DETECTED' : '✓ CLEAN'}</span></div>
      <div class="metric-row"><span class="metric-key">BRUTE FORCE TIME</span><span class="metric-val">${d.brute_force_time}</span></div>
      <div class="metric-row"><span class="metric-key">PASSWORD RISK SCORE</span><span class="metric-val" style="color:${d.password_risk>60?'var(--neon-red)':d.password_risk>30?'var(--neon-orange)':'var(--neon-green)'};">${d.password_risk}/100</span></div>
    `;
    document.getElementById('network-section').style.display = 'grid';
    setStep(3);
  } catch(e) { console.error(e); }
}

async function analyzeNetwork() {
  const sp = document.getElementById('net-spinner');
  sp.classList.add('show');
  const payload = {
    userId: currentUserId,
    ip_address: document.getElementById('ip').value,
    requests_per_minute: parseInt(document.getElementById('rpm').value),
    failed_logins: parseInt(document.getElementById('failed').value),
    connection_degree: parseInt(document.getElementById('conn').value),
    login_hour: parseInt(document.getElementById('hour').value),
    location_jump: document.getElementById('locjump').value === 'true',
    current_location: document.getElementById('curloc').value,
    previous_location: document.getElementById('prevloc').value
  };
  try {
    const r = await fetch(`${API}/network/analyze`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    if (!d.success) return;
    currentNetworkRisk = d.network_risk;
    currentNodeId = d.nodeId;
    const color = d.network_risk >= 70 ? 'var(--neon-red)' : d.network_risk >= 40 ? 'var(--neon-orange)' : 'var(--neon-green)';
    document.getElementById('net-result').innerHTML = `
      <div class="metric-row"><span class="metric-key">NETWORK RISK SCORE</span>
        <span class="metric-val" style="color:${color};">${d.network_risk}/100</span></div>
      <div class="metric-row"><span class="metric-key">ANOMALIES DETECTED</span>
        <span class="metric-val">${d.anomalies.length}</span></div>
      <div style="margin-top:1rem;">
        ${d.anomalies.length > 0 ? d.anomalies.map(a => `<div class="anomaly-item"><div class="anomaly-dot"></div><span>${a}</span></div>`).join('') : '<div style="color:var(--neon-green);font-family:var(--font-mono);font-size:0.75rem;">✓ No anomalies detected</div>'}
      </div>
    `;
    setStep(4);
    await runFusion();
  } catch(e) { console.error(e); }
  finally { sp.classList.remove('show'); }
}

async function runFusion() {
  try {
    const r = await fetch(`${API}/fusion/evaluate`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        userId: currentUserId,
        passwordRisk: currentPasswordRisk,
        networkRisk: currentNetworkRisk,
        nodeId: currentNodeId
      })
    });
    const d = await r.json();
    if (!d.success) return;

    document.getElementById('fusion-section').style.display = 'block';

    // Ring animation
    const score = d.total_threat_score;
    const circ = 351.86;
    const offset = circ - (score / 100) * circ;
    const ringColor = score >= 70 ? 'var(--neon-red)' : score >= 40 ? 'var(--neon-orange)' : 'var(--neon-green)';
    const fill = document.getElementById('ringFill');
    fill.style.stroke = ringColor;
    setTimeout(() => { fill.style.strokeDashoffset = offset; }, 100);
    document.getElementById('ringNum').textContent = score;
    document.getElementById('ringNum').style.color = ringColor;

    const statusClass = d.status === 'ISOLATED' ? 'badge-isolated' : d.status === 'SUSPICIOUS' ? 'badge-suspicious' : 'badge-safe';
    document.getElementById('fusionBadge').innerHTML = `<div class="badge ${statusClass}" style="margin-top:0.5rem;">${d.status}</div>`;

    document.getElementById('fusion-result').innerHTML = `
      <div class="metric-row"><span class="metric-key">PASSWORD RISK (40%)</span><span class="metric-val">${currentPasswordRisk}/100</span></div>
      <div class="metric-row"><span class="metric-key">NETWORK RISK (60%)</span><span class="metric-val">${currentNetworkRisk}/100</span></div>
      <div class="metric-row"><span class="metric-key">FUSION SCORE</span><span class="metric-val" style="color:${ringColor};font-size:1.1rem;">${score}/100</span></div>
      <div class="metric-row"><span class="metric-key">DECISION</span><span class="badge ${statusClass}">${d.status}</span></div>
    `;

    const terminal = document.getElementById('fusionTerminal');
    const lines = [
      `Fusion engine initialized...`,
      `Password risk weight: 0.4 × ${currentPasswordRisk} = ${(currentPasswordRisk * 0.4).toFixed(1)}`,
      `Network risk weight: 0.6 × ${currentNetworkRisk} = ${(currentNetworkRisk * 0.6).toFixed(1)}`,
      `Total threat score: ${score}/100`,
      d.status === 'ISOLATED' ? `⚠ THRESHOLD EXCEEDED — NODE ISOLATION TRIGGERED` :
      d.status === 'SUSPICIOUS' ? `⚡ SUSPICIOUS ACTIVITY — MONITORING ELEVATED` :
      `✓ THREAT WITHIN ACCEPTABLE RANGE — ACCESS GRANTED`
    ];
    terminal.innerHTML = '';
    lines.forEach((l, i) => {
      setTimeout(() => {
        terminal.innerHTML += `<div class="line">${l}</div>`;
        terminal.scrollTop = terminal.scrollHeight;
      }, i * 300);
    });

    setStep(5);
  } catch(e) { console.error(e); }
}

async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAlert('login-alert', 'Both fields required.', 'warning');
  const sp = document.getElementById('login-spinner');
  sp.classList.add('show');
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (d.blocked) return showAlert('login-alert', d.message, 'danger');
    if (!d.success) return showAlert('login-alert', d.message, 'danger');
    showAlert('login-alert', `✓ Authentication successful. Welcome, ${d.email}`, 'success');
  } catch(e) {
    showAlert('login-alert', 'Connection error: ' + e.message, 'danger');
  } finally { sp.classList.remove('show'); }
}