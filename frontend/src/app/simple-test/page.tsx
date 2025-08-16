'use client'

import { useState, useEffect } from 'react'
import { useSpecialtiesStore } from '@/store/specialties'

export default function SimpleTestPage() {
  const { specialties, isLoading, error, loadSpecialties } = useSpecialtiesStore()
  const [testResult, setTestResult] = useState<string>('')

  useEffect(() => {
    console.log('🔍 Componente SimpleTest montado')
    testLoadSpecialties()
  }, [])

  const testLoadSpecialties = async () => {
    console.log('🧪 Iniciando teste de carregamento...')
    setTestResult('Iniciando teste...')
    
    try {
      await loadSpecialties({ withActiveDoctors: true })
      setTestResult('Teste concluído - verificar logs do console')
    } catch (error) {
      console.error('Erro no teste:', error)
      setTestResult('Erro no teste: ' + error)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Teste Simples - Store de Especialidades</h1>
        
        <div className="p-4 border rounded">
          <h2 className="font-bold">Status:</h2>
          <p>Loading: {isLoading ? 'Sim' : 'Não'}</p>
          <p>Error: {error || 'Nenhum'}</p>
          <p>Especialidades encontradas: {specialties.length}</p>
          <p>Teste: {testResult}</p>
        </div>

        <button 
          onClick={testLoadSpecialties}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Testar Novamente
        </button>

        {specialties.length > 0 && (
          <div className="p-4 bg-green-100 border border-green-400 rounded">
            <h2 className="text-green-800 font-bold">✅ Especialidades Carregadas:</h2>
            {specialties.map((specialty) => (
              <div key={specialty.id} className="p-2 border-b">
                <h3 className="font-bold">{specialty.name}</h3>
                <p className="text-sm">{specialty.description}</p>
                <p className="text-xs text-gray-600">Duração: {specialty.duration} min | Preço: R$ {specialty.price}</p>
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