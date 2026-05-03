const crypto = require("crypto");

// This helper converts your .env key into a 32-byte Buffer regardless of its original length
const getSecureKey = () => {
  const rawKey = process.env.SECRET_KEY || "fallback-secret-key";
  return crypto.createHash("sha256").update(rawKey).digest();
};

const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    getSecureKey(), // Use the hashed 32-byte key
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

const decrypt = (text) => {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      getSecureKey(), // Use the same hashed 32-byte key
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption failed. Ensure your SECRET_KEY is correct.");
    return null;
  }
};

module.exports = { encrypt, decrypt };
