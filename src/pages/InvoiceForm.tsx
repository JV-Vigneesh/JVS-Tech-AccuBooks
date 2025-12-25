import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInvoices, saveInvoice, getProducts, getCustomers, getNextInvoiceNumber } from '@/lib/storage';
import { Invoice, InvoiceItem, Product, Customer, InvoiceTax } from '@/types/accounting';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

const UNIT_OPTIONS = [
  'Nos.',
  'PCS',
  'KG',
  'GM',
  'LTR',
  'ML',
  'MTR',
  'CM',
  'BOX',
  'PKT',
  'SET',
  'PAIR',
  'DOZEN',
  'ROLL',
  'BAG',
  'BTL',
  'CAN',
  'CTN',
];

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [invoice, setInvoice] = useState<Invoice>({
    id: crypto.randomUUID(),
    invoiceNumber: '',
    companyId: '',
    customerName: '',
    customerAddress: '',
    customerGSTIN: '',
    customerEmail: '',
    customerMobile: '',
    customerState: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    dispatchedThrough: '',
    destination: '',
    termsOfDelivery: '',
    motorVehicleNo: '',
    items: [],
    totalQty: 0,
    subtotal: 0,
    taxes: [
      { name: 'CGST', percent: 9, amount: 0 },
      { name: 'SGST', percent: 9, amount: 0 },
    ],
    taxPercent: 18,
    taxAmount: 0,
    roundOff: 0,
    total: 0,
    declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    status: 'draft',
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    setProducts(getProducts());
    setCustomers(getCustomers());
    
    if (id) {
      const invoices = getInvoices();
      const existingInvoice = invoices.find(inv => inv.id === id);
      if (existingInvoice) {
        const updatedInvoice = {
          ...existingInvoice,
          totalQty: existingInvoice.totalQty || 0,
          taxes: existingInvoice.taxes || [
            { name: 'CGST', percent: 9, amount: 0 },
            { name: 'SGST', percent: 9, amount: 0 },
          ],
          roundOff: existingInvoice.roundOff || 0,
        };
        setInvoice(updatedInvoice);
      }
    } else if (selectedCompany) {
      // New invoice - set company and next invoice number
      setInvoice(prev => ({
        ...prev,
        companyId: selectedCompany.id,
        invoiceNumber: getNextInvoiceNumber(selectedCompany.id),
      }));
    }
  }, [id, selectedCompany]);

  const recalculateTotals = (items: InvoiceItem[], taxes: InvoiceTax[]) => {
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.finalAmount, 0);
    
    const updatedTaxes = taxes.map(tax => ({
      ...tax,
      amount: (subtotal * tax.percent) / 100,
    }));
    
    const taxAmount = updatedTaxes.reduce((sum, tax) => sum + tax.amount, 0);
    const totalBeforeRound = subtotal + taxAmount;
    const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
    const total = Math.round(totalBeforeRound);
    const taxPercent = taxes.reduce((sum, tax) => sum + tax.percent, 0);
    
    return { totalQty, subtotal, taxes: updatedTaxes, taxAmount, roundOff, total, taxPercent };
  };

  const calculateItemTotal = (item: Partial<InvoiceItem>) => {
    const amount = (item.rate || 0) * (item.quantity || 0);
    const discount = (amount * (item.discountPercent || 0)) / 100;
    return amount - discount;
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      slNo: invoice.items.length + 1,
      description: '',
      batchNumber: '',
      mfgDate: '',
      cases: 0,
      hsnSac: '',
      quantity: 1,
      unit: 'Nos.',
      rate: 0,
      amount: 0,
      discountPercent: 0,
      discountPer: 'item',
      finalAmount: 0,
    };
    const newItems = [...invoice.items, newItem];
    const totals = recalculateTotals(newItems, invoice.taxes);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    newItems[index].amount = newItems[index].rate * newItems[index].quantity;
    newItems[index].finalAmount = calculateItemTotal(newItems[index]);
    
    const totals = recalculateTotals(newItems, invoice.taxes);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const removeItem = (index: number) => {
    const newItems = invoice.items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => item.slNo = i + 1);
    
    const totals = recalculateTotals(newItems, invoice.taxes);
    setInvoice({ ...invoice, items: newItems, ...totals });
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...invoice.items];
      const firstBatch = product.batches?.[0];
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        hsnSac: product.hsnSac,
        rate: product.rate,
        unit: product.unit || 'Nos.',
        batchNumber: firstBatch?.batchNumber || '',
        mfgDate: firstBatch?.mfgDate || '',
      };
      newItems[index].amount = newItems[index].rate * newItems[index].quantity;
      newItems[index].finalAmount = calculateItemTotal(newItems[index]);
      
      const totals = recalculateTotals(newItems, invoice.taxes);
      setInvoice({ ...invoice, items: newItems, ...totals });
    }
  };

  const selectBatch = (index: number, batchId: string) => {
    const item = invoice.items[index];
    const product = products.find(p => p.id === item.productId);
    if (product && product.batches) {
      const batch = product.batches.find(b => b.id === batchId);
      if (batch) {
        const newItems = [...invoice.items];
        newItems[index] = { ...newItems[index], batchNumber: batch.batchNumber, mfgDate: batch.mfgDate };
        const totals = recalculateTotals(newItems, invoice.taxes);
        setInvoice({ ...invoice, items: newItems, ...totals });
      }
    }
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setInvoice({
        ...invoice,
        customerName: customer.name,
        customerPartyName: customer.partyName || '',
        customerAddress: customer.address || '',
        customerGSTIN: customer.gstin || '',
        customerEmail: customer.email || '',
        customerMobile: customer.mobile || '',
        customerState: customer.state || '',
      });
    }
  };

  const updateTax = (index: number, field: 'name' | 'percent', value: string | number) => {
    const newTaxes = [...invoice.taxes];
    if (field === 'name') {
      newTaxes[index] = { ...newTaxes[index], name: value as string };
    } else {
      newTaxes[index] = { ...newTaxes[index], percent: value as number };
    }
    const totals = recalculateTotals(invoice.items, newTaxes);
    setInvoice({ ...invoice, ...totals });
  };

  const addTax = () => {
    const newTaxes = [...invoice.taxes, { name: 'Tax', percent: 0, amount: 0 }];
    const totals = recalculateTotals(invoice.items, newTaxes);
    setInvoice({ ...invoice, ...totals });
  };

  const removeTax = (index: number) => {
    const newTaxes = invoice.taxes.filter((_, i) => i !== index);
    const totals = recalculateTotals(invoice.items, newTaxes);
    setInvoice({ ...invoice, ...totals });
  };

  const handleSave = (status: Invoice['status'] = 'draft') => {
    if (!selectedCompany) {
      toast({
        title: 'Error',
        description: 'Please select a company from the sidebar first',
        variant: 'destructive',
      });
      return;
    }

    if (!invoice.customerName) {
      toast({
        title: 'Error',
        description: 'Customer name is required',
        variant: 'destructive',
      });
      return;
    }

    saveInvoice({ ...invoice, companyId: selectedCompany.id, status });
    toast({
      title: 'Success',
      description: `Invoice ${status === 'draft' ? 'saved as draft' : 'created'} successfully`,
    });
    navigate('/invoices');
  };

  if (!selectedCompany) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company from the sidebar or add one in Settings.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {id ? 'Edit Invoice' : 'New Invoice'}
          </h1>
          <p className="text-sm text-muted-foreground">Company: {selectedCompany.name}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => handleSave('draft')}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSave('sent')}>
            Save Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                  placeholder="Enter or auto-generated"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={invoice.date}
                  onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={invoice.dueDate || ''}
                  onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="motorVehicleNo">Motor Vehicle No.</Label>
                <Input
                  id="motorVehicleNo"
                  value={invoice.motorVehicleNo || ''}
                  onChange={(e) => setInvoice({ ...invoice, motorVehicleNo: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dispatchedThrough">Dispatched Through</Label>
                <Input
                  id="dispatchedThrough"
                  value={invoice.dispatchedThrough || ''}
                  onChange={(e) => setInvoice({ ...invoice, dispatchedThrough: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={invoice.destination || ''}
                  onChange={(e) => setInvoice({ ...invoice, destination: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="termsOfDelivery">Terms of Delivery</Label>
                <Input
                  id="termsOfDelivery"
                  value={invoice.termsOfDelivery || ''}
                  onChange={(e) => setInvoice({ ...invoice, termsOfDelivery: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select from Saved Customers</Label>
              <Select onValueChange={selectCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer or enter manually below" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.partyName ? `(${customer.partyName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={invoice.customerName}
                  onChange={(e) => setInvoice({ ...invoice, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerGSTIN">Customer GSTIN</Label>
                <Input
                  id="customerGSTIN"
                  value={invoice.customerGSTIN || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerGSTIN: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Customer Address</Label>
              <Textarea
                id="customerAddress"
                value={invoice.customerAddress}
                onChange={(e) => setInvoice({ ...invoice, customerAddress: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={invoice.customerEmail || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerMobile">Mobile</Label>
                <Input
                  id="customerMobile"
                  value={invoice.customerMobile || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerMobile: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerState">State</Label>
                <Input
                  id="customerState"
                  value={invoice.customerState || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerState: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoice Items</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoice.items.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.productId);
                return (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">Item #{item.slNo}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <Label className="text-xs">Product</Label>
                        <Select onValueChange={(value) => selectProduct(index, value)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Input
                          className="h-9"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Type or select product"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Batch</Label>
                        {selectedProduct?.batches && selectedProduct.batches.length > 0 ? (
                          <Select onValueChange={(value) => selectBatch(index, value)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={item.batchNumber || "Select"} />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProduct.batches.map((batch) => (
                                <SelectItem key={batch.id} value={batch.id}>
                                  {batch.batchNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-9"
                            value={item.batchNumber || ''}
                            onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                          />
                        )}
                      </div>
                      
                      <div>
                        <Label className="text-xs">Mfg Date</Label>
                        <Input
                          className="h-9"
                          value={item.mfgDate || ''}
                          onChange={(e) => updateItem(index, 'mfgDate', e.target.value)}
                          placeholder="MM/YYYY"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">HSN/SAC</Label>
                        <Input
                          className="h-9"
                          value={item.hsnSac}
                          onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      <div>
                        <Label className="text-xs">Cases</Label>
                        <Input
                          className="h-9"
                          type="number"
                          value={item.cases || ''}
                          onChange={(e) => updateItem(index, 'cases', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          className="h-9"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Select 
                          value={item.unit} 
                          onValueChange={(value) => updateItem(index, 'unit', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Rate</Label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Disc %</Label>
                        <Input
                          className="h-9"
                          type="number"
                          value={item.discountPercent}
                          onChange={(e) => updateItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <Label className="text-xs">Amount</Label>
                        <div className="h-9 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                          ₹{item.finalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {invoice.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items added. Click "Add Item" to add invoice items.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Taxes</CardTitle>
                <Button onClick={addTax} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tax
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoice.taxes.map((tax, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={tax.name}
                      onChange={(e) => updateTax(index, 'name', e.target.value)}
                      placeholder="Tax name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={tax.percent}
                      onChange={(e) => updateTax(index, 'percent', parseFloat(e.target.value) || 0)}
                      placeholder="%"
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground w-24 text-right">
                      ₹{tax.amount.toFixed(2)}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => removeTax(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Quantity:</span>
                  <span>{invoice.totalQty}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.taxes.map((tax, index) => (
                  <div key={index} className="flex justify-between text-sm text-muted-foreground">
                    <span>{tax.name} ({tax.percent}%):</span>
                    <span>₹{tax.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span>Round Off:</span>
                  <span>{invoice.roundOff >= 0 ? '+' : ''}₹{invoice.roundOff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                  <span>Total:</span>
                  <span>₹{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Declaration</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={invoice.declaration}
              onChange={(e) => setInvoice({ ...invoice, declaration: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}