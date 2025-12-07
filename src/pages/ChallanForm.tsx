import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getChallans, saveChallan, getProducts, getCustomers, getNextChallanNumber } from '@/lib/storage';
import { DeliveryChallan, InvoiceItem, Product, Customer, ProductBatch } from '@/types/accounting';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export default function ChallanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [challan, setChallan] = useState<DeliveryChallan>({
    id: crypto.randomUUID(),
    challanNumber: '',
    companyId: '',
    customerName: '',
    customerAddress: '',
    customerGSTIN: '',
    customerEmail: '',
    customerMobile: '',
    customerState: '',
    date: new Date().toISOString().split('T')[0],
    dispatchedThrough: '',
    destination: '',
    termsOfDelivery: '',
    motorVehicleNo: '',
    reasonForTransfer: 'supply',
    items: [],
    totalQty: 0,
    remarks: '',
    status: 'draft',
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    setProducts(getProducts());
    setCustomers(getCustomers());
    
    if (id) {
      const challans = getChallans();
      const existingChallan = challans.find(c => c.id === id);
      if (existingChallan) {
        setChallan(existingChallan);
      }
    } else if (selectedCompany) {
      setChallan(prev => ({
        ...prev,
        companyId: selectedCompany.id,
        challanNumber: getNextChallanNumber(selectedCompany.id),
      }));
    }
  }, [id, selectedCompany]);

  const recalculateTotals = (items: InvoiceItem[]) => {
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    return { totalQty };
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      slNo: challan.items.length + 1,
      description: '',
      productId: '',
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
    const newItems = [...challan.items, newItem];
    const totals = recalculateTotals(newItems);
    setChallan({ ...challan, items: newItems, ...totals });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...challan.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'rate' || field === 'quantity') {
      newItems[index].amount = newItems[index].rate * newItems[index].quantity;
      newItems[index].finalAmount = newItems[index].amount;
    }
    
    const totals = recalculateTotals(newItems);
    setChallan({ ...challan, items: newItems, ...totals });
  };

  const removeItem = (index: number) => {
    const newItems = challan.items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => item.slNo = i + 1);
    
    const totals = recalculateTotals(newItems);
    setChallan({ ...challan, items: newItems, ...totals });
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...challan.items];
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        hsnSac: product.hsnSac,
        rate: product.rate,
        unit: product.unit || 'Nos.',
      };
      newItems[index].amount = newItems[index].rate * newItems[index].quantity;
      newItems[index].finalAmount = newItems[index].amount;
      
      const totals = recalculateTotals(newItems);
      setChallan({ ...challan, items: newItems, ...totals });
    }
  };

  const selectBatch = (index: number, batchId: string) => {
    const item = challan.items[index];
    const product = products.find(p => p.id === item.productId);
    if (product && product.batches) {
      const batch = product.batches.find(b => b.id === batchId);
      if (batch) {
        updateItem(index, 'batchNumber', batch.batchNumber);
        // Also update mfgDate
        const newItems = [...challan.items];
        newItems[index] = { ...newItems[index], batchNumber: batch.batchNumber, mfgDate: batch.mfgDate };
        const totals = recalculateTotals(newItems);
        setChallan({ ...challan, items: newItems, ...totals });
      }
    }
  };

  const selectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setChallan({
        ...challan,
        customerName: customer.name,
        customerAddress: customer.address || '',
        customerGSTIN: customer.gstin || '',
        customerEmail: customer.email || '',
        customerMobile: customer.mobile || '',
        customerState: customer.state || '',
      });
    }
  };

  const handleSave = (status: DeliveryChallan['status'] = 'draft') => {
    if (!selectedCompany) {
      toast({
        title: 'Error',
        description: 'Please select a company from the sidebar first',
        variant: 'destructive',
      });
      return;
    }

    if (!challan.customerName) {
      toast({
        title: 'Error',
        description: 'Customer name is required',
        variant: 'destructive',
      });
      return;
    }

    saveChallan({ ...challan, companyId: selectedCompany.id, status });
    toast({
      title: 'Success',
      description: `Delivery challan ${status === 'draft' ? 'saved as draft' : 'created'} successfully`,
    });
    navigate('/challans');
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
            {id ? 'Edit Delivery Challan' : 'New Delivery Challan'}
          </h1>
          <p className="text-sm text-muted-foreground">Company: {selectedCompany.name}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => handleSave('draft')}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSave('dispatched')}>
            Save & Dispatch
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Challan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="challanNumber">Challan Number</Label>
                <Input
                  id="challanNumber"
                  value={challan.challanNumber}
                  onChange={(e) => setChallan({ ...challan, challanNumber: e.target.value })}
                  placeholder="DC-1"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={challan.date}
                  onChange={(e) => setChallan({ ...challan, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="motorVehicleNo">Motor Vehicle No.</Label>
                <Input
                  id="motorVehicleNo"
                  value={challan.motorVehicleNo || ''}
                  onChange={(e) => setChallan({ ...challan, motorVehicleNo: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="reasonForTransfer">Reason for Transfer</Label>
                <Select
                  value={challan.reasonForTransfer}
                  onValueChange={(value: DeliveryChallan['reasonForTransfer']) => 
                    setChallan({ ...challan, reasonForTransfer: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supply">Supply</SelectItem>
                    <SelectItem value="job_work">Job Work</SelectItem>
                    <SelectItem value="exhibition">Exhibition</SelectItem>
                    <SelectItem value="personal">Personal Use</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dispatchedThrough">Dispatched Through</Label>
                <Input
                  id="dispatchedThrough"
                  value={challan.dispatchedThrough || ''}
                  onChange={(e) => setChallan({ ...challan, dispatchedThrough: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={challan.destination || ''}
                  onChange={(e) => setChallan({ ...challan, destination: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="termsOfDelivery">Terms of Delivery</Label>
                <Input
                  id="termsOfDelivery"
                  value={challan.termsOfDelivery || ''}
                  onChange={(e) => setChallan({ ...challan, termsOfDelivery: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consignee Details</CardTitle>
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
                  value={challan.customerName}
                  onChange={(e) => setChallan({ ...challan, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerGSTIN">Customer GSTIN</Label>
                <Input
                  id="customerGSTIN"
                  value={challan.customerGSTIN || ''}
                  onChange={(e) => setChallan({ ...challan, customerGSTIN: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Customer Address</Label>
              <Textarea
                id="customerAddress"
                value={challan.customerAddress}
                onChange={(e) => setChallan({ ...challan, customerAddress: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={challan.customerEmail || ''}
                  onChange={(e) => setChallan({ ...challan, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerMobile">Mobile</Label>
                <Input
                  id="customerMobile"
                  value={challan.customerMobile || ''}
                  onChange={(e) => setChallan({ ...challan, customerMobile: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerState">State</Label>
                <Input
                  id="customerState"
                  value={challan.customerState || ''}
                  onChange={(e) => setChallan({ ...challan, customerState: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Items</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Sl.</TableHead>
                    <TableHead className="w-32">Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-28">Batch</TableHead>
                    <TableHead className="w-24">Mfg Date</TableHead>
                    <TableHead className="w-20">HSN/SAC</TableHead>
                    <TableHead className="w-16">Cases</TableHead>
                    <TableHead className="w-16">Qty</TableHead>
                    <TableHead className="w-16">Unit</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challan.items.map((item, index) => {
                    const selectedProduct = products.find(p => p.id === item.productId);
                    return (
                      <TableRow key={index}>
                        <TableCell>{item.slNo}</TableCell>
                        <TableCell>
                          <Select onValueChange={(value) => selectProduct(index, value)}>
                            <SelectTrigger className="h-8">
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
                            className="h-8"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Type or select"
                          />
                        </TableCell>
                        <TableCell>
                          {selectedProduct?.batches && selectedProduct.batches.length > 0 ? (
                            <Select onValueChange={(value) => selectBatch(index, value)}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder={item.batchNumber || "Select"} />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedProduct.batches.map((batch) => (
                                  <SelectItem key={batch.id} value={batch.id}>
                                    {batch.batchNumber} ({batch.mfgDate})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              className="h-8"
                              value={item.batchNumber || ''}
                              onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={item.mfgDate || ''}
                            onChange={(e) => updateItem(index, 'mfgDate', e.target.value)}
                            placeholder="MM/YYYY"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={item.hsnSac}
                            onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="number"
                            value={item.cases || ''}
                            onChange={(e) => updateItem(index, 'cases', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary & Remarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={challan.remarks || ''}
                  onChange={(e) => setChallan({ ...challan, remarks: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes or remarks..."
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Quantity:</span>
                    <span>{challan.totalQty}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
