import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getChallans } from '@/lib/storage';
import { DeliveryChallan } from '@/types/accounting';
import { useCompany } from '@/contexts/CompanyContext';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ChallanView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [challan, setChallan] = useState<DeliveryChallan | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const challans = getChallans();
      const found = challans.find(c => c.id === id);
      if (found) {
        setChallan(found);
      }
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !challan) return;
    
    const canvas = await html2canvas(printRef.current, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: printRef.current.scrollWidth,
      height: printRef.current.scrollHeight,
    });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 10;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 5;

    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 5;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(`Challan-${challan.challanNumber}.pdf`);
  };

  if (!challan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Challan not found</p>
      </div>
    );
  }

  const company = selectedCompany;
  const getReasonLabel = (reason: DeliveryChallan['reasonForTransfer']) => {
    const labels = {
      supply: 'Supply of Goods',
      job_work: 'Job Work',
      exhibition: 'Exhibition/Display',
      personal: 'Personal Use',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="outline" onClick={() => navigate('/challans')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Challans
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

      {/* Printable Challan */}
      <div 
        ref={printRef} 
        className="bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none p-6"
        style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}
      >
        <div className="border-2 border-black">
          {/* Header */}
          <div className="flex border-b-2 border-black">
            <div className="flex-1 p-4 border-r-2 border-black">
              <div className="flex items-start gap-4">
                {company?.logo && (
                  <img 
                    src={company.logo} 
                    alt="Logo" 
                    className="w-24 h-24 object-contain"
                    style={{ minWidth: '96px', minHeight: '96px' }}
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#000000' }}>{company?.name || 'Company Name'}</h2>
                  <p className="text-sm whitespace-pre-line" style={{ color: '#000000' }}>{company?.address}</p>
                  {company?.mobile && <p className="text-sm" style={{ color: '#000000' }}>Mobile: {company.mobile}</p>}
                  {company?.email && <p className="text-sm" style={{ color: '#000000' }}>Email: {company.email}</p>}
                  {company?.gstin && <p className="text-sm font-bold" style={{ color: '#000000' }}>GSTIN: {company.gstin}</p>}
                </div>
              </div>
            </div>
            <div className="w-64 p-4 flex flex-col justify-center text-center">
              <div className="border-2 border-black px-4 py-2 mb-3 inline-block mx-auto">
                <h1 className="text-xl font-bold" style={{ color: '#000000' }}>DELIVERY CHALLAN</h1>
              </div>
              <div className="text-sm space-y-1" style={{ color: '#000000' }}>
                <p><span className="font-semibold">Challan No:</span> <span className="font-bold">{challan.challanNumber}</span></p>
                <p><span className="font-semibold">Date:</span> {format(new Date(challan.date), 'dd-MMM-yyyy')}</p>
                <p><span className="font-semibold">Reason:</span> {getReasonLabel(challan.reasonForTransfer)}</p>
              </div>
            </div>
          </div>

          {/* Customer & Dispatch Details */}
          <div className="flex border-b-2 border-black">
            <div className="flex-1 border-r-2 border-black">
              <div className="bg-gray-200 px-3 py-1.5 border-b border-black">
                <h3 className="font-bold text-sm" style={{ color: '#000000' }}>CONSIGNEE (SHIP TO)</h3>
              </div>
              <div className="p-3 text-sm min-h-[100px]" style={{ color: '#000000' }}>
                <p className="font-bold text-base">{challan.customerName}</p>
                <p className="whitespace-pre-line">{challan.customerAddress}</p>
                {challan.customerState && <p><span className="font-semibold">State:</span> {challan.customerState}</p>}
                {challan.customerMobile && <p><span className="font-semibold">Mobile:</span> {challan.customerMobile}</p>}
                {challan.customerEmail && <p><span className="font-semibold">Email:</span> {challan.customerEmail}</p>}
                {challan.customerGSTIN && <p className="font-bold">GSTIN: {challan.customerGSTIN}</p>}
              </div>
            </div>
            <div className="w-80">
              <div className="bg-gray-200 px-3 py-1.5 border-b border-black">
                <h3 className="font-bold text-sm" style={{ color: '#000000' }}>TRANSPORT DETAILS</h3>
              </div>
              <div className="p-3 text-sm" style={{ color: '#000000' }}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div>
                    <p className="text-xs font-semibold">Dispatched Through</p>
                    <p className="font-medium">{challan.dispatchedThrough || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Destination</p>
                    <p className="font-medium">{challan.destination || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Vehicle No.</p>
                    <p className="font-medium">{challan.motorVehicleNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Terms of Delivery</p>
                    <p className="font-medium">{challan.termsOfDelivery || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse text-sm" style={{ color: '#000000' }}>
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b-2 border-r border-black p-2 text-center w-10 font-bold">Sl.</th>
                <th className="border-b-2 border-r border-black p-2 text-left font-bold">Description / Batch / Mfg</th>
                <th className="border-b-2 border-r border-black p-2 text-center w-20 font-bold">HSN/SAC</th>
                <th className="border-b-2 border-r border-black p-2 text-center w-16 font-bold">Cases</th>
                <th className="border-b-2 border-r border-black p-2 text-center w-14 font-bold">Qty</th>
                <th className="border-b-2 border-black p-2 text-center w-14 font-bold">Unit</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="border-r border-black p-2 text-center">{item.slNo}</td>
                  <td className="border-r border-black p-2">
                    <div className="font-medium">{item.description}</div>
                    {(item.batchNumber || item.mfgDate) && (
                      <div className="text-xs" style={{ color: '#000000' }}>
                        {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                        {item.batchNumber && item.mfgDate && <span> | </span>}
                        {item.mfgDate && <span>Mfg: {item.mfgDate}</span>}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-black p-2 text-center">{item.hsnSac}</td>
                  <td className="border-r border-black p-2 text-center">{item.cases || '-'}</td>
                  <td className="border-r border-black p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-center">{item.unit}</td>
                </tr>
              ))}
              {/* Empty rows for spacing */}
              {challan.items.length < 5 && Array.from({ length: 5 - challan.items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-black">
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2"></td>
                  <td className="border-r border-black p-2"></td>
                  <td className="border-r border-black p-2"></td>
                  <td className="border-r border-black p-2"></td>
                  <td className="p-2"></td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="font-bold bg-gray-200">
                <td colSpan={4} className="border-r border-black p-2 text-right">Total Quantity:</td>
                <td className="border-r border-black p-2 text-center">{challan.totalQty}</td>
                <td className="p-2"></td>
              </tr>
            </tbody>
          </table>

          {/* Approx Value */}
          {challan.approxValue !== undefined && challan.approxValue > 0 && (
            <div className="border-t border-black p-3 text-sm" style={{ color: '#000000' }}>
              <span className="font-bold">Approximate Value of Goods: </span>
              <span className="font-semibold">₹{challan.approxValue.toFixed(2)}</span>
            </div>
          )}

          {/* Remarks */}
          {challan.remarks && (
            <div className="border-t border-black p-3" style={{ color: '#000000' }}>
              <p className="font-bold text-sm">Remarks:</p>
              <p className="text-sm">{challan.remarks}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-black p-4" style={{ color: '#000000' }}>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm mb-1">Received the above goods in good condition</p>
                <div className="mt-16 border-t border-black pt-1 w-40">
                  <p className="text-sm text-center">Receiver's Signature</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold mb-1">For {company?.name}</p>
                <div className="h-20 flex flex-col items-center justify-center gap-1">
                  {company?.stamp && (
                    <img src={company.stamp} alt="Stamp" className="h-16 object-contain" />
                  )}
                  {company?.signature && (
                    <img src={company.signature} alt="Signature" className="h-12 object-contain" />
                  )}
                </div>
                <p className="text-sm font-bold border-t border-black pt-1">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-xs" style={{ color: '#000000' }}>
          <p>This is a computer generated delivery challan</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
          }
          .print\\:shadow-none * {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}