import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getInvoices, getCompanies } from '@/lib/storage';
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
      // Backward compatibility
      const updatedInvoice = {
        ...found,
        totalQty: found.totalQty || found.items.reduce((sum, item) => sum + item.quantity, 0),
        taxes: found.taxes || [{ name: 'Tax', percent: found.taxPercent || 18, amount: found.taxAmount || 0 }],
        roundOff: found.roundOff || 0,
      };
      setInvoice(updatedInvoice);
      
      // Get company for this invoice
      const companies = getCompanies();
      if (found.companyId) {
        const comp = companies.find(c => c.id === found.companyId);
        if (comp) setCompany(comp);
      } else if (companies.length > 0) {
        setCompany(companies[0]);
      }
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
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
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

      {/* Invoice Content */}
      <div 
        ref={invoiceRef} 
        className="bg-white text-black p-8 shadow-lg rounded-lg print-area"
        style={{ backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Header */}
        <div className="border-2 border-black">
          {/* Company Header */}
          <div className="flex items-center border-b-2 border-black">
            {company?.logo && (
              <div className="p-3 border-r border-black">
                <img src={company.logo} alt="Logo" className="h-16 w-16 object-contain" />
              </div>
            )}
            <div className="flex-1 p-3 text-center">
              <h1 className="text-2xl font-bold">{company?.name || 'Company Name'}</h1>
              <p className="text-sm whitespace-pre-line">{company?.address || 'Company Address'}</p>
              <div className="flex justify-center gap-4 text-xs mt-1">
                {company?.mobile && <span>Mobile: {company.mobile}</span>}
                {company?.email && <span>Email: {company.email}</span>}
              </div>
              {company?.gstin && <p className="text-sm font-semibold mt-1">GSTIN: {company.gstin}</p>}
            </div>
          </div>

          {/* TAX INVOICE Heading with Invoice Number */}
          <div className="text-center py-2 border-b-2 border-black bg-gray-100">
            <h2 className="text-xl font-bold">TAX INVOICE</h2>
            <p className="text-sm font-semibold">Invoice No: {invoice.invoiceNumber}</p>
          </div>

          {/* Invoice Details Row */}
          <div className="grid grid-cols-4 border-b border-black text-sm">
            <div className="p-2 border-r border-black">
              <span className="text-xs text-gray-600">Date:</span>
              <p className="font-semibold">{format(new Date(invoice.date), 'dd-MMM-yyyy')}</p>
            </div>
            {invoice.dueDate && (
              <div className="p-2 border-r border-black">
                <span className="text-xs text-gray-600">Due Date:</span>
                <p className="font-semibold">{format(new Date(invoice.dueDate), 'dd-MMM-yyyy')}</p>
              </div>
            )}
            {invoice.motorVehicleNo && (
              <div className="p-2 border-r border-black">
                <span className="text-xs text-gray-600">Vehicle No:</span>
                <p className="font-semibold">{invoice.motorVehicleNo}</p>
              </div>
            )}
            {invoice.termsOfDelivery && (
              <div className="p-2">
                <span className="text-xs text-gray-600">Terms of Delivery:</span>
                <p className="font-semibold">{invoice.termsOfDelivery}</p>
              </div>
            )}
          </div>

          {/* Buyer and Delivery Details */}
          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Buyer (Bill to)</p>
              <p className="font-bold text-base">{invoice.customerName}</p>
              <p className="text-sm whitespace-pre-line">{invoice.customerAddress}</p>
              {invoice.customerState && <p className="text-sm">State: {invoice.customerState}</p>}
              {invoice.customerMobile && <p className="text-sm">Mobile: {invoice.customerMobile}</p>}
              {invoice.customerEmail && <p className="text-sm">Email: {invoice.customerEmail}</p>}
              {invoice.customerGSTIN && <p className="text-sm font-semibold">GSTIN: {invoice.customerGSTIN}</p>}
            </div>
            <div className="p-3">
              {invoice.dispatchedThrough && (
                <div className="mb-2">
                  <span className="text-xs text-gray-600">Dispatched Through:</span>
                  <p className="font-semibold">{invoice.dispatchedThrough}</p>
                </div>
              )}
              {invoice.destination && (
                <div>
                  <span className="text-xs text-gray-600">Destination:</span>
                  <p className="font-semibold">{invoice.destination}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b border-r border-black p-2 text-center w-10">Sl.</th>
                <th className="border-b border-r border-black p-2 text-left">Description of Goods</th>
                <th className="border-b border-r border-black p-2 text-center w-20">HSN/SAC</th>
                <th className="border-b border-r border-black p-2 text-center w-16">Qty</th>
                <th className="border-b border-r border-black p-2 text-center w-14">Unit</th>
                <th className="border-b border-r border-black p-2 text-right w-20">Rate</th>
                <th className="border-b border-r border-black p-2 text-center w-14">Disc%</th>
                <th className="border-b border-black p-2 text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.slNo}>
                  <td className="border-b border-r border-black p-2 text-center">{item.slNo}</td>
                  <td className="border-b border-r border-black p-2">{item.description}</td>
                  <td className="border-b border-r border-black p-2 text-center">{item.hsnSac}</td>
                  <td className="border-b border-r border-black p-2 text-center">{item.quantity}</td>
                  <td className="border-b border-r border-black p-2 text-center">{item.unit}</td>
                  <td className="border-b border-r border-black p-2 text-right">₹{item.rate.toFixed(2)}</td>
                  <td className="border-b border-r border-black p-2 text-center">{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                  <td className="border-b border-black p-2 text-right">₹{item.finalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {/* Empty rows */}
              {invoice.items.length < 4 && Array.from({ length: 4 - invoice.items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border-b border-r border-black p-2">&nbsp;</td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-black p-2"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="border-b border-r border-black p-2 text-right font-semibold">Total Qty:</td>
                <td className="border-b border-r border-black p-2 text-center font-semibold">{invoice.totalQty}</td>
                <td className="border-b border-r border-black p-2 text-center">Nos.</td>
                <td colSpan={2} className="border-b border-r border-black p-2 text-right font-semibold">Subtotal:</td>
                <td className="border-b border-black p-2 text-right font-semibold">₹{invoice.subtotal.toFixed(2)}</td>
              </tr>
              {invoice.taxes.map((tax, index) => (
                <tr key={index}>
                  <td colSpan={7} className="border-b border-r border-black p-2 text-right">{tax.name} @ {tax.percent}%:</td>
                  <td className="border-b border-black p-2 text-right">₹{tax.amount.toFixed(2)}</td>
                </tr>
              ))}
              {invoice.roundOff !== 0 && (
                <tr>
                  <td colSpan={7} className="border-b border-r border-black p-2 text-right">Round Off:</td>
                  <td className="border-b border-black p-2 text-right">{invoice.roundOff >= 0 ? '+' : ''}₹{invoice.roundOff.toFixed(2)}</td>
                </tr>
              )}
              <tr className="font-bold bg-gray-100">
                <td colSpan={7} className="border-b border-r border-black p-2 text-right">Grand Total:</td>
                <td className="border-b border-black p-2 text-right">₹{invoice.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words */}
          <div className="border-b border-black p-3">
            <p className="text-sm">
              <span className="font-semibold">Amount Chargeable (in words): </span>
              <span className="font-bold italic">{numberToWords(invoice.total)}</span>
            </p>
          </div>

          {/* Bank Details and Declaration */}
          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Bank Details</p>
              {company?.bankName && <p className="text-sm">Bank Name: <span className="font-semibold">{company.bankName}</span></p>}
              {company?.bankAccount && <p className="text-sm">A/c No.: <span className="font-semibold">{company.bankAccount}</span></p>}
              {company?.bankIfsc && <p className="text-sm">IFSC Code: <span className="font-semibold">{company.bankIfsc}</span></p>}
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Declaration</p>
              <p className="text-xs">{invoice.declaration}</p>
            </div>
          </div>

          {/* Signature Section */}
          <div className="p-4">
            <div className="flex justify-between items-end">
              <div className="text-xs text-gray-500">
                <p>Receiver's Signature</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold mb-2">For {company?.name || 'Company Name'}</p>
                <div className="h-20 flex flex-col items-center justify-center gap-1">
                  {company?.stamp && (
                    <img src={company.stamp} alt="Stamp" className="h-14 object-contain" />
                  )}
                  {company?.signature && (
                    <img src={company.signature} alt="Signature" className="h-10 object-contain" />
                  )}
                </div>
                <p className="text-sm font-semibold border-t border-black pt-1 mt-1">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 text-center text-xs text-gray-500">
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
