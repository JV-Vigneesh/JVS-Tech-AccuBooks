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
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 16;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const margin = 8;
    const usableHeight = pdfHeight - (margin * 2);
    
    if (imgHeight <= usableHeight) {
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let pageNum = 0;
      
      while (remainingHeight > 0) {
        if (pageNum > 0) {
          pdf.addPage();
          pdf.setFontSize(8);
          pdf.setTextColor(100);
          pdf.text(`Invoice ${invoice.invoiceNumber} - Continued...`, margin, margin - 2);
        }
        
        const sliceHeight = Math.min(usableHeight, remainingHeight);
        const sourceHeight = (sliceHeight / imgHeight) * canvas.height;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );
          
          const sliceData = tempCanvas.toDataURL('image/png', 1.0);
          const yPos = pageNum === 0 ? margin : margin + 2;
          pdf.addImage(sliceData, 'PNG', margin, yPos, imgWidth, sliceHeight);
        }
        
        sourceY += sourceHeight;
        remainingHeight -= sliceHeight;
        pageNum++;
      }
    }

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

      {/* Invoice Content - Clean Modern Design */}
      <div 
        ref={invoiceRef} 
        id="printable-document"
        className="bg-white max-w-[210mm] mx-auto shadow-lg"
        style={{ backgroundColor: '#ffffff', color: '#1a1a1a', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '32px' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-5">
            {company?.logo && (
              <img 
                src={company.logo} 
                alt="Logo" 
                crossOrigin="anonymous"
                style={{ width: '100px', height: '100px', objectFit: 'contain' }}
              />
            )}
            <div>
              <h1 className="text-xl font-semibold mb-1" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>{company?.name || 'Company Name'}</h1>
              <p className="text-xs leading-relaxed max-w-[200px]" style={{ color: '#666666' }}>{company?.address}</p>
              {company?.mobile && <p className="text-xs mt-1" style={{ color: '#666666' }}>{company.mobile}</p>}
              {company?.email && <p className="text-xs" style={{ color: '#666666' }}>{company.email}</p>}
              {company?.gstin && <p className="text-xs font-medium mt-1" style={{ color: '#1a1a1a' }}>GSTIN: {company.gstin}</p>}
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-2xl font-light tracking-wide mb-4" style={{ color: '#1a1a1a' }}>TAX INVOICE</h2>
            <div className="text-xs space-y-1" style={{ color: '#666666' }}>
              <p><span className="font-medium" style={{ color: '#1a1a1a' }}>{invoice.invoiceNumber}</span></p>
              <p>{format(new Date(invoice.date), 'dd MMM yyyy')}</p>
              {invoice.dueDate && <p>Due: {format(new Date(invoice.dueDate), 'dd MMM yyyy')}</p>}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-6" style={{ backgroundColor: '#e5e5e5' }}></div>

        {/* Bill To & Dispatch */}
        <div className="flex gap-12 mb-6">
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#999999' }}>Bill To</p>
            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{invoice.customerName}</p>
            {invoice.customerPartyName && (
              <p className="text-xs" style={{ color: '#666666' }}>Attn: {invoice.customerPartyName}</p>
            )}
            <p className="text-xs leading-relaxed mt-1" style={{ color: '#666666' }}>{invoice.customerAddress}</p>
            {invoice.customerState && <p className="text-xs" style={{ color: '#666666' }}>{invoice.customerState}</p>}
            {invoice.customerMobile && <p className="text-xs mt-1" style={{ color: '#666666' }}>{invoice.customerMobile}</p>}
            {invoice.customerGSTIN && <p className="text-xs font-medium mt-1" style={{ color: '#1a1a1a' }}>GSTIN: {invoice.customerGSTIN}</p>}
          </div>
          
          {(invoice.dispatchedThrough || invoice.destination || invoice.motorVehicleNo) && (
            <div className="w-56">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#999999' }}>Dispatch Info</p>
              <div className="text-xs space-y-1" style={{ color: '#666666' }}>
                {invoice.dispatchedThrough && <p>Via: {invoice.dispatchedThrough}</p>}
                {invoice.destination && <p>To: {invoice.destination}</p>}
                {invoice.motorVehicleNo && <p>Vehicle: {invoice.motorVehicleNo}</p>}
                {invoice.termsOfDelivery && <p>Terms: {invoice.termsOfDelivery}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full text-xs mb-6" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
              <th className="py-3 text-left font-medium" style={{ color: '#999999', width: '5%' }}>#</th>
              <th className="py-3 text-left font-medium" style={{ color: '#999999' }}>Description</th>
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '10%' }}>HSN</th>
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '8%' }}>Qty</th>
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '8%' }}>Unit</th>
              <th className="py-3 text-right font-medium" style={{ color: '#999999', width: '12%' }}>Rate</th>
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '8%' }}>Disc</th>
              <th className="py-3 text-right font-medium" style={{ color: '#999999', width: '14%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.slNo} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td className="py-3 text-left" style={{ color: '#999999' }}>{item.slNo}</td>
                <td className="py-3">
                  <span className="font-medium">{item.description}</span>
                  {(item.batchNumber || item.mfgDate) && (
                    <span className="ml-2" style={{ color: '#999999' }}>
                      {item.batchNumber && `Batch: ${item.batchNumber}`}
                      {item.batchNumber && item.mfgDate && ' • '}
                      {item.mfgDate && `Mfg: ${item.mfgDate}`}
                    </span>
                  )}
                </td>
                <td className="py-3 text-center" style={{ color: '#666666' }}>{item.hsnSac}</td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-center" style={{ color: '#666666' }}>{item.unit}</td>
                <td className="py-3 text-right">₹{item.rate.toFixed(2)}</td>
                <td className="py-3 text-center" style={{ color: '#666666' }}>{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                <td className="py-3 text-right font-medium">₹{item.finalAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-between mb-8">
          <div className="flex-1 pr-12">
            <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: '#999999' }}>Amount in Words</p>
            <p className="text-xs font-medium" style={{ color: '#1a1a1a' }}>{numberToWords(invoice.total)}</p>
          </div>
          
          <div className="w-56">
            <div className="flex justify-between py-1.5 text-xs">
              <span style={{ color: '#666666' }}>Subtotal</span>
              <span style={{ color: '#1a1a1a' }}>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.taxes.map((tax, index) => (
              <div key={index} className="flex justify-between py-1.5 text-xs">
                <span style={{ color: '#666666' }}>{tax.name} @ {tax.percent}%</span>
                <span style={{ color: '#1a1a1a' }}>₹{tax.amount.toFixed(2)}</span>
              </div>
            ))}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between py-1.5 text-xs">
                <span style={{ color: '#666666' }}>Round Off</span>
                <span style={{ color: '#1a1a1a' }}>{invoice.roundOff >= 0 ? '+' : ''}₹{invoice.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 mt-1" style={{ borderTop: '1px solid #1a1a1a' }}>
              <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Total</span>
              <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>₹{invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bank & Declaration */}
        <div className="flex gap-12 mb-8 py-4" style={{ borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
          {(company?.bankName || company?.bankAccount) && (
            <div className="flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#999999' }}>Bank Details</p>
              <div className="text-xs space-y-0.5" style={{ color: '#666666' }}>
                {company?.bankName && <p>{company.bankName}</p>}
                {company?.bankAccount && <p>A/C: {company.bankAccount}</p>}
                {company?.bankIfsc && <p>IFSC: {company.bankIfsc}</p>}
              </div>
            </div>
          )}
          {invoice.declaration && (
            <div className="w-64">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#999999' }}>Declaration</p>
              <p className="text-[10px] leading-relaxed" style={{ color: '#666666' }}>{invoice.declaration}</p>
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="flex justify-between items-end">
          <div>
            <div className="h-12 mb-1"></div>
            <div className="w-28 pt-1" style={{ borderTop: '1px solid #cccccc' }}>
              <p className="text-[10px]" style={{ color: '#999999' }}>Receiver's Signature</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium mb-1" style={{ color: '#1a1a1a' }}>For {company?.name}</p>
            <div className="h-12 flex items-center justify-end gap-2 mb-1">
              {company?.stamp && (
                <img src={company.stamp} alt="Stamp" style={{ height: '60px', objectFit: 'contain' }} crossOrigin="anonymous" />
              )}
              {company?.signature && (
                <img src={company.signature} alt="Signature" style={{ height: '50px', objectFit: 'contain' }} crossOrigin="anonymous" />
              )}
            </div>
            <div className="w-32 pt-1 ml-auto" style={{ borderTop: '1px solid #cccccc' }}>
              <p className="text-[10px] font-medium" style={{ color: '#1a1a1a' }}>Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #printable-document,
          #printable-document * {
            visibility: visible;
          }
          
          #printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}