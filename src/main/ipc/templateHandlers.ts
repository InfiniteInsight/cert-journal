import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc/channels';
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate,
} from '../services/database';
import type { Template, CreateTemplateInput, UpdateTemplateInput } from '../../shared/types';

export function registerTemplateHandlers(): void {
  // Get all templates
  ipcMain.handle(IPC_CHANNELS.TEMPLATE_GET_ALL, async (): Promise<Template[]> => {
    return getAllTemplates();
  });

  // Get template by ID
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_GET_BY_ID,
    async (_event, id: number): Promise<Template | null> => {
      return getTemplateById(id);
    }
  );

  // Create a new template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_CREATE,
    async (_event, input: CreateTemplateInput): Promise<Template> => {
      return createTemplate(input);
    }
  );

  // Update an existing template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_UPDATE,
    async (_event, input: UpdateTemplateInput): Promise<Template | null> => {
      return updateTemplate(input);
    }
  );

  // Delete a template
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_DELETE,
    async (_event, id: number): Promise<boolean> => {
      return deleteTemplate(id);
    }
  );

  // Set a template as default
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_SET_DEFAULT,
    async (_event, id: number): Promise<boolean> => {
      return setDefaultTemplate(id);
    }
  );
}
