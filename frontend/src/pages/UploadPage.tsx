import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadZone, MultipleTransactionsForm, RecognizedChartDisplay, useToast, ErrorBoundary } from '../components';
import { useUploadAndParse, useBatchUploadAndParse } from '../hooks/useApi';
import { api } from '../api/client';
import type { TransactionCreate, BatchUploadResponse } from '../types';
import { slideUp, scaleIn } from '../motion';

type Step = 'upload' | 'review' | 'success';

export function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');

  const toast = useToast();
  const uploadMutation = useUploadAndParse();
  const batchUploadMutation = useBatchUploadAndParse();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [batchResults, setBatchResults] = useState<BatchUploadResponse | null>(null);
  const [savedBatchFiles, setSavedBatchFiles] = useState<Set<number>>(new Set());
  const [savedBatchCharts, setSavedBatchCharts] = useState<Set<number>>(new Set());
  const originalAiCategories = useRef<Map<string, { category: string; confidence: number }>>(new Map());

  const error = uploadMutation.error || saveError || batchUploadMutation.error;

  const storeOriginalPredictions = useCallback((transactions: { description: string; amount: number; category?: string | null; confidence?: number }[]) => {
    for (const tx of transactions) {
      const key = `${tx.description}|${tx.amount}`;
      if (!originalAiCategories.current.has(key)) {
        originalAiCategories.current.set(key, {
          category: tx.category || 'Other',
          confidence: tx.confidence ?? 0.5,
        });
      }
    }
  }, []);

  const handleFileSelect = async (files: File[]) => {
    if (files.length > 1) {
      try {
        const results = await batchUploadMutation.mutateAsync(files);
        setBatchResults(results);
        setSavedBatchFiles(new Set());
        setSavedBatchCharts(new Set());
        setStep('review');
        for (const r of results.results) {
          if (r.status === 'success' && r.data) {
            storeOriginalPredictions(r.data.transactions);
          }
        }
        toast.success(`Обработано: ${results.successful} из ${results.total_files}`);
        if (results.failed > 0) {
          toast.error(`Ошибок: ${results.failed}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка пакетной загрузки');
      }
    } else {
      try {
        const result = await uploadMutation.mutateAsync(files[0]);
        if (result) {
          setStep('review');
          storeOriginalPredictions(result.transactions);
          toast.success('Файл распознан');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Не удалось распознать файл');
      }
    }
  };

  const handleSubmit = async (transactions: (TransactionCreate & { confidence?: number })[], batchIndex?: number) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const enrichedTransactions = transactions.map(tx => {
        const key = `${tx.description}|${tx.amount}`;
        const original = originalAiCategories.current.get(key);
        return {
          amount: tx.amount,
          description: tx.description,
          category: tx.category,
          date: tx.date,
          currency: tx.currency,
          type: tx.type || 'expense' as const,
          image_path: tx.image_path,
          raw_text: tx.raw_text,
          ai_category: original?.category ?? tx.category,
          ai_confidence: original?.confidence ?? tx.confidence,
        };
      });

      const result = await api.createTransactionsBulk(enrichedTransactions);
      const succeeded = result.length;

      if (succeeded > 0 && batchIndex !== undefined) {
        setSavedBatchFiles(prev => new Set(prev).add(batchIndex));
      }

      toast.success(`Сохранено транзакций: ${succeeded}`);
      if (batchIndex === undefined) setStep('success');
    } catch (e) {
      setSaveError(e instanceof Error ? e : new Error('Не удалось сохранить транзакции'));
      toast.error('Не удалось сохранить транзакции');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFromChart = async (transactions: TransactionCreate[], batchIndex?: number) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await api.createTransactionsBulk(transactions);
      toast.success(`Создано транзакций из диаграммы: ${result.length}`);

      if (batchIndex !== undefined) {
        setSavedBatchCharts(prev => new Set(prev).add(batchIndex));
      } else {
        setTimeout(() => setStep('success'), 500);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e : new Error('Не удалось создать транзакции'));
      toast.error('Не удалось создать транзакции из диаграммы');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    uploadMutation.reset();
    batchUploadMutation.reset();
    setSaveError(null);
    setBatchResults(null);
    setSavedBatchFiles(new Set());
    setSavedBatchCharts(new Set());
  };

  const allBatchFilesSaved = batchResults
    ? batchResults.results.every((r, idx) =>
        r.status === 'error' || savedBatchFiles.has(idx))
    : false;

  return (
    <ErrorBoundary>
      <div>
        <h1 style={{
          fontSize: '1.4rem',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.04em',
          marginBottom: '1.5rem',
          color: 'var(--color-text)',
        }}>
          {step === 'upload' && 'Загрузить файл'}
          {step === 'review' && 'Проверьте данные'}
          {step === 'success' && 'Готово!'}
        </h1>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(248, 113, 113, 0.08)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          color: 'var(--color-danger)',
        }}>
          {uploadMutation.error
            ? `Ошибка распознавания: ${uploadMutation.error.message}`
            : 'Не удалось сохранить транзакцию'}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" variants={slideUp} initial="initial" animate="animate" exit="exit">
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              padding: 'var(--space-lg)',
            }}>
              <UploadZone
                onFileSelect={handleFileSelect}
                isLoading={uploadMutation.isPending || batchUploadMutation.isPending}
                multiple={true}
              />
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                background: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '0.03em',
                  color: 'var(--color-accent)',
                }}>
                  Как это работает:
                </h3>
                <ol style={{
                  margin: 0,
                  paddingLeft: '1.25rem',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.8,
                }}>
                  <li>Загрузите скриншоты или Excel-выписки из банковского приложения</li>
                  <li>AI распознает сумму, описание и категорию</li>
                  <li>Проверьте и при необходимости исправьте данные</li>
                  <li>Сохраните транзакции</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'review' && batchResults && (
          <motion.div key="batch-review" variants={slideUp} initial="initial" animate="animate" exit="exit">
            {batchResults.results.map((result, idx) => {
              const isSaved = savedBatchFiles.has(idx);
              const isChartSaved = savedBatchCharts.has(idx);
              return (
                <details
                  key={idx}
                  open={idx === 0 && !isSaved}
                  style={{
                    marginBottom: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.25rem',
                    background: 'var(--color-surface)',
                    opacity: isSaved ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  <summary style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.95rem',
                  }}>
                    <span>{result.filename}</span>
                    <span style={{
                      color: isSaved
                        ? 'var(--color-success)'
                        : result.status === 'success'
                          ? 'var(--color-accent)'
                          : 'var(--color-danger)',
                      fontSize: '0.8rem',
                      padding: '0.15rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      background: isSaved
                        ? 'rgba(52, 211, 153, 0.08)'
                        : result.status === 'success'
                          ? 'rgba(129, 140, 248, 0.08)'
                          : 'rgba(248, 113, 113, 0.08)',
                    }}>
                      {isSaved
                        ? 'Сохранено'
                        : result.status === 'success'
                          ? `${result.data?.transactions.length || 0} транзакций`
                          : `${result.error}`}
                    </span>
                  </summary>

                  {result.status === 'success' && result.data && !isSaved && (
                    <div style={{ marginTop: '1rem' }}>
                      {result.data.chart && !isChartSaved && (
                        <RecognizedChartDisplay
                          chart={result.data.chart}
                          onCreateTransactions={(txs) => handleCreateFromChart(txs, idx)}
                          isCreating={isSaving}
                        />
                      )}
                      {isChartSaved && (
                        <div style={{
                          padding: '0.75rem',
                          marginBottom: '1rem',
                          background: 'rgba(52, 211, 153, 0.06)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-success)',
                          fontSize: '0.85rem',
                          border: '1px solid rgba(52, 211, 153, 0.15)',
                        }}>
                          Транзакции из диаграммы созданы
                        </div>
                      )}
                      <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        padding: 'var(--space-lg)',
                      }}>
                        <MultipleTransactionsForm
                          transactions={result.data.transactions}
                          totalAmount={result.data.total_amount}
                          onSubmit={(txs) => handleSubmit(txs, idx)}
                          onCancel={handleReset}
                          isLoading={isSaving}
                        />
                      </div>
                    </div>
                  )}
                </details>
              );
            })}

            {allBatchFilesSaved && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <motion.button
                  className="btn btn-primary"
                  onClick={() => setStep('success')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Готово
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'review' && uploadMutation.data && !batchResults && (
          <motion.div key="single-review" variants={slideUp} initial="initial" animate="animate" exit="exit">
            {uploadMutation.data.chart && (
              <RecognizedChartDisplay
                chart={uploadMutation.data.chart}
                onCreateTransactions={handleCreateFromChart}
                isCreating={isSaving}
              />
            )}
            <div style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              padding: 'var(--space-lg)',
            }}>
              <MultipleTransactionsForm
                transactions={uploadMutation.data.transactions}
                totalAmount={uploadMutation.data.total_amount}
                onSubmit={handleSubmit}
                onCancel={handleReset}
                isLoading={isSaving}
              />
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              padding: 'var(--space-2xl)',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              <CheckCircle size={64} color="var(--color-accent)" style={{ marginBottom: '1rem' }} />
            </motion.div>
            <h2 style={{
              margin: '0 0 0.5rem',
              fontSize: '1.2rem',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.03em',
              color: 'var(--color-accent)',
            }}>
              Транзакции сохранены!
            </h2>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--color-text-secondary)' }}>
              Вы можете загрузить ещё файл или перейти к списку транзакций
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={handleReset}>
                Добавить ещё
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/transactions')}>
                К транзакциям
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
