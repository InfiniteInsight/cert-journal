import type { TableRow } from '../../shared/types';

/**
 * Escape XML special characters for Confluence Storage Format
 */
export function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a table row in Confluence Storage Format (XHTML)
 */
export function buildTableRow(row: TableRow): string {
  // Format SANs as a bulleted list
  const sansList =
    row.sans.length > 0
      ? `<ul>${row.sans.map((san) => `<li>${escapeXml(san)}</li>`).join('')}</ul>`
      : '';

  return `<tr>
<td>${escapeXml(row.expiration)}</td>
<td>${escapeXml(row.cn)}</td>
<td>${sansList}</td>
<td>${escapeXml(row.issuingCA)}</td>
<td>${escapeXml(row.requestor)}</td>
<td>${escapeXml(row.location)}</td>
<td>${escapeXml(row.distributionGroup)}</td>
<td>${escapeXml(row.notes)}</td>
</tr>`;
}

/**
 * Build an empty table with headers only
 */
export function buildEmptyTable(): string {
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
</tbody>
</table>`;
}

/**
 * Check if the page content contains a table
 */
export function hasTable(content: string): boolean {
  return /<table[\s>]/i.test(content);
}

/**
 * Append a row to an existing table in the page content
 * Inserts the row before the closing </tbody> tag
 */
export function appendRowToTable(existingContent: string, row: TableRow): string {
  const newRow = buildTableRow(row);

  // Find the last </tbody> tag and insert before it
  const tbodyCloseIndex = existingContent.lastIndexOf('</tbody>');

  if (tbodyCloseIndex === -1) {
    // No </tbody> found, try to find </table>
    const tableCloseIndex = existingContent.lastIndexOf('</table>');
    if (tableCloseIndex === -1) {
      // No table found at all - this shouldn't happen if hasTable() was checked
      throw new Error('No table found in page content');
    }
    // Insert before </table> and add tbody wrapper
    return (
      existingContent.slice(0, tableCloseIndex) +
      `<tbody>\n${newRow}\n</tbody>\n` +
      existingContent.slice(tableCloseIndex)
    );
  }

  // Insert the new row before </tbody>
  return (
    existingContent.slice(0, tbodyCloseIndex) +
    newRow +
    '\n' +
    existingContent.slice(tbodyCloseIndex)
  );
}

/**
 * Format a date for display in the table
 */
export function formatExpirationDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
