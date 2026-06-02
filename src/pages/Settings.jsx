import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useCompanySettings, useUpdateCompanySettings } from '../lib/queries/company_settings';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';

const defaults = {
  legal_name: 'PT. Inovasi Langkah Usaha',
  brand_name: 'Ilusa',
  tagline: 'Budget Controlling & Partnership Operations',
  address_line1: '',
  city: 'Yogyakarta',
  country: 'Indonesia',
  email: 'partnership@ilusa.id',
  phone: '',
  website: '',
  bank_name: '',
  bank_account_number: '',
  bank_account_holder: '',
  npwp: '',
  default_payment_terms: 'Please use the invoice number as payment reference and confirm payment to partnership@ilusa.id.',
};

export default function Settings() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const [formData, setFormData] = useState(defaults);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) setFormData({ ...defaults, ...settings });
  }, [settings]);

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    await updateSettings.mutateAsync(formData);
    setMessage('Settings saved.');
    setTimeout(() => setMessage(''), 2500);
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-200" />;
  }

  return (
    <>
      <PageHeader
        title="Company Settings"
        description="Payment and company details used on client invoices"
        action={
          <Button onClick={handleSubmit} disabled={updateSettings.isPending}>
            <Save size={15} className="mr-1.5" />
            Save
          </Button>
        }
      />

      {message && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
          {message}
        </div>
      )}

      <form className="grid gap-5 xl:grid-cols-2" onSubmit={handleSubmit}>
        <Card title="Company Identity" description="Shown in invoice header and footer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Legal Name" value={formData.legal_name || ''} onChange={(e) => setField('legal_name', e.target.value)} />
            <Input label="Brand Name" value={formData.brand_name || ''} onChange={(e) => setField('brand_name', e.target.value)} />
            <Input label="Email" value={formData.email || ''} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Phone" value={formData.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
            <Input label="City" value={formData.city || ''} onChange={(e) => setField('city', e.target.value)} />
            <Input label="Country" value={formData.country || ''} onChange={(e) => setField('country', e.target.value)} />
          </div>
          <div className="mt-4 space-y-4">
            <Input label="Tagline" value={formData.tagline || ''} onChange={(e) => setField('tagline', e.target.value)} />
            <Textarea label="Address" value={formData.address_line1 || ''} onChange={(e) => setField('address_line1', e.target.value)} />
          </div>
        </Card>

        <Card title="Payment Details" description="Used by invoice PDF payment instruction">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Bank Name" value={formData.bank_name || ''} onChange={(e) => setField('bank_name', e.target.value)} />
            <Input label="Account Holder" value={formData.bank_account_holder || ''} onChange={(e) => setField('bank_account_holder', e.target.value)} />
            <Input label="Account Number" value={formData.bank_account_number || ''} onChange={(e) => setField('bank_account_number', e.target.value)} />
            <Input label="NPWP" value={formData.npwp || ''} onChange={(e) => setField('npwp', e.target.value)} />
          </div>
          <div className="mt-4">
            <Textarea
              label="Default Payment Terms"
              value={formData.default_payment_terms || ''}
              onChange={(e) => setField('default_payment_terms', e.target.value)}
            />
          </div>
        </Card>
      </form>
    </>
  );
}
