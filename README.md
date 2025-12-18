# Certificate Journal

A desktop application for cataloging SSL/TLS certificates to Atlassian Confluence Server/Data Center.

## Overview

Certificate Journal is an Electron-based desktop application that helps you manage and track SSL/TLS certificates by automatically documenting them in Confluence pages. The tool parses certificate files (PEM, DER, CRT, P12, PFX), extracts key information, and submits it to organized tables in Confluence.

### Key Features

- 📜 **Certificate Parsing**: Supports PEM, DER, CRT, P12, and PFX formats
- 🔒 **Password-Protected Files**: Handles encrypted certificate files with password prompts
- 📊 **Organized Documentation**: Automatically organizes certificates by issuing CA in dedicated sections
- 🗓️ **Date-Based Organization**: Certificates are filed to monthly Confluence pages based on expiration date
- ✅ **Safe Append-Only**: Never overwrites or deletes existing certificate entries
- 🎯 **Confluence Integration**: Direct integration with Confluence Server/DC REST API
- 🔐 **Secure Authentication**: Bearer token authentication with secure credential storage

## Prerequisites

- **Operating System**: Linux, macOS, or Windows
- **Confluence**: Confluence Server or Data Center 9.2.6+ (not compatible with Confluence Cloud)
- **Authentication**: Confluence Bearer token (Personal Access Token)
- **Confluence Pages**: Monthly certificate pages with proper marker sections (see [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md))

## Installation

### Option 1: Install from Package (Recommended)

#### Linux (Debian/Ubuntu)
```bash
sudo dpkg -i cert-journal_1.0.0_amd64.deb
```

#### Linux (Fedora/RHEL)
```bash
sudo rpm -i cert-journal-1.0.0-1.x86_64.rpm
```

#### macOS
1. Download the `.zip` file
2. Extract `Certificate Journal.app`
3. Drag to Applications folder
4. Right-click and select "Open" (first time only)

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/InfiniteInsight/cert-journal.git
cd cert-journal

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run make
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed build instructions.

## Quick Start

### 1. Configure Confluence Connection

On first launch, you'll need to configure your Confluence connection:

1. **Confluence URL**: Your Confluence Server URL (e.g., `https://confluence.corp.example.com`)
2. **Space Key**: The Confluence space where certificate pages are stored
3. **Bearer Token**: Your Confluence Personal Access Token

**To create a Bearer Token in Confluence:**
1. Go to your Confluence profile → Settings
2. Navigate to "Personal Access Tokens"
3. Click "Create token"
4. Give it a name (e.g., "Certificate Journal")
5. Copy the token (you won't see it again!)

### 2. Set Up Confluence Pages

Before using the tool, your Confluence pages must have the proper marker sections. See [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md) for detailed setup instructions.

### 3. Load and Submit a Certificate

1. Click **"Load Certificate"** or drag-and-drop a certificate file
2. If the certificate is password-protected, enter the password when prompted
3. Review the parsed certificate information
4. Fill in additional required fields:
   - **Requestor**: Person who requested the certificate
   - **Location**: Where the certificate is deployed
   - **Distribution Group**: Team or group responsible
   - **Notes**: Any additional information
5. Click **"Submit to Confluence"**
6. The certificate will be automatically added to the appropriate monthly page and CA section

## How It Works

### Certificate Organization

Certificates are automatically organized by:

1. **Monthly Pages**: Based on expiration date (e.g., "2026-12 Certificates")
2. **CA Sections**: Grouped by issuing Certificate Authority:
   - **SECTIGO**: Sectigo certificates
   - **PKI-TIVO-COM**: TiVo/internal PKI certificates
   - **THIRD-PARTY**: DigiCert, GoDaddy, Let's Encrypt, etc.
   - **SDV**: SDV certificates
   - **LEGACY**: Unknown or legacy CAs

### Page Structure

Each Confluence page uses HTML comment markers to define sections:

```
<!-- SECTIGO-START -->
Public Server Certificates - Sectigo
[Table with all Sectigo certificates]
<!-- SECTIGO-END -->
```

The tool finds the appropriate section and appends new certificates to the existing table.

### Safety Features

- **Append-Only**: Never deletes or overwrites existing entries
- **Non-Destructive**: Only adds new rows to existing tables
- **Marker-Based**: Uses clear section markers to avoid accidental edits
- **Fallback Mode**: If markers aren't found, appends to end of page (safe mode)

## Supported Certificate Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| PEM | `.pem`, `.crt`, `.cer` | Base64-encoded certificates |
| DER | `.der`, `.cer` | Binary DER-encoded certificates |
| PKCS#12 | `.p12`, `.pfx` | Password-protected certificate bundles |

## Troubleshooting

### "No marker sections found"

Your Confluence page doesn't have the required HTML comment markers. See [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md) to add them.

### "Authentication failed"

- Verify your Bearer token is correct and hasn't expired
- Check that your Confluence URL is correct
- Ensure your token has permission to edit the target space

### "Page not found"

The monthly page doesn't exist yet. Create a page with the correct naming format (e.g., "2026-12 Certificates") and add the required marker sections.

### Certificate parsing errors

- Verify the file is a valid certificate
- For P12/PFX files, ensure you're entering the correct password
- Check that the file isn't corrupted

## Documentation

- [USER_GUIDE.md](./USER_GUIDE.md) - Detailed usage instructions
- [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md) - Setting up Confluence pages
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Developer guide

## Security & Privacy

- **Credentials**: Stored securely using the system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Bearer Token**: Never logged or transmitted except to your configured Confluence server
- **Local Processing**: Certificate parsing happens entirely on your machine
- **No Telemetry**: No usage data is collected or transmitted

## System Requirements

- **Memory**: 200MB RAM minimum
- **Disk Space**: 150MB for installation
- **Network**: HTTPS access to your Confluence server

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

## Version

Current version: 1.0.0
