import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { UploadZone, MultipleTransactionsForm, RecognizedChartDisplay, useToast, ErrorBoundary } from '../components';
import { useUploadAndParse, useCreateTransaction, useBatchUploadAndParse } from '../hooks/useApi';
import type { TransactionCreate, BatchUploadResponse } from '../types';

type Step = 'upload' | 'review' | 'success';

export function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');

  const toast = useToast();
  const uploadMutation = useUploadAndParse();
  const batchUploadMutation = useBatchUploadAndParse();
  const createMutation = useCreateTransaction();
  const [batchResults, setBatchResults] = useState<BatchUploadResponse | null>(null);

  const error = uploadMutation.error || createMutation.error || batchUploadMutation.error;

  const handleFileSelect = async (files: File[]) => {
    // Use batch upload for multiple files
    if (files.length > 1) {
      try {
        const results = await batchUploadMutation.mutateAsync(files);
        setBatchResults(results);
        setStep('review');
        toast.success(`Обработано: ${results.successful} из ${results.total_files}`);
        if (results.failed > 0) {
          toast.error(`Ошибок: ${results.failed}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка пакетной загрузки');
      }
    } else {
      // Single file upload
      try {
        const result = await uploadMutation.mutateAsync(files[0]);
        if (result) {
          setStep('review');
          toast.success('Скриншот распознан');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Не удалось распознать скриншот');
      }
    }
  };

  const handleSubmit = async (transactions: (TransactionCreate & { confidence?: number })[]) => {
    try {
      // Preserve original AI prediction
      const enrichedTransactions = transactions.map(tx => ({
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: tx.date,
        currency: tx.currency,
        image_path: tx.image_path,
        raw_text: tx.raw_text,
        ai_category: tx.category,  // Preserve original AI prediction
        ai_confidence: tx.confidence,
      }));

      // Save all selected transactions
      await Promise.all(
        enrichedTransactions.map(tx => createMutation.mutateAsync(tx))
      );
      setStep('success');
      const count = transactions.length;
      toast.success(`Сохранено транзакций: ${count}`);
    } catch {
      toast.error('Не удалось сохранить транзакции');
    }
  };

  const handleCreateFromChart = async (transactions: TransactionCreate[]) => {
    try {
      await Promise.all(
        transactions.map(tx => createMutation.mutateAsync(tx))
      );
      const count = transactions.length;
      toast.success(`Создано транзакций из диаграммы: ${count}`);
      // Optionally move to success step or just show success message
      setTimeout(() => {
        setStep('success');
      }, 500);
    } catch {
      toast.error('Не удалось создать транзакции из диаграммы');
    }
  };

  const handleReset = () => {
    setStep('upload');
    uploadMutation.reset();
    batchUploadMutation.reset();
    createMutation.reset();
    setBatchResults(null);
  };

  return (
    <ErrorBoundary>
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
          <UploadZone
            onFileSelect={handleFileSelect}
            isLoading={uploadMutation.isPending || batchUploadMutation.isPending}
            multiple={true}
          />
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
              <li>Загрузите один или несколько скриншотов из банковского приложения</li>
              <li>AI распознает сумму, описание и дату</li>
              <li>Проверьте и при необходимости исправьте данные</li>
              <li>Сохраните транзакции</li>
            </ol>
          </div>
        </div>
      )}

      {step === 'review' && batchResults && (
        <div>
          {batchResults.results.map((result, idx) => (
            <details
              key={idx}
              open={idx === 0}
              style={{
                marginBottom: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <summary style={{
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>{result.filename}</span>
                <span style={{
                  color: result.status === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}>
                  {result.status === 'success'
                    ? `✓ ${result.data?.transactions.length || 0} транзакций`
                    : `✗ ${result.error}`}
                </span>
              </summary>

              {result.status === 'success' && result.data && (
                <div style={{ marginTop: '1rem' }}>
                  {result.data.chart && (
                    <RecognizedChartDisplay
                      chart={result.data.chart}
                      onCreateTransactions={handleCreateFromChart}
                      isCreating={createMutation.isPending}
                    />
                  )}
                  <div className="card">
                    <MultipleTransactionsForm
                      transactions={result.data.transactions}
                      totalAmount={result.data.total_amount}
                      onSubmit={handleSubmit}
                      onCancel={handleReset}
                      isLoading={createMutation.isPending}
                    />
                  </div>
                </div>
              )}
            </details>
          ))}
        </div>
      )}

      {step === 'review' && uploadMutation.data && !batchResults && (
        <div>
          {uploadMutation.data.chart && (
            <RecognizedChartDisplay
              chart={uploadMutation.data.chart}
              onCreateTransactions={handleCreateFromChart}
              isCreating={createMutation.isPending}
            />
          )}
          <div className="card">
            <MultipleTransactionsForm
              transactions={uploadMutation.data.transactions}
              totalAmount={uploadMutation.data.total_amount}
              onSubmit={handleSubmit}
              onCancel={handleReset}
              isLoading={createMutation.isPending}
            />
          </div>
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
            Транзакции сохранены!
          </h2>
          <p
            style={{
              margin: '0 0 1.5rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Вы можете загрузить ещё скриншот или перейти к списку транзакций
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
    </ErrorBoundary>
  );
}
