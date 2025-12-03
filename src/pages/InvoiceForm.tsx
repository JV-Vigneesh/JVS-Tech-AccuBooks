import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getInvoices, saveInvoice, getProducts, getCustomers, getCompanies, getNextInvoiceNumber } from '@/lib/storage';
import { Invoice, InvoiceItem, Product, Customer, Company, InvoiceTax } from '@/types/accounting';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
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
    const allCompanies = getCompanies();
    setCompanies(allCompanies);
    
    if (id) {
      const invoices = getInvoices();
      const existingInvoice = invoices.find(inv => inv.id === id);
      if (existingInvoice) {
        // Ensure backward compatibility
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
        if (existingInvoice.companyId) {
          const comp = allCompanies.find(c => c.id === existingInvoice.companyId);
          if (comp) setSelectedCompany(comp);
        }
      }
    } else {
      // New invoice - set next invoice number
      setInvoice(prev => ({
        ...prev,
        invoiceNumber: getNextInvoiceNumber(),
      }));
    }
  }, [id]);

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
      newItems[index] = {
        ...newItems[index],
        description: product.name,
        hsnSac: product.hsnSac,
        rate: product.rate,
        unit: product.unit || 'Nos.',
      };
      newItems[index].amount = newItems[index].rate * newItems[index].quantity;
      newItems[index].finalAmount = calculateItemTotal(newItems[index]);
      
      const totals = recalculateTotals(newItems, invoice.taxes);
      setInvoice({ ...invoice, items: newItems, ...totals });
    }
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setInvoice({
        ...invoice,
        customerName: customer.name,
        customerAddress: customer.address || '',
        customerGSTIN: customer.gstin || '',
        customerEmail: customer.email || '',
        customerMobile: customer.mobile || '',
      });
    }
  };

  const selectCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
      setInvoice({ ...invoice, companyId: company.id });
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
    if (!invoice.customerName) {
      toast({
        title: 'Error',
        description: 'Customer name is required',
        variant: 'destructive',
      });
      return;
    }

    saveInvoice({ ...invoice, status });
    toast({
      title: 'Success',
      description: `Invoice ${status === 'draft' ? 'saved as draft' : 'created'} successfully`,
    });
    navigate('/invoices');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {id ? 'Edit Invoice' : 'New Invoice'}
        </h1>
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
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Select Company</Label>
                <Select value={invoice.companyId || ''} onValueChange={selectCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dispatchedThrough">Dispatched Through</Label>
                <Input
                  id="dispatchedThrough"
                  value={invoice.dispatchedThrough || ''}
                  onChange={(e) => setInvoice({ ...invoice, dispatchedThrough: e.target.value })}
                  placeholder="e.g., By Road, By Air"
                />
              </div>
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={invoice.destination || ''}
                  onChange={(e) => setInvoice({ ...invoice, destination: e.target.value })}
                  placeholder="Delivery destination"
                />
              </div>
              <div>
                <Label htmlFor="termsOfDelivery">Terms of Delivery</Label>
                <Input
                  id="termsOfDelivery"
                  value={invoice.termsOfDelivery || ''}
                  onChange={(e) => setInvoice({ ...invoice, termsOfDelivery: e.target.value })}
                  placeholder="e.g., FOB, CIF"
                />
              </div>
              <div>
                <Label htmlFor="motorVehicleNo">Motor Vehicle No.</Label>
                <Input
                  id="motorVehicleNo"
                  value={invoice.motorVehicleNo || ''}
                  onChange={(e) => setInvoice({ ...invoice, motorVehicleNo: e.target.value })}
                  placeholder="Vehicle number"
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
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-3 gap-4">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sl.No</TableHead>
                  <TableHead className="w-40">Product</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-24">Rate</TableHead>
                  <TableHead className="w-16">Disc%</TableHead>
                  <TableHead className="w-24">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.slNo}</TableCell>
                    <TableCell>
                      <Select onValueChange={(value) => selectProduct(index, value)}>
                        <SelectTrigger>
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
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Type or select"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.hsnSac}
                        onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.discountPercent}
                        onChange={(e) => updateItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell className="text-foreground">₹{item.finalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Qty:</span>
                  <span>{invoice.totalQty} Nos.</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                
                {/* Multiple Taxes */}
                <div className="border-t pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Taxes</span>
                    <Button variant="outline" size="sm" onClick={addTax}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tax
                    </Button>
                  </div>
                  {invoice.taxes.map((tax, index) => (
                    <div key={index} className="flex items-center gap-2 text-muted-foreground">
                      <Input
                        className="w-24 h-8"
                        value={tax.name}
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                        placeholder="Tax name"
                      />
                      <Input
                        type="number"
                        className="w-16 h-8"
                        value={tax.percent}
                        onChange={(e) => updateTax(index, 'percent', parseFloat(e.target.value) || 0)}
                      />
                      <span>% = ₹{tax.amount.toFixed(2)}</span>
                      {invoice.taxes.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTax(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between text-muted-foreground">
                  <span>Round Off:</span>
                  <span>{invoice.roundOff >= 0 ? '+' : ''}₹{invoice.roundOff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground border-t pt-2">
                  <span>Total:</span>
                  <span>₹{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="declaration">Declaration</Label>
              <Textarea
                id="declaration"
                value={invoice.declaration || ''}
                onChange={(e) => setInvoice({ ...invoice, declaration: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
