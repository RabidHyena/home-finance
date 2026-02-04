import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { UploadZone, TransactionForm, useToast } from '../components';
import { useUploadAndParse, useCreateTransaction } from '../hooks/useApi';
import type { TransactionCreate } from '../types';

type Step = 'upload' | 'review' | 'success';

export function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');

  const toast = useToast();
  const uploadMutation = useUploadAndParse();
  const createMutation = useCreateTransaction();

  const error = uploadMutation.error || createMutation.error;

  const handleFileSelect = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync(file);
      if (result) {
        setStep('review');
        toast.success('Скриншот распознан');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось распознать скриншот');
    }
  };

  const handleSubmit = async (data: TransactionCreate) => {
    try {
      await createMutation.mutateAsync(data);
      setStep('success');
      toast.success('Транзакция сохранена');
    } catch {
      toast.error('Не удалось сохранить транзакцию');
    }
  };

  const handleReset = () => {
    setStep('upload');
    uploadMutation.reset();
    createMutation.reset();
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        {step === 'upload' && 'Загрузить скриншот'}
        {step === 'review' && 'Проверьте данные'}
        {step === 'success' && 'Готово!'}
      </h1>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
          }}
        >
          {uploadMutation.error
            ? `Ошибка распознавания: ${uploadMutation.error.message}`
            : 'Не удалось сохранить транзакцию'}
        </div>
      )}

      {step === 'upload' && (
        <div className="card">
          <UploadZone onFileSelect={handleFileSelect} isLoading={uploadMutation.isPending} />
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: 'var(--color-background)',
              borderRadius: '0.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
              Как это работает:
            </h3>
            <ol
              style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <li>Загрузите скриншот из банковского приложения</li>
              <li>AI распознает сумму, описание и дату</li>
              <li>Проверьте и при необходимости исправьте данные</li>
              <li>Сохраните транзакцию</li>
            </ol>
          </div>
        </div>
      )}

      {step === 'review' && uploadMutation.data && (
        <div className="card">
          <TransactionForm
            initialData={uploadMutation.data}
            onSubmit={handleSubmit}
            onCancel={handleReset}
            isLoading={createMutation.isPending}
            confidence={uploadMutation.data.confidence}
          />
        </div>
      )}

      {step === 'success' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <CheckCircle
            size={64}
            color="var(--color-success)"
            style={{ marginBottom: '1rem' }}
          />
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
            Транзакция сохранена!
          </h2>
          <p
            style={{
              margin: '0 0 1.5rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Вы можете добавить ещё одну или перейти к списку транзакций
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={handleReset}>
              Добавить ещё
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/transactions')}
            >
              К транзакциям
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
