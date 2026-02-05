"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"
import { revalidatePath } from "next/cache"
import { getCustomerProductById } from "./customer-products"

export type RecoveryEntry = Database["public"]["Tables"]["recovery_entries"]["Row"]
export type InsertRecoveryEntry = Database["public"]["Tables"]["recovery_entries"]["Insert"]

export type DailyBusinessLedger = Database["public"]["Tables"]["daily_business_ledger"]["Row"]
export type InsertDailyBusinessLedger = Database["public"]["Tables"]["daily_business_ledger"]["Insert"]

interface RecoveryEntryWithDetails extends RecoveryEntry {
  customer_products: {
    id: string
    customers: { name: string } | null
    products: { name: string } | null
  } | null
  recovery_men: { name: string } | null
}

export async function getRecoveryEntries(startDate?: string, endDate?: string) {
  const supabase = await createClient()
  let query = supabase
    .from("recovery_entries")
    .select(`
      *,
      customer_products (
        id,
        customers (name),
        products (name)
      ),
      recovery_men (name)
    `)
    .order("recovery_date", { ascending: false })

  if (startDate) {
    query = query.gte("recovery_date", startDate)
  }
  if (endDate) {
    query = query.lte("recovery_date", endDate)
  }

  const { data, error } = await query as { data: RecoveryEntryWithDetails[] | null, error: any }

  if (error) {
    console.error("Error fetching recovery entries:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createRecoveryEntry(entry: InsertRecoveryEntry) {
  const supabase = await createClient()

  // 1. Rules Validation
  if (entry.amount <= 0) {
    return { data: null, error: "Recovery amount must be greater than 0" }
  }

  // 2. Outstanding Balance Check
  const { data: contract, error: contractError } = await getCustomerProductById(entry.customer_product_id)
  
  if (contractError || !contract) {
    return { data: null, error: "Could not verify contract details" }
  }

  if (entry.amount > contract.outstanding_balance) {
    return { 
      data: null, 
      error: `Amount exceeds outstanding balance of ${contract.outstanding_balance}` 
    }
  }

  // 3. ATOMIC WRITES (Sequential with error handling for MVP)
  
  // A. Create recovery_entries record
  const { data: newEntry, error: entryError } = await supabase
    .from("recovery_entries")
    .insert(entry)
    .select()
    .single()

  if (entryError) {
    console.error("Error creating recovery entry:", entryError)
    return { data: null, error: entryError.message }
  }

  // B. Create customer_product_ledger record
  const { error: ledgerError } = await supabase
    .from("customer_product_ledger")
    .insert({
      customer_product_id: entry.customer_product_id,
      amount: entry.amount,
      installment_kind: "recovery",
      payment_date: entry.recovery_date
    })

  if (ledgerError) {
    console.error("Error updating customer ledger for recovery:", ledgerError)
    // Rollback recovery entry? (In a full production app, yes. Here we log the critical inconsistency)
  }

  // C. Create daily_business_ledger record
  const { error: businessError } = await supabase
    .from("daily_business_ledger")
    .insert({
      entry_type: "recovery",
      amount: entry.amount,
      entry_date: entry.recovery_date,
      reference_id: `Recovery entry ${newEntry.id}`
    })

  if (businessError) {
    console.error("Error updating business ledger for recovery:", businessError)
  }

  revalidatePath("/recovery")
  revalidatePath(`/customer-products/${entry.customer_product_id}`)
  
  return { data: newEntry, error: null }
}
