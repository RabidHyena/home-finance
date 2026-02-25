import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Layout, ToastProvider, ProtectedRoute, ErrorBoundary, PageTransition } from './components';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage, LoginPage, RegisterPage } from './pages';
import { queryClient } from './queryClient';

// Lazy-loaded pages (heavy: Recharts, file upload, etc.)
const UploadPage = lazy(() => import('./pages/UploadPage').then(m => ({ default: m.UploadPage })));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const IncomePage = lazy(() => import('./pages/IncomePage').then(m => ({ default: m.IncomePage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage').then(m => ({ default: m.BudgetsPage })));

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition><HomePage /></PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition><UploadPage /></PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition><TransactionsPage /></PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/income"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition><IncomePage /></PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition><ReportsPage /></PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <Layout>
                <PageTransition><BudgetsPage /></PageTransition>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={
          <ProtectedRoute>
            <Layout>
              <PageTransition>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-accent)' }}>404 — Страница не найдена</h1>
                  <a href="/" className="btn btn-primary">На главную</a>
                </div>
              </PageTransition>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-heading)',
                background: 'var(--color-background)',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                Загрузка...
              </div>
            }>
              <AnimatedRoutes />
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
