const crypto = require("crypto");
const UAParser = require("ua-parser-js");

function encryptionKey() {
  const value = process.env.APP_ENCRYPTION_KEY;
  if (!value) throw new Error("APP_ENCRYPTION_KEY belum dikonfigurasi");
  return crypto.createHash("sha256").update(value).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptSecret(value) {
  const [ivText, tagText, encryptedText] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64")), decipher.final()]).toString("utf8");
}

function base32Encode(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) output += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  return output;
}

function base32Decode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of value.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function totpCode(secret, counter) {
  const key = base32Decode(secret);
  const data = Buffer.alloc(8);
  data.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(data).digest();
  const offset = digest[digest.length - 1] & 15;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(number).padStart(6, "0");
}

function verifyTotp(secret, token, window = 1) {
  if (!/^\d{6}$/.test(String(token))) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  return Array.from({ length: window * 2 + 1 }, (_, index) => counter + index - window).some((candidate) => crypto.timingSafeEqual(Buffer.from(totpCode(secret, candidate)), Buffer.from(String(token))));
}

function generateRecoveryCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

function hashRecoveryCode(code) {
  return crypto.createHash("sha256").update(code.replace(/[-\s]/g, "").toUpperCase()).digest("hex");
}

function deviceLabel(userAgent = "") {
  const parsed = new UAParser(userAgent).getResult();
  const browser = parsed.browser.name || "Tidak diketahui";
  const browserVersion = parsed.browser.version ? ` ${parsed.browser.version}` : "";
  const os = parsed.os.name || "Tidak diketahui";
  const osVersion = parsed.os.version ? ` ${parsed.os.version}` : "";
  let device = "Perangkat tidak diketahui";
  if (parsed.device.type === "mobile") device = parsed.os.name === "iOS" ? "iPhone" : "Android Phone";
  else if (parsed.device.type === "tablet") device = "Tablet";
  else if (parsed.os.name === "Windows") device = "Windows PC";
  else if (parsed.os.name === "macOS") device = "Mac";
  else if (parsed.os.name) device = parsed.os.name;
  return { device, browser: `${browser}${browserVersion}`, os: `${os}${osVersion}` };
}

module.exports = { encryptSecret, decryptSecret, generateTotpSecret, totpCode, verifyTotp, generateRecoveryCode, hashRecoveryCode, deviceLabel };
