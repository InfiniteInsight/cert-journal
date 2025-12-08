import crypto from 'crypto';
import os from 'os';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Generate a machine-specific encryption key
 * This uses hostname and other machine info to create a unique key
 */
function getMachineKey(): Buffer {
  const machineInfo = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.homedir(),
  ].join('|');

  // Create a deterministic key from machine info
  return crypto.pbkdf2Sync(
    machineInfo,
    'cert-journal-salt-v1',
    100000,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt sensitive data
 */
export function encrypt(plaintext: string): string {
  const key = getMachineKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  const result = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]).toString('base64');

  return result;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  const key = getMachineKey();
  const buffer = Buffer.from(encryptedData, 'base64');

  // Extract IV, authTag, and encrypted data
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
