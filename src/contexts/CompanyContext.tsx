import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Company } from '@/types/accounting';
import { getCompanies } from '@/lib/storage';

interface CompanyContextType {
  selectedCompany: Company | null;
  companies: Company[];
  setSelectedCompany: (company: Company | null) => void;
  refreshCompanies: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const SELECTED_COMPANY_KEY = 'accounting_selected_company_id';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);

  const refreshCompanies = () => {
    const allCompanies = getCompanies();
    setCompanies(allCompanies);
    
    // Restore selected company from localStorage
    const savedId = localStorage.getItem(SELECTED_COMPANY_KEY);
    if (savedId) {
      const found = allCompanies.find(c => c.id === savedId);
      if (found) {
        setSelectedCompanyState(found);
        return;
      }
    }
    
    // Auto-select first company if none selected
    if (allCompanies.length > 0 && !selectedCompany) {
      setSelectedCompanyState(allCompanies[0]);
      localStorage.setItem(SELECTED_COMPANY_KEY, allCompanies[0].id);
    }
  };

  useEffect(() => {
    refreshCompanies();
  }, []);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem(SELECTED_COMPANY_KEY, company.id);
    } else {
      localStorage.removeItem(SELECTED_COMPANY_KEY);
    }
  };

  return (
    <CompanyContext.Provider value={{ selectedCompany, companies, setSelectedCompany, refreshCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}