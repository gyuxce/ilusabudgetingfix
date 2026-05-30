import { useState, useMemo } from 'react';
import { Users, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useFreelancers, useCreateFreelancer, useUpdateFreelancer, useDeleteFreelancer } from '../lib/queries/freelancers';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';

export default function Freelancers() {
  const { data: freelancers, isLoading } = useFreelancers();
  const createFreelancer = useCreateFreelancer();
  const updateFreelancer = useUpdateFreelancer();
  const deleteFreelancer = useDeleteFreelancer();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFreelancer, setEditingFreelancer] = useState(null);
  
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    default_hourly_rate: 17000,
    status: 'active'
  });
  const [formError, setFormError] = useState('');

  const filteredFreelancers = useMemo(() => {
    if (!freelancers) return [];
    if (!search) return freelancers;
    const lowerSearch = search.toLowerCase();
    return freelancers.filter(f => 
      f.name.toLowerCase().includes(lowerSearch) || 
      (f.specialization && f.specialization.toLowerCase().includes(lowerSearch))
    );
  }, [freelancers, search]);

  const handleOpenAdd = () => {
    setEditingFreelancer(null);
    setFormData({ name: '', specialization: '', default_hourly_rate: 17000, status: 'active' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (freelancer, e) => {
    e?.stopPropagation();
    setEditingFreelancer(freelancer);
    setFormData({
      name: freelancer.name || '',
      specialization: freelancer.specialization || '',
      default_hourly_rate: freelancer.default_hourly_rate ?? 17000,
      status: freelancer.status || 'active'
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

    const defaultHourlyRate = parseInt(formData.default_hourly_rate, 10);
    if (Number.isNaN(defaultHourlyRate) || defaultHourlyRate < 0) {
      setFormError('Default hourly rate must be zero or greater.');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        specialization: formData.specialization.trim() || null,
        default_hourly_rate: defaultHourlyRate,
        status: formData.status
      };

      if (editingFreelancer) {
        await updateFreelancer.mutateAsync({ id: editingFreelancer.id, ...payload });
      } else {
        await createFreelancer.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteFreelancer.mutateAsync(deleteId);
        setDeleteId(null);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID').format(val || 0);

  const columns = [
    { key: 'name', label: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'specialization', label: 'Specialization', render: (row) => row.specialization || '—' },
    { key: 'default_hourly_rate', label: 'Rate/hour', render: (row) => `Rp ${formatCurrency(row.default_hourly_rate)}` },
    { key: 'status', label: 'Status', render: (row) => (
      <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
        {row.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    )},
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
        title="Freelancers" 
        description="Manage your freelance team"
        action={
          <Button onClick={handleOpenAdd}>
            <Plus size={16} className="mr-1.5" />
            Add Freelancer
          </Button>
        }
      />

      {freelancers?.length === 0 && !search ? (
        <EmptyState 
          icon={Users} 
          title="No freelancers yet" 
          description="Add your first freelancer to get started" 
          action={<Button onClick={handleOpenAdd}>Add Freelancer</Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Search freelancers..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <DataTable 
            columns={columns} 
            rows={filteredFreelancers} 
            onRowClick={(row) => handleOpenEdit(row)}
            emptyMessage="No freelancers match your search"
          />
        </div>
      )}

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingFreelancer ? "Edit Freelancer" : "Add Freelancer"}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={createFreelancer.isPending || updateFreelancer.isPending}>
              {editingFreelancer ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <form id="freelancer-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {formError}
            </div>
          )}
          <Input 
            label="Name" 
            required 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <Input 
            label="Specialization" 
            value={formData.specialization}
            onChange={e => setFormData({...formData, specialization: e.target.value})}
          />
          <Input 
            label="Default Hourly Rate (Rp)" 
            type="number"
            value={formData.default_hourly_rate}
            onChange={e => setFormData({...formData, default_hourly_rate: e.target.value})}
          />
          <Select 
            label="Status" 
            value={formData.status}
            onChange={e => setFormData({...formData, status: e.target.value})}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
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
            <Button variant="danger" onClick={confirmDelete} disabled={deleteFreelancer.isPending}>
              Confirm Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Are you sure you want to delete this freelancer? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
