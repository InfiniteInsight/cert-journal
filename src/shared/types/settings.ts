import { ConfluenceType } from './confluence';

export interface AppSettings {
  confluenceBaseUrl: string;
  confluenceType: ConfluenceType;
  confluenceSpaceKey: string;
  confluenceUsername: string;
  // Token stored in OS keychain, not here
}

export interface CredentialData {
  username: string;
  token: string;
}
