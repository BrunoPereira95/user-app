import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceQuery, modelenceMutation, createQueryKey } from '@modelence/react-query';
import { Link } from 'react-router-dom';
import { uploadFile } from 'modelence/client';
import toast from 'react-hot-toast';
import AppLayout from '@/client/components/AppLayout';
import { Card, CardContent } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import { Input } from '@/client/components/ui/Input';
import { Select } from '@/client/components/ui/Select';
import { Badge } from '@/client/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/client/components/ui/Dialog';
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  CheckCircle,
  Upload,
  Eye,
} from 'lucide-react';

type Invoice = {
  _id: string;
  clientId: string;
  clientName: string;
  invoiceNumber?: string;
  description: string;
  baseValue: number;
  ivaRate: number;
  ivaValue: number;
  retentionRate: number;
  retentionValue: number;
  ssRate: number;
  ssValue: number;
  totalValue: number;
  netValue: number;
  status: string;
  issueDate: string;
  dueDate?: string;
  paidDate?: string;
  documentPath?: string;
  documentUrl?: string;
};

type Client = {
  _id: string;
  name: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-PT');
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant="success">Paga</Badge>;
    case 'pending':
      return <Badge variant="warning">Pendente</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Atrasada</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Cancelada</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    ...modelenceQuery<Invoice[]>('accounting.getInvoices', {
      status: statusFilter || undefined,
      clientId: clientFilter || undefined,
    }),
  });

  const { data: clients } = useQuery({
    ...modelenceQuery<Client[]>('accounting.getClients', {}),
  });

  const { mutate: markPaid, isPending: isMarkingPaid } = useMutation({
    ...modelenceMutation('accounting.markInvoicePaid'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getInvoices') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getProfessionalDashboard') });
      toast.success('Fatura marcada como paga');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: deleteInvoice, isPending: isDeleting } = useMutation({
    ...modelenceMutation('accounting.deleteInvoice'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getInvoices') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getProfessionalDashboard') });
      toast.success('Fatura eliminada');
      setShowDeleteDialog(false);
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: updateInvoice } = useMutation({
    ...modelenceMutation('accounting.updateInvoice'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getInvoices') });
      toast.success('Documento adicionado');
      setShowUploadDialog(false);
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedInvoice) return;

    const file = e.target.files[0];
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      toast.error('Apenas ficheiros PDF ou imagens sao permitidos');
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split('.').pop();
      const { filePath } = await uploadFile(file, {
        filePath: `invoices/${selectedInvoice._id}.${extension}`,
        contentType: file.type,
        visibility: 'private',
      });

      updateInvoice({
        invoiceId: selectedInvoice._id,
        documentPath: filePath,
        documentType: isPdf ? 'pdf' : 'image',
      });
    } catch (error) {
      toast.error('Erro ao fazer upload do ficheiro');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (invoice: Invoice) => {
    if (invoice.documentUrl) {
      window.open(invoice.documentUrl, '_blank');
    }
  };

  const filteredInvoices = invoices?.filter((inv) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        inv.clientName.toLowerCase().includes(search) ||
        inv.description.toLowerCase().includes(search) ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(search))
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
            <h1 className="text-2xl font-bold text-gray-900">Faturas</h1>
            <p className="text-gray-600">Gerir faturas emitidas</p>
          </div>
          <Link to="/invoices/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nova Fatura
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pesquisar por cliente, descricao..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <option value="">Todos estados</option>
                <option value="pending">Pendente</option>
                <option value="paid">Paga</option>
                <option value="overdue">Atrasada</option>
                <option value="cancelled">Cancelada</option>
              </Select>
              <Select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-48"
              >
                <option value="">Todos clientes</option>
                {clients?.map((client) => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices list */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">A carregar...</div>
            ) : !filteredInvoices || filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma fatura encontrada</p>
                <Link to="/invoices/new" className="mt-4 inline-block">
                  <Button variant="outline">Criar primeira fatura</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cliente</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden md:table-cell">Descricao</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor Base</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 hidden lg:table-cell">Liquido</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Estado</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 hidden sm:table-cell">Data</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{inv.clientName}</div>
                          {inv.invoiceNumber && (
                            <div className="text-xs text-gray-500">#{inv.invoiceNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                          {inv.description}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {formatCurrency(inv.baseValue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-green-600 font-medium hidden lg:table-cell">
                          {formatCurrency(inv.netValue)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(inv.status)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-500 hidden sm:table-cell">
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {inv.documentPath ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDocument(inv)}
                                title="Ver documento"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setShowUploadDialog(true);
                                }}
                                title="Adicionar documento"
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            )}
                            {inv.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markPaid({ invoiceId: inv._id })}
                                disabled={isMarkingPaid}
                                title="Marcar como paga"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Link to={`/invoices/${inv._id}/edit`}>
                              <Button variant="ghost" size="icon" title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowDeleteDialog(true);
                              }}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClose={() => setShowDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Eliminar Fatura</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Tem a certeza que deseja eliminar esta fatura de <strong>{selectedInvoice?.clientName}</strong>?
            Esta acao nao pode ser revertida.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedInvoice && deleteInvoice({ invoiceId: selectedInvoice._id })}
              disabled={isDeleting}
            >
              {isDeleting ? 'A eliminar...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload document dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent onClose={() => setShowUploadDialog(false)}>
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 mb-4">
            Faca upload do PDF ou imagem da fatura-recibo.
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Arraste um ficheiro ou clique para selecionar
            </p>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label htmlFor="file-upload">
              <Button variant="outline" asChild disabled={uploading}>
                <span>{uploading ? 'A fazer upload...' : 'Selecionar ficheiro'}</span>
              </Button>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}