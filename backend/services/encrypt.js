const crypto = require("crypto");

// This helper converts your .env key into a 32-byte Buffer regardless of its original length
const getSecureKey = () => {
  const rawKey = process.env.SECRET_KEY || "fallback-secret-key";
  return crypto.createHash("sha256").update(rawKey).digest(); //we use .update and .digest to get the simplified val so  that we can store it in db
};

const len = 16;

const encrypt = (text) => {
  const rd = crypto.randomBytes(len);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    getSecureKey(), // Use the hashed 32-byte key
    rd,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return rd.toString("hex") + ":" + encrypted.toString("hex");
};

const decrypt = (text) => {
  try {
    const textParts = text.split(":");
    const rd = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      getSecureKey(), // Use the same hashed 32-byte key
      rd,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption failed.");
    return null;
  }
};

module.exports = { encrypt, decrypt };
