import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { Product, Invoice, Voucher, InventoryTransaction, Company, Customer, DeliveryChallan, Quotation, ProductBatch, InvoiceItem, InvoiceTax } from '@/types/accounting';
import { isElectron, electronReadDatabase, electronWriteDatabase } from './electron';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const DB_NAME = 'accounting_data';

// Check if running in Electron
export const isRunningInElectron = (): boolean => isElectron();

// Initialize SQL.js and create/load database
export const initDatabase = async (): Promise<Database> => {
  if (db) return db;

  // Load SQL.js with WASM
  SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  });

  // Try to load existing database from storage (Electron file system or IndexedDB)
  let savedData: Uint8Array | null = null;
  
  if (isElectron()) {
    // Load from file system in Electron
    savedData = await electronReadDatabase();
  } else {
    // Load from IndexedDB in browser
    savedData = await loadFromIndexedDB();
  }
  
  if (savedData) {
    db = new SQL.Database(savedData);
  } else {
    db = new SQL.Database();
    createTables(db);
    // Migrate existing localStorage data
    await migrateFromLocalStorage(db);
  }

  return db;
};

// Create all necessary tables
const createTables = (database: Database): void => {
  database.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      mobile TEXT,
      email TEXT,
      gstin TEXT,
      taxNumber TEXT,
      bankName TEXT,
      bankAccount TEXT,
      bankIfsc TEXT,
      logo TEXT,
      stamp TEXT,
      signature TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      partyName TEXT,
      email TEXT,
      mobile TEXT,
      address TEXT,
      gstin TEXT,
      state TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      hsnSac TEXT,
      rate REAL,
      unit TEXT,
      stock REAL,
      createdAt TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS product_batches (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      batchNumber TEXT,
      mfgDate TEXT,
      quantity REAL,
      expiryDate TEXT,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoiceNumber TEXT NOT NULL,
      companyId TEXT,
      customerName TEXT,
      customerPartyName TEXT,
      customerAddress TEXT,
      customerGSTIN TEXT,
      customerEmail TEXT,
      customerMobile TEXT,
      customerState TEXT,
      date TEXT,
      dueDate TEXT,
      dispatchedThrough TEXT,
      destination TEXT,
      termsOfDelivery TEXT,
      motorVehicleNo TEXT,
      items TEXT,
      totalQty REAL,
      subtotal REAL,
      taxes TEXT,
      taxPercent REAL,
      taxAmount REAL,
      roundOff REAL,
      total REAL,
      declaration TEXT,
      status TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quotationNumber TEXT NOT NULL,
      companyId TEXT,
      customerName TEXT,
      customerPartyName TEXT,
      customerAddress TEXT,
      customerGSTIN TEXT,
      customerEmail TEXT,
      customerMobile TEXT,
      customerState TEXT,
      date TEXT,
      validUntil TEXT,
      subject TEXT,
      items TEXT,
      totalQty REAL,
      subtotal REAL,
      taxes TEXT,
      taxPercent REAL,
      taxAmount REAL,
      roundOff REAL,
      total REAL,
      termsAndConditions TEXT,
      notes TEXT,
      status TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS challans (
      id TEXT PRIMARY KEY,
      challanNumber TEXT NOT NULL,
      companyId TEXT,
      customerName TEXT,
      customerPartyName TEXT,
      customerAddress TEXT,
      customerGSTIN TEXT,
      customerEmail TEXT,
      customerMobile TEXT,
      customerState TEXT,
      date TEXT,
      dispatchedThrough TEXT,
      destination TEXT,
      termsOfDelivery TEXT,
      motorVehicleNo TEXT,
      reasonForTransfer TEXT,
      items TEXT,
      totalQty REAL,
      approxValue REAL,
      remarks TEXT,
      status TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      voucherNumber TEXT NOT NULL,
      companyId TEXT,
      type TEXT,
      date TEXT,
      amount REAL,
      paymentMode TEXT,
      narration TEXT,
      party TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      productId TEXT,
      productName TEXT,
      type TEXT,
      quantity REAL,
      date TEXT,
      reference TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL
    )
  `);
};

// IndexedDB helpers for auto-save
const openIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AccountingDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains('database')) {
        idb.createObjectStore('database');
      }
    };
  });
};

const saveToIndexedDB = async (data: Uint8Array): Promise<void> => {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = idb.transaction(['database'], 'readwrite');
    const store = transaction.objectStore('database');
    const request = store.put(data, DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const loadFromIndexedDB = async (): Promise<Uint8Array | null> => {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');
      const request = store.get(DB_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch {
    return null;
  }
};

// Auto-save database to storage (Electron file system or IndexedDB)
export const saveDatabase = async (): Promise<void> => {
  if (!db) return;
  const data = db.export();
  
  if (isElectron()) {
    // Save to file system in Electron
    await electronWriteDatabase(data);
  } else {
    // Save to IndexedDB in browser
    await saveToIndexedDB(data);
  }
};

// Export database as downloadable file
export const exportDatabase = (): Uint8Array | null => {
  if (!db) return null;
  return db.export();
};

// Import database from file
export const importDatabase = async (data: Uint8Array): Promise<void> => {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });
  }
  
  if (db) {
    db.close();
  }
  
  db = new SQL.Database(data);
  
  if (isElectron()) {
    await electronWriteDatabase(data);
  } else {
    await saveToIndexedDB(data);
  }
};

// Migrate existing localStorage data to SQLite
const migrateFromLocalStorage = async (database: Database): Promise<void> => {
  const STORAGE_KEYS = {
    PRODUCTS: 'accounting_products',
    INVOICES: 'accounting_invoices',
    VOUCHERS: 'accounting_vouchers',
    INVENTORY: 'accounting_inventory',
    COMPANIES: 'accounting_companies',
    CUSTOMERS: 'accounting_customers',
    CHALLANS: 'accounting_challans',
    QUOTATIONS: 'accounting_quotations',
  };

  // Migrate companies
  const companiesData = localStorage.getItem(STORAGE_KEYS.COMPANIES);
  if (companiesData) {
    const companies: Company[] = JSON.parse(companiesData);
    companies.forEach(c => {
      database.run(`
        INSERT OR REPLACE INTO companies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [c.id, c.name, c.address, c.mobile, c.email, c.gstin || null, c.taxNumber || null,
          c.bankName || null, c.bankAccount || null, c.bankIfsc || null, c.logo || null,
          c.stamp || null, c.signature || null, c.createdAt]);
    });
  }

  // Migrate customers
  const customersData = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (customersData) {
    const customers: Customer[] = JSON.parse(customersData);
    customers.forEach(c => {
      database.run(`
        INSERT OR REPLACE INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [c.id, c.name, c.partyName || null, c.email || null, c.mobile || null,
          c.address || null, c.gstin || null, c.state || null, c.createdAt]);
    });
  }

  // Migrate products
  const productsData = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (productsData) {
    const products: Product[] = JSON.parse(productsData);
    products.forEach(p => {
      database.run(`
        INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [p.id, p.name, p.description, p.hsnSac, p.rate, p.unit, p.stock, p.createdAt]);
      
      if (p.batches) {
        p.batches.forEach(b => {
          database.run(`
            INSERT OR REPLACE INTO product_batches VALUES (?, ?, ?, ?, ?, ?)
          `, [b.id, p.id, b.batchNumber, b.mfgDate, b.quantity, b.expiryDate || null]);
        });
      }
    });
  }

  // Migrate invoices
  const invoicesData = localStorage.getItem(STORAGE_KEYS.INVOICES);
  if (invoicesData) {
    const invoices: Invoice[] = JSON.parse(invoicesData);
    invoices.forEach(i => {
      database.run(`
        INSERT OR REPLACE INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [i.id, i.invoiceNumber, i.companyId || null, i.customerName, i.customerPartyName || null,
          i.customerAddress, i.customerGSTIN || null, i.customerEmail || null, i.customerMobile || null,
          i.customerState || null, i.date, i.dueDate || null, i.dispatchedThrough || null,
          i.destination || null, i.termsOfDelivery || null, i.motorVehicleNo || null,
          JSON.stringify(i.items), i.totalQty, i.subtotal, JSON.stringify(i.taxes),
          i.taxPercent, i.taxAmount, i.roundOff, i.total, i.declaration || null, i.status, i.createdAt]);
    });
  }

  // Migrate quotations
  const quotationsData = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
  if (quotationsData) {
    const quotations: Quotation[] = JSON.parse(quotationsData);
    quotations.forEach(q => {
      database.run(`
        INSERT OR REPLACE INTO quotations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [q.id, q.quotationNumber, q.companyId || null, q.customerName, q.customerPartyName || null,
          q.customerAddress, q.customerGSTIN || null, q.customerEmail || null, q.customerMobile || null,
          q.customerState || null, q.date, q.validUntil || null, q.subject || null,
          JSON.stringify(q.items), q.totalQty, q.subtotal, JSON.stringify(q.taxes),
          q.taxPercent, q.taxAmount, q.roundOff, q.total, q.termsAndConditions || null,
          q.notes || null, q.status, q.createdAt]);
    });
  }

  // Migrate challans
  const challansData = localStorage.getItem(STORAGE_KEYS.CHALLANS);
  if (challansData) {
    const challans: DeliveryChallan[] = JSON.parse(challansData);
    challans.forEach(c => {
      database.run(`
        INSERT OR REPLACE INTO challans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [c.id, c.challanNumber, c.companyId || null, c.customerName, c.customerPartyName || null,
          c.customerAddress, c.customerGSTIN || null, c.customerEmail || null, c.customerMobile || null,
          c.customerState || null, c.date, c.dispatchedThrough || null, c.destination || null,
          c.termsOfDelivery || null, c.motorVehicleNo || null, c.reasonForTransfer,
          JSON.stringify(c.items), c.totalQty, c.approxValue || null, c.remarks || null,
          c.status, c.createdAt]);
    });
  }

  // Migrate vouchers
  const vouchersData = localStorage.getItem(STORAGE_KEYS.VOUCHERS);
  if (vouchersData) {
    const vouchers: Voucher[] = JSON.parse(vouchersData);
    vouchers.forEach(v => {
      database.run(`
        INSERT OR REPLACE INTO vouchers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [v.id, v.voucherNumber, v.companyId || null, v.type, v.date, v.amount,
          v.paymentMode, v.narration, v.party || null, v.createdAt]);
    });
  }

  // Migrate inventory transactions
  const inventoryData = localStorage.getItem(STORAGE_KEYS.INVENTORY);
  if (inventoryData) {
    const transactions: InventoryTransaction[] = JSON.parse(inventoryData);
    transactions.forEach(t => {
      database.run(`
        INSERT OR REPLACE INTO inventory_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [t.id, t.productId, t.productName, t.type, t.quantity, t.date, t.reference, t.notes || null, t.createdAt]);
    });
  }

  // Save migrated data
  await saveDatabase();
};

// Get database instance
export const getDatabase = (): Database | null => db;

// ============= CRUD Operations =============

// Companies
export const dbGetCompanies = (): Company[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM companies');
  if (result.length === 0) return [];
  return result[0].values.map((row): Company => ({
    id: row[0] as string,
    name: row[1] as string,
    address: row[2] as string,
    mobile: row[3] as string,
    email: row[4] as string,
    gstin: row[5] as string || undefined,
    taxNumber: row[6] as string || undefined,
    bankName: row[7] as string || undefined,
    bankAccount: row[8] as string || undefined,
    bankIfsc: row[9] as string || undefined,
    logo: row[10] as string || undefined,
    stamp: row[11] as string || undefined,
    signature: row[12] as string || undefined,
    createdAt: row[13] as string,
  }));
};

export const dbSaveCompany = (company: Company): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO companies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [company.id, company.name, company.address, company.mobile, company.email,
      company.gstin || null, company.taxNumber || null, company.bankName || null,
      company.bankAccount || null, company.bankIfsc || null, company.logo || null,
      company.stamp || null, company.signature || null, company.createdAt]);
  saveDatabase();
};

export const dbDeleteCompany = (id: string): void => {
  if (!db) return;
  db.run('DELETE FROM companies WHERE id = ?', [id]);
  saveDatabase();
};

// Customers
export const dbGetCustomers = (): Customer[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM customers');
  if (result.length === 0) return [];
  return result[0].values.map((row): Customer => ({
    id: row[0] as string,
    name: row[1] as string,
    partyName: row[2] as string || undefined,
    email: row[3] as string || undefined,
    mobile: row[4] as string || undefined,
    address: row[5] as string || undefined,
    gstin: row[6] as string || undefined,
    state: row[7] as string || undefined,
    createdAt: row[8] as string,
  }));
};

export const dbSaveCustomer = (customer: Customer): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [customer.id, customer.name, customer.partyName || null, customer.email || null,
      customer.mobile || null, customer.address || null, customer.gstin || null,
      customer.state || null, customer.createdAt]);
  saveDatabase();
};

export const dbDeleteCustomer = (id: string): void => {
  if (!db) return;
  db.run('DELETE FROM customers WHERE id = ?', [id]);
  saveDatabase();
};

// Products
export const dbGetProducts = (): Product[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM products');
  if (result.length === 0) return [];
  
  const batchesResult = db.exec('SELECT * FROM product_batches');
  const batchesMap = new Map<string, ProductBatch[]>();
  
  if (batchesResult.length > 0) {
    batchesResult[0].values.forEach((row) => {
      const productId = row[1] as string;
      const batch: ProductBatch = {
        id: row[0] as string,
        batchNumber: row[2] as string,
        mfgDate: row[3] as string,
        quantity: row[4] as number,
        expiryDate: row[5] as string || undefined,
      };
      if (!batchesMap.has(productId)) {
        batchesMap.set(productId, []);
      }
      batchesMap.get(productId)!.push(batch);
    });
  }
  
  return result[0].values.map((row): Product => ({
    id: row[0] as string,
    name: row[1] as string,
    description: row[2] as string,
    hsnSac: row[3] as string,
    rate: row[4] as number,
    unit: row[5] as string,
    stock: row[6] as number,
    batches: batchesMap.get(row[0] as string),
    createdAt: row[7] as string,
  }));
};

export const dbSaveProduct = (product: Product): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [product.id, product.name, product.description, product.hsnSac,
      product.rate, product.unit, product.stock, product.createdAt]);
  
  // Handle batches
  db.run('DELETE FROM product_batches WHERE productId = ?', [product.id]);
  if (product.batches) {
    product.batches.forEach(b => {
      db.run(`
        INSERT INTO product_batches VALUES (?, ?, ?, ?, ?, ?)
      `, [b.id, product.id, b.batchNumber, b.mfgDate, b.quantity, b.expiryDate || null]);
    });
  }
  saveDatabase();
};

export const dbDeleteProduct = (id: string): void => {
  if (!db) return;
  db.run('DELETE FROM product_batches WHERE productId = ?', [id]);
  db.run('DELETE FROM products WHERE id = ?', [id]);
  saveDatabase();
};

// Invoices
export const dbGetInvoices = (): Invoice[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM invoices');
  if (result.length === 0) return [];
  return result[0].values.map((row): Invoice => ({
    id: row[0] as string,
    invoiceNumber: row[1] as string,
    companyId: row[2] as string || undefined,
    customerName: row[3] as string,
    customerPartyName: row[4] as string || undefined,
    customerAddress: row[5] as string,
    customerGSTIN: row[6] as string || undefined,
    customerEmail: row[7] as string || undefined,
    customerMobile: row[8] as string || undefined,
    customerState: row[9] as string || undefined,
    date: row[10] as string,
    dueDate: row[11] as string || undefined,
    dispatchedThrough: row[12] as string || undefined,
    destination: row[13] as string || undefined,
    termsOfDelivery: row[14] as string || undefined,
    motorVehicleNo: row[15] as string || undefined,
    items: JSON.parse(row[16] as string) as InvoiceItem[],
    totalQty: row[17] as number,
    subtotal: row[18] as number,
    taxes: JSON.parse(row[19] as string) as InvoiceTax[],
    taxPercent: row[20] as number,
    taxAmount: row[21] as number,
    roundOff: row[22] as number,
    total: row[23] as number,
    declaration: row[24] as string || undefined,
    status: row[25] as Invoice['status'],
    createdAt: row[26] as string,
  }));
};

export const dbSaveInvoice = (invoice: Invoice): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [invoice.id, invoice.invoiceNumber, invoice.companyId || null, invoice.customerName,
      invoice.customerPartyName || null, invoice.customerAddress, invoice.customerGSTIN || null,
      invoice.customerEmail || null, invoice.customerMobile || null, invoice.customerState || null,
      invoice.date, invoice.dueDate || null, invoice.dispatchedThrough || null,
      invoice.destination || null, invoice.termsOfDelivery || null, invoice.motorVehicleNo || null,
      JSON.stringify(invoice.items), invoice.totalQty, invoice.subtotal, JSON.stringify(invoice.taxes),
      invoice.taxPercent, invoice.taxAmount, invoice.roundOff, invoice.total,
      invoice.declaration || null, invoice.status, invoice.createdAt]);
  saveDatabase();
};

export const dbDeleteInvoice = (id: string): void => {
  if (!db) return;
  db.run('DELETE FROM invoices WHERE id = ?', [id]);
  saveDatabase();
};

// Quotations
export const dbGetQuotations = (): Quotation[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM quotations');
  if (result.length === 0) return [];
  return result[0].values.map((row): Quotation => ({
    id: row[0] as string,
    quotationNumber: row[1] as string,
    companyId: row[2] as string || undefined,
    customerName: row[3] as string,
    customerPartyName: row[4] as string || undefined,
    customerAddress: row[5] as string,
    customerGSTIN: row[6] as string || undefined,
    customerEmail: row[7] as string || undefined,
    customerMobile: row[8] as string || undefined,
    customerState: row[9] as string || undefined,
    date: row[10] as string,
    validUntil: row[11] as string || undefined,
    subject: row[12] as string || undefined,
    items: JSON.parse(row[13] as string) as InvoiceItem[],
    totalQty: row[14] as number,
    subtotal: row[15] as number,
    taxes: JSON.parse(row[16] as string) as InvoiceTax[],
    taxPercent: row[17] as number,
    taxAmount: row[18] as number,
    roundOff: row[19] as number,
    total: row[20] as number,
    termsAndConditions: row[21] as string || undefined,
    notes: row[22] as string || undefined,
    status: row[23] as Quotation['status'],
    createdAt: row[24] as string,
  }));
};

export const dbSaveQuotation = (quotation: Quotation): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO quotations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [quotation.id, quotation.quotationNumber, quotation.companyId || null, quotation.customerName,
      quotation.customerPartyName || null, quotation.customerAddress, quotation.customerGSTIN || null,
      quotation.customerEmail || null, quotation.customerMobile || null, quotation.customerState || null,
      quotation.date, quotation.validUntil || null, quotation.subject || null,
      JSON.stringify(quotation.items), quotation.totalQty, quotation.subtotal, JSON.stringify(quotation.taxes),
      quotation.taxPercent, quotation.taxAmount, quotation.roundOff, quotation.total,
      quotation.termsAndConditions || null, quotation.notes || null, quotation.status, quotation.createdAt]);
  saveDatabase();
};

export const dbDeleteQuotation = (id: string): void => {
  if (!db) return;
  db.run('DELETE FROM quotations WHERE id = ?', [id]);
  saveDatabase();
};

// Challans
export const dbGetChallans = (): DeliveryChallan[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM challans');
  if (result.length === 0) return [];
  return result[0].values.map((row): DeliveryChallan => ({
    id: row[0] as string,
    challanNumber: row[1] as string,
    companyId: row[2] as string || undefined,
    customerName: row[3] as string,
    customerPartyName: row[4] as string || undefined,
    customerAddress: row[5] as string,
    customerGSTIN: row[6] as string || undefined,
    customerEmail: row[7] as string || undefined,
    customerMobile: row[8] as string || undefined,
    customerState: row[9] as string || undefined,
    date: row[10] as string,
    dispatchedThrough: row[11] as string || undefined,
    destination: row[12] as string || undefined,
    termsOfDelivery: row[13] as string || undefined,
    motorVehicleNo: row[14] as string || undefined,
    reasonForTransfer: row[15] as DeliveryChallan['reasonForTransfer'],
    items: JSON.parse(row[16] as string) as InvoiceItem[],
    totalQty: row[17] as number,
    approxValue: row[18] as number || undefined,
    remarks: row[19] as string || undefined,
    status: row[20] as DeliveryChallan['status'],
    createdAt: row[21] as string,
  }));
};

export const dbSaveChallan = (challan: DeliveryChallan): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO challans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [challan.id, challan.challanNumber, challan.companyId || null, challan.customerName,
      challan.customerPartyName || null, challan.customerAddress, challan.customerGSTIN || null,
      challan.customerEmail || null, challan.customerMobile || null, challan.customerState || null,
      challan.date, challan.dispatchedThrough || null, challan.destination || null,
      challan.termsOfDelivery || null, challan.motorVehicleNo || null, challan.reasonForTransfer,
      JSON.stringify(challan.items), challan.totalQty, challan.approxValue || null,
      challan.remarks || null, challan.status, challan.createdAt]);
  saveDatabase();
};

export const dbDeleteChallan = (id: string): void => {
  if (!db) return;
  db.run('DELETE FROM challans WHERE id = ?', [id]);
  saveDatabase();
};

// Vouchers
export const dbGetVouchers = (): Voucher[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM vouchers');
  if (result.length === 0) return [];
  return result[0].values.map((row): Voucher => ({
    id: row[0] as string,
    voucherNumber: row[1] as string,
    companyId: row[2] as string || undefined,
    type: row[3] as Voucher['type'],
    date: row[4] as string,
    amount: row[5] as number,
    paymentMode: row[6] as string,
    narration: row[7] as string,
    party: row[8] as string || undefined,
    createdAt: row[9] as string,
  }));
};

export const dbSaveVoucher = (voucher: Voucher): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO vouchers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [voucher.id, voucher.voucherNumber, voucher.companyId || null, voucher.type,
      voucher.date, voucher.amount, voucher.paymentMode, voucher.narration,
      voucher.party || null, voucher.createdAt]);
  saveDatabase();
};

export const dbDeleteVoucher = (id: string): void => {
  if (!db) return;
  db.run('DELETE FROM vouchers WHERE id = ?', [id]);
  saveDatabase();
};

// Inventory Transactions
export const dbGetInventoryTransactions = (): InventoryTransaction[] => {
  if (!db) return [];
  const result = db.exec('SELECT * FROM inventory_transactions');
  if (result.length === 0) return [];
  return result[0].values.map((row): InventoryTransaction => ({
    id: row[0] as string,
    productId: row[1] as string,
    productName: row[2] as string,
    type: row[3] as 'in' | 'out',
    quantity: row[4] as number,
    date: row[5] as string,
    reference: row[6] as string,
    notes: row[7] as string || undefined,
    createdAt: row[8] as string,
  }));
};

export const dbSaveInventoryTransaction = (transaction: InventoryTransaction): void => {
  if (!db) return;
  db.run(`
    INSERT OR REPLACE INTO inventory_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [transaction.id, transaction.productId, transaction.productName, transaction.type,
      transaction.quantity, transaction.date, transaction.reference, transaction.notes || null,
      transaction.createdAt]);
  saveDatabase();
};
