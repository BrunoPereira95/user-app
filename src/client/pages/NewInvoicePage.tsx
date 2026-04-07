import { supabase } from "../lib/supabase"
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
import { ArrowLeft, Calculator, Upload, Plus } from 'lucide-react';

type Client = { _id: string; name: string; nif?: string };
type UserSettings = { ssExempt: boolean; ssExemptionEndDate: string | null; ivaQuarterly: boolean; defaultIvaRate: number; defaultRetentionRate: number; };
const SS_RATE = 21.4;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

// Teste da ligação à tabela
async function testConnection() {
  const { data, error } = await supabase.from("invoices").select("*");
  console.log("DATA:", data);
  console.log("ERROR:", error);
}
testConnection();

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({ ...modelenceQuery<Client[]>('accounting.getClients', {}) });
  const { data: settings } = useQuery({ ...modelenceQuery<UserSettings>('accounting.getUserSettings', {}) });

  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNif, setNewClientNif] = useState('');

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

  useEffect(() => { if (settings) { setIvaRate(settings.defaultIvaRate); setRetentionRate(settings.defaultRetentionRate); } }, [settings]);

  const calculations = useMemo(() => {
    const base = parseFloat(baseValue) || 0;
    const ivaValue = base * (ivaRate / 100);
    const totalValue = base + ivaValue;
    const retentionValue = base * (retentionRate / 100);
    const ssExempt = settings?.ssExempt ?? true;
    const ssRate = applySs && !ssExempt ? SS_RATE : 0;
    const ssValue = base * (ssRate / 100);
    const netValue = totalValue - retentionValue - ssValue;
    return { ivaValue, totalValue, retentionValue, ssValue, ssRate, netValue };
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
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: createInvoice, isPending: isCreating } = useMutation({
    ...modelenceMutation('accounting.createInvoice'),
    onSuccess: async (data) => {
      const result = data as { invoiceId: string };
      if (file) {
        try {
          const extension = file.name.split('.').pop();
          const isPdf = file.type === 'application/pdf';
          const { filePath } = await uploadFile(file, { filePath: `invoices/${result.invoiceId}.${extension}`, contentType: file.type, visibility: 'private' });
          await queryClient.fetchQuery({
            queryKey: ['updateInvoiceDoc'],
            queryFn: async () => {
              const { mutationFn } = modelenceMutation('accounting.updateInvoice');
              return mutationFn({ invoiceId: result.invoiceId, documentPath: filePath, documentType: isPdf ? 'pdf' : 'image' });
            },
          });
        } catch (error) { console.error('Error uploading file:', error); }
      }
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getInvoices') });
      queryClient.invalidateQueries({ queryKey: createQueryKey('accounting.getProfessionalDashboard') });
      toast.success('Fatura criada com sucesso');
      navigate('/invoices');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return toast.error('Selecione um cliente');
    if (!description) return toast.error('Adicione uma descricao');
    if (!baseValue || parseFloat(baseValue) <= 0) return toast.error('Adicione um valor valido');
    createInvoice({ clientId, invoiceNumber: invoiceNumber || undefined, description, baseValue: parseFloat(baseValue), ivaRate, retentionRate, applySs, issueDate, dueDate: dueDate || undefined });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const isPdf = selectedFile.type === 'application/pdf';
      const isImage = selectedFile.type.startsWith('image/');
      if (!isPdf && !isImage) return toast.error('Apenas ficheiros PDF ou imagens sao permitidos');
      setFile(selectedFile);
    }
  };

  return (
    <AppLayout>
      {/* ... TODO: mantém exatamente o teu HTML / JSX como antes ... */}
    </AppLayout>
  );
}