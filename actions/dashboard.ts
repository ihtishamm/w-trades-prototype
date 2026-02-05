"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"

/**
 * 10️⃣ AGGREGATE ACTIONS (READ-ONLY)
 */

interface ExpectedRecoveryContract {
  id: string
  total_price: number | null
  weekly_installment_amount: number | null
  customers: { name: string } | null
  products: { name: string } | null
}

export async function getExpectedRecoveryToday() {
  const supabase = await createClient()
  
  // Rule: Today's day of week (0-6, where 0 is Sunday)
  // Our weekly_installment_day is 0-6
  const today = new Date().getDay()

  const { data, error } = await supabase
    .from("customer_products")
    .select(`
      id,
      total_price,
      weekly_installment_amount,
      customers (name),
      products (name)
    `)
    .eq("weekly_installment_day", today)
    .eq("status", "active") as { data: ExpectedRecoveryContract[] | null, error: any }

  if (error) {
    console.error("Error fetching expected recovery today:", error)
    return { data: null, error: error.message }
  }

  if (!data) return { data: { contracts: [], total_expected: 0 }, error: null }

  const totalExpected = data.reduce((acc, curr) => acc + (curr.weekly_installment_amount || 0), 0)

  return { 
    data: {
      contracts: data,
      total_expected: totalExpected
    }, 
    error: null 
  }
}

export async function getActualRecoveryToday() {
  const supabase = await createClient()
  
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from("recovery_entries")
    .select("amount")
    .gte("recovery_date", `${today}T00:00:00`)
    .lte("recovery_date", `${today}T23:59:59`)

  if (error) {
    console.error("Error fetching actual recovery today:", error)
    return { data: null, error: error.message }
  }

  const totalActual = data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

  return { data: totalActual, error: null }
}

interface ProductExposureRecord {
  id: string
  total_price: number | null
  product_id: string
  products: { name: string } | null
  customer_product_ledger: { amount: number }[]
}

export async function getProductExposure() {
  const supabase = await createClient()
  
  // Fetch all active contracts with their ledger to calculate outstanding
  const { data, error } = await supabase
    .from("customer_products")
    .select(`
      id,
      total_price,
      product_id,
      products (name),
      customer_product_ledger (amount)
    `)
    .eq("status", "active") as { data: ProductExposureRecord[] | null, error: any }

  if (error) {
    console.error("Error fetching product exposure:", error)
    return { data: null, error: error.message }
  }

  if (!data) return { data: {}, error: null }

  // Aggregate by product
  const exposure = data.reduce((acc: Record<string, number>, curr) => {
    const paid = curr.customer_product_ledger.reduce((sum, l) => sum + (l.amount || 0), 0)
    const outstanding = (curr.total_price || 0) - paid
    const productName = curr.products?.name || "Unknown"
    
    if (!acc[productName]) {
      acc[productName] = 0
    }
    acc[productName] += outstanding
    return acc
  }, {})

  return { data: exposure, error: null }
}

interface OutstandingContractRecord {
  id: string
  total_price: number | null
  customers: { name: string } | null
  products: { name: string } | null
  customer_product_ledger: { amount: number }[]
}

export async function getOutstandingPerCustomerProduct() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("customer_products")
    .select(`
      id,
      total_price,
      customers (name),
      products (name),
      customer_product_ledger (amount)
    `)
    .eq("status", "active") as { data: OutstandingContractRecord[] | null, error: any }

  if (error) {
    console.error("Error fetching outstanding per customer product:", error)
    return { data: null, error: error.message }
  }

  if (!data) return { data: [], error: null }

  const results = data.map(curr => {
    const paid = curr.customer_product_ledger.reduce((sum, l) => sum + (l.amount || 0), 0)
    const outstanding = (curr.total_price || 0) - paid
    return {
      id: curr.id,
      customer_name: curr.customers?.name,
      product_name: curr.products?.name,
      total_price: curr.total_price,
      paid_amount: paid,
      outstanding_balance: outstanding
    }
  })

  return { data: results, error: null }
}

interface RecoveryManEfficiency {
  id: string
  name: string
}

export async function getRecoveryEfficiency(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  // This is a complex derivation: Actual / Expected
  // For simplicity in MVP, we calculate it for the date range
  
  // 1. Get deliveries (Expected)
  const { data: recoveryMen, error: rmError } = await supabase
    .from("recovery_men")
    .select("id, name")
    .eq("is_active", true)

  if (rmError) {
    console.error("Error fetching recovery men for efficiency:", rmError)
    return { data: null, error: rmError.message }
  }

  // 2. Get Actual Collections per Recovery Man
  const { data: actuals, error: actualError } = await supabase
    .from("recovery_entries")
    .select("recovery_man_id, amount")
    .gte("recovery_date", startDate)
    .lte("recovery_date", endDate)

  if (actualError) {
    console.error("Error fetching actuals for efficiency:", actualError)
    return { data: null, error: actualError.message }
  }

  const recoveryMenList = (recoveryMen || []) as RecoveryManEfficiency[]
  const actualsList = (actuals || []) as { recovery_man_id: string, amount: number }[]

  const efficiency = recoveryMenList.map(rm => {
    const collected = actualsList
      .filter(a => a.recovery_man_id === rm.id)
      .reduce((sum, a) => sum + (a.amount || 0), 0)
    
    // In a real app, we'd also fetch the sum of weekly_installment_amount 
    // for all customers assigned to this recovery man for the days within the range.
    // For now, we return the total collected as the primary metric.
    return {
      recovery_man_id: rm.id,
      name: rm.name,
      total_collected: collected
    }
  })

  return { data: efficiency, error: null }
}
