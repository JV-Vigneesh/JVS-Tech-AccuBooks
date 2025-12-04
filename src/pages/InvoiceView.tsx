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
      const updatedInvoice = {
        ...found,
        totalQty: found.totalQty || found.items.reduce((sum, item) => sum + item.quantity, 0),
        taxes: found.taxes || [{ name: 'Tax', percent: found.taxPercent || 18, amount: found.taxAmount || 0 }],
        roundOff: found.roundOff || 0,
      };
      setInvoice(updatedInvoice);
      
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

      {/* Invoice Content - New Layout */}
      <div 
        ref={invoiceRef} 
        className="bg-white text-black p-6 shadow-lg rounded-lg print-area"
        style={{ backgroundColor: '#ffffff', color: '#000000' }}
      >
        <div className="border-2 border-black">
          {/* Header: Company on Left, TAX INVOICE on Right */}
          <div className="grid grid-cols-2 border-b-2 border-black">
            {/* Left: Company Details */}
            <div className="p-3 border-r-2 border-black">
              <div className="flex items-start gap-3">
                {company?.logo && (
                  <img src={company.logo} alt="Logo" className="h-14 w-14 object-contain" />
                )}
                <div>
                  <h1 className="text-xl font-bold">{company?.name || 'Company Name'}</h1>
                  <p className="text-xs whitespace-pre-line">{company?.address || 'Company Address'}</p>
                  {company?.mobile && <p className="text-xs">Mobile: {company.mobile}</p>}
                  {company?.email && <p className="text-xs">Email: {company.email}</p>}
                  {company?.gstin && <p className="text-xs font-semibold">GSTIN: {company.gstin}</p>}
                </div>
              </div>
            </div>
            {/* Right: TAX INVOICE, Invoice No, Date */}
            <div className="p-3 text-center flex flex-col justify-center">
              <h2 className="text-2xl font-bold">TAX INVOICE</h2>
              <p className="text-sm font-semibold mt-1">Invoice No: {invoice.invoiceNumber}</p>
              <p className="text-sm">Date: {format(new Date(invoice.date), 'dd-MMM-yyyy')}</p>
              {invoice.dueDate && (
                <p className="text-xs text-gray-600">Due: {format(new Date(invoice.dueDate), 'dd-MMM-yyyy')}</p>
              )}
            </div>
          </div>

          {/* Bill To on Left, Dispatch Details on Right */}
          <div className="grid grid-cols-2 border-b border-black">
            {/* Left: Bill To */}
            <div className="border-r border-black p-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Bill To:</p>
              <p className="font-bold text-base">{invoice.customerName}</p>
              <p className="text-xs whitespace-pre-line">{invoice.customerAddress}</p>
              {invoice.customerState && <p className="text-xs">State: {invoice.customerState}</p>}
              {invoice.customerMobile && <p className="text-xs">Mobile: {invoice.customerMobile}</p>}
              {invoice.customerEmail && <p className="text-xs">Email: {invoice.customerEmail}</p>}
              {invoice.customerGSTIN && <p className="text-xs font-semibold">GSTIN: {invoice.customerGSTIN}</p>}
            </div>
            {/* Right: Dispatch Details */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Dispatched Through:</span>
                  <p className="font-semibold">{invoice.dispatchedThrough || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Destination:</span>
                  <p className="font-semibold">{invoice.destination || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle No:</span>
                  <p className="font-semibold">{invoice.motorVehicleNo || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Terms of Delivery:</span>
                  <p className="font-semibold">{invoice.termsOfDelivery || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b border-r border-black p-1.5 text-center w-8">Sl.</th>
                <th className="border-b border-r border-black p-1.5 text-left">Description / Batch / Mfg</th>
                <th className="border-b border-r border-black p-1.5 text-center w-16">HSN/SAC</th>
                <th className="border-b border-r border-black p-1.5 text-center w-12">Cases</th>
                <th className="border-b border-r border-black p-1.5 text-center w-12">Qty</th>
                <th className="border-b border-r border-black p-1.5 text-center w-12">Unit</th>
                <th className="border-b border-r border-black p-1.5 text-right w-16">Rate</th>
                <th className="border-b border-r border-black p-1.5 text-center w-10">Disc%</th>
                <th className="border-b border-black p-1.5 text-right w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.slNo}>
                  <td className="border-b border-r border-black p-1.5 text-center">{item.slNo}</td>
                  <td className="border-b border-r border-black p-1.5">
                    <div className="font-medium">{item.description}</div>
                    {(item.batchNumber || item.mfgDate) && (
                      <div className="text-[10px] text-gray-600">
                        {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                        {item.batchNumber && item.mfgDate && <span> | </span>}
                        {item.mfgDate && <span>Mfg: {item.mfgDate}</span>}
                      </div>
                    )}
                  </td>
                  <td className="border-b border-r border-black p-1.5 text-center">{item.hsnSac}</td>
                  <td className="border-b border-r border-black p-1.5 text-center">{item.cases || '-'}</td>
                  <td className="border-b border-r border-black p-1.5 text-center">{item.quantity}</td>
                  <td className="border-b border-r border-black p-1.5 text-center">{item.unit}</td>
                  <td className="border-b border-r border-black p-1.5 text-right">₹{item.rate.toFixed(2)}</td>
                  <td className="border-b border-r border-black p-1.5 text-center">{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                  <td className="border-b border-black p-1.5 text-right">₹{item.finalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {/* Empty rows */}
              {invoice.items.length < 3 && Array.from({ length: 3 - invoice.items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border-b border-r border-black p-1.5">&nbsp;</td>
                  <td className="border-b border-r border-black p-1.5"></td>
                  <td className="border-b border-r border-black p-1.5"></td>
                  <td className="border-b border-r border-black p-1.5"></td>
                  <td className="border-b border-r border-black p-1.5"></td>
                  <td className="border-b border-r border-black p-1.5"></td>
                  <td className="border-b border-r border-black p-1.5"></td>
                  <td className="border-b border-r border-black p-1.5"></td>
                  <td className="border-b border-black p-1.5"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="border-b border-r border-black p-1.5 text-right font-semibold">Total Qty:</td>
                <td className="border-b border-r border-black p-1.5 text-center font-semibold">{invoice.totalQty}</td>
                <td className="border-b border-r border-black p-1.5 text-center">Nos.</td>
                <td colSpan={2} className="border-b border-r border-black p-1.5 text-right font-semibold">Subtotal:</td>
                <td className="border-b border-black p-1.5 text-right font-semibold">₹{invoice.subtotal.toFixed(2)}</td>
              </tr>
              {invoice.taxes.map((tax, index) => (
                <tr key={index}>
                  <td colSpan={8} className="border-b border-r border-black p-1.5 text-right">{tax.name} @ {tax.percent}%:</td>
                  <td className="border-b border-black p-1.5 text-right">₹{tax.amount.toFixed(2)}</td>
                </tr>
              ))}
              {invoice.roundOff !== 0 && (
                <tr>
                  <td colSpan={8} className="border-b border-r border-black p-1.5 text-right">Round Off:</td>
                  <td className="border-b border-black p-1.5 text-right">{invoice.roundOff >= 0 ? '+' : ''}₹{invoice.roundOff.toFixed(2)}</td>
                </tr>
              )}
              <tr className="font-bold bg-gray-100">
                <td colSpan={8} className="border-b border-r border-black p-1.5 text-right">Grand Total:</td>
                <td className="border-b border-black p-1.5 text-right">₹{invoice.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words */}
          <div className="border-b border-black p-2">
            <p className="text-xs">
              <span className="font-semibold">Amount Chargeable (in words): </span>
              <span className="font-bold italic">{numberToWords(invoice.total)}</span>
            </p>
          </div>

          {/* Bank Details and Declaration */}
          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-2">
              <p className="text-xs font-semibold text-gray-600 mb-1">Bank Details</p>
              {company?.bankName && <p className="text-xs">Bank: <span className="font-semibold">{company.bankName}</span></p>}
              {company?.bankAccount && <p className="text-xs">A/c No.: <span className="font-semibold">{company.bankAccount}</span></p>}
              {company?.bankIfsc && <p className="text-xs">IFSC: <span className="font-semibold">{company.bankIfsc}</span></p>}
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-600 mb-1">Declaration</p>
              <p className="text-[10px]">{invoice.declaration}</p>
            </div>
          </div>

          {/* Signature Section */}
          <div className="p-3">
            <div className="flex justify-between items-end">
              <div className="text-xs text-gray-500">
                <p>Receiver's Signature</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold mb-1">For {company?.name || 'Company Name'}</p>
                <div className="h-16 flex flex-col items-center justify-center gap-1">
                  {company?.stamp && (
                    <img src={company.stamp} alt="Stamp" className="h-12 object-contain" />
                  )}
                  {company?.signature && (
                    <img src={company.signature} alt="Signature" className="h-8 object-contain" />
                  )}
                </div>
                <p className="text-xs font-semibold border-t border-black pt-1">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-center text-[10px] text-gray-500">
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