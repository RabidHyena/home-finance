import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Layout, ToastProvider, ProtectedRoute, ErrorBoundary } from './components';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage, LoginPage, RegisterPage } from './pages';
import { queryClient } from './queryClient';

// Lazy-loaded pages (heavy: Recharts, file upload, etc.)
const UploadPage = lazy(() => import('./pages/UploadPage').then(m => ({ default: m.UploadPage })));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const IncomePage = lazy(() => import('./pages/IncomePage').then(m => ({ default: m.IncomePage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage').then(m => ({ default: m.BudgetsPage })));

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Загрузка...</div>}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <HomePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <UploadPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TransactionsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/income"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <IncomePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ReportsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/budgets"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BudgetsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={
                <ProtectedRoute>
                  <Layout>
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>404 — Страница не найдена</h1>
                      <a href="/" className="btn btn-primary">На главную</a>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
