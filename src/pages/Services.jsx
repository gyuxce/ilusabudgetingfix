import { useState, useMemo } from 'react';
import { Package, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../lib/queries/services';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';

export default function Services() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    service_type: 'monthly',
    fee_type: 'fixed'
  });
  const [formError, setFormError] = useState('');

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!search) return services;
    const lowerSearch = search.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(lowerSearch));
  }, [services, search]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({ name: '', service_type: 'monthly', fee_type: 'fixed' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service, e) => {
    e?.stopPropagation();
    setEditingService(service);
    setFormData({
      name: service.name || '',
      service_type: service.service_type || 'monthly',
      fee_type: service.fee_type || 'fixed'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    try {
      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, ...formData });
      } else {
        await createService.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      if (err.message.includes('unique constraint') || err.message.includes('services_name_service_type_key') || err.message.includes('already exists') || err.message.includes('duplicate key value')) {
        setFormError('A service with this name and type already exists. Try different name or type.');
      } else {
        setFormError(err.message);
      }
    }
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteService.mutateAsync(deleteId);
        setDeleteId(null);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'service_type', label: 'Type', render: (row) => (
      <Badge variant={row.service_type === 'monthly' ? 'success' : 'neutral'}>
        {row.service_type === 'monthly' ? 'Monthly' : 'One-time'}
      </Badge>
    )},
    { key: 'fee_type', label: 'Fee Calculation', render: (row) => {
      if (row.fee_type === 'hourly') return <Badge variant="warning">Hourly</Badge>;
      if (row.fee_type === 'per_content') return <Badge variant="warning">Per Content</Badge>;
      return <Badge variant="neutral">Fixed</Badge>;
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Services" 
        description="Catalog of services you offer to clients"
        action={
          <Button onClick={handleOpenAdd}>
            <Plus size={16} className="mr-1.5" />
            Add Service
          </Button>
        }
      />

      {services?.length === 0 && !search ? (
        <EmptyState 
          icon={Package} 
          title="No services yet" 
          description="Add your first service to get started" 
          action={<Button onClick={handleOpenAdd}>Add Service</Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Search services..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <DataTable 
            columns={columns} 
            rows={filteredServices} 
            onRowClick={(row) => handleOpenEdit(row)}
            emptyMessage="No services match your search"
          />
        </div>
      )}

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingService ? "Edit Service" : "Add Service"}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={createService.isPending || updateService.isPending}>
              {editingService ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <form id="service-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {formError}
            </div>
          )}
          <div>
            <Input 
              label="Name" 
              required 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">
              You can have same name with different Service Type (e.g. Digital Marketing/Monthly + Digital Marketing/One-time)
            </p>
          </div>
          <Select 
            label="Service Type" 
            value={formData.service_type}
            onChange={e => setFormData({...formData, service_type: e.target.value})}
            options={[
              { value: 'monthly', label: 'Monthly Service' },
              { value: 'one_time', label: 'One-time Service' }
            ]}
          />
          <Select 
            label="Fee Calculation" 
            value={formData.fee_type}
            onChange={e => setFormData({...formData, fee_type: e.target.value})}
            options={[
              { value: 'fixed', label: 'Fixed Price' },
              { value: 'hourly', label: 'Hourly Rate' },
              { value: 'per_content', label: 'Per Content' }
            ]}
          />
        </form>
      </Modal>

      <Modal 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteService.isPending}>
              Confirm Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete {services?.find(s => s.id === deleteId)?.name}? This may break existing engagements using this service.
        </p>
      </Modal>
    </>
  );
}
