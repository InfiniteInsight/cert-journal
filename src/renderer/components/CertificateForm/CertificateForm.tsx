import React, { useState, useEffect } from 'react';
import type { ParsedCertificate, Template, CertificateEntry } from '../../../shared/types';
import { getMonthPageForDate } from '../../../shared/constants';
import './CertificateForm.css';

interface CertificateFormProps {
  certificate: ParsedCertificate;
  templates: Template[];
  onSubmit: (entry: CertificateEntry) => void;
  onCancel: () => void;
  onRemove: () => void;
  duplicateWarning?: string;
  isSubmitting?: boolean;
}

const CertificateForm: React.FC<CertificateFormProps> = ({
  certificate,
  templates,
  onSubmit,
  onCancel,
  onRemove,
  duplicateWarning,
  isSubmitting = false,
}) => {
  const [requestor, setRequestor] = useState('');
  const [location, setLocation] = useState('');
  const [distributionGroup, setDistributionGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();
  const [showPreview, setShowPreview] = useState(false);

  // Get the target month page
  const targetPage = getMonthPageForDate(new Date(certificate.expirationDate));

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setRequestor(template.requestor || '');
        setLocation(template.location || '');
        setDistributionGroup(template.distributionGroup || '');
        setNotes(template.notes || '');
      }
    }
  }, [selectedTemplateId, templates]);

  // Auto-select default template on mount
  useEffect(() => {
    const defaultTemplate = templates.find((t) => t.isDefault);
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id);
    }
  }, [templates]);

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPreview(true);
  };

  const handleSubmit = () => {
    const entry: CertificateEntry = {
      ...certificate,
      requestor,
      location,
      distributionGroup,
      notes,
      templateId: selectedTemplateId,
    };

    onSubmit(entry);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateISO = (date: Date) => {
    return new Date(date).toISOString().split('T')[0];
  };

  const escapeXml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const buildTableRowHtml = (): string => {
    // Build SANs list
    const sansList =
      certificate.sans.length > 0
        ? `<ul>${certificate.sans.map((san) => `<li>${escapeXml(san)}</li>`).join('')}</ul>`
        : '';

    // Build the table row
    return `<tr>
<td>${escapeXml(formatDateISO(certificate.expirationDate))}</td>
<td>${escapeXml(certificate.cn)}</td>
<td>${sansList}</td>
<td>${escapeXml(certificate.issuingCA)}</td>
<td>${escapeXml(requestor || '')}</td>
<td>${escapeXml(location || '')}</td>
<td>${escapeXml(distributionGroup || '')}</td>
<td>${escapeXml(notes || '')}</td>
</tr>`;
  };

  const handleCopyEntry = async () => {
    const rowHtml = buildTableRowHtml();

    try {
      await navigator.clipboard.writeText(rowHtml);
      // You could add a toast notification here if you want
      console.log('Entry copied to clipboard');
    } catch (err) {
      console.error('Failed to copy entry:', err);
      alert('Failed to copy entry to clipboard');
    }
  };

  if (showPreview) {
    return (
      <div className="cert-form card">
        <div className="cert-form-header">
          <h3>Preview: {certificate.cn}</h3>
          <button
            type="button"
            className="btn-icon"
            onClick={onRemove}
            title="Remove certificate"
          >
            ✕
          </button>
        </div>

        <div className="preview-info">
          <p className="preview-description">
            This certificate will appear in the <strong>{targetPage}</strong> page under the{' '}
            <strong>{certificate.issuingCA}</strong> section, sorted by expiration date:
          </p>
        </div>

        <div className="confluence-table-preview">
          <h3 className="ca-section-header">{certificate.issuingCA}</h3>
          <table className="preview-table">
            <thead>
              <tr>
                <th>Expiration</th>
                <th>Common Name</th>
                <th>SANs</th>
                <th>Issuing CA</th>
                <th>Requestor</th>
                <th>Location</th>
                <th>Distribution Group</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatDateISO(certificate.expirationDate)}</td>
                <td>{certificate.cn}</td>
                <td>{certificate.sans.join(', ') || '-'}</td>
                <td>{certificate.issuingCA}</td>
                <td>{requestor || '-'}</td>
                <td>{location || '-'}</td>
                <td>{distributionGroup || '-'}</td>
                <td>{notes || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cert-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPreview(false)}
            disabled={isSubmitting}
          >
            Back to Edit
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyEntry}
            disabled={isSubmitting}
            title="Copy table row HTML to clipboard"
          >
            Copy Entry
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm & Add to Confluence'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cert-form card">
      <div className="cert-form-header">
        <h3>{certificate.cn}</h3>
        <button
          type="button"
          className="btn-icon"
          onClick={onRemove}
          title="Remove certificate"
        >
          ✕
        </button>
      </div>

      {duplicateWarning && (
        <div className="alert alert-warning">
          <strong>Warning:</strong> {duplicateWarning}
        </div>
      )}

      <div className="cert-info">
        <div className="cert-info-row">
          <span className="cert-info-label">Expiration:</span>
          <span className="cert-info-value">{formatDate(certificate.expirationDate)}</span>
        </div>
        <div className="cert-info-row">
          <span className="cert-info-label">Target Page:</span>
          <span className="cert-info-value cert-info-badge">{targetPage}</span>
        </div>
        <div className="cert-info-row">
          <span className="cert-info-label">Issuing CA:</span>
          <span className="cert-info-value">{certificate.issuingCA}</span>
        </div>
        {certificate.sans.length > 0 && (
          <div className="cert-info-row cert-info-sans">
            <span className="cert-info-label">SANs:</span>
            <ul className="sans-list">
              {certificate.sans.map((san, index) => (
                <li key={index}>{san}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={handlePreview} className="cert-form-fields">
        <div className="form-group">
          <label className="form-label">Template</label>
          <select
            className="form-select"
            value={selectedTemplateId || ''}
            onChange={(e) =>
              setSelectedTemplateId(e.target.value ? Number(e.target.value) : undefined)
            }
          >
            <option value="">No template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Requestor</label>
          <input
            type="text"
            className="form-input"
            value={requestor}
            onChange={(e) => setRequestor(e.target.value)}
            placeholder="Who requested this certificate?"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Installation Location</label>
          <input
            type="text"
            className="form-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where is this certificate installed?"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Distribution Group</label>
          <input
            type="text"
            className="form-input"
            value={distributionGroup}
            onChange={(e) => setDistributionGroup(e.target.value)}
            placeholder="Distribution group for notifications"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>

        <div className="cert-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            Preview Entry
          </button>
        </div>
      </form>
    </div>
  );
};

export default CertificateForm;
