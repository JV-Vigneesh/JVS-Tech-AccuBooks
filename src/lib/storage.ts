import { Product, Invoice, Voucher, InventoryTransaction, Company, Customer, DeliveryChallan, Quotation } from '@/types/accounting';

const STORAGE_KEYS = {
  PRODUCTS: 'accounting_products',
  INVOICES: 'accounting_invoices',
  VOUCHERS: 'accounting_vouchers',
  INVENTORY: 'accounting_inventory',
  COMPANY: 'accounting_company',
  COMPANIES: 'accounting_companies',
  CUSTOMERS: 'accounting_customers',
  CHALLANS: 'accounting_challans',
  QUOTATIONS: 'accounting_quotations',
};

// Generic storage functions
const getItems = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveItems = <T>(key: string, items: T[]): void => {
  localStorage.setItem(key, JSON.stringify(items));
};

// Products
export const getProducts = (): Product[] => getItems<Product>(STORAGE_KEYS.PRODUCTS);

export const saveProduct = (product: Product): void => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }
  saveItems(STORAGE_KEYS.PRODUCTS, products);
};

export const deleteProduct = (id: string): void => {
  const products = getProducts().filter(p => p.id !== id);
  saveItems(STORAGE_KEYS.PRODUCTS, products);
};

// Invoices
export const getInvoices = (): Invoice[] => getItems<Invoice>(STORAGE_KEYS.INVOICES);

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
  const invoices = getInvoices();
  const index = invoices.findIndex(i => i.id === invoice.id);
  if (index >= 0) {
    invoices[index] = invoice;
  } else {
    invoices.push(invoice);
  }
  saveItems(STORAGE_KEYS.INVOICES, invoices);
};

export const deleteInvoice = (id: string): void => {
  const invoices = getInvoices().filter(i => i.id !== id);
  saveItems(STORAGE_KEYS.INVOICES, invoices);
};

// Delivery Challans
export const getChallans = (): DeliveryChallan[] => getItems<DeliveryChallan>(STORAGE_KEYS.CHALLANS);

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
  const challans = getChallans();
  const index = challans.findIndex(c => c.id === challan.id);
  if (index >= 0) {
    challans[index] = challan;
  } else {
    challans.push(challan);
  }
  saveItems(STORAGE_KEYS.CHALLANS, challans);
};

export const deleteChallan = (id: string): void => {
  const challans = getChallans().filter(c => c.id !== id);
  saveItems(STORAGE_KEYS.CHALLANS, challans);
};

// Vouchers
export const getVouchers = (): Voucher[] => getItems<Voucher>(STORAGE_KEYS.VOUCHERS);

export const getVouchersByCompany = (companyId: string): Voucher[] => {
  return getVouchers().filter(v => v.companyId === companyId);
};

export const saveVoucher = (voucher: Voucher): void => {
  const vouchers = getVouchers();
  const index = vouchers.findIndex(v => v.id === voucher.id);
  if (index >= 0) {
    vouchers[index] = voucher;
  } else {
    vouchers.push(voucher);
  }
  saveItems(STORAGE_KEYS.VOUCHERS, vouchers);
};

export const deleteVoucher = (id: string): void => {
  const vouchers = getVouchers().filter(v => v.id !== id);
  saveItems(STORAGE_KEYS.VOUCHERS, vouchers);
};

// Inventory
export const getInventoryTransactions = (): InventoryTransaction[] => 
  getItems<InventoryTransaction>(STORAGE_KEYS.INVENTORY);

export const saveInventoryTransaction = (transaction: InventoryTransaction): void => {
  const transactions = getInventoryTransactions();
  transactions.push(transaction);
  saveItems(STORAGE_KEYS.INVENTORY, transactions);
  
  // Update product stock
  const products = getProducts();
  const product = products.find(p => p.id === transaction.productId);
  if (product) {
    product.stock += transaction.type === 'in' ? transaction.quantity : -transaction.quantity;
    saveProduct(product);
  }
};

// Multiple Companies
export const getCompanies = (): Company[] => getItems<Company>(STORAGE_KEYS.COMPANIES);

export const saveCompanyToList = (company: Company): void => {
  const companies = getCompanies();
  const index = companies.findIndex(c => c.id === company.id);
  if (index >= 0) {
    companies[index] = company;
  } else {
    companies.push(company);
  }
  saveItems(STORAGE_KEYS.COMPANIES, companies);
};

export const deleteCompany = (id: string): void => {
  const companies = getCompanies().filter(c => c.id !== id);
  saveItems(STORAGE_KEYS.COMPANIES, companies);
};

// Legacy single company support (for backward compatibility)
export const getCompany = (): Company | null => {
  const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
  return data ? JSON.parse(data) : null;
};

export const saveCompany = (company: Company): void => {
  localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(company));
  // Also save to companies list
  saveCompanyToList(company);
};

// Customers
export const getCustomers = (): Customer[] => getItems<Customer>(STORAGE_KEYS.CUSTOMERS);

export const saveCustomer = (customer: Customer): void => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === customer.id);
  if (index >= 0) {
    customers[index] = customer;
  } else {
    customers.push(customer);
  }
  saveItems(STORAGE_KEYS.CUSTOMERS, customers);
};

export const deleteCustomer = (id: string): void => {
  const customers = getCustomers().filter(c => c.id !== id);
  saveItems(STORAGE_KEYS.CUSTOMERS, customers);
};

// Quotations
export const getQuotations = (): Quotation[] => getItems<Quotation>(STORAGE_KEYS.QUOTATIONS);

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
  const quotations = getQuotations();
  const index = quotations.findIndex(q => q.id === quotation.id);
  if (index >= 0) {
    quotations[index] = quotation;
  } else {
    quotations.push(quotation);
  }
  saveItems(STORAGE_KEYS.QUOTATIONS, quotations);
};

export const deleteQuotation = (id: string): void => {
  const quotations = getQuotations().filter(q => q.id !== id);
  saveItems(STORAGE_KEYS.QUOTATIONS, quotations);
};
