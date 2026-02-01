import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import { UploadZone, TransactionForm } from '../components';
import type { ParsedTransaction, TransactionCreate } from '../types';

type Step = 'upload' | 'review' | 'success';

export function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.uploadAndParse(file);
      setParsedData(result);
      setStep('review');
    } catch (err) {
      setError('Не удалось распознать изображение. Попробуйте другой скриншот.');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: TransactionCreate) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.createTransaction(data);
      setStep('success');
    } catch (err) {
      setError('Не удалось сохранить транзакцию');
      console.error('Save error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParsedData(null);
    setError(null);
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
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="card">
          <UploadZone onFileSelect={handleFileSelect} isLoading={isLoading} />
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

      {step === 'review' && parsedData && (
        <div className="card">
          <TransactionForm
            initialData={parsedData}
            onSubmit={handleSubmit}
            onCancel={handleReset}
            isLoading={isLoading}
            confidence={parsedData.confidence}
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
