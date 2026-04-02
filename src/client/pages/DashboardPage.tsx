import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { modelenceQuery } from '@modelence/react-query';
import { Link } from 'react-router-dom';
import AppLayout from '@/client/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import { Select } from '@/client/components/ui/Select';
import { Badge } from '@/client/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/client/components/ui/Tabs';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Plus,
  Calendar,
  Receipt,
  Wallet,
} from 'lucide-react';
import { cn } from '@/client/lib/utils';

type ProfessionalDashboard = {
  totalBilled: number;
  totalIva: number;
  totalRetention: number;
  totalSs: number;
  totalNet: number;
  deductibleIva: number;
  ivaBalance: number;
  quarterIvaAccumulated: number;
  estimatedSs: number;
  ssExempt: boolean;
  ssExemptionEndDate: string | null;
  recentInvoices: Array<{
    _id: string;
    clientName: string;
    baseValue: number;
    status: string;
    issueDate: string;
  }>;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
};

type PersonalDashboard = {
  totalExpenses: number;
  totalIncome: number;
  totalInvestments: number;
  balance: number;
  recentTransactions: Array<{
    _id: string;
    description: string;
    type: string;
    category: string;
    value: number;
    transactionDate: string;
  }>;
  expensesByCategory: Record<string, number>;
};

const months = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const categoryLabels: Record<string, string> = {
  transport: 'Transporte',
  food: 'Alimentacao',
  salary: 'Salario',
  crypto: 'Crypto',
  rent: 'Renda',
  utilities: 'Servicos',
  health: 'Saude',
  entertainment: 'Entretenimento',
  education: 'Educacao',
  other: 'Outros',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });
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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('professional');
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);

  const { data: profData, isLoading: profLoading } = useQuery({
    ...modelenceQuery<ProfessionalDashboard>('accounting.getProfessionalDashboard', {
      period,
      year,
      month: period === 'monthly' ? month : undefined,
      quarter: period === 'quarterly' ? quarter : undefined,
    }),
  });

  const { data: persData, isLoading: persLoading } = useQuery({
    ...modelenceQuery<PersonalDashboard>('accounting.getPersonalDashboard', {
      period: period === 'quarterly' ? 'monthly' : period,
      year,
      month: period !== 'annual' ? month : undefined,
    }),
  });

  const periodLabel = useMemo(() => {
    if (period === 'monthly') {
      return `${months[month - 1]} ${year}`;
    } else if (period === 'quarterly') {
      return `Q${quarter} ${year}`;
    } else {
      return `${year}`;
    }
  }, [period, year, month, quarter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Visao geral das suas financas</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/invoices/new">
              <Button>
                <Plus className="h-4 w-4" />
                Nova Fatura
              </Button>
            </Link>
          </div>
        </div>

        {/* Period selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Periodo:</span>
              </div>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                className="w-36"
              >
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </Select>
              {period === 'monthly' && (
                <Select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-36"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </Select>
              )}
              {period === 'quarterly' && (
                <Select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className="w-24"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </Select>
              )}
              <Select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
              <span className="text-sm text-gray-500">({periodLabel})</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="professional">
              <FileText className="h-4 w-4 mr-2" />
              Profissional
            </TabsTrigger>
            <TabsTrigger value="personal">
              <Wallet className="h-4 w-4 mr-2" />
              Pessoal
            </TabsTrigger>
          </TabsList>

          {/* Professional Dashboard */}
          <TabsContent value="professional">
            {profLoading ? (
              <div className="text-center py-12 text-gray-500">A carregar...</div>
            ) : profData ? (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Faturado</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(profData.totalBilled)}
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Liquido a Receber</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(profData.totalNet)}
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Wallet className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Reservado</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">IVA:</span>
                            <span className="font-medium">{formatCurrency(profData.ivaBalance)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">SS:</span>
                            <span className="font-medium">{formatCurrency(profData.totalSs)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Retencao:</span>
                            <span className="font-medium">{formatCurrency(profData.totalRetention)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Faturas</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-semibold text-green-600">{profData.paidCount} pagas</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-lg font-semibold text-yellow-600">{profData.pendingCount} pend.</span>
                          </div>
                        </div>
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Alerts */}
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between">
                        <span>IVA trimestral acumulado:</span>
                        <span className="font-semibold">{formatCurrency(profData.quarterIvaAccumulated)}</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Retencao na fonte:</span>
                        <span className="font-semibold">{formatCurrency(profData.totalRetention)}</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Estimativa SS futura (mensal):</span>
                        <span className="font-semibold">{formatCurrency(profData.estimatedSs)}</span>
                      </li>
                      {profData.ssExempt && profData.ssExemptionEndDate && (
                        <li className="flex items-center justify-between text-orange-700">
                          <span>Isencao de SS termina em:</span>
                          <span className="font-semibold">
                            {new Date(profData.ssExemptionEndDate).toLocaleDateString('pt-PT', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                {/* Recent invoices */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Ultimas Faturas</CardTitle>
                    <Link to="/invoices">
                      <Button variant="ghost" size="sm">Ver todas</Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {profData.recentInvoices.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Nenhuma fatura encontrada</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Cliente</th>
                              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Valor</th>
                              <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">Estado</th>
                              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profData.recentInvoices.map((inv) => (
                              <tr key={inv._id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-2 text-sm font-medium text-gray-900">{inv.clientName}</td>
                                <td className="py-3 px-2 text-sm text-right">{formatCurrency(inv.baseValue)}</td>
                                <td className="py-3 px-2 text-center">{getStatusBadge(inv.status)}</td>
                                <td className="py-3 px-2 text-sm text-right text-gray-500">{formatDate(inv.issueDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Erro ao carregar dados</div>
            )}
          </TabsContent>

          {/* Personal Dashboard */}
          <TabsContent value="personal">
            {persLoading ? (
              <div className="text-center py-12 text-gray-500">A carregar...</div>
            ) : persData ? (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Gastos</p>
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(persData.totalExpenses)}
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                          <TrendingDown className="h-6 w-6 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Rendimentos</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(persData.totalIncome)}
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Investimentos</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(persData.totalInvestments)}
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cn(
                    persData.balance >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  )}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Saldo</p>
                          <p className={cn(
                            'text-2xl font-bold',
                            persData.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(persData.balance)}
                          </p>
                        </div>
                        <div className={cn(
                          'h-12 w-12 rounded-full flex items-center justify-center text-2xl',
                          persData.balance >= 0 ? 'bg-green-100' : 'bg-red-100'
                        )}>
                          {persData.balance >= 0 ? '🟢' : '🔴'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Expenses by category */}
                {Object.keys(persData.expensesByCategory).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Gastos por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(persData.expensesByCategory)
                          .sort(([, a], [, b]) => b - a)
                          .map(([category, value]) => {
                            const percentage = (value / persData.totalExpenses) * 100;
                            return (
                              <div key={category}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="font-medium">{categoryLabels[category] || category}</span>
                                  <span className="text-gray-600">{formatCurrency(value)} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent transactions */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Ultimas 20 Transacoes</CardTitle>
                    <Link to="/personal">
                      <Button variant="ghost" size="sm">Ver todas</Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {persData.recentTransactions.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Nenhuma transacao encontrada</p>
                    ) : (
                      <div className="space-y-2">
                        {persData.recentTransactions.map((t) => (
                          <div
                            key={t._id}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                t.type === 'income' ? 'bg-green-500' :
                                t.type === 'expense' ? 'bg-red-500' : 'bg-purple-500'
                              )} />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{t.description}</p>
                                <p className="text-xs text-gray-500">
                                  {categoryLabels[t.category] || t.category}
                                </p>
                              </div>
                            </div>
                            <span className={cn(
                              'text-sm font-semibold',
                              t.value >= 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {t.value >= 0 ? '+' : ''}{formatCurrency(t.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Erro ao carregar dados</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}