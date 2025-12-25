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
          pdf.text(`Challan ${challan.challanNumber} - Continued...`, margin, margin - 2);
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
      <div className="flex justify-between items-center mb-6 no-print">
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

      {/* Challan Content - Clean Modern Design */}
      <div 
        ref={printRef} 
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
            <h2 className="text-2xl font-light tracking-wide mb-4" style={{ color: '#1a1a1a' }}>DELIVERY CHALLAN</h2>
            <div className="text-xs space-y-1" style={{ color: '#666666' }}>
              <p><span className="font-medium" style={{ color: '#1a1a1a' }}>{challan.challanNumber}</span></p>
              <p>{format(new Date(challan.date), 'dd MMM yyyy')}</p>
              <p className="text-[10px]" style={{ color: '#999999' }}>{getReasonLabel(challan.reasonForTransfer)}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-6" style={{ backgroundColor: '#e5e5e5' }}></div>

        {/* Consignee & Transport */}
        <div className="flex gap-12 mb-6">
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#999999' }}>Ship To</p>
            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{challan.customerName}</p>
            {challan.customerPartyName && (
              <p className="text-xs" style={{ color: '#666666' }}>Attn: {challan.customerPartyName}</p>
            )}
            <p className="text-xs leading-relaxed mt-1" style={{ color: '#666666' }}>{challan.customerAddress}</p>
            {challan.customerState && <p className="text-xs" style={{ color: '#666666' }}>{challan.customerState}</p>}
            {challan.customerMobile && <p className="text-xs mt-1" style={{ color: '#666666' }}>{challan.customerMobile}</p>}
            {challan.customerGSTIN && <p className="text-xs font-medium mt-1" style={{ color: '#1a1a1a' }}>GSTIN: {challan.customerGSTIN}</p>}
          </div>
          
          {(challan.dispatchedThrough || challan.destination || challan.motorVehicleNo) && (
            <div className="w-56">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#999999' }}>Transport Details</p>
              <div className="text-xs space-y-1" style={{ color: '#666666' }}>
                {challan.dispatchedThrough && <p>Via: {challan.dispatchedThrough}</p>}
                {challan.destination && <p>To: {challan.destination}</p>}
                {challan.motorVehicleNo && <p>Vehicle: {challan.motorVehicleNo}</p>}
                {challan.termsOfDelivery && <p>Terms: {challan.termsOfDelivery}</p>}
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
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '15%' }}>HSN/SAC</th>
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '12%' }}>Cases</th>
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '12%' }}>Qty</th>
              <th className="py-3 text-center font-medium" style={{ color: '#999999', width: '12%' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
                <td className="py-3 text-center" style={{ color: '#666666' }}>{item.cases || '-'}</td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-center" style={{ color: '#666666' }}>{item.unit}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #e5e5e5' }}>
              <td colSpan={4} className="py-3 text-right font-medium" style={{ color: '#666666' }}>Total Quantity:</td>
              <td className="py-3 text-center font-semibold">{challan.totalQty}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {/* Approx Value & Remarks */}
        {(challan.approxValue !== undefined && challan.approxValue > 0) || challan.remarks ? (
          <div className="mb-8 py-4" style={{ borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
            {challan.approxValue !== undefined && challan.approxValue > 0 && (
              <p className="text-xs mb-2">
                <span style={{ color: '#666666' }}>Approximate Value: </span>
                <span className="font-medium" style={{ color: '#1a1a1a' }}>₹{challan.approxValue.toFixed(2)}</span>
              </p>
            )}
            {challan.remarks && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: '#999999' }}>Remarks</p>
                <p className="text-xs" style={{ color: '#666666' }}>{challan.remarks}</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Signature */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs mb-1" style={{ color: '#666666' }}>Received the above goods in good condition</p>
            <div className="h-12 mb-1"></div>
            <div className="w-32 pt-1" style={{ borderTop: '1px solid #cccccc' }}>
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

      {/* Print styles */}
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