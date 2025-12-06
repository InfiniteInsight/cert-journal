import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropZone } from '../components/DropZone';
import { CertificateForm } from '../components/CertificateForm';
import type { ParsedCertificate, Template, CertificateEntry, TableRow } from '../../shared/types';
import { getMonthPageForDate } from '../../shared/constants';
import './HomePage.css';

interface CertWithMeta extends ParsedCertificate {
  id: string;
  duplicateWarning?: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<CertWithMeta[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);
  const [password, setPassword] = useState('');

  // Check if Confluence is configured
  useEffect(() => {
    const checkConfig = async () => {
      const config = await window.api.settings.getConfig();
      const hasCreds = await window.api.settings.hasCredentials();
      setHasConfig(config !== null && hasCreds);
    };
    checkConfig();
  }, []);

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      const loaded = await window.api.templates.getAll();
      setTemplates(loaded);
    };
    loadTemplates();
  }, []);

  const handleFilesDropped = useCallback(async (filePaths: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await window.api.certificate.parse(filePaths);

      const newCerts: CertWithMeta[] = [];
      const needsPassword: Array<{ filePath: string; fileName: string }> = [];

      for (const result of results) {
        if ('error' in result) {
          if (result.error === 'PASSWORD_REQUIRED') {
            needsPassword.push({
              filePath: (result as { filePath?: string }).filePath || '',
              fileName: result.fileName,
            });
          } else {
            setError(`Error parsing ${result.fileName}: ${result.error}`);
          }
        } else {
          newCerts.push({
            ...result,
            id: `${result.cn}-${Date.now()}-${Math.random()}`,
          });
        }
      }

      // Add parsed certs
      setCertificates((prev) => [...prev, ...newCerts]);

      // Check for duplicates
      for (const cert of newCerts) {
        const targetPage = getMonthPageForDate(new Date(cert.expirationDate));
        const check = await window.api.confluence.checkDuplicate({
          cn: cert.cn,
          pageTitle: targetPage,
        });

        if (check.isDuplicate) {
          setCertificates((prev) =>
            prev.map((c) =>
              c.id === cert.id
                ? { ...c, duplicateWarning: `"${cert.cn}" already exists on ${targetPage}` }
                : c
            )
          );
        }
      }

      // Handle password-protected files
      if (needsPassword.length > 0) {
        setPasswordPrompt(needsPassword[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse certificates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPrompt) return;

    setIsLoading(true);

    try {
      const results = await window.api.certificate.parseWithPassword([
        { filePath: passwordPrompt.filePath, password },
      ]);

      for (const result of results) {
        if ('error' in result) {
          setError(`Error parsing ${result.fileName}: ${result.error}`);
        } else {
          const cert: CertWithMeta = {
            ...result,
            id: `${result.cn}-${Date.now()}-${Math.random()}`,
          };
          setCertificates((prev) => [...prev, cert]);

          // Check for duplicate
          const targetPage = getMonthPageForDate(new Date(cert.expirationDate));
          const check = await window.api.confluence.checkDuplicate({
            cn: cert.cn,
            pageTitle: targetPage,
          });

          if (check.isDuplicate) {
            setCertificates((prev) =>
              prev.map((c) =>
                c.id === cert.id
                  ? { ...c, duplicateWarning: `"${cert.cn}" already exists on ${targetPage}` }
                  : c
              )
            );
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse certificate');
    } finally {
      setIsLoading(false);
      setPasswordPrompt(null);
      setPassword('');
    }
  };

  const handleSubmit = async (entry: CertificateEntry) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const targetPage = getMonthPageForDate(new Date(entry.expirationDate));
      const expirationStr = new Date(entry.expirationDate).toISOString().split('T')[0];

      const row: TableRow = {
        expiration: expirationStr,
        cn: entry.cn,
        sans: entry.sans,
        issuingCA: entry.issuingCA,
        requestor: entry.requestor,
        location: entry.location,
        distributionGroup: entry.distributionGroup,
        notes: entry.notes,
      };

      const result = await window.api.confluence.appendToTable({
        pageTitle: targetPage,
        rows: [row],
        templateId: entry.templateId,
      });

      if (result.success) {
        // Remove the submitted certificate from the list
        setCertificates((prev) => prev.filter((c) => c.cn !== entry.cn || c.fileName !== entry.fileName));
        setSuccess(`Successfully added "${entry.cn}" to ${targetPage}`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(result.error || 'Failed to add entry to Confluence');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit certificate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = (certId: string) => {
    setCertificates((prev) => prev.filter((c) => c.id !== certId));
  };

  const handleCancel = () => {
    setCertificates([]);
  };

  if (hasConfig === null) {
    return (
      <div className="home-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!hasConfig) {
    return (
      <div className="home-page">
        <div className="card setup-prompt">
          <h2>Welcome to Certificate Journal</h2>
          <p>Before you can start logging certificates, you need to configure your Confluence connection.</p>
          <button className="btn btn-primary" onClick={() => navigate('/settings')}>
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Certificate Journal</h1>
        <p>Drag and drop certificate files to add them to your Confluence journal</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess(null)}>
            ✕
          </button>
        </div>
      )}

      {passwordPrompt && (
        <div className="password-modal-overlay">
          <div className="password-modal card">
            <h3>Password Required</h3>
            <p>
              The file <strong>{passwordPrompt.fileName}</strong> requires a password.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                />
              </div>
              <div className="password-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPasswordPrompt(null);
                    setPassword('');
                  }}
                >
                  Skip
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Decrypting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DropZone onFilesDropped={handleFilesDropped} disabled={isLoading || isSubmitting} />

      {isLoading && (
        <div className="loading-indicator">
          <span>Parsing certificates...</span>
        </div>
      )}

      {certificates.length > 0 && (
        <div className="certificates-section">
          <div className="certificates-header">
            <h2>Certificates ({certificates.length})</h2>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Clear All
            </button>
          </div>

          <div className="certificates-list">
            {certificates.map((cert) => (
              <CertificateForm
                key={cert.id}
                certificate={cert}
                templates={templates}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                onRemove={() => handleRemove(cert.id)}
                duplicateWarning={cert.duplicateWarning}
                isSubmitting={isSubmitting}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
