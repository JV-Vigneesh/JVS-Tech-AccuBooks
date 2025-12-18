import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getQuotations, saveQuotation, getProducts, getCustomers, getNextQuotationNumber } from '@/lib/storage';
import { Quotation, InvoiceItem, Product, Customer, InvoiceTax } from '@/types/accounting';
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

export default function QuotationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [quotation, setQuotation] = useState<Quotation>({
    id: crypto.randomUUID(),
    quotationNumber: '',
    companyId: '',
    customerName: '',
    customerAddress: '',
    customerGSTIN: '',
    customerEmail: '',
    customerMobile: '',
    customerState: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: '',
    subject: '',
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
    termsAndConditions: '1. Prices are valid for 30 days from the date of quotation.\n2. Payment terms: 50% advance, balance on delivery.\n3. Delivery within 7-10 working days.\n4. GST as applicable.',
    notes: '',
    status: 'draft',
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    setProducts(getProducts());
    setCustomers(getCustomers());
    
    if (id) {
      const quotations = getQuotations();
      const existingQuotation = quotations.find(q => q.id === id);
      if (existingQuotation) {
        const updatedQuotation = {
          ...existingQuotation,
          totalQty: existingQuotation.totalQty || 0,
          taxes: existingQuotation.taxes || [
            { name: 'CGST', percent: 9, amount: 0 },
            { name: 'SGST', percent: 9, amount: 0 },
          ],
          roundOff: existingQuotation.roundOff || 0,
        };
        setQuotation(updatedQuotation);
      }
    } else if (selectedCompany) {
      setQuotation(prev => ({
        ...prev,
        companyId: selectedCompany.id,
        quotationNumber: getNextQuotationNumber(selectedCompany.id),
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
      slNo: quotation.items.length + 1,
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
    const newItems = [...quotation.items, newItem];
    const totals = recalculateTotals(newItems, quotation.taxes);
    setQuotation({ ...quotation, items: newItems, ...totals });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...quotation.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    newItems[index].amount = newItems[index].rate * newItems[index].quantity;
    newItems[index].finalAmount = calculateItemTotal(newItems[index]);
    
    const totals = recalculateTotals(newItems, quotation.taxes);
    setQuotation({ ...quotation, items: newItems, ...totals });
  };

  const removeItem = (index: number) => {
    const newItems = quotation.items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => item.slNo = i + 1);
    
    const totals = recalculateTotals(newItems, quotation.taxes);
    setQuotation({ ...quotation, items: newItems, ...totals });
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...quotation.items];
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
      
      const totals = recalculateTotals(newItems, quotation.taxes);
      setQuotation({ ...quotation, items: newItems, ...totals });
    }
  };

  const selectBatch = (index: number, batchId: string) => {
    const item = quotation.items[index];
    const product = products.find(p => p.id === item.productId);
    if (product && product.batches) {
      const batch = product.batches.find(b => b.id === batchId);
      if (batch) {
        const newItems = [...quotation.items];
        newItems[index] = { ...newItems[index], batchNumber: batch.batchNumber, mfgDate: batch.mfgDate };
        const totals = recalculateTotals(newItems, quotation.taxes);
        setQuotation({ ...quotation, items: newItems, ...totals });
      }
    }
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setQuotation({
        ...quotation,
        customerName: customer.name,
        customerAddress: customer.address || '',
        customerGSTIN: customer.gstin || '',
        customerEmail: customer.email || '',
        customerMobile: customer.mobile || '',
        customerState: customer.state || '',
      });
    }
  };

  const updateTax = (index: number, field: 'name' | 'percent', value: string | number) => {
    const newTaxes = [...quotation.taxes];
    if (field === 'name') {
      newTaxes[index] = { ...newTaxes[index], name: value as string };
    } else {
      newTaxes[index] = { ...newTaxes[index], percent: value as number };
    }
    const totals = recalculateTotals(quotation.items, newTaxes);
    setQuotation({ ...quotation, ...totals });
  };

  const addTax = () => {
    const newTaxes = [...quotation.taxes, { name: 'Tax', percent: 0, amount: 0 }];
    const totals = recalculateTotals(quotation.items, newTaxes);
    setQuotation({ ...quotation, ...totals });
  };

  const removeTax = (index: number) => {
    const newTaxes = quotation.taxes.filter((_, i) => i !== index);
    const totals = recalculateTotals(quotation.items, newTaxes);
    setQuotation({ ...quotation, ...totals });
  };

  const handleSave = (status: Quotation['status'] = 'draft') => {
    if (!selectedCompany) {
      toast({
        title: 'Error',
        description: 'Please select a company from the sidebar first',
        variant: 'destructive',
      });
      return;
    }

    if (!quotation.customerName) {
      toast({
        title: 'Error',
        description: 'Customer name is required',
        variant: 'destructive',
      });
      return;
    }

    saveQuotation({ ...quotation, companyId: selectedCompany.id, status });
    toast({
      title: 'Success',
      description: `Quotation ${status === 'draft' ? 'saved as draft' : 'created'} successfully`,
    });
    navigate('/quotations');
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
            {id ? 'Edit Quotation' : 'New Quotation'}
          </h1>
          <p className="text-sm text-muted-foreground">Company: {selectedCompany.name}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => handleSave('draft')}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSave('sent')}>
            Save Quotation
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="quotationNumber">Quotation Number</Label>
                <Input
                  id="quotationNumber"
                  value={quotation.quotationNumber}
                  onChange={(e) => setQuotation({ ...quotation, quotationNumber: e.target.value })}
                  placeholder="Enter or auto-generated"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={quotation.date}
                  onChange={(e) => setQuotation({ ...quotation, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={quotation.validUntil || ''}
                  onChange={(e) => setQuotation({ ...quotation, validUntil: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={quotation.subject || ''}
                  onChange={(e) => setQuotation({ ...quotation, subject: e.target.value })}
                  placeholder="e.g., Supply of goods"
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
                  value={quotation.customerName}
                  onChange={(e) => setQuotation({ ...quotation, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerGSTIN">Customer GSTIN</Label>
                <Input
                  id="customerGSTIN"
                  value={quotation.customerGSTIN || ''}
                  onChange={(e) => setQuotation({ ...quotation, customerGSTIN: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Customer Address</Label>
              <Textarea
                id="customerAddress"
                value={quotation.customerAddress}
                onChange={(e) => setQuotation({ ...quotation, customerAddress: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={quotation.customerEmail || ''}
                  onChange={(e) => setQuotation({ ...quotation, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerMobile">Mobile</Label>
                <Input
                  id="customerMobile"
                  value={quotation.customerMobile || ''}
                  onChange={(e) => setQuotation({ ...quotation, customerMobile: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerState">State</Label>
                <Input
                  id="customerState"
                  value={quotation.customerState || ''}
                  onChange={(e) => setQuotation({ ...quotation, customerState: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Quotation Items</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotation.items.map((item, index) => {
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
                      <div className="col-span-2 sm:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Input
                          className="h-9"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
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
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      <div>
                        <Label className="text-xs">Rate</Label>
                        <Input
                          className="h-9"
                          type="number"
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
                      <div>
                        <Label className="text-xs">Cases</Label>
                        <Input
                          className="h-9"
                          type="number"
                          value={item.cases || 0}
                          onChange={(e) => updateItem(index, 'cases', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      {selectedProduct?.batches && selectedProduct.batches.length > 0 && (
                        <div>
                          <Label className="text-xs">Batch</Label>
                          <Select onValueChange={(value) => selectBatch(index, value)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select batch" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProduct.batches.map((batch) => (
                                <SelectItem key={batch.id} value={batch.id}>
                                  {batch.batchNumber} ({batch.mfgDate})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Batch No.</Label>
                        <Input
                          className="h-9"
                          value={item.batchNumber || ''}
                          onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                        />
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
                    </div>
                    
                    <div className="flex justify-end">
                      <span className="text-sm font-semibold">Amount: ₹{item.finalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

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
            <div className="space-y-3">
              {quotation.taxes.map((tax, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    placeholder="Tax name"
                    value={tax.name}
                    onChange={(e) => updateTax(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="%"
                    value={tax.percent}
                    onChange={(e) => updateTax(index, 'percent', parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground w-24 text-right">
                    ₹{tax.amount.toFixed(2)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeTax(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
              <Textarea
                id="termsAndConditions"
                value={quotation.termsAndConditions || ''}
                onChange={(e) => setQuotation({ ...quotation, termsAndConditions: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={quotation.notes || ''}
                onChange={(e) => setQuotation({ ...quotation, notes: e.target.value })}
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Qty:</span>
                <span>{quotation.totalQty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{quotation.subtotal.toFixed(2)}</span>
              </div>
              {quotation.taxes.map((tax, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tax.name} ({tax.percent}%):</span>
                  <span>₹{tax.amount.toFixed(2)}</span>
                </div>
              ))}
              {quotation.roundOff !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Round Off:</span>
                  <span>{quotation.roundOff >= 0 ? '+' : ''}₹{quotation.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>₹{quotation.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}