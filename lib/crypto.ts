import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Helper to get key buffer
function getKey() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }
    // Should be 32 bytes (64 hex chars)
    return Buffer.from(keyHex, 'hex');
}

export function encrypt(text: string): string {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = getKey();
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        console.error('Encryption failed:', e);
        throw e;
    }
}

export function decrypt(text: string): string {
    if (!text) return text;

    // Fallback: If text doesn't look like iv:content (hex), assume it's legacy plain text
    // Simple check: Hex string with a colon in the middle
    const parts = text.split(':');
    if (parts.length !== 2) return text;

    try {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');
        const key = getKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        // If decryption fails (e.g. key mismatch or not actually encrypted), return original
        // preventing startup crashes for legacy data
        console.warn('Decryption failed, returning valid text fallback:', e);
        return text;
    }
}
