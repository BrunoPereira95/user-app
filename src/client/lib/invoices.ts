import { supabase } from "./supabase"

export async function addInvoice(cliente: string, descricao: string, valor: number, iva: number, estado: string, fileUrl: string) {
  const { data, error } = await supabase
    .from("invoices")
    .insert([{ cliente, descricao, valor, iva, estado, ficheiro: fileUrl }])
  if (error) throw error
  return data
}

export async function getInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("criado_em", { ascending: false })
  if (error) throw error
  return data
}