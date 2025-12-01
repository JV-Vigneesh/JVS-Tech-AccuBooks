import { Product, Invoice, Voucher, InventoryTransaction, Company, Customer } from '@/types/accounting';

const STORAGE_KEYS = {
  PRODUCTS: 'accounting_products',
  INVOICES: 'accounting_invoices',
  VOUCHERS: 'accounting_vouchers',
  INVENTORY: 'accounting_inventory',
  COMPANY: 'accounting_company',
  CUSTOMERS: 'accounting_customers',
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

// Vouchers
export const getVouchers = (): Voucher[] => getItems<Voucher>(STORAGE_KEYS.VOUCHERS);

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

// Company
export const getCompany = (): Company | null => {
  const data = localStorage.getItem(STORAGE_KEYS.COMPANY);
  return data ? JSON.parse(data) : null;
};

export const saveCompany = (company: Company): void => {
  localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(company));
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
