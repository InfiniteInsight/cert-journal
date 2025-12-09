import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ConfluenceConfig,
  PageContent,
  TableRow,
  DuplicateCheckResult,
} from '../../shared/types';
import {
  buildTableRow,
  buildEmptyTable,
  appendRowToTable,
  hasTable,
  addRowsWithCAGrouping,
  buildCATable,
} from '../utils/storageFormat';

export class ConfluenceClient {
  private client: AxiosInstance;
  private spaceKey: string;
  private isCloud: boolean;

  constructor(
    config: ConfluenceConfig,
    credentials: { username: string; token: string }
  ) {
    this.spaceKey = config.spaceKey;
    this.isCloud = config.type === 'cloud';

    // Normalize base URL (remove trailing slash)
    let baseUrl = config.baseUrl.replace(/\/$/, '');

    // For Cloud, the API path is /wiki/rest/api
    // For Server/DC, it's typically /rest/api
    const apiPath = this.isCloud ? '/wiki/rest/api' : '/rest/api';

    this.client = axios.create({
      baseURL: `${baseUrl}${apiPath}`,
      auth: {
        username: credentials.username,
        password: credentials.token,
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Test the connection to Confluence
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to get the space to verify connection
      await this.client.get(`/space/${this.spaceKey}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        switch (axiosError.response.status) {
          case 401:
            return { success: false, error: 'Authentication failed. Check your credentials.' };
          case 403:
            return { success: false, error: 'Access denied. Check your permissions.' };
          case 404:
            return { success: false, error: `Space "${this.spaceKey}" not found.` };
          default:
            return {
              success: false,
              error: `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`,
            };
        }
      }
      return {
        success: false,
        error: axiosError.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Get a page by its title
   */
  async getPageByTitle(title: string): Promise<PageContent | null> {
    try {
      const response = await this.client.get('/content', {
        params: {
          spaceKey: this.spaceKey,
          title,
          expand: 'body.storage,version',
        },
      });

      const results = response.data.results;
      if (!results || results.length === 0) {
        return null;
      }

      const page = results[0];
      return {
        id: page.id,
        title: page.title,
        version: page.version.number,
        body: page.body.storage.value,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a page's content
   */
  async updatePage(
    pageId: string,
    title: string,
    body: string,
    currentVersion: number
  ): Promise<void> {
    await this.client.put(`/content/${pageId}`, {
      type: 'page',
      title,
      body: {
        storage: {
          value: body,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
      },
    });
  }

  /**
   * Append a row to the table on a page with CA grouping and date sorting
   */
  async appendToTable(pageTitle: string, row: TableRow): Promise<void> {
    const page = await this.getPageByTitle(pageTitle);

    if (!page) {
      throw new Error(`Page "${pageTitle}" not found in space "${this.spaceKey}"`);
    }

    let newBody: string;

    if (!page.body || page.body.trim() === '') {
      // Page is empty - create a CA section with the row
      newBody = buildCATable(row.issuingCA, [row]);
    } else {
      // Use CA grouping and sorting
      newBody = addRowsWithCAGrouping(page.body, [row]);
    }

    await this.updatePage(page.id, page.title, newBody, page.version);
  }

  /**
   * Append multiple rows to the table on a page with CA grouping and date sorting
   */
  async appendMultipleToTable(pageTitle: string, rows: TableRow[]): Promise<void> {
    const page = await this.getPageByTitle(pageTitle);

    if (!page) {
      throw new Error(`Page "${pageTitle}" not found in space "${this.spaceKey}"`);
    }

    let newBody: string;

    if (!page.body || page.body.trim() === '') {
      // Page is empty - create CA sections with rows
      // Group rows by CA first
      const rowsByCA = new Map<string, TableRow[]>();
      for (const row of rows) {
        if (!rowsByCA.has(row.issuingCA)) {
          rowsByCA.set(row.issuingCA, []);
        }
        rowsByCA.get(row.issuingCA)!.push(row);
      }

      // Build sections for each CA
      const sections: string[] = [];
      const sortedCAs = Array.from(rowsByCA.keys()).sort();
      for (const ca of sortedCAs) {
        sections.push(buildCATable(ca, rowsByCA.get(ca)!));
      }
      newBody = sections.join('\n\n');
    } else {
      // Use CA grouping and sorting
      newBody = addRowsWithCAGrouping(page.body, rows);
    }

    await this.updatePage(page.id, page.title, newBody, page.version);
  }

  /**
   * Check if a CN already exists on a page (duplicate detection)
   */
  async checkForDuplicateCN(
    cn: string,
    pageTitle: string
  ): Promise<DuplicateCheckResult> {
    const page = await this.getPageByTitle(pageTitle);

    if (!page || !page.body) {
      return { isDuplicate: false };
    }

    // Look for the CN in table cells
    // The CN would be in a <td> element
    const escapedCN = escapeRegex(cn);
    const cnPattern = new RegExp(`<td[^>]*>\\s*${escapedCN}\\s*</td>`, 'i');

    if (cnPattern.test(page.body)) {
      return {
        isDuplicate: true,
        existingEntry: cn,
      };
    }

    return { isDuplicate: false };
  }
}

/**
 * Build a complete table with headers and a single row
 */
function buildTableWithRow(row: TableRow): string {
  const rowHtml = buildTableRow(row);
  return `<table>
<tbody>
<tr>
<th>Expiration</th>
<th>CN</th>
<th>SANs</th>
<th>Issuing CA</th>
<th>Requestor</th>
<th>Location</th>
<th>Distribution Group</th>
<th>Notes</th>
</tr>
${rowHtml}
</tbody>
</table>`;
}

/**
 * Build a complete table with headers and multiple rows
 */
function buildTableWithRows(rows: TableRow[]): string {
  const rowsHtml = rows.map((row) => buildTableRow(row)).join('\n');
  return `<table>
<tbody>
<tr>
<th>Expiration</th>
<th>CN</th>
<th>SANs</th>
<th>Issuing CA</th>
<th>Requestor</th>
<th>Location</th>
<th>Distribution Group</th>
<th>Notes</th>
</tr>
${rowsHtml}
</tbody>
</table>`;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
