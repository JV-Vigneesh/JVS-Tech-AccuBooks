import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getQuotationsByCompany, deleteQuotation } from '@/lib/storage';
import { Quotation } from '@/types/accounting';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const { toast } = useToast();
  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (selectedCompany) {
      setQuotations(getQuotationsByCompany(selectedCompany.id));
    } else {
      setQuotations([]);
    }
  }, [selectedCompany]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      deleteQuotation(id);
      if (selectedCompany) {
        setQuotations(getQuotationsByCompany(selectedCompany.id));
      }
      toast({
        title: 'Deleted',
        description: 'Quotation deleted successfully',
      });
    }
  };

  const getStatusBadge = (status: Quotation['status']) => {
    const variants: Record<Quotation['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      sent: 'default',
      accepted: 'outline',
      rejected: 'destructive',
      expired: 'destructive',
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
          <h1 className="text-3xl font-bold text-foreground">Quotations</h1>
          <p className="text-sm text-muted-foreground">{selectedCompany.name}</p>
        </div>
        <Link to="/quotations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
          <CardDescription>Manage your quotations for {selectedCompany.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quotations found. Create your first quotation!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                    <TableCell>{quotation.customerName}</TableCell>
                    <TableCell>{format(new Date(quotation.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      {quotation.validUntil ? format(new Date(quotation.validUntil), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>₹{quotation.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/quotations/view/${quotation.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/quotations/edit/${quotation.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(quotation.id)}
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