// IPC Channel names - keeping them centralized for type safety

export const IPC_CHANNELS = {
  // Certificate operations
  CERTIFICATE_PARSE: 'certificate:parse',
  CERTIFICATE_PARSE_WITH_PASSWORD: 'certificate:parseWithPassword',

  // Confluence operations
  CONFLUENCE_TEST_CONNECTION: 'confluence:testConnection',
  CONFLUENCE_GET_PAGE: 'confluence:getPage',
  CONFLUENCE_APPEND_TO_TABLE: 'confluence:appendToTable',
  CONFLUENCE_CHECK_DUPLICATE: 'confluence:checkDuplicate',

  // Template operations
  TEMPLATE_GET_ALL: 'templates:getAll',
  TEMPLATE_GET_BY_ID: 'templates:getById',
  TEMPLATE_CREATE: 'templates:create',
  TEMPLATE_UPDATE: 'templates:update',
  TEMPLATE_DELETE: 'templates:delete',
  TEMPLATE_SET_DEFAULT: 'templates:setDefault',

  // Settings operations
  SETTINGS_SAVE_CREDENTIALS: 'settings:saveCredentials',
  SETTINGS_GET_CONFIG: 'settings:getConfig',
  SETTINGS_SAVE_CONFIG: 'settings:saveConfig',
  SETTINGS_CLEAR_CREDENTIALS: 'settings:clearCredentials',
  SETTINGS_HAS_CREDENTIALS: 'settings:hasCredentials',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
