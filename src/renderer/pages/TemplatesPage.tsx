import React, { useState, useEffect } from 'react';
import type { Template, CreateTemplateInput } from '../../shared/types';
import './TemplatesPage.css';

interface TemplateFormData {
  name: string;
  description: string;
  requestor: string;
  location: string;
  distributionGroup: string;
  notes: string;
  isDefault: boolean;
}

const emptyForm: TemplateFormData = {
  name: '',
  description: '',
  requestor: '',
  location: '',
  distributionGroup: '',
  notes: '',
  isDefault: false,
};

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const loaded = await window.api.templates.getAll();
      setTemplates(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      requestor: template.requestor || '',
      location: template.location || '',
      distributionGroup: template.distributionGroup || '',
      notes: template.notes || '',
      isDefault: template.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await window.api.templates.delete(id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await window.api.templates.setDefault(id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default template');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (editingTemplate) {
        // Update existing template
        await window.api.templates.update({
          id: editingTemplate.id,
          ...formData,
        });
      } else {
        // Create new template
        const input: CreateTemplateInput = {
          name: formData.name,
          description: formData.description || undefined,
          requestor: formData.requestor || undefined,
          location: formData.location || undefined,
          distributionGroup: formData.distributionGroup || undefined,
          notes: formData.notes || undefined,
          isDefault: formData.isDefault,
        };
        await window.api.templates.create(input);
      }

      await loadTemplates();
      setIsModalOpen(false);
      setFormData(emptyForm);
      setEditingTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="templates-page">
        <div className="loading">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="templates-page">
      <div className="templates-header">
        <div>
          <h1>Templates</h1>
          <p>Create templates to quickly fill in certificate metadata</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          + New Template
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button className="alert-close" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No templates yet</h3>
          <p>Create a template to quickly fill in certificate metadata fields.</p>
          <button className="btn btn-primary" onClick={handleCreate}>
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-card card">
              <div className="template-card-header">
                <h3>{template.name}</h3>
                {template.isDefault && <span className="default-badge">Default</span>}
              </div>
              {template.description && (
                <p className="template-description">{template.description}</p>
              )}
              <div className="template-fields">
                {template.requestor && (
                  <div className="template-field">
                    <span className="field-label">Requestor:</span>
                    <span className="field-value">{template.requestor}</span>
                  </div>
                )}
                {template.location && (
                  <div className="template-field">
                    <span className="field-label">Location:</span>
                    <span className="field-value">{template.location}</span>
                  </div>
                )}
                {template.distributionGroup && (
                  <div className="template-field">
                    <span className="field-label">Distribution Group:</span>
                    <span className="field-value">{template.distributionGroup}</span>
                  </div>
                )}
              </div>
              <div className="template-actions">
                {!template.isDefault && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSetDefault(template.id)}
                  >
                    Set as Default
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleEdit(template)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(template.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h2>{editingTemplate ? 'Edit Template' : 'New Template'}</h2>
              <button className="btn-icon" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Template Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Web Server, Internal API"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of when to use this template"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Requestor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.requestor}
                    onChange={(e) => setFormData({ ...formData, requestor: e.target.value })}
                    placeholder="Who typically requests these certificates?"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Where are these certificates typically installed?"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Distribution Group</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.distributionGroup}
                    onChange={(e) =>
                      setFormData({ ...formData, distributionGroup: e.target.value })
                    }
                    placeholder="Distribution group for notifications"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any default notes to include"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    />
                    <span>Set as default template</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
