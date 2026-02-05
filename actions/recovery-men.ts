"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"
import { revalidatePath } from "next/cache"

export type RecoveryMan = Database["public"]["Tables"]["recovery_men"]["Row"]
export type InsertRecoveryMan = Database["public"]["Tables"]["recovery_men"]["Insert"]
export type UpdateRecoveryMan = Database["public"]["Tables"]["recovery_men"]["Update"]

export async function getRecoveryMen() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("recovery_men")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching recovery men:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createRecoveryMan(recoveryMan: InsertRecoveryMan) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("recovery_men")
    .insert(recoveryMan)
    .select()
    .single()

  if (error) {
    console.error("Error creating recovery man:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/recovery-men")
  return { data, error: null }
}

export async function updateRecoveryMan(id: string, recoveryMan: UpdateRecoveryMan) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("recovery_men")
    .update(recoveryMan)
    .match({ id })
    .select()
    .single()

  if (error) {
    console.error("Error updating recovery man:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/recovery-men")
  return { data, error: null }
}
