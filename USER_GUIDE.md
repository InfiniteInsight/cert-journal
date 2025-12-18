# Certificate Journal - User Guide

Complete guide to using Certificate Journal for documenting SSL/TLS certificates in Confluence.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Loading Certificates](#loading-certificates)
4. [Certificate Information](#certificate-information)
5. [Submitting to Confluence](#submitting-to-confluence)
6. [Understanding the Workflow](#understanding-the-workflow)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### First Launch

When you first launch Certificate Journal, you'll need to configure your Confluence connection.

1. Launch the application
2. The configuration dialog will appear
3. Enter your Confluence details (see [Configuration](#configuration))
4. Click "Save" to store your settings

### Main Interface

The Certificate Journal interface consists of:

- **Certificate Loader**: Load certificate files or drag-and-drop
- **Certificate Details**: View parsed certificate information
- **Additional Information Form**: Enter requestor, location, notes, etc.
- **Preview**: See how the certificate will appear in Confluence
- **Submit Button**: Send the certificate to Confluence

## Configuration

### Required Settings

#### Confluence URL
- **Format**: `https://confluence.corp.example.com`
- **Note**: Must include `https://` or `http://`
- **Compatibility**: Confluence Server or Data Center only (not Cloud)

#### Space Key
- **Description**: The Confluence space containing your certificate pages
- **Example**: `INFOSEC`, `IT`, `CERTS`
- **Case Sensitive**: Match the exact case of your space key

#### Bearer Token
- **Type**: Confluence Personal Access Token
- **Security**: Stored securely in your system keychain
- **Permissions Required**:
  - Read pages in the target space
  - Edit pages in the target space

### Creating a Bearer Token

1. Log in to Confluence
2. Click your profile picture → **Settings**
3. Navigate to **Personal Access Tokens**
4. Click **Create token**
5. Enter a name: `Certificate Journal`
6. Set expiration (recommended: 1 year or "No expiration" for internal tools)
7. Click **Create**
8. **Copy the token immediately** (you won't see it again!)
9. Paste it into Certificate Journal's configuration

### Updating Configuration

To update your configuration later:

1. Click **Settings** in the menu bar
2. Update the fields as needed
3. Click **Save**

## Loading Certificates

### Supported File Formats

Certificate Journal supports multiple certificate formats:

| Format | Extensions | Password Required |
|--------|------------|-------------------|
| PEM | `.pem`, `.crt`, `.cer` | No |
| DER | `.der`, `.cer` | No |
| PKCS#12 | `.p12`, `.pfx` | Yes (usually) |

### Method 1: Load Button

1. Click **"Load Certificate"** button
2. Browse to your certificate file
3. Select the file
4. If password-protected (P12/PFX), enter the password when prompted

### Method 2: Drag and Drop

1. Drag a certificate file from your file manager
2. Drop it onto the Certificate Journal window
3. If password-protected, enter the password when prompted

### Password-Protected Certificates

For P12/PFX files:

1. A password dialog will appear
2. Enter the certificate password
3. Click **"Submit"**
4. If incorrect, you'll be prompted again
5. Click **"Cancel"** to abort

**Common Issues:**
- **Wrong password**: Double-check the password, some are case-sensitive
- **No password**: Try leaving it blank or check with whoever provided the file
- **Corrupted file**: Try re-exporting the certificate

## Certificate Information

### Automatically Parsed Fields

When you load a certificate, these fields are automatically extracted:

#### Common Name (CN)
- **Description**: The primary domain or name on the certificate
- **Example**: `*.example.com`, `www.example.com`, `Example Inc.`
- **Editable**: Yes (if parsing is incorrect)

#### Subject Alternative Names (SANs)
- **Description**: Additional domains/names covered by the certificate
- **Example**: `example.com`, `www.example.com`, `api.example.com`
- **Format**: Displayed as a bulleted list in Confluence
- **Editable**: Yes (add/remove entries)

#### Issuing CA
- **Description**: The Certificate Authority that issued the certificate
- **Example**: `Sectigo RSA Domain Validation Secure Server CA`
- **Impact**: Determines which Confluence section the certificate goes to
- **Editable**: Yes (but affects section placement)

#### Expiration Date
- **Description**: When the certificate expires
- **Format**: MM/DD/YYYY
- **Example**: `12/09/2026`
- **Impact**: Determines which monthly page the certificate goes to
- **Editable**: No (read-only from certificate)

### Manually Entered Fields

You must provide these fields before submitting:

#### Requestor
- **Description**: Person who requested or is responsible for the certificate
- **Example**: `John Smith`, `jane.doe@example.com`
- **Required**: Yes

#### Location
- **Description**: Where the certificate is deployed or stored
- **Example**: `Production Load Balancer`, `*.example.com servers`, `Azure KeyVault`
- **Required**: Yes

#### Distribution Group
- **Description**: Team or group responsible for the certificate
- **Example**: `Platform Team`, `DevOps`, `infosec@example.com`
- **Required**: Yes

#### Notes
- **Description**: Additional information about the certificate
- **Example**:
  - `Renewed annually`
  - `Used for external API`
  - `Replaces expired cert from 2024`
- **Required**: No (optional)

## Submitting to Confluence

### Preview Before Submit

Before submitting, review the preview section to ensure:

1. ✅ Certificate information is correct
2. ✅ All required fields are filled
3. ✅ Target page is correct (shown at top of preview)
4. ✅ Table formatting looks good

### Submit Process

1. Click **"Submit to Confluence"**
2. The app will:
   - Determine the target page based on expiration date
   - Find the appropriate CA section (SECTIGO, PKI-TIVO-COM, etc.)
   - Append the certificate to the existing table
   - Show a success message

3. Success indicators:
   - ✅ Green checkmark or success message
   - The form will reset for the next certificate

### What Happens on Confluence

The certificate is added to:

**Page**: `YYYY-MM Certificates` (e.g., `2026-12 Certificates`)

**Section**: Based on Issuing CA:
- Sectigo → `SECTIGO` section
- TiVo/PKI → `PKI-TIVO-COM` section
- DigiCert, GoDaddy, Let's Encrypt → `THIRD-PARTY` section
- SDV → `SDV` section
- Unknown → `LEGACY` section

**Position**: Appended as a new row in the table (never overwrites existing rows)

### After Submission

After successful submission:

1. **Verify in Confluence**: Click the page link to view in Confluence
2. **Check the entry**: Ensure all information is correct
3. **Edit if needed**: You can manually edit the entry in Confluence if needed

## Understanding the Workflow

### Typical Workflow

```
1. Receive new certificate
   ↓
2. Load certificate file (PEM, P12, etc.)
   ↓
3. Review parsed information
   ↓
4. Fill in requestor, location, distribution group
   ↓
5. Add notes (optional)
   ↓
6. Preview the entry
   ↓
7. Submit to Confluence
   ↓
8. Verify in Confluence
```

### Batch Processing

For multiple certificates:

1. Load first certificate
2. Fill in details and submit
3. Form resets automatically
4. Load next certificate
5. Repeat

**Tip**: If multiple certificates share the same requestor/location/distribution group, you can copy-paste these fields between submissions.

## Advanced Features

### Certificate Expiration Date Handling

Certificates are filed to monthly pages based on expiration date:

- **Expires December 2026**: Goes to `2026-12 Certificates`
- **Expires January 2027**: Goes to `2027-01 Certificates`

**Page Naming Format**: `YYYY-MM Certificates`

If the target page doesn't exist, you'll need to create it first (see [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md)).

### CA Section Mapping

The tool automatically maps issuing CAs to sections:

| Issuing CA Contains | Section |
|---------------------|---------|
| `sectigo` | SECTIGO |
| `tivo`, `pki.tivo.com` | PKI-TIVO-COM |
| `digicert`, `comodo`, `godaddy`, `letsencrypt` | THIRD-PARTY |
| `sdv` | SDV |
| Other | LEGACY |

**Note**: Matching is case-insensitive and checks if the CA name *contains* the keyword.

### Fallback Mode

If the tool doesn't find marker sections on a Confluence page:

1. A warning is logged
2. The certificate is appended to the end of the page
3. A new section is created with the CA name as a heading

**Recommendation**: Always set up proper marker sections to avoid fallback mode.

## Best Practices

### Certificate Management

1. **Document immediately**: Add certificates to Confluence as soon as they're issued
2. **Set reminders**: Create Confluence calendar reminders for upcoming expirations
3. **Regular audits**: Periodically review certificate pages for expired certs
4. **Standardize notes**: Use consistent formatting for notes (e.g., "Renewed: 12/2026")

### Data Entry

1. **Accurate requestor**: Use full names or email addresses
2. **Specific locations**: Be as specific as possible (server names, services)
3. **Distribution groups**: Use existing team names or email lists
4. **Meaningful notes**: Include renewal procedures, special requirements, or dependencies

### Confluence Organization

1. **Create pages in advance**: Set up next month's page before month-end
2. **Use templates**: Create a Confluence template with all marker sections
3. **Consistent naming**: Always use `YYYY-MM Certificates` format
4. **Archive old pages**: Move expired certificate pages to an archive space

### Security

1. **Protect your token**: Never share your Confluence Bearer token
2. **Token rotation**: Periodically rotate your token (every 6-12 months)
3. **Secure certificate files**: Don't leave certificate files in downloads folder
4. **Review permissions**: Ensure only authorized users can edit certificate pages

## Troubleshooting

### "No marker sections found"

**Problem**: Confluence page doesn't have HTML comment markers.

**Solution**: Add marker sections to your page. See [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md).

**Workaround**: The certificate will be appended to the end of the page, but this isn't ideal.

---

### "Authentication failed"

**Problem**: Bearer token is invalid or expired.

**Solutions**:
1. Verify the token in Confluence (Settings → Personal Access Tokens)
2. Check if the token has been revoked or expired
3. Create a new token and update configuration
4. Ensure the token has permissions for the target space

---

### "Page not found: YYYY-MM Certificates"

**Problem**: The monthly page doesn't exist yet.

**Solution**: Create the page in Confluence:
1. Navigate to your certificate space
2. Create a new page titled exactly `YYYY-MM Certificates` (e.g., `2026-12 Certificates`)
3. Add marker sections (see [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md))

---

### Certificate parsing fails

**Problem**: File format not recognized or corrupted.

**Solutions**:
1. Verify the file is a valid certificate
2. Try converting the certificate to PEM format
3. Check the file isn't corrupted (re-download or re-export)
4. For P12/PFX, ensure you have the correct password

---

### Wrong CA section

**Problem**: Certificate goes to the wrong section (e.g., LEGACY instead of SECTIGO).

**Cause**: The Issuing CA name doesn't match expected patterns.

**Solution**:
1. Edit the certificate entry after submission in Confluence
2. Or, before submitting, manually edit the "Issuing CA" field to include the expected keyword (e.g., add "Sectigo" to the CA name)

---

### Duplicate entries

**Problem**: Certificate appears twice in Confluence.

**Causes**:
- Submitted twice accidentally
- Marker sections not set up correctly

**Solution**:
1. Manually delete the duplicate entry in Confluence
2. Verify marker sections are properly configured
3. Only submit once per certificate

---

### Table formatting issues

**Problem**: Table columns are too narrow or text wraps awkwardly.

**Cause**: Column width styling may not be applied to existing tables.

**Solution**: The latest version includes column width styling. For existing tables:
1. Edit the Confluence page
2. Manually adjust column widths in the table editor
3. Or, recreate the table using the latest version of the tool

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [README.md](./README.md) for general information
2. Review [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md) for page setup
3. See [DEVELOPMENT.md](./DEVELOPMENT.md) if building from source
4. Open an issue on the GitHub repository

## Appendix: Field Reference

### Table Format in Confluence

Certificates are stored in tables with these columns:

| Column | Source | Example |
|--------|--------|---------|
| Expiration | Parsed from certificate | `12/09/2026` |
| CN | Parsed from certificate | `*.example.com` |
| SANs | Parsed from certificate | `example.com`<br>`www.example.com` |
| Issuing CA | Parsed from certificate | `Sectigo RSA DV` |
| Requestor | User input | `John Smith` |
| Location | User input | `Production LB` |
| Distribution Group | User input | `Platform Team` |
| Notes | User input | `Auto-renewed` |

### Date Format

All dates in Certificate Journal use **MM/DD/YYYY** format:

- ✅ Correct: `12/09/2026`
- ❌ Wrong: `2026-12-09`
- ❌ Wrong: `09/12/2026` (DD/MM/YYYY)

This applies to:
- Preview screen
- Confluence submission
- Table display
