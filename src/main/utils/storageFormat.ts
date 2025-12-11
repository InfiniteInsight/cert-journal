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
 * Unescape XML special characters
 */
export function unescapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

interface CASection {
  caName: string;
  heading: string;
  rows: TableRow[];
  startIndex: number;
  endIndex: number;
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

/**
 * Parse a table row from HTML to extract data
 */
function parseTableRow(rowHtml: string): TableRow | null {
  // Match table cells
  const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const cells: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tdPattern.exec(rowHtml)) !== null) {
    cells.push(match[1]);
  }

  if (cells.length < 8) {
    return null; // Not a valid row
  }

  // Extract SANs from <ul><li> list
  const sans: string[] = [];
  const sansHtml = cells[2];
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let sanMatch: RegExpExecArray | null;
  while ((sanMatch = liPattern.exec(sansHtml)) !== null) {
    const san = unescapeXml(sanMatch[1].trim());
    if (san) {
      sans.push(san);
    }
  }

  return {
    expiration: unescapeXml(cells[0].trim()),
    cn: unescapeXml(cells[1].trim()),
    sans,
    issuingCA: unescapeXml(cells[3].trim()),
    requestor: unescapeXml(cells[4].trim()),
    location: unescapeXml(cells[5].trim()),
    distributionGroup: unescapeXml(cells[6].trim()),
    notes: unescapeXml(cells[7].trim()),
  };
}

/**
 * Parse page content to extract CA sections and their tables
 */
export function parseCASection(pageContent: string): CASection[] {
  const sections: CASection[] = [];

  // Find all h2 headings (CA names)
  const headingPattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings: Array<{ text: string; index: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(pageContent)) !== null) {
    headings.push({
      text: unescapeXml(match[1].trim()),
      index: match.index,
    });
  }

  // For each heading, find the table that follows it
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeadingIndex = i + 1 < headings.length ? headings[i + 1].index : pageContent.length;

    // Extract content between this heading and the next
    const sectionContent = pageContent.slice(heading.index, nextHeadingIndex);

    // Find the table in this section
    const tableMatch = sectionContent.match(/<table[\s\S]*?<\/table>/i);
    if (!tableMatch) {
      continue; // No table in this section
    }

    const tableContent = tableMatch[0];

    // Extract rows from table (skip header row)
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: TableRow[] = [];
    let rowMatch: RegExpExecArray | null;
    let isFirstRow = true;

    while ((rowMatch = rowPattern.exec(tableContent)) !== null) {
      const rowHtml = rowMatch[0];

      // Skip header row (contains <th> tags)
      if (/<th[^>]*>/i.test(rowHtml)) {
        continue;
      }

      if (isFirstRow) {
        isFirstRow = false;
        continue; // Skip first row if it's the header
      }

      const parsedRow = parseTableRow(rowHtml);
      if (parsedRow) {
        rows.push(parsedRow);
      }
    }

    sections.push({
      caName: heading.text,
      heading: `<h2>${escapeXml(heading.text)}</h2>`,
      rows,
      startIndex: heading.index,
      endIndex: heading.index + sectionContent.indexOf('</table>') + '</table>'.length,
    });
  }

  return sections;
}

/**
 * Try to parse a date from various formats
 * Supports: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, YYYY/MM/DD, and ISO 8601
 */
function parseFlexibleDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();

  // Try standard Date parsing first (handles ISO 8601, YYYY-MM-DD, etc.)
  let date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try MM/DD/YYYY (US format)
  let match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Parsed non-standard date format "${trimmed}" as ${date.toISOString().split('T')[0]}`);
      return date;
    }
  }

  // Try DD-MM-YYYY (European format with dashes)
  match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Parsed non-standard date format "${trimmed}" as ${date.toISOString().split('T')[0]}`);
      return date;
    }
  }

  // Try DD/MM/YYYY (European format with slashes)
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    // Ambiguous: could be DD/MM/YYYY or MM/DD/YYYY
    // If day > 12, it must be DD/MM/YYYY
    if (parseInt(day) > 12) {
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        console.log(`Parsed non-standard date format "${trimmed}" as ${date.toISOString().split('T')[0]} (DD/MM/YYYY)`);
        return date;
      }
    }
  }

  // Try YYYY/MM/DD (alternative format)
  match = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      console.log(`Parsed non-standard date format "${trimmed}" as ${date.toISOString().split('T')[0]}`);
      return date;
    }
  }

  console.warn(`Unable to parse date: "${trimmed}" - entry will be placed at end of sorted list`);
  return null;
}

/**
 * Sort rows by expiration date (earliest first)
 * Invalid or unparseable dates are placed at the end
 */
export function sortRowsByDate(rows: TableRow[]): TableRow[] {
  return rows.sort((a, b) => {
    const dateA = parseFlexibleDate(a.expiration);
    const dateB = parseFlexibleDate(b.expiration);

    // Both invalid - maintain original order
    if (!dateA && !dateB) {
      return 0;
    }

    // Only A is invalid - put it at the end
    if (!dateA) {
      return 1;
    }

    // Only B is invalid - put it at the end
    if (!dateB) {
      return -1;
    }

    // Both valid - sort by date (earliest first)
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Build a complete table with headers and rows for a specific CA
 */
export function buildCATable(caName: string, rows: TableRow[]): string {
  const sortedRows = sortRowsByDate([...rows]);
  const rowsHtml = sortedRows.map((row) => buildTableRow(row)).join('\n');

  return `<h2>${escapeXml(caName)}</h2>
<table>
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
 * Add rows to page content with CA grouping and date sorting
 * This function:
 * 1. Parses existing CA sections
 * 2. Adds new rows to the appropriate CA sections
 * 3. Creates new CA sections if needed
 * 4. Sorts rows by date within each CA section
 * 5. Rebuilds the page content while preserving non-CA content
 */
export function addRowsWithCAGrouping(existingContent: string, newRows: TableRow[]): string {
  // Parse existing CA sections
  const sections = parseCASection(existingContent);

  // Group new rows by CA
  const newRowsByCA = new Map<string, TableRow[]>();
  for (const row of newRows) {
    const ca = row.issuingCA;
    if (!newRowsByCA.has(ca)) {
      newRowsByCA.set(ca, []);
    }
    newRowsByCA.get(ca)!.push(row);
  }

  // Merge new rows into existing sections or create new sections
  const updatedSections = new Map<string, TableRow[]>();

  // Add existing sections
  for (const section of sections) {
    updatedSections.set(section.caName, [...section.rows]);
  }

  // Add new rows to appropriate sections
  for (const [ca, rows] of newRowsByCA.entries()) {
    if (updatedSections.has(ca)) {
      updatedSections.get(ca)!.push(...rows);
    } else {
      updatedSections.set(ca, rows);
    }
  }

  // Build the new CA sections content
  const caSectionsContent: string[] = [];

  // Sort CA names alphabetically
  const sortedCANames = Array.from(updatedSections.keys()).sort();

  for (const caName of sortedCANames) {
    const rows = updatedSections.get(caName)!;
    caSectionsContent.push(buildCATable(caName, rows));
  }

  const newCASections = caSectionsContent.join('\n\n');

  // If no existing CA sections, append to the end of the page
  if (sections.length === 0) {
    if (existingContent.trim()) {
      return existingContent.trim() + '\n\n' + newCASections;
    }
    return newCASections;
  }

  // Preserve content before, between, and after CA sections
  const firstSection = sections[0];
  const lastSection = sections[sections.length - 1];

  const contentBefore = existingContent.slice(0, firstSection.startIndex);
  const contentAfter = existingContent.slice(lastSection.endIndex);

  return contentBefore + newCASections + '\n\n' + contentAfter;
}
