import { supabase } from "./supabase"

export async function addExpenses(cliente: string, categoria: string, descricao: string, valor: number, fileUrl: string) {
  const { data, error } = await supabase
    .from("expenses")
    .insert([{ cliente, categoria, descricao, valor, ficheiro: fileUrl }])
  if (error) throw error
  return data
}

export async function getExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("criado_em", { ascending: false })
  if (error) throw error
  return data
}