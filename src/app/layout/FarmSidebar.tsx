import type React from 'react';
import { Row } from './index';

export const FarmSidebar = ({ children }: { children?: React.ReactNode }) => {
  return (
    <Row className="absolute h-full top-0 right-0 z-1 gap-2 pointer-events-none items-start">
      {children}
    </Row>
  );
};
