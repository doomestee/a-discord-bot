const { createCipheriv, createDecipheriv, randomBytes, scryptSync } = require("node:crypto");

module.exports = class EncryptHandler {
    static algorithm = "aes256";
    static key = scryptSync(process.env.ENCRYPTION_KEY, process.env.ENCRYPTION_SALT, 32);
    static decrypt(text) {
        const [iv, encrypted] = text.split(":");
        const decipher = createDecipheriv(this.algorithm, this.key, Buffer.from(iv, "hex"));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]);
        return decrypted.toString();
    }

    static encrypt(text) {
        const iv = randomBytes(16);
        const cipher = createCipheriv(this.algorithm, this.key, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
    }
}