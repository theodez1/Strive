import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterState {
  sports: string[];
  levels: string[];
  timeSlots: string[];
  distance: string[];
  price: string[];
}

interface FilterContextType {
  isFilterVisible: boolean;
  showFilter: () => void;
  hideFilter: () => void;
  selectedFilters: FilterState;
  updateFilters: (filters: Partial<FilterState>) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<FilterState>({
    sports: [],
    levels: [],
    timeSlots: [],
    distance: [],
    price: [],
  });

  const showFilter = () => setIsFilterVisible(true);
  const hideFilter = () => setIsFilterVisible(false);

  const updateFilters = (filters: Partial<FilterState>) => {
    setSelectedFilters(prev => ({
      ...prev,
      ...filters,
    }));
  };

  const value: FilterContextType = {
    isFilterVisible,
    showFilter,
    hideFilter,
    selectedFilters,
    updateFilters,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
