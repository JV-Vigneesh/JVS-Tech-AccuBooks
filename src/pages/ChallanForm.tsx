import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getChallans, saveChallan, getProducts, getCustomers, getNextChallanNumber } from '@/lib/storage';
import { DeliveryChallan, InvoiceItem, Product, Customer } from '@/types/accounting';
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
    approxValue: undefined,
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
        customerPartyName: customer.partyName || '',
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div>
                <Label htmlFor="approxValue">Approx Value of Goods (Optional)</Label>
                <Input
                  id="approxValue"
                  type="number"
                  step="0.01"
                  value={challan.approxValue || ''}
                  onChange={(e) => setChallan({ ...challan, approxValue: parseFloat(e.target.value) || undefined })}
                  placeholder="₹0.00"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="space-y-4">
              {challan.items.map((item, index) => {
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
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    </div>
                  </div>
                );
              })}
              
              {challan.items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items added. Click "Add Item" to add items.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={challan.remarks || ''}
                onChange={(e) => setChallan({ ...challan, remarks: e.target.value })}
                rows={3}
                placeholder="Any additional remarks..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Quantity:</span>
                  <span className="font-semibold">{challan.totalQty}</span>
                </div>
                {challan.approxValue !== undefined && challan.approxValue > 0 && (
                  <div className="flex justify-between">
                    <span>Approx Value:</span>
                    <span className="font-semibold">₹{challan.approxValue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}