import { getSetting, setSetting, deleteSetting } from './database';
import { encrypt, decrypt } from './encryption';

const SERVICE_NAME = 'cert-journal';
const ACCOUNT_TOKEN = 'confluence-token';
const FALLBACK_STORAGE_KEY = '_encrypted_credentials';

// Lazy load keytar to avoid startup errors in environments where it's not available (WSL, headless)
let keytar: typeof import('keytar') | null = null;
let keytarLoadAttempted = false;
let keytarAvailable = false;

async function getKeytar(): Promise<typeof import('keytar') | null> {
  if (keytarLoadAttempted) {
    return keytar;
  }

  keytarLoadAttempted = true;

  try {
    keytar = await import('keytar');
    keytarAvailable = true;
    console.log('Keytar loaded successfully - using OS keychain for credential storage');
    return keytar;
  } catch (error) {
    console.warn('Keytar not available - using encrypted SQLite fallback (this is expected in WSL/headless environments)');
    keytarAvailable = false;
    return null;
  }
}

/**
 * Check which storage method is being used
 */
export function getStorageMethod(): 'keychain' | 'encrypted-db' | 'unknown' {
  if (!keytarLoadAttempted) {
    return 'unknown';
  }
  return keytarAvailable ? 'keychain' : 'encrypted-db';
}

export interface StoredCredentials {
  username: string;
  token: string;
}

/**
 * Save Confluence credentials to the OS keychain or encrypted database fallback
 */
export async function saveCredentials(
  username: string,
  token: string
): Promise<void> {
  const kt = await getKeytar();
  const credentials: StoredCredentials = { username, token };
  const credentialsJson = JSON.stringify(credentials);

  if (kt) {
    // Use OS keychain (preferred)
    try {
      await kt.setPassword(SERVICE_NAME, ACCOUNT_TOKEN, credentialsJson);
      return;
    } catch (error) {
      console.error('Failed to save credentials to keychain, falling back to encrypted database:', error);
    }
  }

  // Fallback: Use encrypted SQLite storage
  try {
    const encrypted = encrypt(credentialsJson);
    setSetting(FALLBACK_STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save credentials to encrypted database:', error);
    throw new Error('Failed to save credentials. Please check application permissions.');
  }
}

/**
 * Retrieve Confluence credentials from the OS keychain or encrypted database fallback
 */
export async function getCredentials(): Promise<StoredCredentials | null> {
  const kt = await getKeytar();

  if (kt) {
    // Try OS keychain first (preferred)
    try {
      const stored = await kt.getPassword(SERVICE_NAME, ACCOUNT_TOKEN);

      if (stored) {
        try {
          return JSON.parse(stored) as StoredCredentials;
        } catch {
          // If parsing fails, the stored data is corrupted - clear it
          await clearCredentials();
          return null;
        }
      }
    } catch (error) {
      console.warn('Error reading from keychain, trying encrypted database:', error);
    }
  }

  // Fallback: Try encrypted SQLite storage
  try {
    const encrypted = getSetting(FALLBACK_STORAGE_KEY);

    if (!encrypted) {
      return null;
    }

    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted) as StoredCredentials;
  } catch (error) {
    console.warn('Error reading from encrypted database:', error);
    return null;
  }
}

/**
 * Check if credentials exist in the keychain or encrypted database
 */
export async function hasCredentials(): Promise<boolean> {
  const kt = await getKeytar();

  if (kt) {
    // Check OS keychain first (preferred)
    try {
      const stored = await kt.getPassword(SERVICE_NAME, ACCOUNT_TOKEN);
      if (stored !== null) {
        return true;
      }
    } catch (error) {
      console.warn('Error checking keychain:', error);
    }
  }

  // Fallback: Check encrypted SQLite storage
  const encrypted = getSetting(FALLBACK_STORAGE_KEY);
  return encrypted !== null;
}

/**
 * Clear credentials from the OS keychain and encrypted database
 */
export async function clearCredentials(): Promise<boolean> {
  const kt = await getKeytar();
  let keychainCleared = false;
  let dbCleared = false;

  if (kt) {
    // Clear from OS keychain
    try {
      keychainCleared = await kt.deletePassword(SERVICE_NAME, ACCOUNT_TOKEN);
    } catch (error) {
      console.warn('Error clearing keychain:', error);
    }
  }

  // Clear from encrypted SQLite storage
  try {
    dbCleared = deleteSetting(FALLBACK_STORAGE_KEY);
  } catch (error) {
    console.warn('Error clearing encrypted database:', error);
  }

  return keychainCleared || dbCleared;
}
