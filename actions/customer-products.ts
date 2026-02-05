"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"
import { revalidatePath } from "next/cache"
import { getProductStock, recordInventoryMovement } from "./products"

export type CustomerProduct = Database["public"]["Tables"]["customer_products"]["Row"]
export type InsertCustomerProduct = Database["public"]["Tables"]["customer_products"]["Insert"]
export type UpdateCustomerProduct = Database["public"]["Tables"]["customer_products"]["Update"]

export type CustomerProductLedger = Database["public"]["Tables"]["customer_product_ledger"]["Row"]

/**
 * 6️⃣ CUSTOMER PRODUCT (INSTALLMENT CONTRACT)
 */

interface CustomerProductWithDetails extends CustomerProduct {
  customers: { name: string } | null
  products: { name: string } | null
}

export async function getCustomerProducts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customer_products")
    .select(`
      *,
      customers (name),
      products (name)
    `)
    .order("created_at", { ascending: false }) as { data: CustomerProductWithDetails[] | null, error: any }

  if (error) {
    console.error("Error fetching customer products:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

interface ContractWithDetails extends CustomerProduct {
  customers: Database["public"]["Tables"]["customers"]["Row"] | null
  products: Database["public"]["Tables"]["products"]["Row"] | null
}

export async function getCustomerProductById(id: string) {
  const supabase = await createClient()
  
  // 1. Fetch contract details
  const { data: contract, error: contractError } = await supabase
    .from("customer_products")
    .select(`
      *,
      customers (*),
      products (*)
    `)
    .eq("id", id)
    .single() as { data: ContractWithDetails | null, error: any }

  if (contractError || !contract) {
    console.error("Error fetching customer product details:", contractError)
    return { data: null, error: contractError?.message || "Contract not found" }
  }

  // 2. Fetch ledger entries
  const { data: ledger, error: ledgerError } = await supabase
    .from("customer_product_ledger")
    .select("*")
    .eq("customer_product_id", id)
    .order("payment_date", { ascending: true })

  if (ledgerError) {
    console.warn("Error fetching ledger for customer product:", ledgerError)
  }

  // 3. Calculate outstanding balance
  const paidAmount = (ledger || []).reduce((acc, curr) => acc + (curr.amount || 0), 0)
  const outstandingBalance = (contract.total_price || 0) - paidAmount

  return { 
    data: { 
      ...contract, 
      ledger: ledger || [],
      outstanding_balance: outstandingBalance
    }, 
    error: null 
  }
}

export async function createCustomerProduct(contract: InsertCustomerProduct) {
  const supabase = await createClient()
  
  // 1. Stock Check (must be >= 1)
  const { data: stock, error: stockCheckError } = await getProductStock(contract.product_id)
  
  if (stockCheckError) {
    return { data: null, error: "Failed to verify stock availability" }
  }
  
  if (!stock || stock < 1) {
    return { data: null, error: "Insufficient stock to sell this product" }
  }

  // 2. Create customer_products record
  const { data: newContract, error: contractError } = await supabase
    .from("customer_products")
    .insert({
      ...contract,
      status: contract.status ?? "active"
    })
    .select()
    .single()

  if (contractError) {
    console.error("Error creating customer product contract:", contractError)
    return { data: null, error: contractError.message }
  }

  // 3. Record advance if any (as an installment)
  if (newContract.advance_amount && newContract.advance_amount > 0) {
    const { error: ledgerError } = await supabase
      .from("customer_product_ledger")
      .insert({
        customer_product_id: newContract.id,
        amount: newContract.advance_amount,
        installment_kind: "advance",
        payment_date: new Date().toISOString()
      })

    if (ledgerError) {
      console.error("Error recording advance payment:", ledgerError)
      // Note: In a real production app, we might want to manually rollback the contract creation here
      // but for this MVP, we log and proceed with inventory adjustment.
    }
  }

  // 4. Record Inventory Movement (sale, -1)
  const { error: movementError } = await recordInventoryMovement({
    product_id: newContract.product_id,
    quantity: -1,
    source_type: "sale",
    reference_id: `Sale to customer contract ${newContract.id}`,
    movement_date: new Date().toISOString()
  })

  if (movementError) {
    console.error("Error recording inventory sale movement:", movementError)
  }

  revalidatePath("/customer-products")
  revalidatePath(`/products/${newContract.product_id}`)
  
  return { data: newContract, error: null }
}

export async function closeCustomerProduct(id: string) {
  const supabase = await createClient()
  
  // Rule: status = closed
  const { data, error } = await supabase
    .from("customer_products")
    .update({ status: "closed" })
    .match({ id })
    .select()
    .single()

  if (error) {
    console.error("Error closing customer product contract:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/customer-products")
  revalidatePath(`/customer-products/${id}`)
  
  return { data, error: null }
}

/**
 * 7️⃣ CUSTOMER PRODUCT LEDGER (READ ONLY)
 */

export async function getCustomerProductLedger(customerProductId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customer_product_ledger")
    .select("*")
    .eq("customer_product_id", customerProductId)
    .order("payment_date", { ascending: true })

  if (error) {
    console.error("Error fetching customer product ledger:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
