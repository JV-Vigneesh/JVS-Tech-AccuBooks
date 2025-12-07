import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getInvoicesByCompany, getVouchersByCompany, getChallansByCompany, getProducts } from '@/lib/storage';
import { Invoice, Voucher, DeliveryChallan } from '@/types/accounting';
import { FileText, Package, Receipt, TrendingUp, Clock, CheckCircle, AlertCircle, Truck } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    pendingAmount: 0,
    totalProducts: 0,
    totalVouchers: 0,
    totalChallans: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: 'invoice' | 'voucher' | 'challan';
    title: string;
    amount?: number;
    date: string;
    status?: string;
  }>>([]);

  useEffect(() => {
    if (!selectedCompany) {
      setStats({
        totalInvoices: 0,
        totalRevenue: 0,
        pendingInvoices: 0,
        pendingAmount: 0,
        totalProducts: 0,
        totalVouchers: 0,
        totalChallans: 0,
      });
      setRecentInvoices([]);
      setRecentActivity([]);
      return;
    }

    const invoices = getInvoicesByCompany(selectedCompany.id);
    const vouchers = getVouchersByCompany(selectedCompany.id);
    const challans = getChallansByCompany(selectedCompany.id);
    const products = getProducts();

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);

    setStats({
      totalInvoices: invoices.length,
      totalRevenue,
      pendingInvoices: pendingInvoices.length,
      pendingAmount,
      totalProducts: products.length,
      totalVouchers: vouchers.length,
      totalChallans: challans.length,
    });

    // Get recent invoices (last 5)
    const sortedInvoices = [...invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setRecentInvoices(sortedInvoices.slice(0, 5));

    // Build recent activity from invoices, vouchers, challans
    const activities: Array<{
      type: 'invoice' | 'voucher' | 'challan';
      title: string;
      amount?: number;
      date: string;
      status?: string;
    }> = [];

    invoices.forEach(inv => {
      activities.push({
        type: 'invoice',
        title: `Invoice #${inv.invoiceNumber} - ${inv.customerName}`,
        amount: inv.total,
        date: inv.createdAt,
        status: inv.status,
      });
    });

    vouchers.forEach(v => {
      activities.push({
        type: 'voucher',
        title: `${v.type.charAt(0).toUpperCase() + v.type.slice(1)} Voucher #${v.voucherNumber}`,
        amount: v.amount,
        date: v.createdAt,
      });
    });

    challans.forEach(c => {
      activities.push({
        type: 'challan',
        title: `Challan #${c.challanNumber} - ${c.customerName}`,
        date: c.createdAt,
        status: c.status,
      });
    });

    // Sort by date descending and take first 10
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentActivity(activities.slice(0, 10));
  }, [selectedCompany]);

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      title: 'Pending Amount',
      value: `₹${stats.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: Clock,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
      subtitle: `${stats.pendingInvoices} invoices`,
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Delivery Challans',
      value: stats.totalChallans,
      icon: Truck,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    {
      title: 'Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
    {
      title: 'Vouchers',
      value: stats.totalVouchers,
      icon: Receipt,
      color: 'text-chart-5',
      bgColor: 'bg-chart-5/10',
    },
  ];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        return <Badge className="bg-chart-1/20 text-chart-1 hover:bg-chart-1/30">Paid</Badge>;
      case 'sent':
      case 'dispatched':
        return <Badge className="bg-chart-4/20 text-chart-4 hover:bg-chart-4/30">Pending</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return null;
    }
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">{selectedCompany.name}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                  <Icon className={cn('h-5 w-5', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No invoices yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{invoice.customerName}</TableCell>
                      <TableCell>₹{invoice.total.toLocaleString('en-IN')}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start justify-between border-b border-border pb-3 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg mt-0.5',
                        activity.type === 'invoice' ? 'bg-primary/10' :
                        activity.type === 'voucher' ? 'bg-chart-5/10' : 'bg-chart-2/10'
                      )}>
                        {activity.type === 'invoice' ? (
                          <FileText className="h-4 w-4 text-primary" />
                        ) : activity.type === 'voucher' ? (
                          <Receipt className="h-4 w-4 text-chart-5" />
                        ) : (
                          <Truck className="h-4 w-4 text-chart-2" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.date), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.amount && (
                        <p className="text-sm font-medium text-foreground">
                          ₹{activity.amount.toLocaleString('en-IN')}
                        </p>
                      )}
                      {activity.status && getStatusBadge(activity.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
