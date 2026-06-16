import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

export interface AgreementData {
  signature: {
    id: string
    agreement_id: string
    party_role: 'disclosing' | 'receiving'
    full_name: string | null
    mykad: string | null
    signed_at: string | null
  }
  agreement: {
    id: string
    ref_no: string
    sender_company_name: string
    sender_signatory_name: string
    recipient_name: string
    recipient_company: string
    recipient_email: string
    document_type: string
    document_content: { text: string }
    status: string
  }
}

export async function getAgreementForSigning(token: string): Promise<AgreementData> {
  const { data, error } = await supabase.rpc('get_agreement_for_signing', { p_token: token })
  if (error) throw error
  if (!data) throw new Error('Signing link not found')
  return data as AgreementData
}

export async function submitSignature(
  signatureId: string,
  fullName: string,
  mykad: string,
  ipAddress: string = 'unknown'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('submit_signature', {
    p_signature_id: signatureId,
    p_full_name: fullName,
    p_mykad: mykad,
    p_ip_address: ipAddress,
  })
  if (error) throw error
  const result = data as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error || 'Failed to sign')
  return true
}
