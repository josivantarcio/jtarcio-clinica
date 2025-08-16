'use client'

import { useState, useEffect } from 'react'

export default function TestDirectPage() {
  const [specialties, setSpecialties] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSpecialties()
  }, [])

  const loadSpecialties = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Testando chamada direta para especialidades...')
      
      // Testar com fetch direto
      const response = await fetch('/api/v1/specialties?withActiveDoctors=true')
      
      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', response.headers)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📥 Data received:', data)
      
      if (data.success && data.data) {
        setSpecialties(data.data)
        console.log('✅ Especialidades carregadas:', data.data.length)
      } else {
        setError('Resposta da API inválida')
      }
    } catch (err: any) {
      console.error('❌ Erro:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Teste Direto - Fetch API</h1>
        
        <button 
          onClick={loadSpecialties}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Carregando...' : 'Carregar Especialidades'}
        </button>

        <div className="p-4 border rounded">
          <h2 className="font-bold">Status:</h2>
          <p>Loading: {loading ? 'Sim' : 'Não'}</p>
          <p>Error: {error || 'Nenhum'}</p>
          <p>Especialidades: {specialties.length}</p>
        </div>

        {specialties.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-bold text-green-600">✅ Especialidades Encontradas:</h2>
            {specialties.map((specialty) => (
              <div key={specialty.id} className="p-3 border border-green-200 bg-green-50 rounded">
                <h3 className="font-bold text-lg">{specialty.name}</h3>
                <p className="text-sm text-gray-600">{specialty.description}</p>
                <p className="text-xs text-gray-500">
                  ID: {specialty.id} | Duração: {specialty.duration}min | Preço: R${specialty.price}
                </p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 rounded">
            <h2 className="text-red-800 font-bold">❌ Erro:</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}