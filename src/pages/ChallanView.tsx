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
    if (!printRef.current) return;
    
    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`challan-${challan?.challanNumber || 'download'}.pdf`);
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
        className="bg-white text-black p-6 max-w-4xl mx-auto shadow-lg print:shadow-none"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <div className="border-2 border-black">
          {/* Header */}
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-4 border-r-2 border-black">
              <div className="flex items-start gap-3">
                {company?.logo && (
                  <img src={company.logo} alt="Logo" className="h-14 w-14 object-contain" />
                )}
                <div>
                  <h2 className="text-xl font-bold">{company?.name || 'Company Name'}</h2>
                  <p className="text-xs whitespace-pre-line">{company?.address}</p>
                  {company?.mobile && <p className="text-xs">Mobile: {company.mobile}</p>}
                  {company?.email && <p className="text-xs">Email: {company.email}</p>}
                  {company?.gstin && <p className="text-xs font-semibold">GSTIN: {company.gstin}</p>}
                </div>
              </div>
            </div>
            <div className="p-4 flex flex-col justify-center text-center">
              <h1 className="text-2xl font-bold">DELIVERY CHALLAN</h1>
              <p className="text-sm font-semibold mt-1">Challan No: {challan.challanNumber}</p>
              <p className="text-sm">Date: {format(new Date(challan.date), 'dd-MMM-yyyy')}</p>
              <p className="text-xs mt-1">Reason: {getReasonLabel(challan.reasonForTransfer)}</p>
            </div>
          </div>

          {/* Customer & Dispatch Details */}
          <div className="grid grid-cols-2 border-b border-black">
            <div className="p-3 border-r border-black">
              <p className="text-xs font-semibold text-gray-600 mb-1">Consignee (Ship To):</p>
              <p className="font-bold text-base">{challan.customerName}</p>
              <p className="text-xs whitespace-pre-line">{challan.customerAddress}</p>
              {challan.customerState && <p className="text-xs">State: {challan.customerState}</p>}
              {challan.customerMobile && <p className="text-xs">Mobile: {challan.customerMobile}</p>}
              {challan.customerEmail && <p className="text-xs">Email: {challan.customerEmail}</p>}
              {challan.customerGSTIN && <p className="text-xs font-semibold">GSTIN: {challan.customerGSTIN}</p>}
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Transport Details:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Dispatched Through:</span>
                  <p className="font-semibold">{challan.dispatchedThrough || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Destination:</span>
                  <p className="font-semibold">{challan.destination || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle No:</span>
                  <p className="font-semibold">{challan.motorVehicleNo || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Terms of Delivery:</span>
                  <p className="font-semibold">{challan.termsOfDelivery || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b border-r border-black p-2 text-center w-10">Sl.</th>
                <th className="border-b border-r border-black p-2 text-left">Description / Batch / Mfg</th>
                <th className="border-b border-r border-black p-2 text-center w-20">HSN/SAC</th>
                <th className="border-b border-r border-black p-2 text-center w-16">Cases</th>
                <th className="border-b border-r border-black p-2 text-center w-14">Qty</th>
                <th className="border-b border-black p-2 text-center w-14">Unit</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item, index) => (
                <tr key={index}>
                  <td className="border-b border-r border-black p-2 text-center">{item.slNo}</td>
                  <td className="border-b border-r border-black p-2">
                    <div className="font-medium">{item.description}</div>
                    {(item.batchNumber || item.mfgDate) && (
                      <div className="text-[10px] text-gray-600">
                        {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                        {item.batchNumber && item.mfgDate && <span> | </span>}
                        {item.mfgDate && <span>Mfg: {item.mfgDate}</span>}
                      </div>
                    )}
                  </td>
                  <td className="border-b border-r border-black p-2 text-center">{item.hsnSac}</td>
                  <td className="border-b border-r border-black p-2 text-center">{item.cases || '-'}</td>
                  <td className="border-b border-r border-black p-2 text-center">{item.quantity}</td>
                  <td className="border-b border-black p-2 text-center">{item.unit}</td>
                </tr>
              ))}
              {/* Empty rows for spacing */}
              {challan.items.length < 5 && Array.from({ length: 5 - challan.items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border-b border-r border-black p-2">&nbsp;</td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-r border-black p-2"></td>
                  <td className="border-b border-black p-2"></td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="font-bold bg-gray-100">
                <td colSpan={4} className="border-b border-r border-black p-2 text-right">Total Quantity:</td>
                <td className="border-b border-r border-black p-2 text-center">{challan.totalQty}</td>
                <td className="border-b border-black p-2"></td>
              </tr>
            </tbody>
          </table>

          {/* Approx Value */}
          {challan.approxValue !== undefined && challan.approxValue > 0 && (
            <div className="border-b border-black p-2 text-sm">
              <span className="font-semibold">Approximate Value of Goods: </span>
              <span>₹{challan.approxValue.toFixed(2)}</span>
            </div>
          )}

          {/* Remarks */}
          {challan.remarks && (
            <div className="border-b border-black p-2">
              <p className="font-semibold text-xs">Remarks:</p>
              <p className="text-xs">{challan.remarks}</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs mb-1">Received the above goods in good condition</p>
                <div className="mt-12 border-t border-black pt-1 w-40">
                  <p className="text-xs text-center">Receiver's Signature</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold mb-1">For {company?.name}</p>
                <div className="h-16 flex flex-col items-center justify-center gap-1">
                  {company?.stamp && (
                    <img src={company.stamp} alt="Stamp" className="h-12 object-contain" />
                  )}
                  {company?.signature && (
                    <img src={company.signature} alt="Signature" className="h-8 object-contain" />
                  )}
                </div>
                <p className="text-xs font-semibold border-t border-black pt-1">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-center text-[10px] text-gray-500">
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
        }
      `}</style>
    </div>
  );
}