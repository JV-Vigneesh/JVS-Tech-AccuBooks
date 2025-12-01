import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getInvoices } from '@/lib/storage';
import { Invoice } from '@/types/accounting';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const invoices = getInvoices();
    const found = invoices.find(inv => inv.id === id);
    if (found) {
      setInvoice(found);
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !invoice) return;

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoice.invoiceNumber}.pdf`);
  };

  if (!invoice) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 no-print">
        <Button variant="ghost" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8" ref={invoiceRef}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">INVOICE</h1>
                <p className="text-muted-foreground mt-2">AccounTally</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{invoice.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">Date: {format(new Date(invoice.date), 'dd/MM/yyyy')}</p>
                <p className="text-sm text-muted-foreground">Due: {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">BILL TO:</p>
              <p className="font-bold text-foreground">{invoice.customerName}</p>
              <p className="text-sm text-muted-foreground">{invoice.customerAddress}</p>
              {invoice.customerGSTIN && (
                <p className="text-sm text-muted-foreground">GSTIN: {invoice.customerGSTIN}</p>
              )}
            </div>

            {/* Items Table */}
            <div>
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 text-sm font-semibold text-muted-foreground">Sl.No</th>
                    <th className="pb-2 text-sm font-semibold text-muted-foreground">Description</th>
                    <th className="pb-2 text-sm font-semibold text-muted-foreground">HSN/SAC</th>
                    <th className="pb-2 text-sm font-semibold text-muted-foreground text-right">Qty</th>
                    <th className="pb-2 text-sm font-semibold text-muted-foreground text-right">Rate</th>
                    <th className="pb-2 text-sm font-semibold text-muted-foreground text-right">Disc%</th>
                    <th className="pb-2 text-sm font-semibold text-muted-foreground text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.slNo} className="border-b">
                      <td className="py-3 text-foreground">{item.slNo}</td>
                      <td className="py-3 text-foreground">{item.description}</td>
                      <td className="py-3 text-foreground">{item.hsnSac}</td>
                      <td className="py-3 text-foreground text-right">{item.quantity} {item.unit}</td>
                      <td className="py-3 text-foreground text-right">₹{item.rate.toFixed(2)}</td>
                      <td className="py-3 text-foreground text-right">{item.discountPercent}%</td>
                      <td className="py-3 text-foreground text-right">₹{item.finalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({invoice.taxPercent}%):</span>
                  <span>₹{invoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-foreground border-t pt-2">
                  <span>Total:</span>
                  <span>₹{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          #root {
            visibility: visible;
          }
          ${invoiceRef.current && `
            #root * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
          `}
        }
      `}</style>
    </div>
  );
}
