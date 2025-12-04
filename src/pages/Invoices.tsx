import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getInvoicesByCompany, deleteInvoice } from '@/lib/storage';
import { Invoice } from '@/types/accounting';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { toast } = useToast();
  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (selectedCompany) {
      setInvoices(getInvoicesByCompany(selectedCompany.id));
    } else {
      setInvoices([]);
    }
  }, [selectedCompany]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice(id);
      if (selectedCompany) {
        setInvoices(getInvoicesByCompany(selectedCompany.id));
      }
      toast({
        title: 'Deleted',
        description: 'Invoice deleted successfully',
      });
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const variants: Record<Invoice['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      sent: 'default',
      paid: 'outline',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
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
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">{selectedCompany.name}</p>
        </div>
        <Link to="/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Manage your invoices for {selectedCompany.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found. Create your first invoice!
            </div>
          ) : (
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
                    <TableCell>{format(new Date(invoice.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>₹{invoice.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/invoices/view/${invoice.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/invoices/edit/${invoice.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}