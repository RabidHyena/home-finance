import { useState, useCallback } from 'react';
import { Upload, Image, X, Loader2, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';

const isExcelFile = (file: File) =>
  file.name.toLowerCase().endsWith('.xlsx') ||
  file.name.toLowerCase().endsWith('.xls') ||
  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  file.type === 'application/vnd.ms-excel';

interface UploadZoneProps {
  onFileSelect: (files: File[]) => void;
  isLoading?: boolean;
  accept?: string;
  multiple?: boolean;
}

export function UploadZone({
  onFileSelect,
  isLoading,
  accept = 'image/*,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
  multiple = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  const handleFiles = useCallback(
    (fileList: File[]) => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      const EXCEL_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];
      const isValidFile = (f: File) =>
        f.type.startsWith('image/') ||
        EXCEL_TYPES.includes(f.type) ||
        EXCEL_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext));
      const validFiles = fileList.filter(isValidFile);

      if (validFiles.length === 0) {
        alert('Пожалуйста, выберите изображения или Excel файлы');
        return;
      }

      const oversized = validFiles.filter(f => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        alert(`Файлы превышают 10MB: ${oversized.map(f => f.name).join(', ')}`);
        return;
      }

      if (multiple) {
        previews.forEach(p => URL.revokeObjectURL(p.url));
        const newPreviews = validFiles.map(file => ({
          file,
          url: URL.createObjectURL(file)
        }));
        setPreviews(newPreviews);
      } else {
        const file = validFiles[0];
        setFileName(file.name);
        if (isExcelFile(file)) {
          setPreview('excel');
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
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
      if (files.length > 0) handleFiles(files);
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
      if (files.length > 0) handleFiles(files);
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
          border: '2px dashed var(--color-border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem',
          textAlign: 'center',
          background: 'var(--color-surface)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={48} style={{ color: 'var(--color-accent)' }} />
        </motion.div>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
          Распознавание файла...
        </p>
      </div>
    );
  }

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
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem',
                background: 'var(--color-surface)',
              }}
            >
              {isExcelFile(preview.file) ? (
                <div style={{
                  width: '100%',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(52, 211, 153, 0.06)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <FileSpreadsheet size={40} color="var(--color-success)" />
                </div>
              ) : (
                <img
                  src={preview.url}
                  alt={preview.file.name}
                  style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
              )}
              <p style={{
                fontSize: '0.7rem',
                marginTop: '0.4rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--color-text-secondary)',
              }}>
                {preview.file.name}
              </p>
            </motion.div>
          ))}
        </div>
        <button onClick={clearPreview} className="btn btn-secondary" style={{ width: '100%' }}>
          Выбрать другие файлы
        </button>
      </div>
    );
  }

  if (preview) {
    return (
      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          background: 'var(--color-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Image size={20} color="var(--color-accent)" />
            <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--color-text)' }}>{fileName}</span>
          </div>
          <motion.button
            onClick={clearPreview}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              padding: '0.25rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            <X size={20} />
          </motion.button>
        </div>
        {preview === 'excel' ? (
          <div style={{
            width: '100%',
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(52, 211, 153, 0.06)',
            borderRadius: 'var(--radius-md)',
          }}>
            <FileSpreadsheet size={64} color="var(--color-success)" />
            <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Excel файл
            </p>
          </div>
        ) : (
          <img
            src={preview}
            alt="Preview"
            style={{
              width: '100%',
              maxHeight: '300px',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
            }}
          />
        )}
      </div>
    );
  }

  return (
    <motion.label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      whileHover={{ borderColor: 'var(--color-accent)', boxShadow: '0 0 24px rgba(129, 140, 248, 0.12)' }}
      animate={{
        borderColor: isDragging ? 'var(--color-primary)' : 'rgba(148, 163, 184, 0.2)',
        background: isDragging ? 'rgba(129, 140, 248, 0.04)' : 'var(--color-surface)',
      }}
      style={{
        display: 'block',
        border: '2px dashed rgba(148, 163, 184, 0.2)',
        borderRadius: 'var(--radius-xl)',
        padding: '3rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease-out',
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
      <motion.div
        animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Upload
          size={48}
          style={{
            color: isDragging ? 'var(--color-primary)' : 'var(--color-accent)',
            marginBottom: '1rem',
          }}
        />
      </motion.div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text)' }}>
        {multiple ? 'Перетащите файлы сюда' : 'Перетащите файл сюда'}
      </p>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        {multiple ? 'или нажмите для выбора файлов' : 'или нажмите для выбора файла'}
      </p>
      <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        Поддерживаются: JPG, PNG, GIF, WebP, Excel (.xlsx, .xls) (до 10MB)
      </p>
    </motion.label>
  );
}
