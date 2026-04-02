import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceQuery, modelenceMutation, createQueryKey } from '@modelence/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/client/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import { Input } from '@/client/components/ui/Input';
import { Label } from '@/client/components/ui/Label';
import { Select } from '@/client/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/client/components/ui/Dialog';
import {
  Plus,
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import { cn } from '@/client/lib/utils';

type Transaction = {
  _id: string;
  description: string;
  type: 'expense' | 'income' | 'investment';
  category: string;
  value: number;
  transactionDate: string;
};

const TYPES = [
  { value: 'expense', label: 'Despesa', color: 'text-red-600', bg: 'bg-red-100' },
  { value: 'income', label: 'Rendimento', color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'investment', label: 'Investimento', color: 'text-purple-600', bg: 'bg-purple-100' },
];

const CATEGORIES = [
  { value: 'transport', label: 'Transporte' },
  { value: 'food', label: 'Alimentacao' },
  { value: 'salary', label: 'Salario' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'rent', label: 'Renda' },
  { value: 'utilities', label: 'Servicos' },
  { value: 'health', label: 'Saude' },
  { value: 'entertainment', label: 'Entretenimento' },
  { value: 'education', label: 'Educacao' },
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

function getTypeInfo(type: string) {
  return TYPES.find(t => t.value === type) || TYPES[0];
}

export default function PersonalPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'investment'>('expense');
  const [category, setCategory] = useState('other');
  const [value, setValue] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: transactions, isLoading } = useQuery({
    ...modelenceQuery<Transaction[]>('accounting.getPersonalTransactions', {
      type: typeFilter || undefined,
      category: categoryFilter || undefined,
      limit: 100,
    }),
  });

  const { mutate: createTransaction, isPending: isCreating } = useMutation({
    ...modelenceMutation('accounting.createPersonalTransaction'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getPersonalTransactions') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getPersonalDashboard') });
      toast.success('Transacao adicionada');
      resetForm();
      setShowDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const { mutate: deleteTransaction, isPending: isDeleting } = useMutation({
    ...modelenceMutation('accounting.deletePersonalTransaction'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getPersonalTransactions') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getPersonalDashboard') });
      toast.success('Transacao eliminada');
      setShowDeleteDialog(false);
      setSelectedTransaction(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setDescription('');
    setType('expense');
    setCategory('other');
    setValue('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description) {
      toast.error('Adicione uma descricao');
      return;
    }

    if (!value || parseFloat(value) <= 0) {
      toast.error('Adicione um valor valido');
      return;
    }

    createTransaction({
      description,
      type,
      category,
      value: parseFloat(value),
      transactionDate,
    });
  };

  const filteredTransactions = transactions?.filter((t) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return t.description.toLowerCase().includes(search);
    }
    return true;
  });

  // Calculate totals
  const totals = filteredTransactions?.reduce(
    (acc, t) => {
      if (t.type === 'income') {
        acc.income += t.value;
      } else if (t.type === 'expense') {
        acc.expenses += Math.abs(t.value);
      } else {
        acc.investments += Math.abs(t.value);
      }
      return acc;
    },
    { income: 0, expenses: 0, investments: 0 }
  ) || { income: 0, expenses: 0, investments: 0 };

  const balance = totals.income - totals.expenses - totals.investments;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financas Pessoais</h1>
            <p className="text-gray-600">Gerir gastos, rendimentos e investimentos</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" />
            Nova Transacao
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rendimentos</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gastos</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totals.expenses)}</p>
                </div>
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Investimentos</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(totals.investments)}</p>
                </div>
                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            balance >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Saldo</p>
                  <p className={cn(
                    'text-xl font-bold',
                    balance >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(balance)}
                  </p>
                </div>
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center text-xl',
                  balance >= 0 ? 'bg-green-100' : 'bg-red-100'
                )}>
                  {balance >= 0 ? '🟢' : '🔴'}
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
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-40"
              >
                <option value="">Todos tipos</option>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-40"
              >
                <option value="">Todas categorias</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions list */}
        <Card>
          <CardHeader>
            <CardTitle>Transacoes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">A carregar...</div>
            ) : !filteredTransactions || filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma transacao encontrada</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowDialog(true)}>
                  Adicionar primeira transacao
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTransactions.map((t) => {
                  const typeInfo = getTypeInfo(t.type);
                  return (
                    <div
                      key={t._id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          typeInfo.bg
                        )}>
                          {t.type === 'income' ? (
                            <TrendingUp className={cn('h-5 w-5', typeInfo.color)} />
                          ) : t.type === 'investment' ? (
                            <Wallet className={cn('h-5 w-5', typeInfo.color)} />
                          ) : (
                            <TrendingDown className={cn('h-5 w-5', typeInfo.color)} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{t.description}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{getCategoryLabel(t.category)}</span>
                            <span>•</span>
                            <span>{formatDate(t.transactionDate)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          'text-lg font-semibold',
                          t.value >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {t.value >= 0 ? '+' : ''}{formatCurrency(t.value)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTransaction(t);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New transaction dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Transacao</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value as 'expense' | 'income' | 'investment')}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                      type === t.value
                        ? `${t.bg} ${t.color} border-current`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Salario, Gasolina, Bitcoin..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Valor *</Label>
                <div className="relative">
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0.00"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    EUR
                  </span>
                </div>
              </div>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionDate">Data</Label>
              <Input
                id="transactionDate"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
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
            <DialogTitle>Eliminar Transacao</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Tem a certeza que deseja eliminar esta transacao?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTransaction && deleteTransaction({ transactionId: selectedTransaction._id })}
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