import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getInvoices, deleteInvoice } from '@/lib/storage';
import { Invoice } from '@/types/accounting';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadInvoices = () => {
    setInvoices(getInvoices());
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice(id);
      loadInvoices();
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    const colors = {
      draft: 'bg-secondary text-secondary-foreground',
      sent: 'bg-chart-2 text-primary-foreground',
      paid: 'bg-chart-1 text-primary-foreground',
      overdue: 'bg-destructive text-destructive-foreground',
    };
    return colors[status];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <Button onClick={() => navigate('/invoices/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{format(new Date(invoice.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>₹{invoice.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/edit/${invoice.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(invoice.id)}>
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
