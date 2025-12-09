import React, { useState, useCallback, useRef } from 'react';
import './DropZone.css';

interface DropZoneProps {
  onFilesDropped: (filePaths: string[]) => void;
  disabled?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validExtensions = ['.pem', '.crt', '.cer', '.der', '.p12', '.pfx'];

      const filePaths = files
        .filter((file) => {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          return validExtensions.includes(ext);
        })
        .map((file) => window.api.getPathForFile(file));

      if (filePaths.length > 0) {
        onFilesDropped(filePaths);
      }
    },
    [disabled, onFilesDropped]
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const filePaths = Array.from(files).map((file) => window.api.getPathForFile(file));
      if (filePaths.length > 0) {
        onFilesDropped(filePaths);
      }

      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [onFilesDropped]
  );

  return (
    <div
      className={`dropzone ${isDragOver ? 'dragover' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pem,.crt,.cer,.der,.p12,.pfx"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className="dropzone-content">
        <div className="dropzone-icon">📁</div>
        <div className="dropzone-text">
          <p className="dropzone-primary">
            {isDragOver ? 'Drop certificates here' : 'Drag & drop certificates here'}
          </p>
          <p className="dropzone-secondary">
            or click to browse (.pem, .crt, .cer, .der, .p12, .pfx)
          </p>
        </div>
      </div>
    </div>
  );
};

export default DropZone;
