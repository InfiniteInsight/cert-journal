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
  headingLevel: number; // 1-6 for h1-h6
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
 * Detects ANY heading level (h1-h6), not just h2
 */
export function parseCASection(pageContent: string): CASection[] {
  const sections: CASection[] = [];

  // Find all headings (h1-h6) - using backreference to match closing tag
  const headingPattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings: Array<{ text: string; level: number; index: number; fullMatch: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(pageContent)) !== null) {
    headings.push({
      text: unescapeXml(match[2].trim()),
      level: parseInt(match[1]),
      index: match.index,
      fullMatch: match[0],
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
      heading: heading.fullMatch,
      headingLevel: heading.level,
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
 * @param caName The name of the CA for the heading
 * @param rows The rows to include in the table
 * @param headingLevel The heading level to use (1-6 for h1-h6), defaults to 3
 */
export function buildCATable(caName: string, rows: TableRow[], headingLevel: number = 3): string {
  const sortedRows = sortRowsByDate([...rows]);
  const rowsHtml = sortedRows.map((row) => buildTableRow(row)).join('\n');

  return `<h${headingLevel}>${escapeXml(caName)}</h${headingLevel}>
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
 * Map issuing CA names to HTML comment marker sections
 */
function getMarkerSectionForCA(issuingCA: string): string | null {
  const caLower = issuingCA.toLowerCase();

  // Sectigo certificates
  if (caLower.includes('sectigo')) {
    return 'SECTIGO';
  }

  // TiVo/PKI certificates
  if (caLower.includes('tivo') || caLower.includes('pki.tivo.com')) {
    return 'PKI-TIVO-COM';
  }

  // Third party certificates
  if (caLower.includes('digicert') || caLower.includes('comodo') ||
      caLower.includes('godaddy') || caLower.includes('letsencrypt')) {
    return 'THIRD-PARTY';
  }

  // SDV certificates
  if (caLower.includes('sdv')) {
    return 'SDV';
  }

  // Default to LEGACY for unknown CAs
  return 'LEGACY';
}

interface MarkerSection {
  markerName: string;
  startMarker: string;
  endMarker: string;
  startIndex: number;
  endIndex: number;
  contentStartIndex: number;
  contentEndIndex: number;
}

/**
 * Find all HTML comment marker sections in the page
 */
function findMarkerSections(content: string): MarkerSection[] {
  const sections: MarkerSection[] = [];

  // Look for Confluence htmlcomment macro format:
  // <span class="conf-macro output-inline" data-hasbody="true" data-macro-name="htmlcomment"><!-- <p>NAME-START</p> --></span>
  // Also support plain HTML comments for compatibility: <!-- NAME-START -->
  const spanMarkerPattern = /<span[^>]*data-macro-name="htmlcomment"[^>]*><!--\s*(?:<p>)?\s*([A-Z0-9-]+)-START\s*(?:<\/p>)?\s*--><\/span>/gi;
  const plainMarkerPattern = /<!--\s*(?:<p>)?\s*([A-Z0-9-]+)-START\s*(?:<\/p>)?\s*-->/gi;

  let match: RegExpExecArray | null;

  // First try to find span-wrapped markers (Confluence Server/DC format)
  while ((match = spanMarkerPattern.exec(content)) !== null) {
    const markerName = match[1];
    const startMarker = match[0];

    // Build end marker patterns to search for
    const endMarkerPatterns = [
      `<span class="conf-macro output-inline" data-hasbody="true" data-macro-name="htmlcomment"><!-- <p>${markerName}-END</p> --></span>`,
      `<span class="conf-macro output-inline" data-hasbody="true" data-macro-name="htmlcomment"><!-- ${markerName}-END --></span>`,
    ];

    let endIndex = -1;
    let endMarker = '';

    for (const pattern of endMarkerPatterns) {
      endIndex = content.indexOf(pattern, match.index + startMarker.length);
      if (endIndex !== -1) {
        endMarker = pattern;
        break;
      }
    }

    const contentStartIndex = match.index + startMarker.length;

    if (endIndex === -1) {
      console.warn(`No end marker found for ${markerName}`);
      continue;
    }

    sections.push({
      markerName,
      startMarker,
      endMarker,
      startIndex: match.index,
      endIndex: endIndex + endMarker.length,
      contentStartIndex,
      contentEndIndex: endIndex,
    });
  }

  // If no span-wrapped markers found, try plain HTML comment markers
  if (sections.length === 0) {
    while ((match = plainMarkerPattern.exec(content)) !== null) {
      const markerName = match[1];
      const startMarker = match[0];

      // Try both formats for the end marker
      let endMarker = `<!-- ${markerName}-END -->`;
      let endIndex = content.indexOf(endMarker, match.index + startMarker.length);

      // If not found, try with <p> tags
      if (endIndex === -1) {
        endMarker = `<!-- <p>${markerName}-END</p> -->`;
        endIndex = content.indexOf(endMarker, match.index + startMarker.length);
      }

      const contentStartIndex = match.index + startMarker.length;

      if (endIndex === -1) {
        console.warn(`No end marker found for ${markerName}`);
        continue;
      }

      sections.push({
        markerName,
        startMarker,
        endMarker,
        startIndex: match.index,
        endIndex: endIndex + endMarker.length,
        contentStartIndex,
        contentEndIndex: endIndex,
      });
    }
  }

  return sections;
}

/**
 * Add rows to page content with HTML marker section awareness
 * This function:
 * 1. Detects HTML comment markers (e.g., <!-- SECTIGO-START -->)
 * 2. Maps certificates to appropriate marker sections
 * 3. Within each section, organizes by Issuing CA with h2 headings
 * 4. Sorts rows by date within each CA
 * 5. Preserves ALL other page content
 */
export function addRowsWithCAGrouping(existingContent: string, newRows: TableRow[]): string {
  console.log('=== addRowsWithCAGrouping called ===');
  console.log('Existing content length:', existingContent.length);
  console.log('New rows to add:', newRows.length);

  // Find HTML marker sections
  const markerSections = findMarkerSections(existingContent);
  console.log('Found marker sections:', markerSections.map(s => s.markerName).join(', '));

  if (markerSections.length === 0) {
    // No markers found - fall back to old behavior (append CA sections at end)
    console.log('No marker sections found - using fallback behavior');
    return addRowsWithoutMarkers(existingContent, newRows);
  }

  // Group new rows by marker section
  const rowsByMarkerSection = new Map<string, TableRow[]>();
  for (const row of newRows) {
    const markerName = getMarkerSectionForCA(row.issuingCA);
    if (!markerName) {
      console.warn(`Could not determine marker section for CA: ${row.issuingCA}`);
      continue;
    }

    if (!rowsByMarkerSection.has(markerName)) {
      rowsByMarkerSection.set(markerName, []);
    }
    rowsByMarkerSection.get(markerName)!.push(row);
  }

  console.log('Rows grouped by marker section:', Array.from(rowsByMarkerSection.keys()).join(', '));

  // Process each marker section that has new rows
  let result = existingContent;
  let offset = 0;

  // Process sections in order of appearance
  for (const markerSection of markerSections) {
    const newRowsForSection = rowsByMarkerSection.get(markerSection.markerName);
    if (!newRowsForSection || newRowsForSection.length === 0) {
      continue; // No new rows for this section
    }

    console.log(`Processing section ${markerSection.markerName} with ${newRowsForSection.length} new rows`);

    // Extract current content within this marker section
    const sectionContent = result.slice(
      markerSection.contentStartIndex + offset,
      markerSection.contentEndIndex + offset
    );

    // Within each marker section, there should be ONE heading and ONE table
    // The heading is a category name (e.g., "Public Server Certificates - Sectigo")
    // The table contains ALL certificates for that category

    // Find the heading (h1-h6)
    const headingPattern = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/i;
    const headingMatch = sectionContent.match(headingPattern);

    let existingHeading = '';
    let existingRows: TableRow[] = [];

    if (headingMatch) {
      existingHeading = headingMatch[0]; // Preserve the exact heading HTML
      console.log(`  Found existing heading: ${headingMatch[2].trim()}`);
    }

    // Find the table
    const tableMatch = sectionContent.match(/<table[\s\S]*?<\/table>/i);
    if (tableMatch) {
      const tableContent = tableMatch[0];

      // Parse all existing rows from the table
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;

      while ((rowMatch = rowPattern.exec(tableContent)) !== null) {
        const rowHtml = rowMatch[0];

        // Skip header row (contains <th> tags)
        if (/<th[^>]*>/i.test(rowHtml)) {
          continue;
        }

        const parsedRow = parseTableRow(rowHtml);
        if (parsedRow) {
          existingRows.push(parsedRow);
        }
      }

      console.log(`  Found ${existingRows.length} existing rows in table`);
    }

    // Combine existing rows with new rows
    const allRows = [...existingRows, ...newRowsForSection];
    console.log(`  Total rows after adding new: ${allRows.length}`);

    // Sort all rows by expiration date
    const sortedRows = sortRowsByDate(allRows);

    // Build the table with all rows
    const rowsHtml = sortedRows.map(row => buildTableRow(row)).join('\n');

    // Build new section content with the original heading and updated table
    const newSectionContent = existingHeading
      ? `\n${existingHeading}\n<table>\n<tbody>\n<tr>\n<th>Expiration</th>\n<th>CN</th>\n<th>SANs</th>\n<th>Issuing CA</th>\n<th>Requestor</th>\n<th>Location</th>\n<th>Distribution Group</th>\n<th>Notes</th>\n</tr>\n${rowsHtml}\n</tbody>\n</table>\n`
      : `\n<table>\n<tbody>\n<tr>\n<th>Expiration</th>\n<th>CN</th>\n<th>SANs</th>\n<th>Issuing CA</th>\n<th>Requestor</th>\n<th>Location</th>\n<th>Distribution Group</th>\n<th>Notes</th>\n</tr>\n${rowsHtml}\n</tbody>\n</table>\n`;

    // Calculate the old section content length
    const oldSectionLength = markerSection.contentEndIndex - markerSection.contentStartIndex;

    // Replace the content within the markers
    const before = result.slice(0, markerSection.contentStartIndex + offset);
    const after = result.slice(markerSection.contentEndIndex + offset);

    result = before + newSectionContent + after;

    // Update offset for subsequent sections
    offset += newSectionContent.length - oldSectionLength;
    console.log(`  Updated ${markerSection.markerName}: length change = ${newSectionContent.length - oldSectionLength}`);
  }

  console.log('Final result length:', result.length);
  console.log('=== addRowsWithCAGrouping complete ===');
  return result;
}

/**
 * Fallback function for pages without HTML markers
 * CRITICAL SAFETY: This function ONLY appends new content at the end
 * It NEVER modifies, rebuilds, or deletes any existing content
 */
function addRowsWithoutMarkers(existingContent: string, newRows: TableRow[]): string {
  console.log('=== addRowsWithoutMarkers called (APPEND-ONLY MODE) ===');
  console.warn('WARNING: HTML markers not found - appending new content at end of page');
  console.warn('This may result in duplicate entries. Please add HTML comment markers to your page:');
  console.warn('  <!-- SECTIGO-START --> ... <!-- SECTIGO-END -->');

  // Group new rows by CA
  const newRowsByCA = new Map<string, TableRow[]>();
  for (const row of newRows) {
    const ca = row.issuingCA;
    if (!newRowsByCA.has(ca)) {
      newRowsByCA.set(ca, []);
    }
    newRowsByCA.get(ca)!.push(row);
  }

  // Build new sections for the new rows
  const newCASections: string[] = [];
  const sortedCANames = Array.from(newRowsByCA.keys()).sort();

  for (const caName of sortedCANames) {
    const rows = newRowsByCA.get(caName)!;
    // Use h3 as default heading level for new sections
    newCASections.push(buildCATable(caName, rows, 3));
  }

  // ALWAYS append at the end, never modify existing content
  if (existingContent.trim()) {
    console.log(`Appending ${newCASections.length} new sections to existing content`);
    return existingContent.trim() + '\n\n' + newCASections.join('\n\n');
  }

  console.log(`Creating ${newCASections.length} new sections (page was empty)`);
  return newCASections.join('\n\n');
}
