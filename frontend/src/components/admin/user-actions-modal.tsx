'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

// Simple Input and Label components
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <input
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${className || ''}`}
    {...props}
  />
)

const Label = ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className="text-sm font-medium text-gray-700" {...props}>
    {children}
  </label>
)
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  X
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  cpf?: string
  role: string
  status: 'active' | 'inactive' | 'suspended'
  lastLogin: Date | string
  createdAt: Date | string
  avatar?: string
}

interface UserActionsModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  mode: 'view' | 'edit' | 'suspend' | 'create'
  onSave?: (userData: Partial<User>) => void
  onSuspend?: (userId: string, reason: string) => void
  onActivate?: (userId: string) => void
  onCreate?: (userData: any) => void
}

export function UserActionsModal({
  user,
  isOpen,
  onClose,
  mode,
  onSave,
  onSuspend,
  onActivate,
  onCreate
}: UserActionsModalProps) {
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create')
  const [editData, setEditData] = useState<Partial<User>>({})
  const [suspendReason, setSuspendReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user && mode !== 'create') return null

  const handleSave = async () => {
    if (mode === 'create' && onCreate) {
      setLoading(true)
      try {
        await onCreate(editData)
        onClose()
      } catch (error) {
        console.error('Error creating user:', error)
      } finally {
        setLoading(false)
      }
    } else if (onSave && user) {
      setLoading(true)
      try {
        await onSave({ ...editData, id: user.id })
        setIsEditing(false)
        onClose()
      } catch (error) {
        console.error('Error saving user:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSuspend = async () => {
    if (!onSuspend || !suspendReason.trim() || !user) return
    setLoading(true)
    try {
      await onSuspend(user.id, suspendReason)
      onClose()
    } catch (error) {
      console.error('Error suspending user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!onActivate || !user) return
    setLoading(true)
    try {
      await onActivate(user.id)
      onClose()
    } catch (error) {
      console.error('Error activating user:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      if (isNaN(dateObj.getTime())) return 'Data não disponível'
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj)
    } catch {
      return 'Data não disponível'
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Ativo', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo', icon: AlertCircle },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspenso', icon: X }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    const Icon = config.icon

    return (
      <Badge className={`${config.color} border-0 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { color: 'bg-purple-100 text-purple-800', label: 'Admin' },
      DOCTOR: { color: 'bg-blue-100 text-blue-800', label: 'Médico' },
      PATIENT: { color: 'bg-green-100 text-green-800', label: 'Paciente' },
      RECEPTIONIST: { color: 'bg-yellow-100 text-yellow-800', label: 'Recepcionista' }
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.PATIENT

    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const getDialogTitle = () => {
    if (mode === 'suspend') return 'Suspender Usuário'
    if (mode === 'create') return 'Criar Novo Usuário'
    if (isEditing) return 'Editar Usuário'
    return 'Detalhes do Usuário'
  }

  const getDialogDescription = () => {
    if (mode === 'suspend') return 'Suspender o usuário impedirá o acesso ao sistema'
    if (mode === 'create') return 'Preencha as informações do novo usuário'
    if (isEditing) return 'Edite as informações do usuário'
    return 'Visualize as informações detalhadas do usuário'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Avatar and Basic Info */}
          {mode !== 'create' && user && (
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <UserAvatar 
                src={user.avatar}
                name={user.name}
                size="lg"
                className="h-16 w-16"
              />
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user.status)}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              {mode !== 'suspend' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={loading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancelar' : 'Editar'}
                </Button>
              )}
            </div>
          )}

          {/* Suspend Mode */}
          {mode === 'suspend' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Atenção</h4>
                    <p className="text-sm text-red-700">
                      O usuário será impedido de acessar o sistema. Esta ação pode ser revertida posteriormente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="suspend-reason">Motivo da suspensão *</Label>
                <Textarea
                  id="suspend-reason"
                  placeholder="Descreva o motivo da suspensão do usuário..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                />
              </div>

              {user.status === 'suspended' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-blue-800">Usuário já está suspenso</h4>
                      <p className="text-sm text-blue-700">
                        Você pode reativar este usuário clicando no botão &quot;Reativar Usuário&quot;.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit/View/Create Mode Fields */}
          {mode !== 'suspend' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={mode === 'create' ? (editData.name ?? '') : (isEditing ? (editData.name ?? user?.name) : user?.name)}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  disabled={!isEditing && mode !== 'create'}
                  placeholder={mode === 'create' ? 'Digite o nome completo' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={mode === 'create' ? (editData.email ?? '') : (isEditing ? (editData.email ?? user?.email) : user?.email)}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  disabled={!isEditing && mode !== 'create'}
                  placeholder={mode === 'create' ? 'Digite o email' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={mode === 'create' ? (editData.phone ?? '') : (isEditing ? (editData.phone ?? user?.phone ?? '') : (user?.phone ?? ''))}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  disabled={!isEditing && mode !== 'create'}
                  placeholder={mode === 'create' ? 'Digite o telefone' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={mode === 'create' ? (editData.cpf ?? '') : (user?.cpf ?? 'Não informado')}
                  onChange={(e) => setEditData({ ...editData, cpf: e.target.value })}
                  disabled={mode !== 'create'}
                  placeholder={mode === 'create' ? 'Digite o CPF' : ''}
                />
              </div>

              {mode === 'create' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={editData.password ?? ''}
                      onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                      placeholder="Digite a senha"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <select
                      id="role"
                      value={editData.role ?? 'PATIENT'}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="PATIENT">Paciente</option>
                      <option value="DOCTOR">Médico</option>
                      <option value="RECEPTIONIST">Recepcionista</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </>
              )}

              {mode !== 'create' && user && (
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Último Login</Label>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(user.lastLogin)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cadastro</Label>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {mode === 'suspend' ? (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {user.status === 'suspended' ? (
                  <Button onClick={handleActivate} disabled={loading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reativar Usuário
                  </Button>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={handleSuspend} 
                    disabled={loading || !suspendReason.trim()}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Suspender Usuário
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                {isEditing || mode === 'create' ? 'Cancelar' : 'Fechar'}
              </Button>
              {(isEditing || mode === 'create') && (
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}