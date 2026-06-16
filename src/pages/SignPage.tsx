import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getAgreementForSigning, submitSignature } from '../lib/supabase'
import type { AgreementData } from '../lib/supabase'

export default function SignPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreement, setAgreement] = useState<AgreementData | null>(null)
  const [fullName, setFullName] = useState('')
  const [mykad, setMykad] = useState('')
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid signing link — no token provided.')
      setLoading(false)
      return
    }

    async function load() {
      try {
        const data = await getAgreementForSigning(token)
        setAgreement(data)

        // Pre-fill if already signed
        if (data.signature.full_name) setFullName(data.signature.full_name)
        if (data.signature.mykad) setMykad(data.signature.mykad)
        if (data.signature.signed_at) setSigned(true)
      } catch (err) {
        setError('Signing link not found or has expired.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token, navigate])

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

      await submitSignature(agreement!.signature.id, fullName.trim(), mykadClean, ipAddress)
      setSigned(true)
      navigate('/success?ref=' + encodeURIComponent(agreement!.agreement.ref_no))
    } catch (err) {
      setError('Failed to record signature. Please try again.')
      console.error(err)
    } finally {
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
          <h1 className="text-xl font-bold mb-2">Signing Link Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please contact the sender for a new signing link.</p>
        </div>
      </div>
    )
  }

  if (!agreement) return null

  const sig = agreement.signature
  const agr = agreement.agreement
  const partyLabel = sig.party_role === 'disclosing' ? agr.sender_company_name : agr.recipient_company
  const partyName = sig.party_role === 'disclosing' ? agr.sender_signatory_name : agr.recipient_name

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">LMSB E-Sign Portal</h1>
              <p className="text-sm text-gray-500">Confidential signing — no account required</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Reference</p>
              <p className="font-mono text-sm font-bold">{agr.ref_no}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Document Type</p>
                <p className="font-medium">{agr.document_type}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className={`font-medium ${signed ? 'text-green-600' : 'text-amber-600'}`}>
                  {signed ? '✅ Signed' : '⏳ Awaiting your signature'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Disclosing Party</p>
                <p className="font-medium">{agr.sender_company_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Receiving Party</p>
                <p className="font-medium">{agr.recipient_company}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Agreement Content */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Agreement Preview</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed border rounded-lg p-4 bg-gray-50">
            {agr.document_content?.text || ''}
          </div>
        </div>

        {/* Signature Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-1">Sign as <span className="text-blue-600">{partyLabel}</span></h2>
          <p className="text-sm text-gray-500 mb-4">
            {partyName} — by signing, you agree to the terms above.
          </p>

          {signed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-medium text-lg">✅ You have already signed this agreement.</p>
              <p className="text-sm text-gray-500 mt-1">
                Signed on {new Date(sig.signed_at!).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">12-digit number without dashes</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  By clicking "Sign Agreement", you acknowledge that this constitutes your electronic signature and confirms your agreement to be bound by the terms of this document.
                </div>

                <button
                  onClick={handleSign}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {submitting ? 'Recording signature...' : '✍️ Sign Agreement'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="text-center text-xs text-gray-400 pb-8">
          Powered by <span className="font-bold">LMSB</span> E-Sign Portal &middot; Reference: {agr.ref_no}
        </div>
      </div>
    </div>
  )
}
