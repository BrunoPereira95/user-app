import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceQuery, modelenceMutation, createQueryKey } from '@modelence/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/client/components/AppLayout';
import { Card, CardContent } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import { Input } from '@/client/components/ui/Input';
import { Label } from '@/client/components/ui/Label';
import { Textarea } from '@/client/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/client/components/ui/Dialog';
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

type Client = {
  _id: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const { data: clients, isLoading } = useQuery({
    ...modelenceQuery<Client[]>('accounting.getClients', {}),
  });

  const { mutate: createClient, isPending: isCreating } = useMutation({
    ...modelenceMutation('accounting.createClient'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getClients') });
      toast.success('Cliente criado com sucesso');
      resetForm();
      setShowDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: updateClient, isPending: isUpdating } = useMutation({
    ...modelenceMutation('accounting.updateClient'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getClients') });
      toast.success('Cliente atualizado');
      resetForm();
      setShowDialog(false);
      setEditingClient(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: deleteClient, isPending: isDeleting } = useMutation({
    ...modelenceMutation('accounting.deleteClient'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getClients') });
      toast.success('Cliente eliminado');
      setShowDeleteDialog(false);
      setSelectedClient(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setName('');
    setNif('');
    setEmail('');
    setPhone('');
    setAddress('');
    setNotes('');
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setNif(client.nif || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('O nome e obrigatorio');
      return;
    }

    const data = {
      name,
      nif: nif || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      notes: notes || undefined,
    };

    if (editingClient) {
      updateClient({ clientId: editingClient._id, ...data });
    } else {
      createClient(data);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingClient(null);
    resetForm();
  };

  const filteredClients = clients?.filter((client) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        client.name.toLowerCase().includes(search) ||
        (client.nif && client.nif.includes(search)) ||
        (client.email && client.email.toLowerCase().includes(search))
      );
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600">Gerir clientes e entidades</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar por nome, NIF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Clients grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">A carregar...</div>
        ) : !filteredClients || filteredClients.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum cliente encontrado</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowDialog(true)}>
                  Adicionar primeiro cliente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Card key={client._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                        {client.nif && (
                          <p className="text-sm text-gray-500">NIF: {client.nif}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedClient(client);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                  </div>

                  {client.notes && (
                    <p className="mt-3 text-xs text-gray-500 line-clamp-2">{client.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent onClose={handleCloseDialog} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da empresa ou pessoa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nif">NIF</Label>
                <Input
                  id="nif"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="Numero de identificacao fiscal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 XXX XXX XXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Morada</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Morada completa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionais sobre o cliente"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? 'A guardar...' : editingClient ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClose={() => setShowDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Tem a certeza que deseja eliminar o cliente <strong>{selectedClient?.name}</strong>?
            Esta acao nao pode ser revertida.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedClient && deleteClient({ clientId: selectedClient._id })}
              disabled={isDeleting}
            >
              {isDeleting ? 'A eliminar...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}