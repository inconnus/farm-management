import './App.css';
import { MainLayout } from '@app/layout';
import { FarmSidebar } from '@app/layout/FarmSidebar';
import Sidebar from '@app/layout/sidebar';
import {
  ForgotPasswordPage,
  LoginPage,
  NavRoleRoute,
  OrgRequiredRoute,
  OrgSelectPage,
  PluksangAppShell,
  PluksangLegacyRedirect,
  ProtectedRoute,
  PublicRoute,
  RegisterPage,
  PluksangRegisterPage,
  ResetPasswordPage,
} from '@features/auth';
import CameraScreen from '@features/camera/components/camera_screen';
import KasetkornCameraScreen from '@features/camera/components/kasetkorn_camera_screen';
import DashboardScreen from '@features/dashboard/components/dashboard_screen';
import { FamilyScreen, NotificationsScreen } from '@features/family';
import { FarmsSidebar } from '@features/farms/components/FarmsSidebar';
import MapView from '@features/map';
import { Navigate, Route, Routes } from 'react-router-dom';
import MapLayout from './layout/map_layout';

const dashboardScreen = (
  <NavRoleRoute navItem="dashboard">
    <DashboardScreen />
  </NavRoleRoute>
);

const iotCamerasScreen = (
  <NavRoleRoute navItem="iot-cameras">
    <KasetkornCameraScreen />
  </NavRoleRoute>
);

const deviceSharingScreen = (
  <NavRoleRoute navItem="device-sharing">
    <FamilyScreen />
  </NavRoleRoute>
);

const notificationsScreen = (
  <NavRoleRoute navItem="notifications">
    <NotificationsScreen />
  </NavRoleRoute>
);

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
      <Route
        path="/auth/register/building"
        element={
          <PublicRoute>
            <PluksangRegisterPage />
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

      {/* Legacy pluksang URLs → /dashboard, /iot-cameras, … */}
      <Route path="/pluksang/*" element={<PluksangLegacyRedirect />} />

      {/* Pluksang mode — no org slug in URL */}
      <Route
        path="/dashboard"
        element={<PluksangAppShell>{dashboardScreen}</PluksangAppShell>}
      />
      <Route
        path="/dashboard/:deviceId"
        element={<PluksangAppShell>{dashboardScreen}</PluksangAppShell>}
      />
      <Route
        path="/iot-cameras"
        element={<PluksangAppShell>{iotCamerasScreen}</PluksangAppShell>}
      />
      <Route
        path="/iot-cameras/:deviceId"
        element={<PluksangAppShell>{iotCamerasScreen}</PluksangAppShell>}
      />
      <Route
        path="/device-sharing/*"
        element={<PluksangAppShell>{deviceSharingScreen}</PluksangAppShell>}
      />
      <Route
        path="/notifications"
        element={<PluksangAppShell>{notificationsScreen}</PluksangAppShell>}
      />

      {/* Farm management — scoped under /:orgSlug */}
      <Route
        path="/:orgSlug/*"
        element={
          <ProtectedRoute>
            <OrgRequiredRoute>
              <MainLayout>
                <Sidebar />
                <MapView />
                <Routes>
                  <Route
                    path="farms"
                    element={
                      <NavRoleRoute navItem="farms">
                        <FarmsSidebar />
                      </NavRoleRoute>
                    }
                  >
                    <Route path=":farmId">
                      <Route path=":landId" />
                    </Route>
                  </Route>
                  <Route path="dashboard" element={dashboardScreen}>
                    <Route path=":deviceId" />
                  </Route>
                  <Route
                    path="camera"
                    element={
                      <NavRoleRoute navItem="camera">
                        <CameraScreen />
                      </NavRoleRoute>
                    }
                  >
                    <Route path=":deviceId" />
                  </Route>
                  <Route path="iot-cameras" element={iotCamerasScreen}>
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
