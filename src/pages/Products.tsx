import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProducts, saveProduct, deleteProduct } from '@/lib/storage';
import { Product, ProductBatch } from '@/types/accounting';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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

const getCurrentMfgDate = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${month}/${year}`;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [selectedUnit, setSelectedUnit] = useState('Nos.');
  const { toast } = useToast();

  const loadProducts = () => {
    setProducts(getProducts());
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setBatches(product.batches || []);
      setSelectedUnit(product.unit || 'Nos.');
    } else {
      setEditingProduct(null);
      setBatches([]);
      setSelectedUnit('Nos.');
    }
    setIsDialogOpen(true);
  };

  const addBatch = () => {
    setBatches([
      ...batches,
      {
        id: crypto.randomUUID(),
        batchNumber: '',
        mfgDate: getCurrentMfgDate(),
        quantity: 0,
      },
    ]);
  };

  const updateBatch = (index: number, field: keyof ProductBatch, value: string | number) => {
    const newBatches = [...batches];
    newBatches[index] = { ...newBatches[index], [field]: value };
    setBatches(newBatches);
  };

  const removeBatch = (index: number) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Calculate total stock from batches
    const batchStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    const manualStock = parseFloat(formData.get('stock') as string) || 0;
    const totalStock = batches.length > 0 ? batchStock : manualStock;

    const product: Product = {
      id: editingProduct?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || '',
      hsnSac: formData.get('hsnSac') as string,
      rate: parseFloat(formData.get('rate') as string),
      unit: selectedUnit,
      stock: totalStock,
      batches: batches.filter(b => b.batchNumber),
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
    };

    saveProduct(product);
    loadProducts();
    setIsDialogOpen(false);
    setEditingProduct(null);
    setBatches([]);
    toast({
      title: 'Success',
      description: `Product ${editingProduct ? 'updated' : 'created'} successfully`,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
      loadProducts();
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    }
  };

  const toggleExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Products</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit' : 'Add'} Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" name="name" defaultValue={editingProduct?.name} required />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" name="description" defaultValue={editingProduct?.description} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hsnSac">HSN/SAC *</Label>
                  <Input id="hsnSac" name="hsnSac" defaultValue={editingProduct?.hsnSac} required />
                </div>
                <div>
                  <Label>Unit *</Label>
                  <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate">Rate *</Label>
                  <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingProduct?.rate} required />
                </div>
                <div>
                  <Label htmlFor="stock">Stock (if no batches)</Label>
                  <Input id="stock" name="stock" type="number" defaultValue={editingProduct?.stock} />
                </div>
              </div>

              {/* Batch Tracking Section */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <Label className="text-base font-semibold">Batch Tracking</Label>
                    <p className="text-sm text-muted-foreground">Add batch numbers and manufacturing dates</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addBatch}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Batch
                  </Button>
                </div>
                
                {batches.length > 0 && (
                  <div className="space-y-3">
                    {batches.map((batch, index) => (
                      <div key={batch.id} className="grid grid-cols-4 gap-2 items-end">
                        <div>
                          <Label className="text-xs">Batch Number</Label>
                          <Input
                            value={batch.batchNumber}
                            onChange={(e) => updateBatch(index, 'batchNumber', e.target.value)}
                            placeholder="e.g., B001"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Mfg Date (MM/YYYY)</Label>
                          <Input
                            value={batch.mfgDate}
                            onChange={(e) => updateBatch(index, 'mfgDate', e.target.value)}
                            placeholder="01/2024"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            value={batch.quantity}
                            onChange={(e) => updateBatch(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBatch(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                {editingProduct ? 'Update' : 'Create'} Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Batches</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <>
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.batches && product.batches.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleExpand(product.id)}
                        >
                          {expandedProducts.has(product.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.description || '-'}</TableCell>
                    <TableCell>{product.hsnSac}</TableCell>
                    <TableCell>₹{product.rate.toFixed(2)}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      {product.batches && product.batches.length > 0 ? (
                        <Badge variant="secondary">{product.batches.length} batches</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {/* Expanded batch details */}
                  {expandedProducts.has(product.id) && product.batches && product.batches.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 py-2">
                        <div className="pl-10">
                          <p className="text-sm font-medium mb-2 text-muted-foreground">Batch Details:</p>
                          <div className="grid grid-cols-3 gap-4">
                            {product.batches.map((batch) => (
                              <div
                                key={batch.id}
                                className="flex items-center gap-2 bg-background rounded p-2 border border-border"
                              >
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{batch.batchNumber}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Mfg: {batch.mfgDate} | Qty: {batch.quantity}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}