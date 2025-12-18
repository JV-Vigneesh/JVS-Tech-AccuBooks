import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getQuotations, getCompanies } from '@/lib/storage';
import { Quotation, Company } from '@/types/accounting';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { numberToWords } from '@/lib/numberToWords';

export default function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const quotationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const quotations = getQuotations();
    const found = quotations.find(q => q.id === id);
    if (found) {
      const updatedQuotation = {
        ...found,
        totalQty: found.totalQty || found.items.reduce((sum, item) => sum + item.quantity, 0),
        taxes: found.taxes || [{ name: 'Tax', percent: found.taxPercent || 18, amount: found.taxAmount || 0 }],
        roundOff: found.roundOff || 0,
      };
      setQuotation(updatedQuotation);
      
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
    if (!quotationRef.current || !quotation) return;

    const canvas = await html2canvas(quotationRef.current, {
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
    pdf.save(`Quotation-${quotation.quotationNumber}.pdf`);
  };

  if (!quotation) {
    return <div className="text-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 no-print">
        <Button variant="ghost" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotations
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

      {/* Quotation Content - Professional Layout */}
      <div 
        ref={quotationRef} 
        className="bg-white text-black max-w-4xl mx-auto shadow-lg print-area"
        style={{ backgroundColor: '#ffffff', color: '#000000' }}
      >
        {/* Main Border Container */}
        <div className="border-2 border-gray-800">
          {/* Header Section */}
          <div className="border-b-2 border-gray-800">
            <div className="grid grid-cols-12">
              {/* Company Details - Left */}
              <div className="col-span-7 p-4 border-r-2 border-gray-800">
                <div className="flex items-start gap-3">
                  {company?.logo && (
                    <img src={company.logo} alt="Logo" className="h-16 w-16 object-contain border border-gray-300 p-1" />
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{company?.name || 'Company Name'}</h1>
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-tight">{company?.address || 'Company Address'}</p>
                    <div className="mt-2 text-sm">
                      {company?.mobile && <p><span className="font-semibold">Phone:</span> {company.mobile}</p>}
                      {company?.email && <p><span className="font-semibold">Email:</span> {company.email}</p>}
                      {company?.gstin && <p className="font-semibold text-gray-900">GSTIN: {company.gstin}</p>}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quotation Info - Right */}
              <div className="col-span-5 p-4 bg-gray-50">
                <div className="text-center">
                  <div className="inline-block border-2 border-gray-800 px-6 py-2 mb-3">
                    <h2 className="text-xl font-bold tracking-wide">QUOTATION</h2>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between border-b border-gray-300 pb-1">
                      <span className="font-semibold">Quotation No:</span>
                      <span className="font-bold">{quotation.quotationNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-300 pb-1">
                      <span className="font-semibold">Date:</span>
                      <span>{format(new Date(quotation.date), 'dd-MMM-yyyy')}</span>
                    </div>
                    {quotation.validUntil && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Valid Until:</span>
                        <span>{format(new Date(quotation.validUntil), 'dd-MMM-yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Section */}
          <div className="grid grid-cols-12 border-b-2 border-gray-800">
            {/* To - Left */}
            <div className="col-span-7 border-r-2 border-gray-800">
              <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-400">
                <h3 className="font-bold text-sm">TO</h3>
              </div>
              <div className="p-3 text-sm min-h-[100px]">
                <p className="font-bold text-base mb-1">{quotation.customerName}</p>
                <p className="text-gray-700 whitespace-pre-line leading-tight">{quotation.customerAddress}</p>
                {quotation.customerState && <p className="mt-1"><span className="font-semibold">State:</span> {quotation.customerState}</p>}
                {quotation.customerMobile && <p><span className="font-semibold">Mobile:</span> {quotation.customerMobile}</p>}
                {quotation.customerEmail && <p><span className="font-semibold">Email:</span> {quotation.customerEmail}</p>}
                {quotation.customerGSTIN && <p className="font-semibold mt-1">GSTIN: {quotation.customerGSTIN}</p>}
              </div>
            </div>
            
            {/* Subject - Right */}
            <div className="col-span-5">
              <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-400">
                <h3 className="font-bold text-sm">SUBJECT</h3>
              </div>
              <div className="p-3 text-sm">
                <p className="font-medium">{quotation.subject || 'Quotation for Supply of Goods/Services'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b-2 border-r border-gray-800 p-2 text-center w-10 font-bold">Sl.</th>
                <th className="border-b-2 border-r border-gray-800 p-2 text-left font-bold">Description</th>
                <th className="border-b-2 border-r border-gray-800 p-2 text-center w-16 font-bold">HSN</th>
                <th className="border-b-2 border-r border-gray-800 p-2 text-center w-12 font-bold">Qty</th>
                <th className="border-b-2 border-r border-gray-800 p-2 text-center w-12 font-bold">Unit</th>
                <th className="border-b-2 border-r border-gray-800 p-2 text-right w-16 font-bold">Rate</th>
                <th className="border-b-2 border-r border-gray-800 p-2 text-center w-12 font-bold">Disc%</th>
                <th className="border-b-2 border-gray-800 p-2 text-right w-20 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.slNo} className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2 text-center">{item.slNo}</td>
                  <td className="border-r border-gray-300 p-2">
                    <div className="font-medium">{item.description}</div>
                    {(item.batchNumber || item.mfgDate) && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                        {item.batchNumber && item.mfgDate && <span className="mx-1">|</span>}
                        {item.mfgDate && <span>Mfg: {item.mfgDate}</span>}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-gray-300 p-2 text-center">{item.hsnSac}</td>
                  <td className="border-r border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td className="border-r border-gray-300 p-2 text-center">{item.unit}</td>
                  <td className="border-r border-gray-300 p-2 text-right">₹{item.rate.toFixed(2)}</td>
                  <td className="border-r border-gray-300 p-2 text-center">{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                  <td className="p-2 text-right font-medium">₹{item.finalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {/* Empty rows for minimum height */}
              {quotation.items.length < 5 && Array.from({ length: 5 - quotation.items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-gray-300">
                  <td className="border-r border-gray-300 p-2">&nbsp;</td>
                  <td className="border-r border-gray-300 p-2"></td>
                  <td className="border-r border-gray-300 p-2"></td>
                  <td className="border-r border-gray-300 p-2"></td>
                  <td className="border-r border-gray-300 p-2"></td>
                  <td className="border-r border-gray-300 p-2"></td>
                  <td className="border-r border-gray-300 p-2"></td>
                  <td className="p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="border-t-2 border-gray-800">
            <div className="grid grid-cols-12">
              {/* Left - Amount in Words */}
              <div className="col-span-7 border-r-2 border-gray-800 p-3">
                <p className="text-sm">
                  <span className="font-semibold">Amount (in words):</span>
                </p>
                <p className="text-sm font-bold mt-1 italic">{numberToWords(quotation.total)}</p>
              </div>
              
              {/* Right - Calculations */}
              <div className="col-span-5 text-sm">
                <div className="flex justify-between px-3 py-1.5 border-b border-gray-300">
                  <span>Total Qty:</span>
                  <span className="font-semibold">{quotation.totalQty}</span>
                </div>
                <div className="flex justify-between px-3 py-1.5 border-b border-gray-300">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{quotation.subtotal.toFixed(2)}</span>
                </div>
                {quotation.taxes.map((tax, index) => (
                  <div key={index} className="flex justify-between px-3 py-1 border-b border-gray-300 text-gray-700">
                    <span>{tax.name} @ {tax.percent}%:</span>
                    <span>₹{tax.amount.toFixed(2)}</span>
                  </div>
                ))}
                {quotation.roundOff !== 0 && (
                  <div className="flex justify-between px-3 py-1 border-b border-gray-300">
                    <span>Round Off:</span>
                    <span>{quotation.roundOff >= 0 ? '+' : ''}₹{quotation.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 bg-gray-100 font-bold text-base">
                  <span>TOTAL:</span>
                  <span>₹{quotation.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-12 border-t-2 border-gray-800">
            <div className="col-span-7 border-r-2 border-gray-800 p-3">
              <h4 className="font-bold text-sm mb-2 border-b border-gray-300 pb-1">Terms & Conditions</h4>
              <p className="text-xs text-gray-700 whitespace-pre-line leading-tight">{quotation.termsAndConditions}</p>
            </div>
            <div className="col-span-5 p-3">
              {quotation.notes && (
                <>
                  <h4 className="font-bold text-sm mb-2 border-b border-gray-300 pb-1">Notes</h4>
                  <p className="text-xs text-gray-700 leading-tight">{quotation.notes}</p>
                </>
              )}
            </div>
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-gray-800 p-4">
            <div className="flex justify-between items-end">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-16">Customer Acceptance</p>
                <div className="border-t border-gray-400 pt-1 w-32">
                  <p className="text-xs">Date: _______________</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold mb-1">For {company?.name || 'Company Name'}</p>
                <div className="h-16 flex flex-col items-center justify-center gap-1 mb-2">
                  {company?.stamp && (
                    <img src={company.stamp} alt="Stamp" className="h-14 object-contain" />
                  )}
                  {company?.signature && (
                    <img src={company.signature} alt="Signature" className="h-10 object-contain" />
                  )}
                </div>
                <div className="border-t border-gray-800 pt-1">
                  <p className="text-sm font-semibold">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-xs text-gray-500">
          <p>This is a computer generated quotation</p>
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