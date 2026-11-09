function validatePassword(password, policy) {
  if (typeof password !== "string" || password.length < policy.pwMinLength) {
    return `Password minimal terdiri dari ${policy.pwMinLength} karakter`;
  }
  if (policy.pwRequireLetterNumber && (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
    return "Password harus mengandung huruf dan angka";
  }
  if (policy.pwRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return "Password harus mengandung karakter khusus";
  }
  return null;
}

function defaultPolicy() {
  return { maxFailedAttempts: 5, lockoutMinutes: 15, pwMinLength: 8, pwRequireLetterNumber: true, pwRequireSpecial: false };
}

function validatePolicy(input) {
  const policy = {
    maxFailedAttempts: Number(input.maxFailedAttempts),
    lockoutMinutes: Number(input.lockoutMinutes),
    pwMinLength: Number(input.pwMinLength),
    pwRequireLetterNumber: Boolean(input.pwRequireLetterNumber),
    pwRequireSpecial: Boolean(input.pwRequireSpecial),
  };
  if (!Number.isInteger(policy.maxFailedAttempts) || policy.maxFailedAttempts < 3 || policy.maxFailedAttempts > 10) return "Maksimal percobaan harus 3-10";
  if (!Number.isInteger(policy.lockoutMinutes) || policy.lockoutMinutes < 1 || policy.lockoutMinutes > 1440) return "Durasi kunci harus 1-1440 menit";
  if (!Number.isInteger(policy.pwMinLength) || policy.pwMinLength < 8 || policy.pwMinLength > 64) return "Panjang minimum password harus 8-64 karakter";
  return policy;
}

module.exports = { validatePassword, defaultPolicy, validatePolicy };
