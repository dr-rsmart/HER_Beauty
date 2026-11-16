/**
 * BookingTrack Application Router
 * -------------------------------
 * Combines all Base44 public/customer/provider routes with TimeTrack's
 * auth guards, forced password change modal, Master Console, Simulator, and Audit Log.
 */

import { useEffect, type ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/layout/ErrorBoundary';
import ChangePasswordModal from './components/auth/ChangePasswordModal';

import Browse from './pages/Browse';
import ProviderDetail from './pages/ProviderDetail';
import BookAppointment from './pages/BookAppointment';
import MyBookings from './pages/MyBookings';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import DashboardBookings from './pages/dashboard/DashboardBookings';
import DashboardAvailability from './pages/dashboard/DashboardAvailability';
import DashboardServices from './pages/dashboard/DashboardServices';
import DashboardTeam from './pages/dashboard/DashboardTeam';
import DashboardSpecials from './pages/dashboard/DashboardSpecials';
import DashboardContracts from './pages/dashboard/DashboardContracts';
import DashboardProfile from './pages/dashboard/DashboardProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import AuditLog from './pages/AuditLog';
import MasterConsole from './pages/MasterConsole';
import Demo from './pages/Demo';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import NotFound from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const returnTo = location.pathname + location.search;
    const query = returnTo && returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
    return <Navigate to={`/login${query}`} replace />;
  }

  return (
    <>
      {children}
      {user.mustChangePassword && (
        <ChangePasswordModal
          allowKeep={!user.usingDefaultPassword}
          onSuccess={() => void refresh()}
        />
      )}
    </>
  );
}

function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || (!roles.includes(user.role) && !(roles.includes('master') && user.originalRole === 'master'))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
          <ScrollToTop />
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            {/* Standalone Auth Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ForgotPassword />} />

            {/* Public & Customer Browsing inside AppLayout */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Browse />} />
              <Route path="/providers/:id" element={<ProviderDetail />} />
              <Route path="/providers/:id/book" element={<BookAppointment />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/support" element={<Support />} />

              {/* Authenticated Customer, Business Provider & Governance Routes */}
              <Route
                path="/my-bookings"
                element={
                  <RequireAuth>
                    <MyBookings />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <DashboardOverview />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/bookings"
                element={
                  <RequireAuth>
                    <DashboardBookings />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/availability"
                element={
                  <RequireAuth>
                    <DashboardAvailability />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/services"
                element={
                  <RequireAuth>
                    <DashboardServices />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/team"
                element={
                  <RequireAuth>
                    <DashboardTeam />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/specials"
                element={
                  <RequireAuth>
                    <DashboardSpecials />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/contracts"
                element={
                  <RequireAuth>
                    <DashboardContracts />
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/profile"
                element={
                  <RequireAuth>
                    <DashboardProfile />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route
                path="/audit"
                element={
                  <RequireAuth>
                    <RequireRole roles={['master', 'admin', 'manager']}>
                      <AuditLog />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/master"
                element={
                  <RequireAuth>
                    <RequireRole roles={['master']}>
                      <MasterConsole />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/demo"
                element={
                  <RequireAuth>
                    <RequireRole roles={['master']}>
                      <Demo />
                    </RequireRole>
                  </RequireAuth>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
