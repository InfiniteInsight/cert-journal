# Confluence Setup Guide

Complete guide to setting up Confluence pages for use with Certificate Journal.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Page Naming Convention](#page-naming-convention)
4. [Marker Sections](#marker-sections)
5. [Creating Your First Page](#creating-your-first-page)
6. [Creating a Page Template](#creating-a-page-template)
7. [Section Details](#section-details)
8. [Troubleshooting](#troubleshooting)

## Overview

Certificate Journal requires Confluence pages to be structured with specific HTML comment markers that define sections for different certificate authorities. This guide walks you through setting up these pages correctly.

### Why Markers?

HTML comment markers serve two purposes:

1. **Organization**: Keep certificates grouped by issuing CA
2. **Safety**: Prevent the tool from accidentally modifying the wrong content

Without markers, the tool will use **fallback mode** and append certificates to the end of the page, which isn't ideal for organization.

## Prerequisites

- **Confluence Server or Data Center** (9.2.6 or higher)
- **Edit permissions** for the target space
- **Basic Confluence knowledge** (creating pages, editing HTML)

**Note**: This tool is **NOT compatible with Confluence Cloud**. It requires Confluence Server or Data Center.

## Page Naming Convention

Certificate pages **must** follow this exact naming format:

```
YYYY-MM Certificates
```

### Examples

- `2026-12 Certificates` (December 2026)
- `2027-01 Certificates` (January 2027)
- `2025-06 Certificates` (June 2025)

### Rules

- ✅ Use 4-digit year: `2026`
- ✅ Use 2-digit month: `01`, `02`, ..., `12`
- ✅ Include space before "Certificates"
- ✅ "Certificates" is plural
- ❌ Don't use: `Dec 2026`, `2026-December`, `Certificates 2026-12`

### Why This Format?

The tool determines which page to use based on the certificate's expiration date. A certificate expiring on December 15, 2026 will be added to the `2026-12 Certificates` page.

## Marker Sections

### Required Markers

Your Confluence page needs these marker sections:

1. **TOC** - Table of Contents
2. **PKI-TIVO-COM** - Internal PKI certificates
3. **SECTIGO** - Sectigo certificates
4. **LEGACY** - Legacy or unknown CA certificates
5. **THIRD-PARTY** - Third-party CA certificates (DigiCert, GoDaddy, etc.)
6. **SDV** - SDV certificates
7. **METADATA** - Page metadata (optional)

### Marker Format

Each section uses HTML comment markers in Confluence's structured macro format:

**Start Marker:**
```xml
<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>SECTION-NAME-START</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

**End Marker:**
```xml
<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>SECTION-NAME-END</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

**Important**: Replace `SECTION-NAME` with the actual section name (e.g., `SECTIGO`, `PKI-TIVO-COM`, etc.)

## Creating Your First Page

Follow these steps to create a properly formatted certificate page:

### Step 1: Create the Page

1. Navigate to your certificate space in Confluence
2. Click **Create** (usually in the top-right)
3. Select **Blank Page**
4. Enter title: `YYYY-MM Certificates` (e.g., `2026-12 Certificates`)

### Step 2: Add Marker Sections

1. Click **Edit** on your new page
2. Switch to **HTML Editor** (Tools → Source Editor or `<>` button)
3. Paste the complete page structure (see below)
4. Click **Save**

### Step 3: Complete Page Structure

Paste this into the HTML editor:

```html
<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>TOC-START</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Table of Contents</h2>
<ul>
  <li><a href="#PKI-TIVO-COM">Private PKI Certificates - pki.tivo.com</a></li>
  <li><a href="#SECTIGO">Public Server Certificates - Sectigo</a></li>
  <li><a href="#THIRD-PARTY">Third Party Certificates</a></li>
  <li><a href="#SDV">SDV Certificates</a></li>
  <li><a href="#LEGACY">Legacy Certificates</a></li>
</ul>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>TOC-END</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>PKI-TIVO-COM-START</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3 id="PKI-TIVO-COM">Private PKI Certificates - pki.tivo.com</h3>
<table style="width: 100%; table-layout: auto;">
<tbody>
<tr>
<th style="min-width: 90px;">Expiration</th>
<th style="min-width: 200px; max-width: 300px;">CN</th>
<th style="min-width: 250px; max-width: 350px;">SANs</th>
<th style="min-width: 150px; max-width: 200px;">Issuing CA</th>
<th style="min-width: 120px; max-width: 180px;">Requestor</th>
<th style="min-width: 120px; max-width: 180px;">Location</th>
<th style="min-width: 150px; max-width: 200px;">Distribution Group</th>
<th style="min-width: 200px; max-width: 300px;">Notes</th>
</tr>
</tbody>
</table>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>PKI-TIVO-COM-END</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>SECTIGO-START</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3 id="SECTIGO">Public Server Certificates - Sectigo</h3>
<table style="width: 100%; table-layout: auto;">
<tbody>
<tr>
<th style="min-width: 90px;">Expiration</th>
<th style="min-width: 200px; max-width: 300px;">CN</th>
<th style="min-width: 250px; max-width: 350px;">SANs</th>
<th style="min-width: 150px; max-width: 200px;">Issuing CA</th>
<th style="min-width: 120px; max-width: 180px;">Requestor</th>
<th style="min-width: 120px; max-width: 180px;">Location</th>
<th style="min-width: 150px; max-width: 200px;">Distribution Group</th>
<th style="min-width: 200px; max-width: 300px;">Notes</th>
</tr>
</tbody>
</table>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>SECTIGO-END</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>LEGACY-START</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3 id="LEGACY">Legacy Certificates</h3>
<table style="width: 100%; table-layout: auto;">
<tbody>
<tr>
<th style="min-width: 90px;">Expiration</th>
<th style="min-width: 200px; max-width: 300px;">CN</th>
<th style="min-width: 250px; max-width: 350px;">SANs</th>
<th style="min-width: 150px; max-width: 200px;">Issuing CA</th>
<th style="min-width: 120px; max-width: 180px;">Requestor</th>
<th style="min-width: 120px; max-width: 180px;">Location</th>
<th style="min-width: 150px; max-width: 200px;">Distribution Group</th>
<th style="min-width: 200px; max-width: 300px;">Notes</th>
</tr>
</tbody>
</table>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>LEGACY-END</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>THIRD-PARTY-START</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3 id="THIRD-PARTY">Third Party Certificates</h3>
<table style="width: 100%; table-layout: auto;">
<tbody>
<tr>
<th style="min-width: 90px;">Expiration</th>
<th style="min-width: 200px; max-width: 300px;">CN</th>
<th style="min-width: 250px; max-width: 350px;">SANs</th>
<th style="min-width: 150px; max-width: 200px;">Issuing CA</th>
<th style="min-width: 120px; max-width: 180px;">Requestor</th>
<th style="min-width: 120px; max-width: 180px;">Location</th>
<th style="min-width: 150px; max-width: 200px;">Distribution Group</th>
<th style="min-width: 200px; max-width: 300px;">Notes</th>
</tr>
</tbody>
</table>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>THIRD-PARTY-END</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>SDV-START</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3 id="SDV">SDV Certificates</h3>
<table style="width: 100%; table-layout: auto;">
<tbody>
<tr>
<th style="min-width: 90px;">Expiration</th>
<th style="min-width: 200px; max-width: 300px;">CN</th>
<th style="min-width: 250px; max-width: 350px;">SANs</th>
<th style="min-width: 150px; max-width: 200px;">Issuing CA</th>
<th style="min-width: 120px; max-width: 180px;">Requestor</th>
<th style="min-width: 120px; max-width: 180px;">Location</th>
<th style="min-width: 150px; max-width: 200px;">Distribution Group</th>
<th style="min-width: 200px; max-width: 300px;">Notes</th>
</tr>
</tbody>
</table>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>SDV-END</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>METADATA-START</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3>Metadata</h3>
<p><em>This page contains SSL/TLS certificates expiring in YYYY-MM. Automatically managed by Certificate Journal.</em></p>

<ac:structured-macro ac:name="htmlcomment" ac:schema-version="1">
  <ac:parameter ac:name="atlassian-macro-output-type">INLINE</ac:parameter>
  <ac:rich-text-body>
    <p>METADATA-END</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

### Step 4: Verify

After saving:

1. Check that all sections are visible
2. Verify the table headers display correctly
3. Ensure no errors or formatting issues

## Creating a Page Template

To save time creating future pages, create a Confluence template:

### Step 1: Create Template

1. In Confluence, go to **Space Tools** → **Content Tools** → **Templates**
2. Click **Create new template**
3. Name it: `Certificate Monthly Page`
4. Paste the complete page structure (from above)
5. Save the template

### Step 2: Use Template

When creating new monthly pages:

1. Click **Create**
2. Select **Certificate Monthly Page** template
3. Enter the title: `YYYY-MM Certificates`
4. The page will be pre-populated with all marker sections
5. Save

## Section Details

### TOC (Table of Contents)

**Purpose**: Quick navigation to different certificate sections

**Content**: Links to each certificate authority section

**Optional**: You can remove or customize this section

---

### PKI-TIVO-COM

**Purpose**: Internal PKI certificates from pki.tivo.com

**Triggered by**: Issuing CA contains "tivo" or "pki.tivo.com"

**Example CAs**:
- `pki.tivo.com Issuing CA`
- `TiVo Internal Certificate Authority`

---

### SECTIGO

**Purpose**: Public certificates from Sectigo

**Triggered by**: Issuing CA contains "sectigo"

**Example CAs**:
- `Sectigo RSA Domain Validation Secure Server CA`
- `Sectigo ECC Domain Validation Secure Server CA`

---

### LEGACY

**Purpose**: Certificates from unknown or legacy CAs

**Triggered by**: Issuing CA doesn't match any other pattern

**Example CAs**:
- Old internal CAs
- Deprecated CAs
- Unknown CAs

---

### THIRD-PARTY

**Purpose**: Certificates from commercial third-party CAs

**Triggered by**: Issuing CA contains "digicert", "comodo", "godaddy", or "letsencrypt"

**Example CAs**:
- `DigiCert SHA2 Secure Server CA`
- `GoDaddy Secure Certificate Authority`
- `Let's Encrypt Authority X3`

---

### SDV

**Purpose**: SDV-specific certificates

**Triggered by**: Issuing CA contains "sdv"

**Example CAs**:
- `SDV Certificate Authority`

---

### METADATA

**Purpose**: Page information and notes

**Optional**: Can include:
- Page description
- Last updated date
- Contact information
- Related pages

## Troubleshooting

### "No marker sections found" Error

**Cause**: Page doesn't have HTML comment markers

**Fix**:
1. Edit the Confluence page
2. Switch to HTML/Source editor
3. Add the marker sections (see above)
4. Save the page

---

### Markers Not Working

**Cause**: Incorrect marker format or typos

**Check**:
1. Marker names match exactly (case-sensitive): `SECTIGO-START`, not `sectigo-start`
2. Each section has both START and END markers
3. Markers are in Confluence structured macro format (not plain HTML comments)

---

### Table Formatting Issues

**Cause**: Missing or incorrect table HTML

**Fix**:
1. Ensure each section has a complete table with `<table>`, `<tbody>`, and header row
2. Include the `style="width: 100%; table-layout: auto;"` on the `<table>` element
3. Include column width styles on `<th>` elements

---

### Certificate Goes to Wrong Section

**Cause**: Issuing CA name doesn't match expected pattern

**Fix**:
1. Check the Issuing CA name in the certificate
2. Verify it contains the expected keyword (case-insensitive)
3. If needed, manually move the entry in Confluence after submission

---

### Template Not Available

**Cause**: Template not created or insufficient permissions

**Fix**:
1. Verify you have permission to create templates in the space
2. Check Space Tools → Content Tools → Templates
3. Recreate the template if missing

## Best Practices

### Page Management

1. **Create pages in advance**: Set up next month's page before certificates expire
2. **Use templates**: Save time with a reusable template
3. **Consistent naming**: Always use `YYYY-MM Certificates` format
4. **Regular cleanup**: Archive or delete old pages after a few years

### Table Organization

1. **Keep headers consistent**: Don't modify column headers
2. **Don't manually add rows**: Let the tool manage entries for consistency
3. **Manual edits**: Only edit existing rows to fix errors, don't add new rows manually

### Marker Sections

1. **Don't delete markers**: Keep all START/END markers even if sections are empty
2. **Don't modify marker text**: Changing `SECTIGO-START` to `SECTIGO-BEGIN` will break the tool
3. **Keep sections in order**: Maintain the TOC, PKI, SECTIGO, LEGACY, THIRD-PARTY, SDV, METADATA order

### Permissions

1. **Restrict edit access**: Only allow certificate managers to edit pages
2. **Read access**: Make pages readable by teams who need certificate info
3. **Space permissions**: Set appropriate space-level permissions

## Quick Reference

### Marker Names (Case-Sensitive)

- `TOC-START` / `TOC-END`
- `PKI-TIVO-COM-START` / `PKI-TIVO-COM-END`
- `SECTIGO-START` / `SECTIGO-END`
- `LEGACY-START` / `LEGACY-END`
- `THIRD-PARTY-START` / `THIRD-PARTY-END`
- `SDV-START` / `SDV-END`
- `METADATA-START` / `METADATA-END`

### Page Naming Format

```
YYYY-MM Certificates
```

Examples: `2026-12 Certificates`, `2027-01 Certificates`

### Required Table Columns (in order)

1. Expiration
2. CN
3. SANs
4. Issuing CA
5. Requestor
6. Location
7. Distribution Group
8. Notes

## Additional Resources

- [README.md](./README.md) - General overview
- [USER_GUIDE.md](./USER_GUIDE.md) - How to use the tool
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Building and development
