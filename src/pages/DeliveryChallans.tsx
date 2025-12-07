import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getChallansByCompany, deleteChallan } from '@/lib/storage';
import { DeliveryChallan } from '@/types/accounting';
import { Plus, Eye, Edit, Trash2, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';

export default function DeliveryChallans() {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  const loadChallans = () => {
    if (selectedCompany) {
      setChallans(getChallansByCompany(selectedCompany.id));
    }
  };

  useEffect(() => {
    loadChallans();
  }, [selectedCompany]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this delivery challan?')) {
      deleteChallan(id);
      loadChallans();
      toast({
        title: 'Success',
        description: 'Delivery challan deleted successfully',
      });
    }
  };

  const getStatusBadge = (status: DeliveryChallan['status']) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-chart-1/20 text-chart-1 hover:bg-chart-1/30">Delivered</Badge>;
      case 'dispatched':
        return <Badge className="bg-chart-4/20 text-chart-4 hover:bg-chart-4/30">Dispatched</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getReasonLabel = (reason: DeliveryChallan['reasonForTransfer']) => {
    const labels = {
      supply: 'Supply',
      job_work: 'Job Work',
      exhibition: 'Exhibition',
      personal: 'Personal Use',
      other: 'Other',
    };
    return labels[reason] || reason;
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
          <h1 className="text-3xl font-bold text-foreground">Delivery Challans</h1>
          <p className="text-sm text-muted-foreground">{selectedCompany.name}</p>
        </div>
        <Link to="/challans/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Challan
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            All Delivery Challans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {challans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No delivery challans yet.</p>
              <p className="text-sm">Create your first delivery challan to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challan No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Total Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challans.map((challan) => (
                  <TableRow key={challan.id}>
                    <TableCell className="font-medium">{challan.challanNumber}</TableCell>
                    <TableCell>{format(new Date(challan.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{challan.customerName}</TableCell>
                    <TableCell>{challan.destination || '-'}</TableCell>
                    <TableCell>{getReasonLabel(challan.reasonForTransfer)}</TableCell>
                    <TableCell>{challan.totalQty}</TableCell>
                    <TableCell>{getStatusBadge(challan.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Link to={`/challans/view/${challan.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/challans/edit/${challan.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(challan.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
