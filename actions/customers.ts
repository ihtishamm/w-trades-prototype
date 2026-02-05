"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"
import { revalidatePath } from "next/cache"

export type Customer = Database["public"]["Tables"]["customers"]["Row"]
export type InsertCustomer = Database["public"]["Tables"]["customers"]["Insert"]
export type UpdateCustomer = Database["public"]["Tables"]["customers"]["Update"]

export async function getCustomers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching customers:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createCustomer(customer: InsertCustomer) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .insert(customer)
    .select()
    .single()

  if (error) {
    console.error("Error creating customer:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/customers") // Assuming there's a customers page
  return { data, error: null }
}

export async function updateCustomer(id: string, customer: UpdateCustomer) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .update(customer)
    .match({ id })
    .select()
    .single()

  if (error) {
    console.error("Error updating customer:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/customers")
  return { data, error: null }
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("customers")
    .delete()
    .match({ id })

  if (error) {
    console.error("Error deleting customer:", error)
    return { error: error.message }
  }

  revalidatePath("/customers")
  return { error: null }
}

export async function getCustomerById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching customer by id:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
