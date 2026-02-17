import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout, ToastProvider, ProtectedRoute, ErrorBoundary } from './components';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage, UploadPage, TransactionsPage, IncomePage, ReportsPage, BudgetsPage, LoginPage, RegisterPage } from './pages';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
