import React, { useState, useEffect } from 'react';
import type { AppSettings, ConfluenceType } from '../../shared/types';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState('');
  const [confluenceType, setConfluenceType] = useState<ConfluenceType>('cloud');
  const [spaceKey, setSpaceKey] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const config = await window.api.settings.getConfig();
        const hasCreds = await window.api.settings.hasCredentials();

        if (config) {
          setBaseUrl(config.confluenceBaseUrl);
          setConfluenceType(config.confluenceType);
          setSpaceKey(config.confluenceSpaceKey);
          setUsername(config.confluenceUsername);
        }

        setHasCredentials(hasCreds);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleTestConnection = async () => {
    console.log('=== TEST CONNECTION CLICKED ===');
    console.log('Config:', { baseUrl, type: confluenceType, spaceKey, username, hasToken: !!token });

    setIsTesting(true);
    setTestResult(null);

    try {
      console.log('Calling testConnection API...');
      const result = await window.api.confluence.testConnection({
        baseUrl,
        type: confluenceType,
        spaceKey,
        username,
        token: token || '', // Use new token if provided, otherwise test will fail if no stored creds
      });

      console.log('Test result:', result);
      setTestResult(result);
    } catch (error) {
      console.error('Test connection error:', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveResult(null);

    try {
      // Save non-sensitive config
      const config: AppSettings = {
        confluenceBaseUrl: baseUrl,
        confluenceType,
        confluenceSpaceKey: spaceKey,
        confluenceUsername: username,
      };

      await window.api.settings.saveConfig(config);

      // Save credentials if token is provided
      if (token) {
        await window.api.settings.saveCredentials({ username, token });
        setHasCredentials(true);
        setToken(''); // Clear the token field after saving
      }

      setSaveResult({ success: true, message: 'Settings saved successfully!' });
    } catch (error) {
      setSaveResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCredentials = async () => {
    if (confirm('Are you sure you want to clear your stored credentials?')) {
      await window.api.settings.clearCredentials();
      setHasCredentials(false);
      setToken('');
    }
  };

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure your Confluence connection</p>
      </div>

      <form onSubmit={handleSave} className="settings-form card">
        <div className="form-section">
          <h2>Confluence Connection</h2>

          <div className="form-group">
            <label className="form-label">Confluence Type</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="confluenceType"
                  value="cloud"
                  checked={confluenceType === 'cloud'}
                  onChange={() => setConfluenceType('cloud')}
                />
                <span>Atlassian Cloud</span>
                <span className="radio-hint">(yourcompany.atlassian.net)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="confluenceType"
                  value="server"
                  checked={confluenceType === 'server'}
                  onChange={() => setConfluenceType('server')}
                />
                <span>Server / Data Center</span>
                <span className="radio-hint">(self-hosted)</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Base URL</label>
            <input
              type="url"
              className="form-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                confluenceType === 'cloud'
                  ? 'https://yourcompany.atlassian.net'
                  : 'https://confluence.yourcompany.com'
              }
              required
            />
            <span className="form-hint">
              {confluenceType === 'cloud'
                ? 'Your Atlassian Cloud URL (without /wiki)'
                : 'Your Confluence Server URL'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Space Key</label>
            <input
              type="text"
              className="form-input"
              value={spaceKey}
              onChange={(e) => setSpaceKey(e.target.value.toUpperCase())}
              placeholder="e.g., SEC, CERTS, IT"
              required
            />
            <span className="form-hint">
              The key of the Confluence space containing your monthly pages
            </span>
          </div>
        </div>

        <div className="form-section">
          <h2>Authentication</h2>

          <div className="form-group">
            <label className="form-label">
              {confluenceType === 'cloud' ? 'Email Address' : 'Username'}
            </label>
            <input
              type={confluenceType === 'cloud' ? 'email' : 'text'}
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={confluenceType === 'cloud' ? 'you@company.com' : 'username'}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {confluenceType === 'cloud' ? 'API Token' : 'Personal Access Token'}
              {hasCredentials && <span className="credential-badge">Stored</span>}
            </label>
            <input
              type="password"
              className="form-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasCredentials ? '••••••••••••' : 'Enter your token'}
            />
            <span className="form-hint">
              {confluenceType === 'cloud' ? (
                <>
                  Create an API token at{' '}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Atlassian Account Settings
                  </a>
                </>
              ) : (
                'Create a Personal Access Token in your Confluence profile settings'
              )}
            </span>
            {hasCredentials && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearCredentials}
                style={{ marginTop: '8px' }}
              >
                Clear Stored Credentials
              </button>
            )}
          </div>
        </div>

        {testResult && (
          <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
            {testResult.success
              ? 'Connection successful!'
              : `Connection failed: ${testResult.error}`}
          </div>
        )}

        {saveResult && (
          <div className={`alert ${saveResult.success ? 'alert-success' : 'alert-error'}`}>
            {saveResult.message}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={isTesting || !baseUrl || !spaceKey || !username || (!token && !hasCredentials)}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
