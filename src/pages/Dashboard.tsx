import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInvoices, getProducts, getVouchers } from '@/lib/storage';
import { FileText, Package, Receipt, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalVouchers: 0,
  });

  useEffect(() => {
    const invoices = getInvoices();
    const products = getProducts();
    const vouchers = getVouchers();

    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    setStats({
      totalInvoices: invoices.length,
      totalRevenue,
      totalProducts: products.length,
      totalVouchers: vouchers.length,
    });
  }, []);

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      color: 'text-primary',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-chart-1',
    },
    {
      title: 'Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-chart-2',
    },
    {
      title: 'Vouchers',
      value: stats.totalVouchers,
      icon: Receipt,
      color: 'text-chart-3',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={cn('h-5 w-5', stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
