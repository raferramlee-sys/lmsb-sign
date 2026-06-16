import { useSearchParams } from 'react-router-dom'

export default function SuccessPage() {
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Signature Recorded!</h1>
        <p className="text-gray-600 mb-4">
          Your electronic signature has been successfully recorded.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left text-sm">
          <p className="text-blue-700 font-medium mb-1">What happens next?</p>
          <ul className="text-blue-600 space-y-1 list-disc list-inside">
            <li>Your signature has been timestamped</li>
            <li>Both parties will be notified once all signatures are collected</li>
            <li>The final signed PDF will be emailed to both parties</li>
          </ul>
        </div>

        {ref && (
          <p className="text-xs text-gray-400">
            Reference: <span className="font-mono">{ref}</span>
          </p>
        )}

        <p className="text-xs text-gray-400 mt-4">
          You may close this window.
        </p>
      </div>
    </div>
  )
}
