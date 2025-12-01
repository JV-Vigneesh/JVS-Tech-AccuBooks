import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { getVouchers, saveVoucher, deleteVoucher } from '@/lib/storage';
import { Voucher } from '@/types/accounting';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const { toast } = useToast();

  const loadVouchers = () => {
    setVouchers(getVouchers());
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const voucher: Voucher = {
      id: editingVoucher?.id || crypto.randomUUID(),
      voucherNumber: formData.get('voucherNumber') as string,
      type: formData.get('type') as Voucher['type'],
      date: formData.get('date') as string,
      amount: parseFloat(formData.get('amount') as string),
      paymentMode: formData.get('paymentMode') as string,
      narration: formData.get('narration') as string,
      party: formData.get('party') as string,
      createdAt: editingVoucher?.createdAt || new Date().toISOString(),
    };

    saveVoucher(voucher);
    loadVouchers();
    setIsDialogOpen(false);
    setEditingVoucher(null);
    toast({
      title: 'Success',
      description: `Voucher ${editingVoucher ? 'updated' : 'created'} successfully`,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this voucher?')) {
      deleteVoucher(id);
      loadVouchers();
      toast({
        title: 'Success',
        description: 'Voucher deleted successfully',
      });
    }
  };

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setIsDialogOpen(true);
  };

  const getVoucherTypeColor = (type: Voucher['type']) => {
    const colors = {
      payment: 'bg-destructive text-destructive-foreground',
      receipt: 'bg-chart-1 text-primary-foreground',
      journal: 'bg-chart-2 text-primary-foreground',
      contra: 'bg-chart-3 text-primary-foreground',
    };
    return colors[type];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Vouchers</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingVoucher(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Voucher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVoucher ? 'Edit' : 'Add'} Voucher</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voucherNumber">Voucher Number</Label>
                  <Input
                    id="voucherNumber"
                    name="voucherNumber"
                    defaultValue={editingVoucher?.voucherNumber || `VCH-${Date.now()}`}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={editingVoucher?.date || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={editingVoucher?.type} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="receipt">Receipt</SelectItem>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="contra">Contra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={editingVoucher?.amount}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Input
                    id="paymentMode"
                    name="paymentMode"
                    defaultValue={editingVoucher?.paymentMode}
                    placeholder="Cash, Bank, UPI, etc."
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="party">Party Name</Label>
                <Input id="party" name="party" defaultValue={editingVoucher?.party} />
              </div>
              <div>
                <Label htmlFor="narration">Narration</Label>
                <Textarea id="narration" name="narration" defaultValue={editingVoucher?.narration} required />
              </div>
              <Button type="submit" className="w-full">
                {editingVoucher ? 'Update' : 'Create'} Voucher
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                  <TableCell>{format(new Date(voucher.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge className={getVoucherTypeColor(voucher.type)}>
                      {voucher.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{voucher.party}</TableCell>
                  <TableCell>{voucher.paymentMode}</TableCell>
                  <TableCell>₹{voucher.amount.toFixed(2)}</TableCell>
                  <TableCell className="max-w-xs truncate">{voucher.narration}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(voucher)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(voucher.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
