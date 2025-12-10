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
  console.log('=== SAVING CREDENTIALS ===');
  console.log('Username:', username);
  console.log('Token length:', token?.length || 0);
  console.log('Token starts with:', token?.substring(0, 5) + '...');

  const kt = await getKeytar();
  const credentials: StoredCredentials = { username, token };
  const credentialsJson = JSON.stringify(credentials);

  if (kt) {
    // Use OS keychain (preferred)
    try {
      await kt.setPassword(SERVICE_NAME, ACCOUNT_TOKEN, credentialsJson);
      console.log('✓ Credentials saved to macOS Keychain');
      return;
    } catch (error) {
      console.error('Failed to save credentials to keychain, falling back to encrypted database:', error);
    }
  }

  // Fallback: Use encrypted SQLite storage
  try {
    const encrypted = encrypt(credentialsJson);
    setSetting(FALLBACK_STORAGE_KEY, encrypted);
    console.log('✓ Credentials saved to encrypted database');
  } catch (error) {
    console.error('Failed to save credentials to encrypted database:', error);
    throw new Error('Failed to save credentials. Please check application permissions.');
  }
}

/**
 * Retrieve Confluence credentials from the OS keychain or encrypted database fallback
 */
export async function getCredentials(): Promise<StoredCredentials | null> {
  console.log('=== RETRIEVING CREDENTIALS ===');
  const kt = await getKeytar();

  if (kt) {
    // Try OS keychain first (preferred)
    try {
      const stored = await kt.getPassword(SERVICE_NAME, ACCOUNT_TOKEN);

      if (stored) {
        try {
          const creds = JSON.parse(stored) as StoredCredentials;
          console.log('✓ Retrieved from macOS Keychain');
          console.log('Username:', creds.username);
          console.log('Token length:', creds.token?.length || 0);
          console.log('Token starts with:', creds.token?.substring(0, 5) + '...');
          return creds;
        } catch {
          // If parsing fails, the stored data is corrupted - clear it
          console.error('Failed to parse stored credentials - data corrupted');
          await clearCredentials();
          return null;
        }
      } else {
        console.log('No credentials found in macOS Keychain');
      }
    } catch (error) {
      console.warn('Error reading from keychain, trying encrypted database:', error);
    }
  }

  // Fallback: Try encrypted SQLite storage
  try {
    const encrypted = getSetting(FALLBACK_STORAGE_KEY);

    if (!encrypted) {
      console.log('No credentials found in encrypted database');
      return null;
    }

    const decrypted = decrypt(encrypted);
    const creds = JSON.parse(decrypted) as StoredCredentials;
    console.log('✓ Retrieved from encrypted database');
    console.log('Username:', creds.username);
    console.log('Token length:', creds.token?.length || 0);
    console.log('Token starts with:', creds.token?.substring(0, 5) + '...');
    return creds;
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
