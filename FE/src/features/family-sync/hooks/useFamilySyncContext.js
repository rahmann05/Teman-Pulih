import { useContext } from 'react';
import FamilySyncContext from '../context/FamilySyncContext';

export const useFamilySyncContext = () => {
  const context = useContext(FamilySyncContext);
  if (!context) {
    throw new Error('useFamilySyncContext must be used within a FamilySyncProvider');
  }
  return context;
};
