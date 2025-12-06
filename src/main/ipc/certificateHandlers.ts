import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import {
  parseCertificateFile,
  parseCertificateFiles,
  requiresPassword,
} from '../services/certificateParser';
import type { ParsedCertificate } from '../../shared/types';

export interface ParseResultWithPath {
  error: string;
  fileName: string;
  filePath?: string;
}

export function registerCertificateHandlers(): void {
  // Parse a single certificate or multiple certificates
  ipcMain.handle(
    IPC_CHANNELS.CERTIFICATE_PARSE,
    async (
      _event,
      filePaths: string[]
    ): Promise<Array<ParsedCertificate | ParseResultWithPath>> => {
      // Check which files need passwords
      const filesNeedingPassword = filePaths.filter(requiresPassword);

      if (filesNeedingPassword.length > 0) {
        // Return info about which files need passwords
        // The renderer will need to prompt for passwords and call parseWithPassword
        const results: Array<ParsedCertificate | ParseResultWithPath> = [];

        for (const filePath of filePaths) {
          if (requiresPassword(filePath)) {
            const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
            results.push({
              error: 'PASSWORD_REQUIRED',
              fileName,
              filePath,
            });
          } else {
            // For non-PKCS12 files, parse immediately
            try {
              const cert = await parseCertificateFile(filePath);
              results.push(cert);
            } catch (error) {
              const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
              results.push({
                error: error instanceof Error ? error.message : 'Unknown error',
                fileName,
              });
            }
          }
        }

        return results;
      }

      // No passwords needed, parse all files
      return parseCertificateFiles(filePaths);
    }
  );

  // Parse certificates with passwords
  ipcMain.handle(
    IPC_CHANNELS.CERTIFICATE_PARSE_WITH_PASSWORD,
    async (
      _event,
      filePathsWithPasswords: Array<{ filePath: string; password?: string }>
    ): Promise<Array<ParsedCertificate | { error: string; fileName: string }>> => {
      const results: Array<ParsedCertificate | { error: string; fileName: string }> = [];

      for (const { filePath, password } of filePathsWithPasswords) {
        try {
          const cert = await parseCertificateFile(filePath, password);
          results.push(cert);
        } catch (error) {
          const fileName =
            filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
          results.push({
            error: error instanceof Error ? error.message : 'Unknown error',
            fileName,
          });
        }
      }

      return results;
    }
  );
}
