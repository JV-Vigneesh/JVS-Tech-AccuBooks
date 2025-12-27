import { Product, Invoice, Voucher, InventoryTransaction, Company, Customer, DeliveryChallan, Quotation } from '@/types/accounting';
import {
  dbGetCompanies, dbSaveCompany, dbDeleteCompany,
  dbGetCustomers, dbSaveCustomer, dbDeleteCustomer,
  dbGetProducts, dbSaveProduct, dbDeleteProduct,
  dbGetInvoices, dbSaveInvoice, dbDeleteInvoice,
  dbGetQuotations, dbSaveQuotation, dbDeleteQuotation,
  dbGetChallans, dbSaveChallan, dbDeleteChallan,
  dbGetVouchers, dbSaveVoucher, dbDeleteVoucher,
  dbGetInventoryTransactions, dbSaveInventoryTransaction,
  getDatabase
} from '@/lib/database';

// Products
export const getProducts = (): Product[] => dbGetProducts();

export const saveProduct = (product: Product): void => {
  dbSaveProduct(product);
};

export const deleteProduct = (id: string): void => {
  dbDeleteProduct(id);
};

// Invoices
export const getInvoices = (): Invoice[] => dbGetInvoices();

export const getInvoicesByCompany = (companyId: string): Invoice[] => {
  return getInvoices().filter(inv => inv.companyId === companyId);
};

export const getNextInvoiceNumber = (companyId?: string): string => {
  const invoices = companyId ? getInvoicesByCompany(companyId) : getInvoices();
  if (invoices.length === 0) return '1';
  
  const numbers = invoices
    .map(inv => {
      const num = parseInt(inv.invoiceNumber.replace(/\D/g, ''), 10);
      return isNaN(num) ? 0 : num;
    })
    .filter(n => n > 0);
  
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(maxNumber + 1);
};

export const saveInvoice = (invoice: Invoice): void => {
  dbSaveInvoice(invoice);
};

export const deleteInvoice = (id: string): void => {
  dbDeleteInvoice(id);
};

// Delivery Challans
export const getChallans = (): DeliveryChallan[] => dbGetChallans();

export const getChallansByCompany = (companyId: string): DeliveryChallan[] => {
  return getChallans().filter(c => c.companyId === companyId);
};

export const getNextChallanNumber = (companyId?: string): string => {
  const challans = companyId ? getChallansByCompany(companyId) : getChallans();
  if (challans.length === 0) return 'DC-1';
  
  const numbers = challans
    .map(c => {
      const num = parseInt(c.challanNumber.replace(/\D/g, ''), 10);
      return isNaN(num) ? 0 : num;
    })
    .filter(n => n > 0);
  
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `DC-${maxNumber + 1}`;
};

export const saveChallan = (challan: DeliveryChallan): void => {
  dbSaveChallan(challan);
};

export const deleteChallan = (id: string): void => {
  dbDeleteChallan(id);
};

// Vouchers
export const getVouchers = (): Voucher[] => dbGetVouchers();

export const getVouchersByCompany = (companyId: string): Voucher[] => {
  return getVouchers().filter(v => v.companyId === companyId);
};

export const saveVoucher = (voucher: Voucher): void => {
  dbSaveVoucher(voucher);
};

export const deleteVoucher = (id: string): void => {
  dbDeleteVoucher(id);
};

// Inventory
export const getInventoryTransactions = (): InventoryTransaction[] => dbGetInventoryTransactions();

export const saveInventoryTransaction = (transaction: InventoryTransaction): void => {
  dbSaveInventoryTransaction(transaction);
  
  // Update product stock
  const products = getProducts();
  const product = products.find(p => p.id === transaction.productId);
  if (product) {
    product.stock += transaction.type === 'in' ? transaction.quantity : -transaction.quantity;
    saveProduct(product);
  }
};

// Multiple Companies
export const getCompanies = (): Company[] => dbGetCompanies();

export const saveCompanyToList = (company: Company): void => {
  dbSaveCompany(company);
};

export const deleteCompany = (id: string): void => {
  dbDeleteCompany(id);
};

// Legacy single company support (for backward compatibility)
export const getCompany = (): Company | null => {
  const companies = getCompanies();
  return companies.length > 0 ? companies[0] : null;
};

export const saveCompany = (company: Company): void => {
  saveCompanyToList(company);
};

// Customers
export const getCustomers = (): Customer[] => dbGetCustomers();

export const saveCustomer = (customer: Customer): void => {
  dbSaveCustomer(customer);
};

export const deleteCustomer = (id: string): void => {
  dbDeleteCustomer(id);
};

// Quotations
export const getQuotations = (): Quotation[] => dbGetQuotations();

export const getQuotationsByCompany = (companyId: string): Quotation[] => {
  return getQuotations().filter(q => q.companyId === companyId);
};

export const getNextQuotationNumber = (companyId?: string): string => {
  const quotations = companyId ? getQuotationsByCompany(companyId) : getQuotations();
  if (quotations.length === 0) return 'QT-1';
  
  const numbers = quotations
    .map(q => {
      const num = parseInt(q.quotationNumber.replace(/\D/g, ''), 10);
      return isNaN(num) ? 0 : num;
    })
    .filter(n => n > 0);
  
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `QT-${maxNumber + 1}`;
};

export const saveQuotation = (quotation: Quotation): void => {
  dbSaveQuotation(quotation);
};

export const deleteQuotation = (id: string): void => {
  dbDeleteQuotation(id);
};
