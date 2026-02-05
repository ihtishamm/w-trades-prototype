"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"

export type DailyBusinessLedger = Database["public"]["Tables"]["daily_business_ledger"]["Row"]

/**
 * 9️⃣ BUSINESS LEDGER
 */

export async function getDailyBusinessLedger(startDate?: string, endDate?: string) {
  const supabase = await createClient()
  let query = supabase
    .from("daily_business_ledger")
    .select("*")
    .order("entry_date", { ascending: false })

  if (startDate) {
    query = query.gte("entry_date", startDate)
  }
  if (endDate) {
    query = query.lte("entry_date", endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching daily business ledger:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
