import React, { createContext, useState, useContext, ReactNode } from 'react';

interface SidebarProviderProps {
  children: ReactNode;
}
const SidebarContext = createContext<any>(null);
export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);