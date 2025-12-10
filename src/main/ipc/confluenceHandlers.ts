import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import { ConfluenceClient } from '../services/confluenceClient';
import { getFullConfig } from './settingsHandlers';
import { recordSubmission } from '../services/database';
import { getCredentials } from '../services/credentialStore';
import type { TableRow, DuplicateCheckResult, ConfluenceConfig } from '../../shared/types';

// Cache the client to avoid recreating it for every request
let cachedClient: ConfluenceClient | null = null;
let cachedConfigHash: string | null = null;

async function getClient(): Promise<ConfluenceClient> {
  const fullConfig = await getFullConfig();

  if (!fullConfig) {
    throw new Error('Confluence not configured. Please set up your connection in Settings.');
  }

  // Create a simple hash of the config to detect changes
  const configHash = JSON.stringify(fullConfig.config) + fullConfig.credentials.username;

  if (cachedClient && cachedConfigHash === configHash) {
    return cachedClient;
  }

  cachedClient = new ConfluenceClient(
    {
      baseUrl: fullConfig.config.confluenceBaseUrl,
      type: fullConfig.config.confluenceType,
      spaceKey: fullConfig.config.confluenceSpaceKey,
      username: fullConfig.config.confluenceUsername,
    },
    fullConfig.credentials
  );
  cachedConfigHash = configHash;

  return cachedClient;
}

// Clear cached client when config changes
export function clearClientCache(): void {
  cachedClient = null;
  cachedConfigHash = null;
}

export function registerConfluenceHandlers(): void {
  // Test connection with provided config (for settings page)
  ipcMain.handle(
    IPC_CHANNELS.CONFLUENCE_TEST_CONNECTION,
    async (
      _event,
      config: ConfluenceConfig & { token: string }
    ): Promise<{ success: boolean; error?: string }> => {
      console.log('=== MAIN PROCESS: Test connection handler called ===');
      console.log('Config received:', {
        baseUrl: config.baseUrl,
        type: config.type,
        spaceKey: config.spaceKey,
        username: config.username,
        hasToken: !!config.token,
      });

      try {
        let tokenToUse = config.token;

        // If no token provided in config, try to get stored credentials
        if (!tokenToUse) {
          console.log('No token provided, attempting to retrieve stored credentials...');
          const credentials = await getCredentials();
          if (credentials) {
            tokenToUse = credentials.token;
            console.log('Using stored credentials');
          } else {
            console.log('No stored credentials found');
            return {
              success: false,
              error: 'No token provided and no stored credentials found',
            };
          }
        }

        const client = new ConfluenceClient(
          {
            baseUrl: config.baseUrl,
            type: config.type,
            spaceKey: config.spaceKey,
            username: config.username,
          },
          { username: config.username, token: tokenToUse }
        );

        console.log('Testing connection...');
        const result = await client.testConnection();
        console.log('Test connection result:', result);
        return result;
      } catch (error) {
        console.error('Test connection error in handler:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Get a page by title
  ipcMain.handle(
    IPC_CHANNELS.CONFLUENCE_GET_PAGE,
    async (_event, pageTitle: string) => {
      const client = await getClient();
      return await client.getPageByTitle(pageTitle);
    }
  );

  // Append rows to a table on a page
  ipcMain.handle(
    IPC_CHANNELS.CONFLUENCE_APPEND_TO_TABLE,
    async (
      _event,
      {
        pageTitle,
        rows,
        templateId,
      }: { pageTitle: string; rows: TableRow[]; templateId?: number }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const client = await getClient();

        if (rows.length === 1) {
          await client.appendToTable(pageTitle, rows[0]);
        } else {
          await client.appendMultipleToTable(pageTitle, rows);
        }

        // Record submissions in history
        for (const row of rows) {
          recordSubmission(row.cn, pageTitle, templateId);
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Check for duplicate CN on a page
  ipcMain.handle(
    IPC_CHANNELS.CONFLUENCE_CHECK_DUPLICATE,
    async (
      _event,
      { cn, pageTitle }: { cn: string; pageTitle: string }
    ): Promise<DuplicateCheckResult> => {
      try {
        const client = await getClient();
        return await client.checkForDuplicateCN(cn, pageTitle);
      } catch (error) {
        // If we can't check, assume no duplicate to not block the user
        console.error('Error checking for duplicate CN:', error);
        return { isDuplicate: false };
      }
    }
  );
}
