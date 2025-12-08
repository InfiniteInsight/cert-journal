import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc/channels';
import type {
  ParsedCertificate,
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  AppSettings,
  TableRow,
  DuplicateCheckResult,
  ConfluenceConfig,
  PageContent,
} from '../shared/types';

// Define the API types for better TypeScript support in renderer
export interface ElectronAPI {
  certificate: {
    parse: (
      filePaths: string[]
    ) => Promise<Array<ParsedCertificate | { error: string; fileName: string }>>;
    parseWithPassword: (
      files: Array<{ filePath: string; password?: string }>
    ) => Promise<Array<ParsedCertificate | { error: string; fileName: string }>>;
  };
  confluence: {
    testConnection: (
      config: ConfluenceConfig & { token: string }
    ) => Promise<{ success: boolean; error?: string }>;
    getPage: (pageTitle: string) => Promise<PageContent | null>;
    appendToTable: (params: {
      pageTitle: string;
      rows: TableRow[];
      templateId?: number;
    }) => Promise<{ success: boolean; error?: string }>;
    checkDuplicate: (params: {
      cn: string;
      pageTitle: string;
    }) => Promise<DuplicateCheckResult>;
  };
  templates: {
    getAll: () => Promise<Template[]>;
    getById: (id: number) => Promise<Template | null>;
    create: (input: CreateTemplateInput) => Promise<Template>;
    update: (input: UpdateTemplateInput) => Promise<Template | null>;
    delete: (id: number) => Promise<boolean>;
    setDefault: (id: number) => Promise<boolean>;
  };
  settings: {
    saveCredentials: (credentials: {
      username: string;
      token: string;
    }) => Promise<void>;
    hasCredentials: () => Promise<boolean>;
    clearCredentials: () => Promise<boolean>;
    getConfig: () => Promise<AppSettings | null>;
    saveConfig: (config: AppSettings) => Promise<void>;
    getStorageMethod: () => Promise<'keychain' | 'encrypted-db' | 'unknown'>;
  };
}

// Expose the API to the renderer process
const api: ElectronAPI = {
  certificate: {
    parse: (filePaths) =>
      ipcRenderer.invoke(IPC_CHANNELS.CERTIFICATE_PARSE, filePaths),
    parseWithPassword: (files) =>
      ipcRenderer.invoke(IPC_CHANNELS.CERTIFICATE_PARSE_WITH_PASSWORD, files),
  },
  confluence: {
    testConnection: (config) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFLUENCE_TEST_CONNECTION, config),
    getPage: (pageTitle) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFLUENCE_GET_PAGE, pageTitle),
    appendToTable: (params) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFLUENCE_APPEND_TO_TABLE, params),
    checkDuplicate: (params) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFLUENCE_CHECK_DUPLICATE, params),
  },
  templates: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_GET_ALL),
    getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_GET_BY_ID, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_CREATE, input),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_UPDATE, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_DELETE, id),
    setDefault: (id) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_SET_DEFAULT, id),
  },
  settings: {
    saveCredentials: (credentials) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE_CREDENTIALS, credentials),
    hasCredentials: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_HAS_CREDENTIALS),
    clearCredentials: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_CLEAR_CREDENTIALS),
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_CONFIG),
    saveConfig: (config) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE_CONFIG, config),
    getStorageMethod: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_STORAGE_METHOD),
  },
};

contextBridge.exposeInMainWorld('api', api);

// Declare the global type for TypeScript
declare global {
  interface Window {
    api: ElectronAPI;
  }
}
