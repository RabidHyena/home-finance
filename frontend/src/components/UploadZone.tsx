import { useState, useCallback } from 'react';
import { Upload, Image, X, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (files: File[]) => void;
  isLoading?: boolean;
  accept?: string;
  multiple?: boolean;
}

export function UploadZone({
  onFileSelect,
  isLoading,
  accept = 'image/*',
  multiple = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  const handleFiles = useCallback(
    (fileList: File[]) => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const validFiles = fileList.filter(f => f.type.startsWith('image/'));

      if (validFiles.length === 0) {
        alert('Пожалуйста, выберите изображения');
        return;
      }

      const oversized = validFiles.filter(f => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        alert(`Файлы превышают 10MB: ${oversized.map(f => f.name).join(', ')}`);
        return;
      }

      if (multiple) {
        // Revoke old object URLs to prevent memory leaks
        previews.forEach(p => URL.revokeObjectURL(p.url));
        const newPreviews = validFiles.map(file => ({
          file,
          url: URL.createObjectURL(file)
        }));
        setPreviews(newPreviews);
      } else {
        // Single file mode (backwards compatibility)
        const file = validFiles[0];
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }

      onFileSelect(validFiles);
    },
    [onFileSelect, multiple, previews]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
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
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
    setFileName(null);
    previews.forEach(p => URL.revokeObjectURL(p.url));
    setPreviews([]);
  }, [previews]);

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

  // Multiple file preview
  if (previews.length > 0 && multiple) {
    return (
      <div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          {previews.map((preview, i) => (
            <div key={i} style={{
              border: '2px solid var(--color-border)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              backgroundColor: 'var(--color-surface)',
            }}>
              <img
                src={preview.url}
                alt={preview.file.name}
                style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.25rem' }}
              />
              <p style={{
                fontSize: '0.75rem',
                marginTop: '0.5rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {preview.file.name}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={clearPreview}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          Выбрать другие файлы
        </button>
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
        multiple={multiple}
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
        {multiple ? 'Перетащите несколько скриншотов сюда' : 'Перетащите скриншот сюда'}
      </p>
      <p
        style={{
          margin: '0.5rem 0 0',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        {multiple ? 'или нажмите для выбора файлов' : 'или нажмите для выбора файла'}
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
