import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceQuery, modelenceMutation, createQueryKey } from '@modelence/react-query';
import { uploadFile } from 'modelence/client';
import toast from 'react-hot-toast';
import AppLayout from '@/client/components/AppLayout';
import { Card, CardContent } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import { Input } from '@/client/components/ui/Input';
import { Label } from '@/client/components/ui/Label';
import { Select } from '@/client/components/ui/Select';
import { Textarea } from '@/client/components/ui/Textarea';
import { Badge } from '@/client/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/client/components/ui/Dialog';
import {
  Plus,
  Search,
  Receipt,
  Trash2,
  Upload,
  Eye,
} from 'lucide-react';

type Expense = {
  _id: string;
  description: string;
  category: string;
  totalValue: number;
  ivaRate: number;
  ivaValue: number;
  netValue: number;
  supplierName?: string;
  supplierNif?: string;
  expenseDate: string;
  documentPath?: string;
  documentUrl?: string;
};

const CATEGORIES = [
  { value: 'transport', label: 'Transporte' },
  { value: 'food', label: 'Alimentacao' },
  { value: 'office', label: 'Material Escritorio' },
  { value: 'equipment', label: 'Equipamento' },
  { value: 'services', label: 'Servicos' },
  { value: 'other', label: 'Outros' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-PT');
}

function getCategoryLabel(category: string): string {
  return CATEGORIES.find(c => c.value === category)?.label || category;
}

function getCategoryBadge(category: string) {
  const colors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
    transport: 'default',
    food: 'warning',
    office: 'secondary',
    equipment: 'success',
    services: 'outline',
    other: 'secondary',
  };
  return <Badge variant={colors[category] || 'secondary'}>{getCategoryLabel(category)}</Badge>;
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [totalValue, setTotalValue] = useState('');
  const [ivaRate, setIvaRate] = useState(23);
  const [supplierName, setSupplierName] = useState('');
  const [supplierNif, setSupplierNif] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);

  const { data: expenses, isLoading } = useQuery({
    ...modelenceQuery<Expense[]>('accounting.getExpenses', {
      category: categoryFilter || undefined,
    }),
  });

  const { mutate: createExpense, isPending: isCreating } = useMutation({
    ...modelenceMutation('accounting.createExpense'),
    onSuccess: async (data) => {
      const result = data as { expenseId: string; ivaValue: number };
      // Upload file if exists
      if (file) {
        try {
          const extension = file.name.split('.').pop();
          const isPdf = file.type === 'application/pdf';
          const { filePath } = await uploadFile(file, {
            filePath: `expenses/${result.expenseId}.${extension}`,
            contentType: file.type,
            visibility: 'private',
          });

          await queryClient.fetchQuery({
            queryKey: ['updateExpenseDoc'],
            queryFn: async () => {
              const { mutationFn } = modelenceMutation('accounting.updateExpense');
              return mutationFn({
                expenseId: result.expenseId,
                documentPath: filePath,
                documentType: isPdf ? 'pdf' : 'image',
              });
            },
          });
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }

      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getExpenses') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getProfessionalDashboard') });
      toast.success(`Despesa adicionada (IVA dedutivel: ${formatCurrency(result.ivaValue)})`);
      resetForm();
      setShowNewDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: deleteExpense, isPending: isDeleting } = useMutation({
    ...modelenceMutation('accounting.deleteExpense'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getExpenses') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getProfessionalDashboard') });
      toast.success('Despesa eliminada');
      setShowDeleteDialog(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: updateExpense } = useMutation({
    ...modelenceMutation('accounting.updateExpense'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getExpenses') });
      toast.success('Documento adicionado');
      setShowUploadDialog(false);
      setSelectedExpense(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setDescription('');
    setCategory('other');
    setTotalValue('');
    setIvaRate(23);
    setSupplierName('');
    setSupplierNif('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setFile(null);
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

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedExpense) return;

    const uploadedFile = e.target.files[0];
    const isPdf = uploadedFile.type === 'application/pdf';
    const isImage = uploadedFile.type.startsWith('image/');

    if (!isPdf && !isImage) {
      toast.error('Apenas ficheiros PDF ou imagens sao permitidos');
      return;
    }

    setUploading(true);
    try {
      const extension = uploadedFile.name.split('.').pop();
      const { filePath } = await uploadFile(uploadedFile, {
        filePath: `expenses/${selectedExpense._id}.${extension}`,
        contentType: uploadedFile.type,
        visibility: 'private',
      });

      updateExpense({
        expenseId: selectedExpense._id,
        documentPath: filePath,
        documentType: isPdf ? 'pdf' : 'image',
      });
    } catch (error) {
      toast.error('Erro ao fazer upload do ficheiro');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = (expense: Expense) => {
    if (expense.documentUrl) {
      window.open(expense.documentUrl, '_blank');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description) {
      toast.error('Adicione uma descricao');
      return;
    }

    if (!totalValue || parseFloat(totalValue) <= 0) {
      toast.error('Adicione um valor valido');
      return;
    }

    createExpense({
      description,
      category,
      totalValue: parseFloat(totalValue),
      ivaRate,
      supplierName: supplierName || undefined,
      supplierNif: supplierNif || undefined,
      expenseDate,
    });
  };

  // Calculate IVA preview
  const calculateIva = () => {
    const total = parseFloat(totalValue) || 0;
    const netValue = total / (1 + ivaRate / 100);
    const ivaValue = total - netValue;
    return { netValue, ivaValue };
  };

  const ivaPreview = calculateIva();

  const filteredExpenses = expenses?.filter((exp) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        exp.description.toLowerCase().includes(search) ||
        (exp.supplierName && exp.supplierName.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Calculate totals
  const totals = filteredExpenses?.reduce(
    (acc, exp) => ({
      total: acc.total + exp.totalValue,
      iva: acc.iva + exp.ivaValue,
    }),
    { total: 0, iva: 0 }
  ) || { total: 0, iva: 0 };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Despesas IVA</h1>
            <p className="text-gray-600">Gerir despesas para deducao de IVA</p>
          </div>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Despesas</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">IVA Dedutivel</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.iva)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pesquisar por descricao, fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-48"
              >
                <option value="">Todas categorias</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses list */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">A carregar...</div>
            ) : !filteredExpenses || filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma despesa encontrada</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowNewDialog(true)}>
                  Adicionar primeira despesa
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Descricao</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden md:table-cell">Fornecedor</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Categoria</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 hidden lg:table-cell">IVA Dedutivel</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 hidden sm:table-cell">Data</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => (
                      <tr key={exp._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{exp.description}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">
                          {exp.supplierName || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getCategoryBadge(exp.category)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {formatCurrency(exp.totalValue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-green-600 font-medium hidden lg:table-cell">
                          {formatCurrency(exp.ivaValue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-500 hidden sm:table-cell">
                          {formatDate(exp.expenseDate)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {exp.documentPath ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDocument(exp)}
                                title="Ver documento"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedExpense(exp);
                                  setShowUploadDialog(true);
                                }}
                                title="Adicionar documento"
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpense(exp);
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

      {/* New expense dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent onClose={() => setShowNewDialog(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descricao *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Gasolina para deslocacao"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Data</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalValue">Valor Total (com IVA) *</Label>
                <div className="relative">
                  <Input
                    id="totalValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    placeholder="0.00"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
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
            </div>

            {totalValue && ivaRate > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA dedutivel:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(ivaPreview.ivaValue)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierName">Fornecedor</Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierNif">NIF Fornecedor</Label>
                <Input
                  id="supplierNif"
                  value={supplierNif}
                  onChange={(e) => setSupplierNif(e.target.value)}
                  placeholder="NIF"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documento (opcional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-600">{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 mb-2">Fatura da despesa (PDF/imagem)</p>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="expense-file-upload"
                    />
                    <label htmlFor="expense-file-upload">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Selecionar</span>
                      </Button>
                    </label>
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'A guardar...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClose={() => setShowDeleteDialog(false)}>
          <DialogHeader>
            <DialogTitle>Eliminar Despesa</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Tem a certeza que deseja eliminar esta despesa?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedExpense && deleteExpense({ expenseId: selectedExpense._id })}
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
            Faca upload do PDF ou imagem da fatura.
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleUploadDocument}
              className="hidden"
              id="upload-doc"
              disabled={uploading}
            />
            <label htmlFor="upload-doc">
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