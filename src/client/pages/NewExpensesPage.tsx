import { supabase } from "../lib/supabase";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { modelenceQuery, modelenceMutation, createQueryKey } from "@modelence/react-query";
import { useNavigate } from "react-router-dom";
import { uploadFile } from "modelence/client";
import toast from "react-hot-toast";
import AppLayout from "@/client/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/Card";
import { Button } from "@/client/components/ui/Button";
import { Input } from "@/client/components/ui/Input";
import { Label } from "@/client/components/ui/Label";
import { Select } from "@/client/components/ui/Select";
import { Textarea } from "@/client/components/ui/Textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/client/components/ui/Dialog";
import { Upload } from "lucide-react";

type ExpenseCategory = { id: string; name: string };

const SS_RATE = 21.4;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function NewExpensesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({ ...modelenceQuery<ExpenseCategory[]>("accounting.getExpenseCategories", {}) });

  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [applySs, setApplySs] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);

  const { data: settings } = useQuery({ ...modelenceQuery("accounting.getUserSettings", {}) });

  // Calcula retenção e SS
  const calculations = useMemo(() => {
    const base = parseFloat(amount) || 0;
    const ssRate = applySs && !(settings?.ssExempt ?? true) ? SS_RATE : 0;
    const ssValue = base * (ssRate / 100);
    return { ssValue, ssRate };
  }, [amount, applySs, settings]);

  const { mutate: createExpense, isPending: isCreating } = useMutation({
    ...modelenceMutation("accounting.createExpense"),
    onSuccess: async (data: any) => {
      const result = data as { expenseId: string };

      // Upload do ficheiro
      if (file) {
        try {
          const extension = file.name.split(".").pop();
          const isPdf = file.type === "application/pdf";
          const { filePath } = await uploadFile(file, {
            filePath: `expenses/${result.expenseId}.${extension}`,
            contentType: file.type,
            visibility: "private",
          });

          await queryClient.fetchQuery({
            queryKey: ["updateExpenseDoc"],
            queryFn: async () => {
              const { mutationFn } = modelenceMutation("accounting.updateExpense");
              return mutationFn({
                expenseId: result.expenseId,
                documentPath: filePath,
                documentType: isPdf ? "pdf" : "image",
              });
            },
          });
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: createQueryKey("accounting.getExpenses") });
      toast.success("Despesa criada com sucesso");
      navigate("/expenses");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return toast.error("Selecione uma categoria");
    if (!description) return toast.error("Adicione uma descrição");
    if (!amount || parseFloat(amount) <= 0) return toast.error("Adicione um valor válido");

    createExpense({
      categoryId,
      description,
      amount: parseFloat(amount),
      applySs,
      expenseDate,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const isPdf = selectedFile.type === "application/pdf";
      const isImage = selectedFile.type.startsWith("image/");

      if (!isPdf && !isImage) {
        toast.error("Apenas ficheiros PDF ou imagens são permitidos");
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/expenses")}>Voltar</Button>
          <h1 className="text-2xl font-bold">Nova Despesa</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Detalhes da Despesa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Selecionar categoria</option>
                  {categories?.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Data *</Label>
                  <Input id="expenseDate" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-600">{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>Remover</Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Anexe recibo/fatura (PDF ou imagem)</p>
                    <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload">
                      <Button type="button" variant="outline" asChild>
                        <span>Selecionar ficheiro</span>
                      </Button>
                    </label>
                  </>
                )}
              </div>

              <Button type="submit" disabled={isCreating}>{isCreating ? "A guardar..." : "Guardar Despesa"}</Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
}