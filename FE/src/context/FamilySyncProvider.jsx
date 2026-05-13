import FamilySyncContext from './FamilySyncContext';
import { useFamilySync } from '../hooks/useFamilySync';

const FamilySyncProvider = ({ children }) => {
  const value = useFamilySync();
  return (
    <FamilySyncContext.Provider value={value}>
      {children}
    </FamilySyncContext.Provider>
  );
};

export default FamilySyncProvider;
