import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceQuery, modelenceMutation, createQueryKey } from '@modelence/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/client/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/client/components/ui/Card';
import { Button } from '@/client/components/ui/Button';
import { Input } from '@/client/components/ui/Input';
import { Label } from '@/client/components/ui/Label';
import { Select } from '@/client/components/ui/Select';
import {
  Settings,
  Shield,
  Calculator,
  Save,
} from 'lucide-react';

type UserSettings = {
  ssExempt: boolean;
  ssExemptionEndDate: string | null;
  ivaQuarterly: boolean;
  defaultIvaRate: number;
  defaultRetentionRate: number;
};

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    ...modelenceQuery<UserSettings>('accounting.getUserSettings', {}),
  });

  // Form state
  const [ssExempt, setSsExempt] = useState(true);
  const [ssExemptionEndDate, setSsExemptionEndDate] = useState('');
  const [ivaQuarterly, setIvaQuarterly] = useState(true);
  const [defaultIvaRate, setDefaultIvaRate] = useState(23);
  const [defaultRetentionRate, setDefaultRetentionRate] = useState(25);

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setSsExempt(settings.ssExempt);
      setSsExemptionEndDate(
        settings.ssExemptionEndDate
          ? new Date(settings.ssExemptionEndDate).toISOString().split('T')[0]
          : ''
      );
      setIvaQuarterly(settings.ivaQuarterly);
      setDefaultIvaRate(settings.defaultIvaRate);
      setDefaultRetentionRate(settings.defaultRetentionRate);
    }
  }, [settings]);

  const { mutate: updateSettings, isPending: isSaving } = useMutation({
    ...modelenceMutation('accounting.updateUserSettings'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getUserSettings') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getProfessionalDashboard') });
      toast.success('Definicoes guardadas');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateSettings({
      ssExempt,
      ssExemptionEndDate: ssExemptionEndDate || null,
      ivaQuarterly,
      defaultIvaRate,
      defaultRetentionRate,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-gray-500">A carregar...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Definicoes</h1>
          <p className="text-gray-600">Configurar parametros de contabilidade</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Social Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Seguranca Social</CardTitle>
                  <CardDescription>Configuracoes de isencao e contribuicoes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Isento de Seguranca Social</Label>
                  <p className="text-sm text-gray-500">
                    Trabalhadores independentes no primeiro ano de atividade
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ssExempt}
                    onChange={(e) => setSsExempt(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {ssExempt && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="ssExemptionEndDate">Data de fim da isencao</Label>
                  <Input
                    id="ssExemptionEndDate"
                    type="date"
                    value={ssExemptionEndDate}
                    onChange={(e) => setSsExemptionEndDate(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-gray-500">
                    A isencao termina 12 meses apos o inicio da atividade
                  </p>
                </div>
              )}

              {!ssExempt && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Taxa aplicavel:</strong> 21.4% sobre o rendimento relevante
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Impostos</CardTitle>
                  <CardDescription>Configuracoes de IVA e retencao na fonte</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">IVA Trimestral</Label>
                  <p className="text-sm text-gray-500">
                    Entrega de declaracao trimestral de IVA
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ivaQuarterly}
                    onChange={(e) => setIvaQuarterly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultIvaRate">Taxa IVA Padrao</Label>
                  <Select
                    id="defaultIvaRate"
                    value={defaultIvaRate}
                    onChange={(e) => setDefaultIvaRate(Number(e.target.value))}
                  >
                    <option value={0}>0% (Isento)</option>
                    <option value={6}>6% (Reduzida)</option>
                    <option value={13}>13% (Intermedia)</option>
                    <option value={23}>23% (Normal)</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultRetentionRate">Retencao Padrao</Label>
                  <Select
                    id="defaultRetentionRate"
                    value={defaultRetentionRate}
                    onChange={(e) => setDefaultRetentionRate(Number(e.target.value))}
                  >
                    <option value={0}>0% (Sem retencao)</option>
                    <option value={16.5}>16.5%</option>
                    <option value={25}>25%</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Settings className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Sobre as taxas portuguesas</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• <strong>IVA Normal:</strong> 23% (maioria dos servicos)</li>
                    <li>• <strong>IVA Intermedia:</strong> 13% (restauracao, etc.)</li>
                    <li>• <strong>IVA Reduzida:</strong> 6% (produtos essenciais)</li>
                    <li>• <strong>Retencao 25%:</strong> Para prestacoes de servicos</li>
                    <li>• <strong>Retencao 16.5%:</strong> Para algumas categorias</li>
                    <li>• <strong>SS 21.4%:</strong> Taxa para independentes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'A guardar...' : 'Guardar Definicoes'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}