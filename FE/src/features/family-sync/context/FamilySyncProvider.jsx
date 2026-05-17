import FamilySyncContext from '@/features/family-sync/context/FamilySyncContext';
import { useFamilySync } from '@/features/family-sync/hooks/useFamilySync';

const FamilySyncProvider = ({ children }) => {
  const value = useFamilySync();
  return (
    <FamilySyncContext.Provider value={value}>
      {children}
    </FamilySyncContext.Provider>
  );
};

export default FamilySyncProvider;
