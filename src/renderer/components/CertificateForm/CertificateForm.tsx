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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

      <form onSubmit={handleSubmit} className="cert-form-fields">
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
            {isSubmitting ? 'Submitting...' : 'Add to Confluence'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CertificateForm;
