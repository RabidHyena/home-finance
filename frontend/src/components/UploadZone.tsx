import { useState, useCallback } from 'react';
import { Upload, Image, X, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
}

export function UploadZone({
  onFileSelect,
  isLoading,
  accept = 'image/*',
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      setFileName(file.name);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
    setFileName(null);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <Loader2
          size={48}
          style={{
            color: 'var(--color-primary)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          Распознавание изображения...
        </p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (preview) {
    return (
      <div
        style={{
          border: '2px solid var(--color-border)',
          borderRadius: '0.75rem',
          padding: '1rem',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Image size={20} color="var(--color-success)" />
            <span style={{ fontWeight: 500 }}>{fileName}</span>
          </div>
          <button
            onClick={clearPreview}
            style={{
              padding: '0.25rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}
          >
            <X size={20} />
          </button>
        </div>
        <img
          src={preview}
          alt="Preview"
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'contain',
            borderRadius: '0.5rem',
          }}
        />
      </div>
    );
  }

  return (
    <label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        display: 'block',
        border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: '0.75rem',
        padding: '3rem',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging
          ? 'rgba(59, 130, 246, 0.05)'
          : 'var(--color-background)',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      <Upload
        size={48}
        style={{
          color: isDragging ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          marginBottom: '1rem',
        }}
      />
      <p
        style={{
          margin: 0,
          fontWeight: 500,
          color: 'var(--color-text)',
        }}
      >
        Перетащите скриншот сюда
      </p>
      <p
        style={{
          margin: '0.5rem 0 0',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        или нажмите для выбора файла
      </p>
      <p
        style={{
          margin: '1rem 0 0',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        Поддерживаются: JPG, PNG, GIF, WebP (до 10MB)
      </p>
    </label>
  );
}
