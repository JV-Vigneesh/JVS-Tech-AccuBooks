import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCompanies, saveCompanyToList, deleteCompany } from '@/lib/storage';
import { Company } from '@/types/accounting';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const emptyCompany: Company = {
  id: '',
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
};

export default function Settings() {
  const { toast } = useToast();
  const { refreshCompanies } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company>({ ...emptyCompany, id: crypto.randomUUID() });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setCompanies(getCompanies());
  }, []);

  const handleSave = () => {
    if (!company.name) {
      toast({
        title: 'Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }
    
    saveCompanyToList(company);
    setCompanies(getCompanies());
    refreshCompanies(); // Update sidebar
    setCompany({ ...emptyCompany, id: crypto.randomUUID() });
    setIsEditing(false);
    toast({
      title: 'Success',
      description: `Company ${isEditing ? 'updated' : 'added'} successfully`,
    });
  };

  const handleEdit = (comp: Company) => {
    setCompany(comp);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    deleteCompany(id);
    setCompanies(getCompanies());
    refreshCompanies(); // Update sidebar
    toast({
      title: 'Success',
      description: 'Company deleted successfully',
    });
  };

  const handleCancel = () => {
    setCompany({ ...emptyCompany, id: crypto.randomUUID() });
    setIsEditing(false);
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
        <p className="text-muted-foreground">Manage your companies and branding</p>
      </div>

      {/* Companies List */}
      {companies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Companies</CardTitle>
            <CardDescription>Select a company when creating invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.gstin || '-'}</TableCell>
                    <TableCell>{comp.mobile || '-'}</TableCell>
                    <TableCell>{comp.email || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(comp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Company Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditing ? 'Edit Company' : 'Add New Company'}
          </CardTitle>
          <CardDescription>Enter company details to use in invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
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
          <CardDescription>Upload company logo, stamp, and signature</CardDescription>
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

      <div className="flex justify-end gap-2">
        {isEditing && (
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} size="lg">
          {isEditing ? 'Update Company' : 'Add Company'}
        </Button>
      </div>
    </div>
  );
}
