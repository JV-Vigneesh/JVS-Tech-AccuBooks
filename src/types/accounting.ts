export interface ProductBatch {
  id: string;
  batchNumber: string;
  mfgDate: string; // Month and Year e.g., "01/2024"
  quantity: number;
  expiryDate?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  hsnSac: string;
  rate: number;
  unit: string;
  stock: number;
  batches?: ProductBatch[];
  createdAt: string;
}

export interface InvoiceItem {
  slNo: number;
  description: string;
  productId?: string;
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
  customerPartyName?: string;
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

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  companyId?: string;
  customerName: string;
  customerPartyName?: string;
  customerAddress: string;
  customerGSTIN?: string;
  customerEmail?: string;
  customerMobile?: string;
  customerState?: string;
  date: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  motorVehicleNo?: string;
  reasonForTransfer: 'supply' | 'job_work' | 'exhibition' | 'personal' | 'other';
  items: InvoiceItem[];
  totalQty: number;
  approxValue?: number;
  remarks?: string;
  status: 'draft' | 'dispatched' | 'delivered';
  createdAt: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  companyId?: string;
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
  partyName?: string;
  email?: string;
  mobile?: string;
  address?: string;
  gstin?: string;
  state?: string;
  createdAt: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  companyId?: string;
  customerName: string;
  customerPartyName?: string;
  customerAddress: string;
  customerGSTIN?: string;
  customerEmail?: string;
  customerMobile?: string;
  customerState?: string;
  date: string;
  validUntil?: string;
  subject?: string;
  items: InvoiceItem[];
  totalQty: number;
  subtotal: number;
  taxes: InvoiceTax[];
  taxPercent: number;
  taxAmount: number;
  roundOff: number;
  total: number;
  termsAndConditions?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
}
