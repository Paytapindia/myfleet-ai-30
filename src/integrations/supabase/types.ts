export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          permissions: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      challan_verifications: {
        Row: {
          api_cost_saved: boolean | null
          created_at: string
          error_message: string | null
          id: string
          is_cached: boolean | null
          status: string
          updated_at: string
          user_id: string
          vehicle_number: string
          verification_data: Json | null
        }
        Insert: {
          api_cost_saved?: boolean | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_cached?: boolean | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_number: string
          verification_data?: Json | null
        }
        Update: {
          api_cost_saved?: boolean | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_cached?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_number?: string
          verification_data?: Json | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          driver_id: string | null
          expiry_date: string | null
          file_size: number | null
          file_url: string
          id: string
          issue_date: string | null
          mime_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          driver_id?: string | null
          expiry_date?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          driver_id?: string | null
          expiry_date?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          license_expiry: string | null
          license_number: string
          name: string
          phone: string | null
          rating: number | null
          status: Database["public"]["Enums"]["driver_status"]
          total_earnings: number | null
          total_trips: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          license_expiry?: string | null
          license_number: string
          name: string
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          license_expiry?: string | null
          license_number?: string
          name?: string
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string
          id: string
          receipt_date: string | null
          receipt_number: string | null
          receipt_url: string | null
          rejection_reason: string | null
          subcategory: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
          vendor_contact: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          receipt_date?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          subcategory?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          receipt_date?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          subcategory?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fastag_verifications: {
        Row: {
          api_cost_saved: boolean | null
          created_at: string
          error_message: string | null
          id: string
          is_cached: boolean | null
          status: string
          updated_at: string
          user_id: string
          vehicle_number: string
          verification_data: Json | null
        }
        Insert: {
          api_cost_saved?: boolean | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_cached?: boolean | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_number: string
          verification_data?: Json | null
        }
        Update: {
          api_cost_saved?: boolean | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_cached?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_number?: string
          verification_data?: Json | null
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: number
          is_verified: boolean | null
          otp: string
          phone_number: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: never
          is_verified?: boolean | null
          otp: string
          phone_number: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: never
          is_verified?: boolean | null
          otp?: string
          phone_number?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_onboarded: boolean
          pan_number: string | null
          phone: string | null
          phone_verified: boolean
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_onboarded?: boolean
          pan_number?: string | null
          phone?: string | null
          phone_verified?: boolean
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_onboarded?: boolean
          pan_number?: string | null
          phone?: string | null
          phone_verified?: boolean
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rc_verifications: {
        Row: {
          api_cost_saved: boolean | null
          created_at: string
          error_message: string | null
          id: string
          is_cached: boolean | null
          request_id: string | null
          status: string
          updated_at: string
          user_id: string
          vehicle_number: string
          verification_data: Json | null
        }
        Insert: {
          api_cost_saved?: boolean | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_cached?: boolean | null
          request_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_number: string
          verification_data?: Json | null
        }
        Update: {
          api_cost_saved?: boolean | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_cached?: boolean | null
          request_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_number?: string
          verification_data?: Json | null
        }
        Relationships: []
      }
      settlements: {
        Row: {
          commission_amount: number
          created_at: string
          deductions: number
          driver_id: string | null
          gross_earnings: number
          id: string
          net_amount: number
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["settlement_status"]
          total_trips: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          deductions?: number
          driver_id?: string | null
          gross_earnings?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["settlement_status"]
          total_trips?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          deductions?: number
          driver_id?: string | null
          gross_earnings?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          total_trips?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          customer_email: string | null
          customer_phone: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          is_manual: boolean | null
          location: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          receipt_url: string | null
          reference_number: string | null
          transaction_date: string
          trip_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          id?: string
          is_manual?: boolean | null
          location?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          transaction_date?: string
          trip_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_manual?: boolean | null
          location?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          transaction_date?: string
          trip_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          base_fare: number | null
          cancellation_reason: string | null
          commission: number | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          customer_rating: number | null
          destination: string | null
          destination_coordinates: unknown | null
          distance_fare: number | null
          distance_km: number | null
          driver_earnings: number | null
          driver_id: string | null
          driver_rating: number | null
          id: string
          notes: string | null
          pickup_coordinates: unknown | null
          pickup_location: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["trip_status"]
          toll_charges: number | null
          total_fare: number | null
          updated_at: string
          user_id: string
          vehicle_id: string
          waiting_charges: number | null
        }
        Insert: {
          base_fare?: number | null
          cancellation_reason?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          customer_rating?: number | null
          destination?: string | null
          destination_coordinates?: unknown | null
          distance_fare?: number | null
          distance_km?: number | null
          driver_earnings?: number | null
          driver_id?: string | null
          driver_rating?: number | null
          id?: string
          notes?: string | null
          pickup_coordinates?: unknown | null
          pickup_location?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          toll_charges?: number | null
          total_fare?: number | null
          updated_at?: string
          user_id: string
          vehicle_id: string
          waiting_charges?: number | null
        }
        Update: {
          base_fare?: number | null
          cancellation_reason?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          customer_rating?: number | null
          destination?: string | null
          destination_coordinates?: unknown | null
          distance_fare?: number | null
          distance_km?: number | null
          driver_earnings?: number | null
          driver_id?: string | null
          driver_rating?: number | null
          id?: string
          notes?: string | null
          pickup_coordinates?: unknown | null
          pickup_location?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          toll_charges?: number | null
          total_fare?: number | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          waiting_charges?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_assignments: {
        Row: {
          assigned_at: string
          driver_id: string
          id: string
          is_active: boolean
          unassigned_at: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          driver_id: string
          id?: string
          is_active?: boolean
          unassigned_at?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          unassigned_at?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          challans_count: number | null
          chassis_number: string | null
          color: string | null
          created_at: string
          engine_number: string | null
          fasttag_balance: number | null
          fasttag_last_synced_at: string | null
          fasttag_linked: boolean | null
          financer: string | null
          fuel_type: string | null
          gps_device_id: string | null
          gps_linked: boolean | null
          id: string
          insurance_expiry: string | null
          is_financed: boolean | null
          last_service_date: string | null
          make: string | null
          model: string | null
          next_service_due: string | null
          number: string
          odometer_reading: number | null
          owner_name: string | null
          pay_tap_balance: number | null
          permanent_address: string | null
          pollution_expiry: string | null
          rc_verification_status: string | null
          rc_verified_at: string | null
          registration_authority: string | null
          registration_date: string | null
          registration_expiry: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          user_id: string
          wallet_balance: number | null
          year: number | null
        }
        Insert: {
          challans_count?: number | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          engine_number?: string | null
          fasttag_balance?: number | null
          fasttag_last_synced_at?: string | null
          fasttag_linked?: boolean | null
          financer?: string | null
          fuel_type?: string | null
          gps_device_id?: string | null
          gps_linked?: boolean | null
          id?: string
          insurance_expiry?: string | null
          is_financed?: boolean | null
          last_service_date?: string | null
          make?: string | null
          model?: string | null
          next_service_due?: string | null
          number: string
          odometer_reading?: number | null
          owner_name?: string | null
          pay_tap_balance?: number | null
          permanent_address?: string | null
          pollution_expiry?: string | null
          rc_verification_status?: string | null
          rc_verified_at?: string | null
          registration_authority?: string | null
          registration_date?: string | null
          registration_expiry?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          user_id: string
          wallet_balance?: number | null
          year?: number | null
        }
        Update: {
          challans_count?: number | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          engine_number?: string | null
          fasttag_balance?: number | null
          fasttag_last_synced_at?: string | null
          fasttag_linked?: boolean | null
          financer?: string | null
          fuel_type?: string | null
          gps_device_id?: string | null
          gps_linked?: boolean | null
          id?: string
          insurance_expiry?: string | null
          is_financed?: boolean | null
          last_service_date?: string | null
          make?: string | null
          model?: string | null
          next_service_due?: string | null
          number?: string
          odometer_reading?: number | null
          owner_name?: string | null
          pay_tap_balance?: number | null
          permanent_address?: string | null
          pollution_expiry?: string | null
          rc_verification_status?: string | null
          rc_verified_at?: string | null
          registration_authority?: string | null
          registration_date?: string | null
          registration_expiry?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          user_id?: string
          wallet_balance?: number | null
          year?: number | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string
          id: string
          reference_number: string | null
          trip_id: string | null
          type: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description: string
          id?: string
          reference_number?: string | null
          trip_id?: string | null
          type: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string
          id?: string
          reference_number?: string | null
          trip_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_trip_earnings: {
        Args: {
          p_base_fare: number
          p_commission_rate?: number
          p_distance_fare: number
          p_toll_charges?: number
          p_waiting_charges?: number
        }
        Returns: {
          commission: number
          driver_earnings: number
          total_fare: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_action: string
          p_description?: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "support" | "user"
      document_status:
        | "uploaded"
        | "missing"
        | "expired"
        | "pending_review"
        | "approved"
        | "rejected"
      driver_status: "active" | "inactive" | "suspended"
      expense_category:
        | "fuel"
        | "maintenance"
        | "insurance"
        | "permits"
        | "parking"
        | "tolls"
        | "fines"
        | "other"
      payment_method:
        | "upi"
        | "cash"
        | "bank_transfer"
        | "card"
        | "wallet"
        | "other"
      settlement_status: "pending" | "processing" | "completed" | "cancelled"
      transaction_type:
        | "fuel"
        | "parking"
        | "fasttag"
        | "add_money"
        | "maintenance"
        | "insurance"
        | "revenue"
        | "toll"
        | "permit"
        | "fine"
        | "manual_income"
        | "manual_expense"
      trip_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      vehicle_status: "active" | "maintenance" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "support", "user"],
      document_status: [
        "uploaded",
        "missing",
        "expired",
        "pending_review",
        "approved",
        "rejected",
      ],
      driver_status: ["active", "inactive", "suspended"],
      expense_category: [
        "fuel",
        "maintenance",
        "insurance",
        "permits",
        "parking",
        "tolls",
        "fines",
        "other",
      ],
      payment_method: [
        "upi",
        "cash",
        "bank_transfer",
        "card",
        "wallet",
        "other",
      ],
      settlement_status: ["pending", "processing", "completed", "cancelled"],
      transaction_type: [
        "fuel",
        "parking",
        "fasttag",
        "add_money",
        "maintenance",
        "insurance",
        "revenue",
        "toll",
        "permit",
        "fine",
        "manual_income",
        "manual_expense",
      ],
      trip_status: ["scheduled", "in_progress", "completed", "cancelled"],
      vehicle_status: ["active", "maintenance", "inactive"],
    },
  },
} as const
