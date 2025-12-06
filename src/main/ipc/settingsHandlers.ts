import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
  hasCredentials,
} from '../services/credentialStore';
import { getSetting, setSetting } from '../services/database';
import type { AppSettings, ConfluenceType } from '../../shared/types';

export function registerSettingsHandlers(): void {
  // Save credentials to keychain
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE_CREDENTIALS,
    async (
      _event,
      { username, token }: { username: string; token: string }
    ): Promise<void> => {
      await saveCredentials(username, token);
    }
  );

  // Check if credentials exist
  ipcMain.handle(IPC_CHANNELS.SETTINGS_HAS_CREDENTIALS, async (): Promise<boolean> => {
    return await hasCredentials();
  });

  // Clear credentials from keychain
  ipcMain.handle(IPC_CHANNELS.SETTINGS_CLEAR_CREDENTIALS, async (): Promise<boolean> => {
    return await clearCredentials();
  });

  // Get app configuration (non-sensitive settings from database)
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET_CONFIG,
    async (): Promise<AppSettings | null> => {
      const baseUrl = getSetting('confluence_base_url');
      const type = getSetting('confluence_type') as ConfluenceType | null;
      const spaceKey = getSetting('confluence_space_key');
      const username = getSetting('confluence_username');

      if (!baseUrl || !type || !spaceKey || !username) {
        return null;
      }

      return {
        confluenceBaseUrl: baseUrl,
        confluenceType: type,
        confluenceSpaceKey: spaceKey,
        confluenceUsername: username,
      };
    }
  );

  // Save app configuration (non-sensitive settings to database)
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE_CONFIG,
    async (_event, config: AppSettings): Promise<void> => {
      setSetting('confluence_base_url', config.confluenceBaseUrl);
      setSetting('confluence_type', config.confluenceType);
      setSetting('confluence_space_key', config.confluenceSpaceKey);
      setSetting('confluence_username', config.confluenceUsername);
    }
  );
}

// Helper to get full config with credentials for creating Confluence client
export async function getFullConfig(): Promise<{
  config: AppSettings;
  credentials: { username: string; token: string };
} | null> {
  const baseUrl = getSetting('confluence_base_url');
  const type = getSetting('confluence_type') as ConfluenceType | null;
  const spaceKey = getSetting('confluence_space_key');
  const username = getSetting('confluence_username');

  if (!baseUrl || !type || !spaceKey || !username) {
    return null;
  }

  const credentials = await getCredentials();
  if (!credentials) {
    return null;
  }

  return {
    config: {
      confluenceBaseUrl: baseUrl,
      confluenceType: type,
      confluenceSpaceKey: spaceKey,
      confluenceUsername: username,
    },
    credentials,
  };
}
