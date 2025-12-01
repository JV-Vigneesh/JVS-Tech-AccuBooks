import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getCompany, saveCompany } from '@/lib/storage';
import { Company } from '@/types/accounting';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const [company, setCompany] = useState<Company>({
    id: '1',
    name: '',
    address: '',
    mobile: '',
    email: '',
    gstin: '',
    taxNumber: '',
    bankName: '',
    bankAccount: '',
    bankIfsc: '',
    logo: '',
    stamp: '',
    signature: '',
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    const savedCompany = getCompany();
    if (savedCompany) {
      setCompany(savedCompany);
    }
  }, []);

  const handleSave = () => {
    saveCompany(company);
    toast({
      title: 'Success',
      description: 'Company details saved successfully',
    });
  };

  const handleImageUpload = (field: 'logo' | 'stamp' | 'signature') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany({ ...company, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company details and branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Basic details about your company</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                value={company.mobile}
                onChange={(e) => setCompany({ ...company, mobile: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={company.gstin}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <CardDescription>Banking information for invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={company.bankName}
                onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Account Number</Label>
              <Input
                id="bankAccount"
                value={company.bankAccount}
                onChange={(e) => setCompany({ ...company, bankAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankIfsc">IFSC Code</Label>
              <Input
                id="bankIfsc"
                value={company.bankIfsc}
                onChange={(e) => setCompany({ ...company, bankIfsc: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxNumber">Tax Number</Label>
              <Input
                id="taxNumber"
                value={company.taxNumber}
                onChange={(e) => setCompany({ ...company, taxNumber: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Upload your company logo, stamp, and signature</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleImageUpload('logo')}
              />
              {company.logo && (
                <img src={company.logo} alt="Logo" className="mt-2 h-20 object-contain" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stamp">Company Stamp</Label>
              <Input
                id="stamp"
                type="file"
                accept="image/*"
                onChange={handleImageUpload('stamp')}
              />
              {company.stamp && (
                <img src={company.stamp} alt="Stamp" className="mt-2 h-20 object-contain" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature">Signature</Label>
              <Input
                id="signature"
                type="file"
                accept="image/*"
                onChange={handleImageUpload('signature')}
              />
              {company.signature && (
                <img src={company.signature} alt="Signature" className="mt-2 h-20 object-contain" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
