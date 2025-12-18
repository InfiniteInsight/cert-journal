# Certificate Journal - Development Guide

Developer documentation for building, testing, and contributing to Certificate Journal.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Building](#building)
5. [Testing](#testing)
6. [Code Standards](#code-standards)
7. [Release Process](#release-process)
8. [Troubleshooting Development Issues](#troubleshooting-development-issues)
9. [Contributing](#contributing)

## Development Setup

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: For version control
- **Platform-specific**:
  - **Linux**: `libsecret` for credential storage
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/InfiniteInsight/cert-journal.git
cd cert-journal

# Install dependencies
npm install

# Run in development mode
npm start
```

### Development Mode

Running `npm start` will:
- Launch the Electron app with hot-reload
- Open DevTools automatically
- Use development webpack configuration
- Enable source maps for debugging

**Note**: In development mode (`NODE_ENV=development`), the DevTools console opens automatically on app launch.

### Environment Variables

The app automatically detects the environment:

- **Development**: `NODE_ENV=development` (set by `npm start`)
- **Production**: `NODE_ENV=production` (set by `npm run make`)

No manual environment configuration is needed.

## Project Structure

```
cert-journal/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main process entry point
│   │   ├── services/      # Business logic services
│   │   │   ├── certificateParser.ts  # Certificate parsing
│   │   │   ├── confluence.ts         # Confluence API client
│   │   │   └── storage.ts            # Local data storage
│   │   ├── utils/         # Utility functions
│   │   │   └── storageFormat.ts      # Confluence format builder
│   │   └── windows/       # Window management
│   │       └── mainWindow.ts
│   ├── preload/           # Preload scripts (IPC bridge)
│   │   └── index.ts
│   ├── renderer/          # React frontend
│   │   ├── components/    # React components
│   │   │   └── CertificateForm/
│   │   ├── pages/         # Page components
│   │   │   └── HomePage.tsx
│   │   ├── index.tsx      # Renderer entry point
│   │   └── index.html     # HTML template
│   └── shared/            # Shared types/constants
│       └── types.ts
├── forge.config.ts        # Electron Forge configuration
├── webpack.main.config.ts # Webpack config for main process
├── webpack.renderer.config.ts  # Webpack config for renderer
├── package.json
└── tsconfig.json
```

### Key Files

#### `/src/main/index.ts`
Main process entry point. Handles:
- App lifecycle
- Window creation
- IPC handlers
- System integration

#### `/src/main/services/certificateParser.ts`
Certificate parsing logic:
- Reads certificate files (PEM, DER, P12, PFX)
- Extracts CN, SANs, expiration, issuing CA
- Handles password-protected certificates

#### `/src/main/services/confluence.ts`
Confluence API integration:
- REST API client
- Bearer token authentication
- Page retrieval and updates
- Error handling

#### `/src/main/utils/storageFormat.ts`
**CRITICAL FILE**: Confluence storage format builder
- Builds tables in Confluence storage format (XHTML)
- Handles marker section detection
- **APPEND-ONLY approach** - never deletes existing data
- Generates table rows with proper escaping

#### `/src/renderer/pages/HomePage.tsx`
Main UI component:
- Certificate loading
- Form handling
- Preview generation
- Submission logic

#### `/src/preload/index.ts`
IPC bridge between main and renderer:
- Exposes safe APIs to renderer
- Handles context isolation
- Type-safe IPC

## Architecture

### Electron Multi-Process Model

```
┌─────────────────────────────────────┐
│         Main Process                │
│  (Node.js, system access)           │
│                                     │
│  ├── Certificate Parser             │
│  ├── Confluence API Client          │
│  ├── Credential Storage             │
│  └── IPC Handlers                   │
└──────────────┬──────────────────────┘
               │ IPC
               │
┌──────────────┴──────────────────────┐
│         Renderer Process            │
│  (Chromium, React UI)               │
│                                     │
│  ├── Certificate Form               │
│  ├── Preview                        │
│  └── User Interface                 │
└─────────────────────────────────────┘
```

### Data Flow

```
1. User loads certificate file
   ↓
2. Renderer → IPC → Main Process
   ↓
3. Certificate Parser extracts data
   ↓
4. Main → IPC → Renderer (parsed data)
   ↓
5. User fills additional fields
   ↓
6. User clicks Submit
   ↓
7. Renderer → IPC → Main Process
   ↓
8. Storage Format Builder creates table row
   ↓
9. Confluence API Client submits to Confluence
   ↓
10. Main → IPC → Renderer (success/error)
```

### Confluence Integration

#### Storage Format

Confluence Server/DC uses **Confluence Storage Format** (XML-based):

```xml
<table style="width: 100%; table-layout: auto;">
<tbody>
<tr>
  <th style="min-width: 90px;">Expiration</th>
  <th style="min-width: 200px;">CN</th>
  ...
</tr>
<tr>
  <td>12/09/2026</td>
  <td>*.example.com</td>
  ...
</tr>
</tbody>
</table>
```

#### Marker Sections

HTML comment markers use structured macros:

```xml
<ac:structured-macro ac:name="htmlcomment">
  <ac:rich-text-body>
    <p>SECTIGO-START</p>
  </ac:rich-text-body>
</ac:structured-macro>
```

#### Append-Only Safety

**Critical Design Decision**: The tool uses an **append-only approach** to prevent data loss:

1. ✅ Find existing table
2. ✅ Locate closing `</tbody>` tag
3. ✅ Insert new row before `</tbody>`
4. ❌ DO NOT parse existing rows
5. ❌ DO NOT rebuild table
6. ❌ DO NOT replace content

See `/src/main/utils/storageFormat.ts:508-565` for implementation.

## Building

### Development Build

```bash
# Run with hot-reload
npm start
```

### Production Build

```bash
# Package and create installers
npm run make
```

**Output**: `out/make/`

Platform-specific builds:

#### Linux
```bash
npm run make
```
Creates:
- `.deb` (Debian/Ubuntu)
- `.rpm` (Fedora/RHEL)

#### macOS
```bash
npm run make
```
Creates:
- `.zip` containing `.app` bundle

**Note**: Must build on macOS for macOS packages (no cross-compilation)

#### Windows
```bash
npm run make
```
Creates:
- Squirrel installer

### Package Only (No Installer)

```bash
npm run package
```

Creates runnable app in `out/` without creating installers.

### Build Configuration

Build settings are in `forge.config.ts`:

```typescript
{
  packagerConfig: {
    asar: {
      unpack: '**/*.{node,dll,so,dylib}',
    },
  },
  makers: [
    new MakerSquirrel({}),      // Windows
    new MakerZIP({}, ['darwin']), // macOS
    new MakerRpm({}),            // Linux RPM
    new MakerDeb({}),            // Linux DEB
  ],
  // ...
}
```

## Testing

### Test Framework

The project uses **Playwright** for end-to-end testing:

```bash
# Run tests (headless)
npm test

# Run tests (headed - visible browser)
npm run test:headed

# Debug tests
npm run test:debug
```

### Test Structure

Tests are located in `tests/` directory (if exists).

### Writing Tests

Example test:

```typescript
import { test, expect } from '@playwright/test';

test('loads certificate file', async ({ page }) => {
  // Launch the Electron app
  await page.goto('app://.');

  // Interact with the app
  await page.click('#load-certificate');

  // Assertions
  await expect(page.locator('#certificate-cn')).toBeVisible();
});
```

### Manual Testing Checklist

Before release, manually test:

- ✅ Certificate loading (PEM, DER, P12, PFX)
- ✅ Password-protected certificates
- ✅ Form validation
- ✅ Confluence submission
- ✅ Error handling
- ✅ Settings persistence
- ✅ Credential storage

## Code Standards

### TypeScript

- **Strict mode**: Enabled in `tsconfig.json`
- **Type safety**: No `any` types
- **Interfaces**: Define all data structures in `src/shared/types.ts`

### Linting

```bash
# Run ESLint
npm run lint
```

ESLint configuration in `.eslintrc.json` (if exists).

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line length**: 100 characters max
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_SNAKE_CASE` for constants

### File Organization

- **One component per file**
- **Services in `/main/services/`**
- **Utilities in `/main/utils/`**
- **Types in `/shared/types.ts`**

### Documentation

- **JSDoc comments** for public functions
- **Inline comments** for complex logic
- **README** for major features

Example:

```typescript
/**
 * Parse a certificate file and extract key information
 * @param filePath Absolute path to certificate file
 * @param password Optional password for encrypted certificates
 * @returns Parsed certificate data
 */
export async function parseCertificate(
  filePath: string,
  password?: string
): Promise<CertificateData> {
  // Implementation
}
```

## Release Process

### Version Bumping

1. Update version in `package.json`:
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. Commit the version change:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.1.0"
   ```

### Creating a Release

1. **Build for all platforms**:
   ```bash
   # On Linux
   npm run make

   # On macOS
   npm run make

   # On Windows
   npm run make
   ```

2. **Test the builds**:
   - Install and run on target platforms
   - Test critical functionality
   - Verify no regressions

3. **Tag the release**:
   ```bash
   git tag -a v1.1.0 -m "Release version 1.1.0"
   git push origin v1.1.0
   ```

4. **Create GitHub Release**:
   - Go to GitHub → Releases → New Release
   - Select the tag
   - Add release notes
   - Upload build artifacts (`.deb`, `.rpm`, `.zip`, etc.)

### Release Notes Template

```markdown
## Version 1.1.0

### New Features
- Added support for ECC certificates
- Improved table column widths

### Bug Fixes
- Fixed date format to use MM/DD/YYYY
- Fixed data deletion issue with append-only approach

### Changes
- Updated dependencies
- Improved error messages

### Known Issues
- None
```

## Troubleshooting Development Issues

### Build Failures

**Problem**: `npm install` fails

**Solutions**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`
- Update npm: `npm install -g npm@latest`

---

**Problem**: Native module compilation fails

**Solutions**:
- Install build tools:
  - **Linux**: `sudo apt install build-essential`
  - **macOS**: `xcode-select --install`
  - **Windows**: Install Visual Studio Build Tools
- Rebuild native modules: `npm rebuild`

---

### Development Server Issues

**Problem**: Hot reload not working

**Solution**: Restart the development server

---

**Problem**: Changes not reflected

**Solution**:
- Clear webpack cache
- Restart development server
- Hard refresh in DevTools (Cmd/Ctrl + Shift + R)

---

### Credential Storage Issues

**Problem**: Credentials not persisting

**Solutions**:
- **Linux**: Install `libsecret`:
  ```bash
  sudo apt install libsecret-1-dev
  ```
- **macOS**: Keychain permissions may be required
- **Windows**: Check Windows Credential Manager

---

### Confluence API Issues

**Problem**: CORS errors in development

**Note**: Electron apps don't have CORS restrictions. This shouldn't happen.

**If it does**:
- Verify you're using the main process for API calls, not renderer
- Check that API calls are in `/src/main/services/confluence.ts`

---

## Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```

3. Make your changes
4. Test thoroughly
5. Commit with descriptive messages:
   ```bash
   git commit -m "Add support for ECC certificates"
   ```

6. Push to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```

7. Open a Pull Request

### Pull Request Guidelines

- **Description**: Clearly describe what the PR does
- **Tests**: Include tests for new features
- **Documentation**: Update README/docs if needed
- **Code style**: Follow existing conventions
- **Commits**: Use clear, descriptive commit messages

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example**:
```
feat: Add support for ECC certificates

- Parse ECC certificate format
- Handle EC public keys
- Update tests

Closes #123
```

### Code Review Process

1. PR is submitted
2. Automated tests run
3. Code review by maintainers
4. Address feedback
5. Approval and merge

## Dependencies

### Key Dependencies

- **electron**: Desktop app framework
- **react**: UI framework
- **axios**: HTTP client for Confluence API
- **node-forge**: Certificate parsing
- **keytar**: Secure credential storage
- **better-sqlite3**: Local database

### Development Dependencies

- **@electron-forge/cli**: Build tooling
- **typescript**: Type safety
- **webpack**: Module bundler
- **@playwright/test**: End-to-end testing
- **eslint**: Code linting

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update <package-name>

# Update all packages (careful!)
npm update
```

**Test thoroughly after updating dependencies!**

## Architecture Decisions

### Why Electron?

- **Cross-platform**: Single codebase for Linux, macOS, Windows
- **Native integration**: Access to system keychain, file system
- **Modern UI**: React + modern web technologies
- **Desktop app**: Better UX than web app for file handling

### Why React?

- **Component-based**: Modular, reusable UI components
- **Rich ecosystem**: Large library of components and tools
- **Developer experience**: Hot reload, DevTools

### Why Append-Only Approach?

**Critical Design Decision**:

The tool uses an append-only approach instead of parsing and rebuilding tables because:

1. **Safety**: Never risk deleting existing data
2. **Simplicity**: No complex parsing logic
3. **Reliability**: Fewer failure points
4. **Confluence compatibility**: Avoids issues with varying HTML formats

**Trade-off**: Tables aren't automatically sorted after adding new entries. Users can manually sort in Confluence if needed.

### Why Confluence Server/DC Only?

Confluence Server/DC uses **Storage Format** (XML-based), which is different from Confluence Cloud's format. The tool is specifically designed for the Storage Format used by Server/DC.

## Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)
- [Confluence REST API](https://developer.atlassian.com/server/confluence/confluence-server-rest-api/)
- [Node-Forge Documentation](https://github.com/digitalbazaar/forge)

## Getting Help

- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: Contact maintainers (if applicable)

## License

MIT License - see LICENSE file for details
