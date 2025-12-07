import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getChallans } from '@/lib/storage';
import { DeliveryChallan, Company } from '@/types/accounting';
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
    const pageHeight = 297;
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
        className="bg-white text-black p-8 max-w-4xl mx-auto border border-border print:border-black print:shadow-none"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
          <div className="flex-1">
            {company?.logo && (
              <img src={company.logo} alt="Logo" className="h-16 mb-2" />
            )}
            <h2 className="text-xl font-bold">{company?.name || 'Company Name'}</h2>
            <p className="text-sm whitespace-pre-line">{company?.address}</p>
            {company?.mobile && <p className="text-sm">Mobile: {company.mobile}</p>}
            {company?.email && <p className="text-sm">Email: {company.email}</p>}
            {company?.gstin && <p className="text-sm font-semibold">GSTIN: {company.gstin}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold mb-2">DELIVERY CHALLAN</h1>
            <p className="text-sm"><span className="font-semibold">Challan No:</span> {challan.challanNumber}</p>
            <p className="text-sm"><span className="font-semibold">Date:</span> {format(new Date(challan.date), 'dd/MM/yyyy')}</p>
            <p className="text-sm mt-2"><span className="font-semibold">Reason:</span> {getReasonLabel(challan.reasonForTransfer)}</p>
          </div>
        </div>

        {/* Customer & Dispatch Details */}
        <div className="grid grid-cols-2 gap-4 border-b border-black pb-4 mb-4">
          <div>
            <h3 className="font-bold text-sm border-b border-black pb-1 mb-2">Consignee (Ship To)</h3>
            <p className="font-semibold">{challan.customerName}</p>
            <p className="text-sm whitespace-pre-line">{challan.customerAddress}</p>
            {challan.customerGSTIN && <p className="text-sm">GSTIN: {challan.customerGSTIN}</p>}
            {challan.customerState && <p className="text-sm">State: {challan.customerState}</p>}
            {challan.customerMobile && <p className="text-sm">Mobile: {challan.customerMobile}</p>}
            {challan.customerEmail && <p className="text-sm">Email: {challan.customerEmail}</p>}
          </div>
          <div>
            <h3 className="font-bold text-sm border-b border-black pb-1 mb-2">Transport Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="font-semibold">Dispatched Through:</span></p>
              <p>{challan.dispatchedThrough || '-'}</p>
              <p><span className="font-semibold">Destination:</span></p>
              <p>{challan.destination || '-'}</p>
              <p><span className="font-semibold">Vehicle No:</span></p>
              <p>{challan.motorVehicleNo || '-'}</p>
              <p><span className="font-semibold">Terms of Delivery:</span></p>
              <p>{challan.termsOfDelivery || '-'}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-4 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left w-10">Sl.</th>
              <th className="border border-black p-2 text-left">Description of Goods</th>
              <th className="border border-black p-2 text-center w-24">HSN/SAC</th>
              <th className="border border-black p-2 text-center w-20">Cases</th>
              <th className="border border-black p-2 text-center w-16">Qty</th>
              <th className="border border-black p-2 text-center w-16">Unit</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-black p-2 text-center">{item.slNo}</td>
                <td className="border border-black p-2">
                  <div>{item.description}</div>
                  {(item.batchNumber || item.mfgDate) && (
                    <div className="text-xs text-gray-600">
                      {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                      {item.batchNumber && item.mfgDate && <span> | </span>}
                      {item.mfgDate && <span>Mfg: {item.mfgDate}</span>}
                    </div>
                  )}
                </td>
                <td className="border border-black p-2 text-center">{item.hsnSac}</td>
                <td className="border border-black p-2 text-center">{item.cases || '-'}</td>
                <td className="border border-black p-2 text-center">{item.quantity}</td>
                <td className="border border-black p-2 text-center">{item.unit}</td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="font-bold bg-gray-100">
              <td colSpan={4} className="border border-black p-2 text-right">Total Quantity:</td>
              <td className="border border-black p-2 text-center">{challan.totalQty}</td>
              <td className="border border-black p-2"></td>
            </tr>
          </tbody>
        </table>

        {/* Remarks */}
        {challan.remarks && (
          <div className="border border-black p-3 mb-4">
            <p className="font-semibold text-sm">Remarks:</p>
            <p className="text-sm">{challan.remarks}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between mt-8 pt-4">
          <div>
            <p className="text-sm mb-1">Received the above goods in good condition</p>
            <div className="mt-12 border-t border-black pt-1 w-48">
              <p className="text-sm text-center">Receiver's Signature</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold mb-1">For {company?.name}</p>
            {company?.signature && (
              <img src={company.signature} alt="Signature" className="h-16 ml-auto" />
            )}
            {company?.stamp && (
              <img src={company.stamp} alt="Stamp" className="h-16 ml-auto mt-2" />
            )}
            <div className="mt-4 border-t border-black pt-1">
              <p className="text-sm">Authorized Signatory</p>
            </div>
          </div>
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
          [data-print] {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
