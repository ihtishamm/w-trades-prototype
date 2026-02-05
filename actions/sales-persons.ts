"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"
import { revalidatePath } from "next/cache"

export type SalesPerson = Database["public"]["Tables"]["sales_persons"]["Row"]
export type InsertSalesPerson = Database["public"]["Tables"]["sales_persons"]["Insert"]
export type UpdateSalesPerson = Database["public"]["Tables"]["sales_persons"]["Update"]

export async function getSalesPersons() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sales_persons")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching sales persons:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createSalesPerson(salesPerson: InsertSalesPerson) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sales_persons")
    .insert(salesPerson)
    .select()
    .single()

  if (error) {
    console.error("Error creating sales person:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/sales-persons")
  return { data, error: null }
}
