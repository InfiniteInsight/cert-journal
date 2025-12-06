export type ConfluenceType = 'cloud' | 'server';

export interface ConfluenceConfig {
  baseUrl: string;
  type: ConfluenceType;
  spaceKey: string;
  username: string;
  // Token stored separately in keychain
}

export interface PageContent {
  id: string;
  title: string;
  version: number;
  body: string;
}

export interface TableRow {
  expiration: string;
  cn: string;
  sans: string[];
  issuingCA: string;
  requestor: string;
  location: string;
  distributionGroup: string;
  notes: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingEntry?: string;
}
