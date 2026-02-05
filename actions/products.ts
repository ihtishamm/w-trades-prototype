"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"
import { revalidatePath } from "next/cache"

export type Product = Database["public"]["Tables"]["products"]["Row"]
export type InsertProduct = Database["public"]["Tables"]["products"]["Insert"]
export type UpdateProduct = Database["public"]["Tables"]["products"]["Update"]

export type InventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Row"]
export type InsertInventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Insert"]

/**
 * 1️⃣ PRODUCTS (MASTER DATA)
 */

export async function getProducts(activeOnly = true) {
  const supabase = await createClient()
  let query = supabase.from("products").select("*")

  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query.order("name", { ascending: true })

  if (error) {
    console.error("Error fetching products:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getProductById(id: string) {
  const supabase = await createClient()
  
  // Get product details
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (productError) {
    console.error("Error fetching product by id:", productError)
    return { data: null, error: productError.message }
  }

  // Get current stock
  const { data: stock, error: stockError } = await getProductStock(id)
  
  if (stockError) {
    console.warn("Error fetching stock for product:", stockError)
  }

  return { 
    data: { 
      ...product, 
      current_stock: stock || 0 
    }, 
    error: null 
  }
}

export async function createProduct(product: InsertProduct) {
  const supabase = await createClient()
  
  // Rule: is_active = true by default
  const newProduct = {
    ...product,
    is_active: product.is_active ?? true
  }

  const { data, error } = await supabase
    .from("products")
    .insert(newProduct)
    .select()
    .single()

  if (error) {
    console.error("Error creating product:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/products")
  return { data, error: null }
}

export async function updateProduct(id: string, product: UpdateProduct) {
  const supabase = await createClient()
  
  // Rule: Never touches inventory (which we follow by only updating products table)
  // Rule: Never deletes product (which we follow by using update instead of delete)
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .match({ id })
    .select()
    .single()

  if (error) {
    console.error("Error updating product:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/products")
  return { data, error: null }
}

export async function toggleProductStatus(id: string, isActive: boolean) {
  const supabase = await createClient()
  
  // Rule: Soft-disable only
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .match({ id })
    .select()
    .single()

  if (error) {
    console.error("Error toggling product status:", error)
    return { data: null, error: error.message }
  }

  revalidatePath("/products")
  return { data, error: null }
}

/**
 * 2️⃣ INVENTORY LEDGER (STOCK TRUTH)
 */

export async function recordInventoryPurchase(productId: string, quantity: number, referenceId?: string) {
  if (quantity <= 0) {
    return { data: null, error: "Purchase quantity must be greater than 0" }
  }

  return await recordInventoryMovement({
    product_id: productId,
    quantity: quantity,
    source_type: "purchase",
    reference_id: referenceId ?? null,
    movement_date: new Date().toISOString()
  })
}

export async function recordInventoryAdjustment(productId: string, quantity: number, reason: string) {
  // quantity can be ±
  // admin-only (Implicitly handled by who calls this action, but logic is here)
  return await recordInventoryMovement({
    product_id: productId,
    quantity: quantity,
    source_type: "adjustment",
    reference_id: reason,
    movement_date: new Date().toISOString()
  })
}

export async function recordInventoryReturn(productId: string, quantity: number, referenceId?: string) {
  if (quantity <= 0) {
    return { data: null, error: "Return quantity must be greater than 0" }
  }

  return await recordInventoryMovement({
    product_id: productId,
    quantity: quantity,
    source_type: "return",
    reference_id: referenceId ?? null,
    movement_date: new Date().toISOString()
  })
}

export async function recordInventoryMovement(movement: Omit<InventoryMovement, "id" | "created_at">) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("inventory_movements")
    .insert(movement)
    .select()
    .single()

  if (error) {
    console.error("Error recording inventory movement:", error)
    return { data: null, error: error.message }
  }

  revalidatePath(`/products/${movement.product_id}`)
  return { data, error: null }
}

export async function getProductStock(productId: string) {
  const supabase = await createClient()
  
  // Logic: SUM(quantity) GROUP BY product_id
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("quantity")
    .eq("product_id", productId)

  if (error) {
    console.error("Error calculating product stock:", error)
    return { data: null, error: error.message }
  }

  const stock = data.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
  return { data: stock, error: null }
}

export async function getInventoryLedgerByProduct(productId: string) {
  const supabase = await createClient()
  
  // Order: movement_date ASC
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("product_id", productId)
    .order("movement_date", { ascending: true })

  if (error) {
    console.error("Error fetching inventory ledger:", error)
    return { data: null, error: error.message }
  }

  return { data: data as InventoryMovement[], error: null }
}
