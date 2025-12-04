export interface Product {
  id: string;
  name: string;
  description: string;
  hsnSac: string;
  rate: number;
  unit: string;
  stock: number;
  createdAt: string;
}

export interface InvoiceItem {
  slNo: number;
  description: string;
  batchNumber?: string;
  mfgDate?: string; // Month and Year e.g., "01/2024"
  cases?: number; // No of cases/box/package
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discountPercent: number;
  discountPer: string;
  finalAmount: number;
}

export interface InvoiceTax {
  name: string;
  percent: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId?: string;
  customerName: string;
  customerAddress: string;
  customerGSTIN?: string;
  customerEmail?: string;
  customerMobile?: string;
  customerState?: string;
  date: string;
  dueDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  motorVehicleNo?: string;
  items: InvoiceItem[];
  totalQty: number;
  subtotal: number;
  taxes: InvoiceTax[];
  taxPercent: number;
  taxAmount: number;
  roundOff: number;
  total: number;
  declaration?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  type: 'payment' | 'receipt' | 'journal' | 'contra';
  date: string;
  amount: number;
  paymentMode: string;
  narration: string;
  party?: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  reference: string;
  notes?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  mobile: string;
  email: string;
  gstin?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  logo?: string;
  stamp?: string;
  signature?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  address?: string;
  gstin?: string;
  createdAt: string;
}