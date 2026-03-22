import './App.css';
import { Column, MainLayout, Row } from '@components/layout';
import { Sidebar } from '@components/layout/sidebar';
import Mapbox from '@components/widgets/mapbox/mapbox';

const App = () => {
  return (
    <MainLayout>
      <Mapbox />
      <Sidebar />
    </MainLayout>
  );
};

export default App;
