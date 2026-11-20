import * as crypto from 'crypto';

/**
 * AES-256-GCM Encryption / Decryption Utility for sensitive data at rest (e.g. Bank Account Numbers).
 */
export class EncryptionUtil {
  private static getKey(secret?: string): Buffer {
    const rawKey = secret || process.env.ENCRYPTION_KEY || 'marvels-basket-aes256-default-key-32b!';
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   * Output format: `${ivHex}:${authTagHex}:${encryptedHex}`
   */
  static encrypt(plaintext: string, secret?: string): string {
    if (!plaintext) return '';
    const key = this.getKey(secret);
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext formatted as `${ivHex}:${authTagHex}:${encryptedHex}`.
   */
  static decrypt(ciphertext: string, secret?: string): string {
    if (!ciphertext) return '';
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = this.getKey(secret);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Masks a bank account number for display (e.g., `••••••••1234`).
   */
  static maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return '';
    const clean = accountNumber.replace(/\s+/g, '');
    if (clean.length <= 4) {
      return '••••'.slice(0, clean.length);
    }
    const last4 = clean.slice(-4);
    const maskedPrefix = '•'.repeat(Math.max(4, clean.length - 4));
    return `${maskedPrefix}${last4}`;
  }
}
