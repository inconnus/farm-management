import './App.css';
import { MainLayout } from '@app/layout';
import { FarmSidebar } from '@app/layout/FarmSidebar';
import Sidebar from '@app/layout/sidebar';
import {
  ForgotPasswordPage,
  LoginPage,
  OrgRequiredRoute,
  OrgSelectPage,
  ProtectedRoute,
  PublicRoute,
  RegisterPage,
  ResetPasswordPage,
} from '@features/auth';
import CameraScreen from '@features/camera/components/camera_screen';
import DashboardScreen from '@features/dashboard/components/dashboard_screen';
import { FarmsSidebar } from '@features/farms/components/FarmsSidebar';
import MapView from '@features/map';
import { Navigate, Route, Routes } from 'react-router-dom';
import MapLayout from './layout/map_layout';

const App = () => {
  return (
    <Routes>
      {/* Auth routes (public only) */}
      <Route
        path="/auth/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Org selection (protected, but no org required) */}
      <Route
        path="/org/select"
        element={
          <ProtectedRoute>
            <OrgSelectPage />
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />

      {/* Protected app routes — scoped under /:orgSlug */}
      <Route
        path="/:orgSlug/*"
        element={
          <ProtectedRoute>
            <OrgRequiredRoute>
              <MainLayout>
                <Sidebar />
                <MapView />
                <Routes>
                  <Route path="farms" element={<FarmsSidebar />}>
                    <Route path=":farmId">
                      <Route path=":landId" />
                    </Route>
                  </Route>
                  <Route path="dashboard" element={<DashboardScreen />}>
                    <Route path=":deviceId" />
                  </Route>
                  <Route path="camera" element={<CameraScreen />}>
                    <Route path=":deviceId" />
                  </Route>
                </Routes>
              </MainLayout>
            </OrgRequiredRoute>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
