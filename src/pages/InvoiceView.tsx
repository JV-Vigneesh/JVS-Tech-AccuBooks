import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getInvoices, getCompany } from '@/lib/storage';
import { Invoice, Company } from '@/types/accounting';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { numberToWords } from '@/lib/numberToWords';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const invoices = getInvoices();
    const found = invoices.find(inv => inv.id === id);
    if (found) {
      setInvoice(found);
    }
    setCompany(getCompany());
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
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoice.invoiceNumber}.pdf`);
  };

  if (!invoice) {
    return <div className="text-foreground">Loading...</div>;
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

      {/* Invoice Content - Always white background with black text for print/PDF */}
      <div 
        ref={invoiceRef} 
        className="bg-white text-black p-8 shadow-lg rounded-lg print-area"
        style={{ backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Header with Company Logo and Details */}
        <div className="border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              {company?.logo && (
                <img src={company.logo} alt="Company Logo" className="h-20 w-20 object-contain" />
              )}
              <div>
                <h1 className="text-2xl font-bold">{company?.name || 'Your Company Name'}</h1>
                <p className="text-sm whitespace-pre-line">{company?.address || 'Company Address'}</p>
                {company?.mobile && <p className="text-sm">Mobile: {company.mobile}</p>}
                {company?.email && <p className="text-sm">Email: {company.email}</p>}
                {company?.gstin && <p className="text-sm font-semibold">GSTIN: {company.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold">TAX INVOICE</h2>
            </div>
          </div>
        </div>

        {/* Invoice Details Row */}
        <div className="grid grid-cols-2 gap-4 border border-black mb-0">
          <div className="border-r border-black p-3">
            <p className="text-xs font-semibold text-gray-600">Invoice No.</p>
            <p className="font-bold">{invoice.invoiceNumber}</p>
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-gray-600">Dated</p>
            <p className="font-bold">{format(new Date(invoice.date), 'dd-MMM-yyyy')}</p>
          </div>
        </div>

        {/* Buyer and Delivery Details */}
        <div className="grid grid-cols-2 border-l border-r border-b border-black">
          <div className="border-r border-black">
            <div className="p-3 border-b border-black">
              <p className="text-xs font-semibold text-gray-600">Buyer (Bill to)</p>
              <p className="font-bold">{invoice.customerName}</p>
              <p className="text-sm whitespace-pre-line">{invoice.customerAddress}</p>
              {invoice.customerState && <p className="text-sm">State: {invoice.customerState}</p>}
              {invoice.customerMobile && <p className="text-sm">Mobile: {invoice.customerMobile}</p>}
              {invoice.customerEmail && <p className="text-sm">Email: {invoice.customerEmail}</p>}
              {invoice.customerGSTIN && <p className="text-sm font-semibold">GSTIN: {invoice.customerGSTIN}</p>}
            </div>
          </div>
          <div>
            {invoice.dueDate && (
              <div className="p-3 border-b border-black">
                <p className="text-xs font-semibold text-gray-600">Due Date</p>
                <p>{format(new Date(invoice.dueDate), 'dd-MMM-yyyy')}</p>
              </div>
            )}
            {invoice.dispatchedThrough && (
              <div className="p-3 border-b border-black">
                <p className="text-xs font-semibold text-gray-600">Dispatched Through</p>
                <p>{invoice.dispatchedThrough}</p>
              </div>
            )}
            {invoice.destination && (
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-600">Destination</p>
                <p>{invoice.destination}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-12">Sl.No</th>
              <th className="border border-black p-2 text-left">Description of Goods</th>
              <th className="border border-black p-2 text-center">HSN/SAC</th>
              <th className="border border-black p-2 text-center">Qty</th>
              <th className="border border-black p-2 text-right">Rate</th>
              <th className="border border-black p-2 text-center">Disc%</th>
              <th className="border border-black p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.slNo}>
                <td className="border border-black p-2 text-center">{item.slNo}</td>
                <td className="border border-black p-2">{item.description}</td>
                <td className="border border-black p-2 text-center">{item.hsnSac}</td>
                <td className="border border-black p-2 text-center">{item.quantity} {item.unit}</td>
                <td className="border border-black p-2 text-right">₹{item.rate.toFixed(2)}</td>
                <td className="border border-black p-2 text-center">{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                <td className="border border-black p-2 text-right">₹{item.finalAmount.toFixed(2)}</td>
              </tr>
            ))}
            {/* Empty rows for spacing if needed */}
            {invoice.items.length < 5 && Array.from({ length: 5 - invoice.items.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="border border-black p-2 text-right font-semibold">Subtotal</td>
              <td className="border border-black p-2 text-right">₹{invoice.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-black p-2 text-right font-semibold">Tax ({invoice.taxPercent}%)</td>
              <td className="border border-black p-2 text-right">₹{invoice.taxAmount.toFixed(2)}</td>
            </tr>
            <tr className="font-bold bg-gray-100">
              <td colSpan={6} className="border border-black p-2 text-right">Grand Total</td>
              <td className="border border-black p-2 text-right">₹{invoice.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Amount in Words */}
        <div className="border-l border-r border-b border-black p-3">
          <p className="text-sm">
            <span className="font-semibold">Amount Chargeable (in words): </span>
            <span className="font-bold">{numberToWords(invoice.total)}</span>
          </p>
        </div>

        {/* Bank Details and Declaration */}
        <div className="grid grid-cols-2 border-l border-r border-b border-black">
          <div className="border-r border-black p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Bank Details</p>
            {company?.bankName && <p className="text-sm">Bank Name: {company.bankName}</p>}
            {company?.bankAccount && <p className="text-sm">A/c No.: {company.bankAccount}</p>}
            {company?.bankIfsc && <p className="text-sm">IFSC Code: {company.bankIfsc}</p>}
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Declaration</p>
            <p className="text-xs">{invoice.declaration}</p>
          </div>
        </div>

        {/* Signature Section */}
        <div className="border-l border-r border-b border-black p-4">
          <div className="flex justify-end">
            <div className="text-center">
              <p className="text-sm font-semibold mb-2">For {company?.name || 'Company Name'}</p>
              <div className="h-20 flex flex-col items-center justify-center gap-1">
                {company?.stamp && (
                  <img src={company.stamp} alt="Stamp" className="h-16 object-contain" />
                )}
                {company?.signature && (
                  <img src={company.signature} alt="Signature" className="h-12 object-contain" />
                )}
              </div>
              <p className="text-sm font-semibold border-t border-black pt-2 mt-2">Authorised Signatory</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>This is a computer generated invoice</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-area {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
