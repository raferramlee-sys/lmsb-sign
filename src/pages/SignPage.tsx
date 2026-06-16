import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Agreement = Record<string, unknown>
type Signature = Record<string, unknown>

export default function SignPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [signature, setSignature] = useState<Signature | null>(null)
  const [fullName, setFullName] = useState('')
  const [mykad, setMykad] = useState('')
  const [signed, setSigned] = useState(false)
  const [sigId, setSigId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Invalid signing link — no token provided.')
      setLoading(false)
      return
    }

    async function load() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_signature_by_token', { p_token: token })

      if (rpcErr) {
        console.error('RPC error:', rpcErr)
        setError('Failed to load signing data.')
        setLoading(false)
        return
      }

      const result = data as { found: boolean; signature?: Signature; agreement?: Agreement }

      if (!result.found || !result.signature || !result.agreement) {
        setError('Signing link not found or has expired.')
        setLoading(false)
        return
      }

      const sig = result.signature
      const agr = result.agreement

      setSignature(sig)
      setAgreement(agr)
      setSigId(sig.id as string)
      if (sig.full_name) setFullName(sig.full_name as string)
      if (sig.mykad) setMykad(sig.mykad as string)
      if (sig.signed_at) setSigned(true)

      setLoading(false)
    }

    load()
  }, [token])

  async function handleSign() {
    if (!fullName.trim() || !mykad.trim()) {
      setError('Please fill in your full name and MyKad/IC number.')
      return
    }

    const mykadClean = mykad.replace(/-/g, '')
    if (!/^\d{12}$/.test(mykadClean)) {
      setError('Please enter a valid 12-digit MyKad/IC number.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let ipAddress = ''
      try {
        const resp = await fetch('https://api.ipify.org?format=json')
        const ipData = await resp.json()
        ipAddress = ipData.ip
      } catch {
        ipAddress = 'unknown'
      }

      const { error: rpcErr } = await supabase
        .rpc('record_signature', {
          p_sig_id: sigId,
          p_full_name: fullName.trim(),
          p_mykad: mykadClean,
          p_ip_address: ipAddress,
        })

      if (rpcErr) {
        console.error('Sign error:', rpcErr)
        setError('Failed to record signature. Please try again.')
        setSubmitting(false)
        return
      }

      setSigned(true)
      navigate('/success?ref=' + encodeURIComponent(String(agreement?.ref_no || '')))
    } catch (err) {
      setError('Failed to record signature. Please try again.')
      console.error(err)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading agreement...</p>
        </div>
      </div>
    )
  }

  if (error && !agreement) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2 text-gray-900">Signing Link Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please contact the sender for a new signing link.</p>
        </div>
      </div>
    )
  }

  if (!agreement || !signature) return null

  const partyLabel = signature.party_role === 'disclosing'
    ? (agreement.sender_company_name as string)
    : (agreement.recipient_company as string)

  const partyName = signature.party_role === 'disclosing'
    ? (agreement.sender_signatory_name as string)
    : (agreement.recipient_name as string)

  const docContent = agreement.document_content as Record<string, unknown> | null
  const docText = typeof docContent?.text === 'string' ? docContent.text : ''

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">LMSB E-Sign Portal</h1>
              <p className="text-sm text-gray-500">Confidential signing — no account required</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Reference</p>
              <p className="font-mono text-sm font-bold text-gray-900">{agreement.ref_no as string}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Document Type</p>
                <p className="font-medium text-gray-900">{agreement.document_type as string}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className={`font-medium ${signed ? 'text-green-600' : 'text-amber-600'}`}>
                  {signed ? '✅ Signed' : '⏳ Awaiting your signature'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Disclosing Party</p>
                <p className="font-medium text-gray-900">{agreement.sender_company_name as string}</p>
              </div>
              <div>
                <p className="text-gray-500">Receiving Party</p>
                <p className="font-medium text-gray-900">{agreement.recipient_company as string}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Agreement Text */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 text-gray-900">Agreement Preview</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed border rounded-lg p-4 bg-gray-50">
            {docText}
          </div>
        </div>

        {/* Signature Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-1 text-gray-900">
            Sign as <span className="text-blue-600">{partyLabel}</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {partyName} — by signing, you agree to the terms above.
          </p>

          {signed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-medium text-lg">✅ You have already signed this agreement.</p>
              <p className="text-sm text-gray-500 mt-1">
                Signed on {new Date(signature.signed_at as string).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Yusof Aaron Kong bin Abdullah"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MyKad / IC Number
                  </label>
                  <input
                    type="text"
                    value={mykad}
                    onChange={(e) => setMykad(e.target.value)}
                    placeholder="e.g. 860613525353"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">12-digit number without dashes</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  By clicking "Sign Agreement", you acknowledge that this constitutes your electronic
                  signature and confirms your agreement to be bound by the terms of this document.
                </div>

                <button
                  onClick={handleSign}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors cursor-pointer"
                >
                  {submitting ? 'Recording signature...' : '✍️ Sign Agreement'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="text-center text-xs text-gray-400 pb-8">
          Powered by <span className="font-bold">LMSB</span> E-Sign Portal &middot;{' '}
          Reference: {agreement.ref_no as string}
        </div>
      </div>
    </div>
  )
}
