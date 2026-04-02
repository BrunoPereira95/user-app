import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceQuery, modelenceMutation, createQueryKey } from '@modelence/react-query';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from 'modelence/client';
import toast from 'react-hot-toast';
import AppLayout from '@/client/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import { Input } from '@/client/components/ui/Input';
import { Label } from '@/client/components/ui/Label';
import { Select } from '@/client/components/ui/Select';
import { Textarea } from '@/client/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/client/components/ui/Dialog';
import {
  ArrowLeft,
  Calculator,
  Upload,
  Plus,
} from 'lucide-react';

type Client = {
  _id: string;
  name: string;
  nif?: string;
};

type UserSettings = {
  ssExempt: boolean;
  ssExemptionEndDate: string | null;
  ivaQuarterly: boolean;
  defaultIvaRate: number;
  defaultRetentionRate: number;
};

const SS_RATE = 21.4;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    ...modelenceQuery<Client[]>('accounting.getClients', {}),
  });

  const { data: settings } = useQuery({
    ...modelenceQuery<UserSettings>('accounting.getUserSettings', {}),
  });

  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNif, setNewClientNif] = useState('');

  // Form state
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [baseValue, setBaseValue] = useState('');
  const [ivaRate, setIvaRate] = useState(23);
  const [retentionRate, setRetentionRate] = useState(25);
  const [applySs, setApplySs] = useState(false);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Set defaults from settings
  useEffect(() => {
    if (settings) {
      setIvaRate(settings.defaultIvaRate);
      setRetentionRate(settings.defaultRetentionRate);
    }
  }, [settings]);

  // Calculate values
  const calculations = useMemo(() => {
    const base = parseFloat(baseValue) || 0;
    const ivaValue = base * (ivaRate / 100);
    const totalValue = base + ivaValue;
    const retentionValue = base * (retentionRate / 100);
    const ssExempt = settings?.ssExempt ?? true;
    const ssRate = applySs && !ssExempt ? SS_RATE : 0;
    const ssValue = base * (ssRate / 100);
    const netValue = totalValue - retentionValue - ssValue;

    return {
      ivaValue,
      totalValue,
      retentionValue,
      ssValue,
      ssRate,
      netValue,
    };
  }, [baseValue, ivaRate, retentionRate, applySs, settings]);

  const { mutate: createClient, isPending: isCreatingClient } = useMutation({
    ...modelenceMutation('accounting.createClient'),
    onSuccess: (data) => {
      const result = data as { clientId: string };
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getClients') });
      setClientId(result.clientId);
      setShowNewClientDialog(false);
      setNewClientName('');
      setNewClientNif('');
      toast.success('Cliente criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: createInvoice, isPending: isCreating } = useMutation({
    ...modelenceMutation('accounting.createInvoice'),
    onSuccess: async (data) => {
      const result = data as { invoiceId: string };
      // Upload file if exists
      if (file) {
        try {
          const extension = file.name.split('.').pop();
          const isPdf = file.type === 'application/pdf';
          const { filePath } = await uploadFile(file, {
            filePath: `invoices/${result.invoiceId}.${extension}`,
            contentType: file.type,
            visibility: 'private',
          });

          // Update invoice with document path
          await queryClient.fetchQuery({
            queryKey: ['updateInvoiceDoc'],
            queryFn: async () => {
              const { mutationFn } = modelenceMutation('accounting.updateInvoice');
              return mutationFn({
                invoiceId: result.invoiceId,
                documentPath: filePath,
                documentType: isPdf ? 'pdf' : 'image',
              });
            },
          });
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }

      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getInvoices') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getProfessionalDashboard') });
      toast.success('Fatura criada com sucesso');
      navigate('/invoices');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      toast.error('Selecione um cliente');
      return;
    }

    if (!description) {
      toast.error('Adicione uma descricao');
      return;
    }

    if (!baseValue || parseFloat(baseValue) <= 0) {
      toast.error('Adicione um valor valido');
      return;
    }

    createInvoice({
      clientId,
      invoiceNumber: invoiceNumber || undefined,
      description,
      baseValue: parseFloat(baseValue),
      ivaRate,
      retentionRate,
      applySs,
      issueDate,
      dueDate: dueDate || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const isPdf = selectedFile.type === 'application/pdf';
      const isImage = selectedFile.type.startsWith('image/');

      if (!isPdf && !isImage) {
        toast.error('Apenas ficheiros PDF ou imagens sao permitidos');
        return;
      }

      setFile(selectedFile);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova Fatura</h1>
            <p className="text-gray-600">Criar uma nova fatura</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Fatura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client">Cliente *</Label>
                      <div className="flex gap-2">
                        <Select
                          id="client"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          className="flex-1"
                        >
                          <option value="">Selecionar cliente</option>
                          {clients?.map((client) => (
                            <option key={client._id} value={client._id}>
                              {client.name}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowNewClientDialog(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber">Numero da Fatura</Label>
                      <Input
                        id="invoiceNumber"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="Ex: FT 2026/001"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descricao *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Trabalho de iluminacao para concerto"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueDate">Data de Emissao *</Label>
                      <Input
                        id="issueDate"
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Data de Vencimento</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Valores e Impostos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="baseValue">Valor Base *</Label>
                      <div className="relative">
                        <Input
                          id="baseValue"
                          type="number"
                          step="0.01"
                          min="0"
                          value={baseValue}
                          onChange={(e) => setBaseValue(e.target.value)}
                          placeholder="0.00"
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          EUR
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ivaRate">Taxa IVA</Label>
                      <Select
                        id="ivaRate"
                        value={ivaRate}
                        onChange={(e) => setIvaRate(Number(e.target.value))}
                      >
                        <option value={0}>0% (Isento)</option>
                        <option value={6}>6% (Reduzida)</option>
                        <option value={13}>13% (Intermedia)</option>
                        <option value={23}>23% (Normal)</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retentionRate">Retencao na Fonte</Label>
                      <Select
                        id="retentionRate"
                        value={retentionRate}
                        onChange={(e) => setRetentionRate(Number(e.target.value))}
                      >
                        <option value={0}>0% (Sem retencao)</option>
                        <option value={16.5}>16.5%</option>
                        <option value={25}>25%</option>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applySs}
                          onChange={(e) => setApplySs(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={settings?.ssExempt}
                        />
                        <span>Aplicar Seguranca Social ({SS_RATE}%)</span>
                      </Label>
                      {settings?.ssExempt && (
                        <span className="text-xs text-gray-500">(Atualmente isento)</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFile(null)}
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Anexe a fatura-recibo (PDF ou imagem)
                        </p>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload">
                          <Button type="button" variant="outline" asChild>
                            <span>Selecionar ficheiro</span>
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Simulation sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Simulacao
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor base:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(baseValue) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA ({ivaRate}%):</span>
                      <span className="font-medium">{formatCurrency(calculations.ivaValue)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-600">Total com IVA:</span>
                      <span className="font-semibold">{formatCurrency(calculations.totalValue)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Deducoes</p>
                    <div className="flex justify-between text-red-600">
                      <span>Retencao ({retentionRate}%):</span>
                      <span>-{formatCurrency(calculations.retentionValue)}</span>
                    </div>
                    {calculations.ssValue > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>SS ({calculations.ssRate}%):</span>
                        <span>-{formatCurrency(calculations.ssValue)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Recebes na conta:</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(calculations.netValue)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reservado (Estado)</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>IVA:</span>
                          <span className="font-medium">{formatCurrency(calculations.ivaValue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Retencao:</span>
                          <span className="font-medium">{formatCurrency(calculations.retentionValue)}</span>
                        </div>
                        {calculations.ssValue > 0 && (
                          <div className="flex justify-between">
                            <span>SS:</span>
                            <span className="font-medium">{formatCurrency(calculations.ssValue)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-yellow-300 pt-1 font-semibold">
                          <span>Total:</span>
                          <span>
                            {formatCurrency(
                              calculations.ivaValue + calculations.retentionValue + calculations.ssValue
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating ? 'A guardar...' : 'Guardar Fatura'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      {/* New client dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent onClose={() => setShowNewClientDialog(false)}>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newClientName">Nome *</Label>
              <Input
                id="newClientName"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nome da empresa ou pessoa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newClientNif">NIF</Label>
              <Input
                id="newClientNif"
                value={newClientNif}
                onChange={(e) => setNewClientNif(e.target.value)}
                placeholder="Numero de identificacao fiscal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClientDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createClient({ name: newClientName, nif: newClientNif || undefined })}
              disabled={!newClientName || isCreatingClient}
            >
              {isCreatingClient ? 'A criar...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}