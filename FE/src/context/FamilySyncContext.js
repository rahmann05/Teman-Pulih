import { createContext, useContext } from 'react';

const FamilySyncContext = createContext(null);

export const useFamilySyncContext = () => {
  const context = useContext(FamilySyncContext);
  if (!context) {
    throw new Error('useFamilySyncContext must be used within a FamilySyncProvider');
  }
  return context;
};

export default FamilySyncContext;
