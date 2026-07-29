import { useState, useMemo } from 'react';
import { Briefcase, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useEngagements, useCreateEngagement, useCreateEngagementsBulk, useUpdateEngagement, useDeleteEngagement } from '../lib/queries/engagements';
import { useClients } from '../lib/queries/clients';
import { useServices } from '../lib/queries/services';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';

export default function Engagements() {
  const navigate = useNavigate();
  const { data: engagements, isLoading: engagementsLoading } = useEngagements();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: services, isLoading: servicesLoading } = useServices();

  const createEngagement = useCreateEngagement();
  const createEngagementsBulk = useCreateEngagementsBulk();
  const updateEngagement = useUpdateEngagement();
  const deleteEngagement = useDeleteEngagement();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    service_fee_per_month: 0,
    selected_service_ids: [],
    service_fees: {},
    start_date: format(new Date(), 'yyyy-MM-dd'),
    finish_date: '',
    status: 'ongoing',
    qtn_url: '',
    report_url: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // Filters logic
  const filteredEngagements = useMemo(() => {
    if (!engagements) return [];
    let filtered = engagements;

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(eng => 
        eng.client?.company_name?.toLowerCase().includes(lowerSearch) ||
        eng.service?.name?.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(eng => eng.status === filterStatus);
    }

    if (filterClient && filterClient !== 'all') {
      filtered = filtered.filter(eng => eng.client_id === filterClient);
    }

    return filtered;
  }, [engagements, search, filterStatus, filterClient]);

  const handleOpenAdd = () => {
    if (clients?.length === 0) {
      setIsErrorModalOpen(true);
      return;
    }
    
    setEditingEngagement(null);
    setFormData({
      client_id: clients?.[0]?.id || '',
      service_id: '',
      service_fee_per_month: 0,
      selected_service_ids: [],
      service_fees: {},
      start_date: format(new Date(), 'yyyy-MM-dd'),
      finish_date: '',
      status: 'ongoing',
      qtn_url: '',
      report_url: '',
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (eng, e) => {
    e?.stopPropagation();
    setEditingEngagement(eng);
    setFormData({
      client_id: eng.client_id || '',
      service_id: eng.service_id || '',
      service_fee_per_month: eng.service_fee_per_month || 0,
      selected_service_ids: [eng.service_id].filter(Boolean),
      service_fees: { [eng.service_id]: eng.service_fee_per_month || 0 },
      start_date: eng.start_date || format(new Date(), 'yyyy-MM-dd'),
      finish_date: eng.finish_date || '',
      status: eng.status || 'ongoing',
      qtn_url: eng.qtn_url || '',
      report_url: eng.report_url || '',
      notes: eng.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const selectedServiceIds = editingEngagement ? [formData.service_id].filter(Boolean) : formData.selected_service_ids;
    if (!formData.client_id || selectedServiceIds.length === 0 || !formData.start_date || !formData.status) {
      setFormError('Please fill out all required fields.');
      return;
    }

    const fees = selectedServiceIds.map((serviceId) => ({
      serviceId,
      fee: parseInt(editingEngagement ? formData.service_fee_per_month : formData.service_fees[serviceId], 10),
    }));
    if (fees.some(({ fee }) => Number.isNaN(fee) || fee < 0)) {
      setFormError('Nominal service harus nol atau angka positif.');
      return;
    }

    if (formData.finish_date && new Date(formData.finish_date) < new Date(formData.start_date)) {
      setFormError('Finish date cannot be before start date.');
      return;
    }

    try {
      if (editingEngagement) {
        const payload = {
          client_id: formData.client_id,
          service_id: formData.service_id,
          service_fee_per_month: fees[0].fee,
          start_date: formData.start_date,
          finish_date: formData.finish_date || null,
          status: formData.status,
          qtn_url: formData.qtn_url,
          report_url: formData.report_url,
          notes: formData.notes,
        };
        await updateEngagement.mutateAsync({ id: editingEngagement.id, ...payload });
      } else {
        const payloads = fees.map(({ serviceId, fee }) => ({
          client_id: formData.client_id,
          service_id: serviceId,
          service_fee_per_month: fee,
          start_date: formData.start_date,
          finish_date: formData.finish_date || null,
          status: formData.status,
          qtn_url: formData.qtn_url,
          report_url: formData.report_url,
          notes: formData.notes,
        }));
        if (payloads.length === 1) {
          await createEngagement.mutateAsync(payloads[0]);
        } else {
          await createEngagementsBulk.mutateAsync(payloads);
        }
      }
      
      setIsModalOpen(false);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 2000);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteEngagement.mutateAsync(deleteId);
        setDeleteId(null);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const columns = [
    { key: 'client', label: 'Client', render: (row) => <span className="font-medium text-gray-900">{row.client?.company_name || '—'}</span> },
    { key: 'service', label: 'Service', render: (row) => <span className="text-gray-700">{row.service?.name || '—'}</span> },
    { key: 'type', label: 'Type', render: (row) => (
      row.service ? (
        <Badge variant={row.service.service_type === 'monthly' ? 'success' : 'neutral'}>
          {row.service.service_type === 'monthly' ? 'Monthly' : 'One-time'}
        </Badge>
      ) : '—'
    )},
    { key: 'fee', label: 'Fee/Month', render: (row) => row.service_fee_per_month > 0 ? `Rp ${formatCurrency(row.service_fee_per_month)}` : '—' },
    { key: 'start', label: 'Start', render: (row) => row.start_date ? format(new Date(row.start_date), 'dd MMM yyyy') : '—' },
    { key: 'status', label: 'Status', render: (row) => {
      if (row.status === 'ongoing') return <Badge variant="success">Ongoing</Badge>;
      if (row.status === 'hold') return <Badge variant="warning">On Hold</Badge>;
      return <Badge variant="neutral">Finished</Badge>;
    }},
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={(e) => handleOpenEdit(row, e)}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={(e) => handleDelete(row.id, e)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
          <Trash2 size={14} />
        </Button>
      </div>
    )}
  ];

  if (engagementsLoading || clientsLoading || servicesLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-48"></div>
          <div className="h-10 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  const selectedServiceObj = services?.find(s => s.id === formData.service_id);
  const toggleService = (serviceId) => {
    setFormData((previous) => {
      const selected = previous.selected_service_ids.includes(serviceId);
      return {
        ...previous,
        selected_service_ids: selected
          ? previous.selected_service_ids.filter((id) => id !== serviceId)
          : [...previous.selected_service_ids, serviceId],
        service_fees: selected
          ? Object.fromEntries(Object.entries(previous.service_fees).filter(([id]) => id !== serviceId))
          : { ...previous.service_fees, [serviceId]: 0 },
      };
    });
  };

  return (
    <>
      <PageHeader 
        title="Engagements" 
        description="Active and past client service contracts"
        action={
          <Button onClick={handleOpenAdd}>
            <Plus size={16} className="mr-1.5" />
            New Engagement
          </Button>
        }
      />

      {engagements?.length === 0 && !search && filterStatus === 'all' && filterClient === 'all' ? (
        <EmptyState 
          icon={Briefcase} 
          title="No engagements yet" 
          description="Create your first engagement to start tracking work for clients" 
          action={<Button onClick={handleOpenAdd}>New Engagement</Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="max-w-xs w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <Select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'ongoing', label: 'Ongoing' },
                { value: 'finished', label: 'Finished' },
                { value: 'hold', label: 'On Hold' }
              ]}
              className="w-48"
            />
            <Select 
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              options={[
                { value: 'all', label: 'All clients' },
                ...(clients?.map(c => ({ value: c.id, label: c.company_name })) || [])
              ]}
              className="w-56"
            />
          </div>

          {engagements && (
            <p className="text-xs text-gray-500 mb-2 block">
              Showing {filteredEngagements.length} of {engagements.length} entries
            </p>
          )}

          <DataTable 
            columns={columns} 
            rows={filteredEngagements} 
            onRowClick={(row) => handleOpenEdit(row)}
            emptyMessage="No engagements match your filters"
          />
        </div>
      )}

      {/* ERROR MODAL (No Clients) */}
      <Modal 
        open={isErrorModalOpen} 
        onClose={() => setIsErrorModalOpen(false)}
        title="Add a client first"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsErrorModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setIsErrorModalOpen(false);
              navigate('/clients');
            }}>
              Go to Clients
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">You need at least one client before creating an engagement.</p>
      </Modal>

      {/* CREATE/EDIT MODAL */}
      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingEngagement ? "Edit Engagement" : "Add Engagement"}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={createEngagement.isPending || createEngagementsBulk.isPending || updateEngagement.isPending}>
              {editingEngagement ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <form id="engagement-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {formError}
            </div>
          )}

          <div className="w-full">
            <Select 
              label="Client *" 
              required
              value={formData.client_id}
              onChange={e => setFormData({...formData, client_id: e.target.value})}
              options={[
                { value: '', label: 'Select client...' },
                ...(clients?.map(c => ({ value: c.id, label: c.company_name })) || [])
              ]}
            />
          </div>

          {editingEngagement ? (
            <>
              <div className="w-full">
                <Select
                  label="Service *"
                  required
                  value={formData.service_id}
                  onChange={e => setFormData({ ...formData, service_id: e.target.value })}
                  options={[
                    { value: '', label: 'Select service...' },
                    ...(services?.map(s => ({ value: s.id, label: `${s.name} (${s.service_type === 'monthly' ? 'Monthly' : 'One-time'})` })) || [])
                  ]}
                />
              </div>
              <CurrencyInput
                label={selectedServiceObj?.service_type === 'one_time' ? 'Service Fee *' : 'Service Fee per Month *'}
                min="0"
                required
                value={formData.service_fee_per_month}
                onChange={e => setFormData({ ...formData, service_fee_per_month: e.target.value })}
              />
            </>
          ) : (
            <div className="w-full">
              <p className="block text-sm font-medium text-gray-700 mb-1.5">Service * <span className="text-red-500">(pilih satu atau beberapa)</span></p>
              <div className="space-y-2 rounded-md border border-gray-300 bg-gray-50 p-3 max-h-56 overflow-y-auto">
                {(services || []).map((service) => {
                  const checked = formData.selected_service_ids.includes(service.id);
                  return (
                    <div key={service.id} className="rounded-md border border-gray-200 bg-white p-2.5">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleService(service.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{service.name}</span>
                        <span className="text-xs text-gray-500">({service.service_type === 'monthly' ? 'Monthly' : 'One-time'})</span>
                      </label>
                      {checked && (
                        <CurrencyInput
                          className="mt-2"
                          label={service.service_type === 'one_time' ? 'Nominal service' : 'Nominal per bulan'}
                          min="0"
                          required
                          value={formData.service_fees[service.id] ?? 0}
                          onChange={(event) => setFormData((previous) => ({
                            ...previous,
                            service_fees: { ...previous.service_fees, [service.id]: event.target.value },
                          }))}
                        />
                      )}
                    </div>
                  );
                })}
                {services?.length === 0 && <p className="text-sm text-gray-500">Belum ada service. Tambahkan service terlebih dahulu.</p>}
              </div>
              <p className="text-xs text-gray-500 mt-1">Setiap service yang dicentang akan dibuat sebagai satu project untuk client yang sama.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Start Date *" 
              type="date"
              required
              value={formData.start_date}
              onChange={e => setFormData({...formData, start_date: e.target.value})}
            />
            <div>
              <Input 
                label="Finish Date" 
                type="date"
                value={formData.finish_date}
                onChange={e => setFormData({...formData, finish_date: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty if ongoing</p>
            </div>
          </div>

          <div className="w-full">
            <Select 
              label="Status *" 
              required
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              options={[
                { value: 'ongoing', label: 'Ongoing' },
                { value: 'finished', label: 'Finished' },
                { value: 'hold', label: 'On Hold' }
              ]}
            />
          </div>

          <div className="w-full">
            <Input 
              label="QTN URL" 
              type="url"
              placeholder="https://docs.google.com/..."
              value={formData.qtn_url}
              onChange={e => setFormData({...formData, qtn_url: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">Link to Google Docs quotation</p>
          </div>

          <div className="w-full">
            <Input 
              label="Report URL" 
              type="url"
              placeholder="https://..."
              value={formData.report_url}
              onChange={e => setFormData({...formData, report_url: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">Link to final report (if applicable)</p>
          </div>

          <div className="w-full">
            <Textarea 
              label="Notes" 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteEngagement.isPending}>
              Delete Engagement
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete engagement {
            (() => {
              const eng = engagements?.find(e => e.id === deleteId);
              if (!eng) return '';
              return <strong>{eng.client?.company_name} - {eng.service?.name}</strong>;
            })()
          }? All related invoices and freelancer fees will also be deleted (cascade). This cannot be undone.
        </p>
      </Modal>
      
      {/* Toast */}
      {successToast && (
        <div className="fixed bottom-4 right-4 bg-gray-950 text-white px-4 py-3 rounded-md shadow-lg text-sm font-medium animate-bounce z-50">
          Engagement saved successfully!
        </div>
      )}
    </>
  );
}
