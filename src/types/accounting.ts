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
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discountPercent: number;
  discountPer: string;
  finalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerAddress: string;
  customerGSTIN?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
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
