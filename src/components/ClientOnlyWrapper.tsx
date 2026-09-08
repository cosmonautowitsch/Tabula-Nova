
'use client';

import { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyWrapperProps {
  children: ReactNode;
}

const ClientOnlyWrapper: React.FC<ClientOnlyWrapperProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    // Removed the global context menu prevention to allow for component-specific context menus.
    // const handleContextMenu = (event: MouseEvent) => {
    //   event.preventDefault();
    // };
    // document.addEventListener('contextmenu', handleContextMenu);
    // return () => {
    //   document.removeEventListener('contextmenu', handleContextMenu);
    // };
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

export default ClientOnlyWrapper;
