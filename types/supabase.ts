export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admins_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_product_ledger: {
        Row: {
          id: string
          customer_product_id: string
          amount: number
          installment_kind: string
          payment_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_product_id: string
          amount: number
          installment_kind: string
          payment_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_product_id?: string
          amount?: number
          installment_kind?: string
          payment_date?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_ledger_customer_product_id_fkey"
            columns: ["customer_product_id"]
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_products: {
        Row: {
          id: string
          customer_id: string
          product_id: string
          recovery_man_id: string
          total_price: number
          advance_percentage: number | null
          advance_amount: number | null
          weekly_installment_amount: number
          weekly_installment_day: number
          start_date: string
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          product_id: string
          recovery_man_id: string
          total_price: number
          advance_percentage?: number | null
          advance_amount?: number | null
          weekly_installment_amount: number
          weekly_installment_day: number
          start_date: string
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          product_id?: string
          recovery_man_id?: string
          total_price?: number
          advance_percentage?: number | null
          advance_amount?: number | null
          weekly_installment_amount?: number
          weekly_installment_day?: number
          start_date?: string
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_products_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_products_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_products_recovery_man_id_fkey"
            columns: ["recovery_man_id"]
            referencedRelation: "recovery_men"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          address: string | null
          area: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          address?: string | null
          area?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          address?: string | null
          area?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      daily_business_ledger: {
        Row: {
          id: string
          entry_type: string
          amount: number
          entry_date: string
          reference_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          entry_type: string
          amount: number
          entry_date: string
          reference_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          entry_type?: string
          amount?: number
          entry_date?: string
          reference_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          id: string
          product_id: string
          quantity: number
          source_type: "purchase" | "adjustment" | "return" | "sale"
          reference_id: string | null
          movement_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          source_type: "purchase" | "adjustment" | "return" | "sale"
          reference_id?: string | null
          movement_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          source_type?: "purchase" | "adjustment" | "return" | "sale"
          reference_id?: string | null
          movement_date?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          category: string | null
          cost_price: number
          selling_price: number
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          cost_price: number
          selling_price: number
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          cost_price?: number
          selling_price?: number
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      recovery_entries: {
        Row: {
          id: string
          customer_product_id: string
          recovery_man_id: string
          amount: number
          recovery_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_product_id: string
          recovery_man_id: string
          amount: number
          recovery_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_product_id?: string
          recovery_man_id?: string
          amount?: number
          recovery_date?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_entries_customer_product_id_fkey"
            columns: ["customer_product_id"]
            referencedRelation: "customer_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_entries_recovery_man_id_fkey"
            columns: ["recovery_man_id"]
            referencedRelation: "recovery_men"
            referencedColumns: ["id"]
          }
        ]
      }
      recovery_men: {
        Row: {
          id: string
          name: string
          phone: string | null
          area: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          area?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          area?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      sales_persons: {
        Row: {
          id: string
          name: string
          phone: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
