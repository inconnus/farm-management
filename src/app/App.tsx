import './App.css';
import { MainLayout } from '@app/layout';
import { FarmSidebar } from '@app/layout/FarmSidebar';
import Sidebar from '@app/layout/sidebar';
import {
  ForgotPasswordPage,
  LoginPage,
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

      {/* Protected app routes (org required) */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            {/* <OrgRequiredRoute> */}
            <MainLayout>
              <Sidebar />
              <MapView />
              <FarmSidebar>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route path="/farms" element={<FarmsSidebar />}>
                    <Route index element={<></>} />
                    <Route path=":farmId" element={<></>} />
                  </Route>
                  <Route path="/dashboard" element={<DashboardScreen />}>
                    <Route index element={<></>} />
                    <Route path=":deviceId" element={<></>} />
                  </Route>
                  <Route path="/camera" element={<CameraScreen />}>
                    <Route index element={<></>} />
                    <Route path=":deviceId" element={<></>} />
                  </Route>
                  {/* <Route path="/dashboard" element={<DashboardScreen />} /> */}
                  {/* <Route path="/tasks" element={<FarmsSidebar />} /> */}
                </Routes>
              </FarmSidebar>
            </MainLayout>
            {/* </OrgRequiredRoute> */}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
