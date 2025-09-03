import { supabase } from "@/integrations/supabase/client";
import type { FastagVerificationResponse, FastagData } from "@/api/fastagApi";
import type { Database, Json } from "@/integrations/supabase/types";

export interface SaveFastagManualInput {
  status?: string;
  balance?: number;
  bankName?: string;
  lastTransactionDate?: string;
}

export const saveFastagManual = async (
  vehicleNumber: string,
  input: SaveFastagManualInput
): Promise<FastagVerificationResponse> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const normalized: FastagData = {
      balance: typeof input.balance === 'number' ? input.balance : 0,
      linked: (input.status || 'active').toLowerCase() === 'active',
      status: input.status || 'active',
      lastTransactionDate: input.lastTransactionDate,
      vehicleNumber,
      bankName: input.bankName,
    };

    // Insert a completed verification record
    const row: Database['public']['Tables']['fastag_verifications']['Insert'] = {
      user_id: user.id,
      vehicle_number: vehicleNumber,
      status: 'completed',
      verification_data: normalized as unknown as Json,
      is_cached: true,
    };

    const { error: insertErr } = await supabase
      .from('fastag_verifications')
      .insert(row);

    if (insertErr) {
      console.error('saveFastagManual insert error:', insertErr);
      return { success: false, error: insertErr.message };
    }

    // Update vehicle aggregates
    const { error: updateErr } = await supabase
      .from('vehicles')
      .update({
        fasttag_balance: normalized.balance,
        fasttag_linked: normalized.linked,
        fasttag_last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('number', vehicleNumber);

    if (updateErr) {
      console.warn('saveFastagManual vehicle update warning:', updateErr);
      // Non-fatal: still return success for UI flow
    }

    return {
      success: true,
      data: normalized,
      cached: true,
      verifiedAt: new Date().toISOString(),
      details: 'Manually provided FASTag details',
    };
  } catch (e: any) {
    console.error('saveFastagManual error:', e);
    return { success: false, error: e?.message || 'Unknown error' };
  }
};