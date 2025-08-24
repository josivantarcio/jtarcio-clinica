'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { usePatientsStore } from '@/store/patients'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/user-avatar'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin,
  FileText,
  Clock,
  Heart,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Patient, Appointment } from '@/types'
import { parseDateFromAPI } from '@/lib/date-utils'

interface PatientWithStats extends Patient {
  totalAppointments: number
  lastAppointment?: Date
  nextAppointment?: Date
  status: 'active' | 'inactive' | 'pending'
}

export default function PatientsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const { patients, isLoading: patientsLoading, loadPatients, updatePatientStatus, clearCache } = usePatientsStore()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    // Hydrate the persisted store only once
    const unsubscribe = useAuthStore.persist.rehydrate()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  const loadPatientsForUser = useCallback(() => {
    if (user && isAuthenticated) {
      // Check if user has permission to access patients page
      if (!['DOCTOR', 'ADMIN', 'RECEPTIONIST'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      loadPatients()
    }
  }, [user, isAuthenticated, loadPatients, router])

  useEffect(() => {
    loadPatientsForUser()
  }, [loadPatientsForUser])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen) {
        setDropdownOpen(null)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || patientsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando pacientes...</p>
        </div>
      </div>
    )
  }

  // Filter patients
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = !searchTerm || 
      (patient.user.name && patient.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      patient.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm) ||
      patient.phone.includes(searchTerm)

    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const exportPatients = () => {
    console.log('Exportando pacientes...', filteredPatients.length, 'pacientes encontrados')
    
    if (!filteredPatients.length) {
      alert('Nenhum paciente para exportar')
      return
    }

    try {
      const excelData = generatePatientsExcel()
      console.log('Excel gerado:', excelData.substring(0, 200) + '...')
      downloadExcel(excelData, `pacientes_${new Date().toISOString().split('T')[0]}.xlsx`)
      
      // Show success message
      alert(`Exportação concluída! ${filteredPatients.length} pacientes exportados para Excel.`)
    } catch (error) {
      console.error('Erro na exportação:', error)
      alert('Erro ao exportar pacientes. Verifique o console para detalhes.')
    }
  }

  const generatePatientsExcel = () => {
    console.log('Gerando Excel para', filteredPatients.length, 'pacientes filtrados')
    
    // Excel-compatible CSV with proper encoding and separators
    const csvLines = [
      // Header with BOM for proper Excel encoding
      '\uFEFF',
      'EO Clínica - Lista de Pacientes',
      `Exportado em: ${new Date().toLocaleDateString('pt-BR')}`,
      `Total de pacientes: ${filteredPatients.length}`,
      '',
      // Column headers
      'Nome;Email;Telefone;CPF;Endereço;Contato de Emergência;Status;Data de Cadastro'
    ]
    
    // Patient data with semicolon separator for Excel
    filteredPatients.forEach((patient, index) => {
      console.log(`Processando paciente ${index + 1}:`, patient.user.name)
      
      const csvLine = [
        patient.user.name || 'N/A',
        patient.user.email || 'N/A',
        patient.phone || 'N/A',
        patient.cpf || 'N/A',
        patient.address || 'N/A',
        patient.emergencyContact || 'N/A',
        patient.status === 'active' ? 'Ativo' : patient.status === 'inactive' ? 'Inativo' : 'Pendente',
        patient.user.createdAt ? new Date(patient.user.createdAt).toLocaleDateString('pt-BR') : 'N/A'
      ].map(field => field.toString().replace(/;/g, ',')).join(';')
      
      csvLines.push(csvLine)
    })
    
    console.log('Excel gerado com', csvLines.length, 'linhas')
    return csvLines.join('\n')
  }

  const downloadExcel = (excelContent: string, fileName: string) => {
    console.log('Iniciando download Excel:', fileName)
    
    try {
      // Create blob with proper Excel encoding 
      const blob = new Blob([excelContent], { 
        type: 'application/vnd.ms-excel;charset=utf-8;' 
      })
      
      console.log('Blob Excel criado:', blob.size, 'bytes')
      
      // Check if browser supports download
      const link = document.createElement('a')
      if (typeof link.download !== 'undefined') {
        const url = URL.createObjectURL(blob)
        link.href = url
        link.download = fileName
        link.style.visibility = 'hidden'
        
        // Add to DOM, click, and remove
        document.body.appendChild(link)
        console.log('Link adicionado ao DOM, iniciando download Excel...')
        link.click()
        document.body.removeChild(link)
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100)
        
        console.log('Download Excel iniciado com sucesso!')
      } else {
        // Fallback for older browsers
        console.log('Download não suportado, usando fallback...')
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Erro no downloadExcel:', error)
      throw error
    }
  }

  const togglePatientStatus = async (patientId: string, currentStatus: string) => {
    // Set loading state
    setUpdatingStatus(patientId)
    
    try {
      console.log('Alterando status do paciente:', { patientId, currentStatus })
      
      const newStatus = currentStatus === 'active' ? 'INACTIVE' : 'ACTIVE'
      const statusLabel = newStatus === 'ACTIVE' ? 'ativado' : 'inativado'
      
      console.log('Novo status será:', newStatus)
      
      const success = await updatePatientStatus(patientId, newStatus)
      
      if (success) {
        // Show success message
        console.log(`Status alterado com sucesso para: ${newStatus}`)
        alert(`Paciente ${statusLabel} com sucesso!`)
        
        // Recarregar dados do store (com cache invalidado)
        loadPatientsForUser()
      }
    } catch (error) {
      console.error('Error updating patient status:', error)
      alert(`Erro ao atualizar status do paciente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      // Clear loading state
      setUpdatingStatus(null)
      // Close dropdown
      setDropdownOpen(null)
    }
  }

  const statsCards = [
    {
      title: 'Total de Pacientes',
      value: patients.length,
      icon: User,
      color: 'text-blue-600'
    },
    {
      title: 'Pacientes Ativos',
      value: patients.filter(p => p.status === 'active').length,
      icon: Heart,
      color: 'text-green-600'
    },
    {
      title: 'Novos este Mês',
      value: patients.filter(p => {
        const createdAt = new Date(p.user.createdAt)
        const thisMonth = new Date()
        return createdAt.getMonth() === thisMonth.getMonth() && 
               createdAt.getFullYear() === thisMonth.getFullYear()
      }).length,
      icon: Calendar,
      color: 'text-purple-600'
    },
    {
      title: 'Pendentes',
      value: patients.filter(p => p.status === 'pending').length,
      icon: AlertTriangle,
      color: 'text-yellow-600'
    }
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gerenciar Pacientes
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'DOCTOR' && 'Seus pacientes e histórico médico'}
              {user?.role === 'ADMIN' && 'Todos os pacientes da clínica'}
              {user?.role === 'RECEPTIONIST' && 'Cadastro e atendimento de pacientes'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={exportPatients}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => router.push('/patients/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, email, CPF ou telefone..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-primary/10 focus:shadow-md hover:bg-gray-50 transition-all duration-200"
                >
                  <option value="all" className="text-gray-900 bg-white hover:bg-primary/10">Todos</option>
                  <option value="active" className="text-gray-900 bg-white hover:bg-primary/10">Ativos</option>
                  <option value="inactive" className="text-gray-900 bg-white hover:bg-primary/10">Inativos</option>
                  <option value="pending" className="text-gray-900 bg-white hover:bg-primary/10">Pendentes</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pacientes ({filteredPatients.length})
            </CardTitle>
            <CardDescription>
              Lista de todos os pacientes cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Nenhum paciente encontrado com os filtros aplicados' 
                    : 'Nenhum paciente cadastrado ainda'}
                </p>
                {!searchTerm && (
                  <Button className="mt-4" onClick={() => router.push('/patients/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Paciente
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPatients.map((patient) => (
                  <div 
                    key={patient.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <UserAvatar 
                        src={patient.user.avatar} 
                        name={patient.user.name}
                        size="lg"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-lg">
                            {patient.user.name || 'Nome não disponível'}
                          </h4>
                          {getStatusBadge(patient.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {patient.user.email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {patient.phone}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {patient.address}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {patient.totalAppointments} consultas
                          </div>
                          {patient.lastAppointment && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Última: {patient.lastAppointment.toLocaleDateString('pt-BR')}
                            </div>
                          )}
                          {patient.nextAppointment && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-green-600" />
                              Próxima: {patient.nextAppointment.toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/patients/${patient.id}`)}
                        title="Ver detalhes do paciente"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/patients/${patient.id}/edit`)}
                        title="Editar paciente"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/appointments/new?patientId=' + patient.id)}
                        title="Agendar nova consulta"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <div className="relative">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="Mais opções"
                          onClick={() => {
                            setDropdownOpen(dropdownOpen === patient.id ? null : patient.id)
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        
                        {dropdownOpen === patient.id && (
                          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                              Status do Paciente
                            </div>
                            <button
                              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => togglePatientStatus(patient.id, patient.status)}
                              disabled={updatingStatus === patient.id}
                            >
                              {updatingStatus === patient.id ? (
                                <>
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mr-3">
                                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">Atualizando...</div>
                                    <div className="text-xs text-gray-500">Aguarde</div>
                                  </div>
                                </>
                              ) : patient.status === 'active' ? (
                                <>
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 mr-3 group-hover:bg-orange-200 transition-colors">
                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">Inativar Paciente</div>
                                    <div className="text-xs text-gray-500">Desabilitar acesso ao sistema</div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mr-3 group-hover:bg-green-200 transition-colors">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">Ativar Paciente</div>
                                    <div className="text-xs text-gray-500">Permitir acesso ao sistema</div>
                                  </div>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {filteredPatients.length > 10 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" className="bg-primary text-white">
                        1
                      </Button>
                      <Button variant="outline" size="sm">
                        2
                      </Button>
                      <Button variant="outline" size="sm">
                        3
                      </Button>
                      <Button variant="outline" size="sm">
                        Próximo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  )
}