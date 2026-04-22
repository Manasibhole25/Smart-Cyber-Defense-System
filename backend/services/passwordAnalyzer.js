const DICTIONARY = ['password', '123456', 'admin', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'sunshine', 'abc123', 'iloveyou'];

function analyzePassword(password) {
  let score = 0;
  const length = password.length;

  if (length >= 8) score += 10;
  if (length >= 12) score += 15;
  if (length >= 16) score += 15;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  if (length > 20) score += 10;

  const dictionaryMatch = DICTIONARY.some(word => password.toLowerCase().includes(word));
  if (dictionaryMatch) score = Math.max(0, score - 30);

  const charsetSize = getCharsetSize(password);
  const combinations = Math.pow(charsetSize, length);
  const guessesPerSecond = 1e10;
  const seconds = combinations / guessesPerSecond;
  const bruteForceTime = formatTime(seconds);

  const passwordRisk = Math.max(0, 100 - score);

  return {
    strength_score: Math.min(score, 100),
    dictionary_match: dictionaryMatch,
    brute_force_time: bruteForceTime,
    password_risk: passwordRisk
  };
}

function getCharsetSize(password) {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^A-Za-z0-9]/.test(password)) size += 32;
  return size || 26;
}

function formatTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 3.154e9) return `${Math.round(seconds / 31536000)} years`;
  return 'Centuries';
}

module.exports = { analyzePassword };