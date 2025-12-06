import keytar from 'keytar';

const SERVICE_NAME = 'cert-journal';
const ACCOUNT_TOKEN = 'confluence-token';

export interface StoredCredentials {
  username: string;
  token: string;
}

/**
 * Save Confluence credentials to the OS keychain
 */
export async function saveCredentials(
  username: string,
  token: string
): Promise<void> {
  // Store credentials as JSON to keep username and token together
  const credentials: StoredCredentials = { username, token };
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_TOKEN, JSON.stringify(credentials));
}

/**
 * Retrieve Confluence credentials from the OS keychain
 */
export async function getCredentials(): Promise<StoredCredentials | null> {
  const stored = await keytar.getPassword(SERVICE_NAME, ACCOUNT_TOKEN);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredCredentials;
  } catch {
    // If parsing fails, the stored data is corrupted - clear it
    await clearCredentials();
    return null;
  }
}

/**
 * Check if credentials exist in the keychain
 */
export async function hasCredentials(): Promise<boolean> {
  const stored = await keytar.getPassword(SERVICE_NAME, ACCOUNT_TOKEN);
  return stored !== null;
}

/**
 * Clear credentials from the OS keychain
 */
export async function clearCredentials(): Promise<boolean> {
  return await keytar.deletePassword(SERVICE_NAME, ACCOUNT_TOKEN);
}
