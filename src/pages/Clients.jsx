import { useState, useMemo } from 'react';
import { Building2, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '../lib/queries/clients';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '',
    pic_name: '',
    phone_number: '',
    location: '',
    status: 'active',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!search) return clients;
    const lowerSearch = search.toLowerCase();
    return clients.filter(c => 
      c.company_name.toLowerCase().includes(lowerSearch) || 
      (c.pic_name && c.pic_name.toLowerCase().includes(lowerSearch))
    );
  }, [clients, search]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({ company_name: '', pic_name: '', phone_number: '', location: '', status: 'active', notes: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client, e) => {
    e?.stopPropagation();
    setEditingClient(client);
    setFormData({
      company_name: client.company_name || '',
      pic_name: client.pic_name || '',
      phone_number: client.phone_number || '',
      location: client.location || '',
      status: client.status || 'active',
      notes: client.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.company_name.trim()) {
      setFormError('Company name is required');
      return;
    }

    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, ...formData });
      } else {
        await createClient.mutateAsync(formData);
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
        await deleteClient.mutateAsync(deleteId);
        setDeleteId(null);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const columns = [
    { key: 'company_name', label: 'Company', render: (row) => <span className="font-medium text-gray-900">{row.company_name}</span> },
    { key: 'pic_name', label: 'PIC', render: (row) => row.pic_name || '—' },
    { key: 'location', label: 'Location', render: (row) => row.location || '—' },
    { key: 'phone_number', label: 'Phone', render: (row) => row.phone_number || '—' },
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
        title="Clients" 
        description="Manage all your client companies"
        action={
          <Button onClick={handleOpenAdd}>
            <Plus size={16} className="mr-1.5" />
            Add Client
          </Button>
        }
      />

      {clients?.length === 0 && !search ? (
        <EmptyState 
          icon={Building2} 
          title="No clients yet" 
          description="Add your first client to get started" 
          action={<Button onClick={handleOpenAdd}>Add Client</Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Search clients..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <DataTable 
            columns={columns} 
            rows={filteredClients} 
            onRowClick={(row) => handleOpenEdit(row)}
            emptyMessage="No clients match your search"
          />
        </div>
      )}

      <Modal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? "Edit Client" : "Add Client"}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={createClient.isPending || updateClient.isPending}>
              {editingClient ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <form id="client-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {formError}
            </div>
          )}
          <Input 
            label="Company Name" 
            required 
            value={formData.company_name}
            onChange={e => setFormData({...formData, company_name: e.target.value})}
          />
          <Input 
            label="PIC Name" 
            value={formData.pic_name}
            onChange={e => setFormData({...formData, pic_name: e.target.value})}
          />
          <Input 
            label="Phone Number" 
            value={formData.phone_number}
            onChange={e => setFormData({...formData, phone_number: e.target.value})}
          />
          <Input 
            label="Location" 
            value={formData.location}
            onChange={e => setFormData({...formData, location: e.target.value})}
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
          <Textarea 
            label="Notes" 
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
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
            <Button variant="danger" onClick={confirmDelete} disabled={deleteClient.isPending}>
              Confirm Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Are you sure you want to delete this client? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
