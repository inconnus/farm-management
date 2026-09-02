import { MainLayout } from '@app/layout';
import Sidebar from '@app/layout/sidebar';
import MapView from '@features/map';
import { PluksangOnlyRoute } from './PluksangOnlyRoute';
import { ProtectedRoute } from './ProtectedRoute';

type PluksangAppShellProps = {
  children: React.ReactNode;
};

export function PluksangAppShell({ children }: PluksangAppShellProps) {
  return (
    <ProtectedRoute>
      <PluksangOnlyRoute>
        <MainLayout>
          <Sidebar />
          <MapView />
          {children}
        </MainLayout>
      </PluksangOnlyRoute>
    </ProtectedRoute>
  );
}
