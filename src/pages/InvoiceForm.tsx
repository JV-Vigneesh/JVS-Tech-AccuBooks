import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getInvoices, saveInvoice, getProducts } from '@/lib/storage';
import { Invoice, InvoiceItem, Product } from '@/types/accounting';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [invoice, setInvoice] = useState<Invoice>({
    id: crypto.randomUUID(),
    invoiceNumber: `INV-${Date.now()}`,
    customerName: '',
    customerAddress: '',
    customerGSTIN: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    taxPercent: 18,
    taxAmount: 0,
    total: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    setProducts(getProducts());
    if (id) {
      const invoices = getInvoices();
      const existingInvoice = invoices.find(inv => inv.id === id);
      if (existingInvoice) {
        setInvoice(existingInvoice);
      }
    }
  }, [id]);

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
      unit: 'PCS',
      rate: 0,
      amount: 0,
      discountPercent: 0,
      discountPer: 'item',
      finalAmount: 0,
    };
    setInvoice({ ...invoice, items: [...invoice.items, newItem] });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amounts
    newItems[index].amount = newItems[index].rate * newItems[index].quantity;
    newItems[index].finalAmount = calculateItemTotal(newItems[index]);
    
    const subtotal = newItems.reduce((sum, item) => sum + item.finalAmount, 0);
    const taxAmount = (subtotal * invoice.taxPercent) / 100;
    const total = subtotal + taxAmount;
    
    setInvoice({ ...invoice, items: newItems, subtotal, taxAmount, total });
  };

  const removeItem = (index: number) => {
    const newItems = invoice.items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => item.slNo = i + 1);
    
    const subtotal = newItems.reduce((sum, item) => sum + item.finalAmount, 0);
    const taxAmount = (subtotal * invoice.taxPercent) / 100;
    const total = subtotal + taxAmount;
    
    setInvoice({ ...invoice, items: newItems, subtotal, taxAmount, total });
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateItem(index, 'description', product.name);
      updateItem(index, 'hsnSac', product.hsnSac);
      updateItem(index, 'rate', product.rate);
      updateItem(index, 'unit', product.unit);
    }
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
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
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={invoice.customerName}
                onChange={(e) => setInvoice({ ...invoice, customerName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customerAddress">Customer Address</Label>
              <Input
                id="customerAddress"
                value={invoice.customerAddress}
                onChange={(e) => setInvoice({ ...invoice, customerAddress: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerGSTIN">Customer GSTIN (Optional)</Label>
                <Input
                  id="customerGSTIN"
                  value={invoice.customerGSTIN}
                  onChange={(e) => setInvoice({ ...invoice, customerGSTIN: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
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
                  <TableHead>Description</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-24">Rate</TableHead>
                  <TableHead className="w-20">Disc%</TableHead>
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
                          <SelectValue placeholder={item.description || "Select product"} />
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
                        value={item.hsnSac}
                        onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
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
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.discountPercent}
                        onChange={(e) => updateItem(index, 'discountPercent', parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>₹{item.finalAmount.toFixed(2)}</TableCell>
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
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Tax:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={invoice.taxPercent}
                      onChange={(e) => {
                        const taxPercent = parseFloat(e.target.value);
                        const taxAmount = (invoice.subtotal * taxPercent) / 100;
                        const total = invoice.subtotal + taxAmount;
                        setInvoice({ ...invoice, taxPercent, taxAmount, total });
                      }}
                    />
                    <span>% = ₹{invoice.taxAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground border-t pt-2">
                  <span>Total:</span>
                  <span>₹{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
