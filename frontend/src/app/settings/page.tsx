'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Camera,
  Edit,
  Trash2,
  Info,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Calendar,
  Clock,
  Languages
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useTheme } from '@/providers/theme-provider'
import { useToast, toastUtils } from '@/hooks/use-toast'

// Helper function to build safe avatar URL - only allow external URLs
const getSafeAvatarUrl = (avatarPath: string | undefined) => {
  if (!avatarPath || typeof avatarPath !== 'string') return undefined
  
  // Only allow external URLs (http/https) or data URLs
  if (avatarPath.startsWith('https://') || 
      avatarPath.startsWith('http://') || 
      avatarPath.startsWith('data:image/')) {
    return avatarPath
  }
  
  // Reject local paths to avoid 404 errors
  return undefined
}

interface UserSettings {
  profile: {
    firstName: string
    lastName: string
    email: string
    phone: string
    avatar?: string
    bio?: string
    timezone: string
    language: string
  }
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    appointmentReminders: boolean
    cancellationAlerts: boolean
    promotionalEmails: boolean
    systemUpdates: boolean
    reminderTiming: number // hours before
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts'
    shareActivityStatus: boolean
    allowDirectMessages: boolean
    showOnlineStatus: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    fontSize: 'small' | 'medium' | 'large'
    reducedMotion: boolean
    highContrast: boolean
  }
  security: {
    twoFactorEnabled: boolean
    loginNotifications: boolean
    sessionTimeout: number // minutes
  }
}

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR'
    },
    notifications: {
      email: true,
      sms: true,
      push: true,
      appointmentReminders: true,
      cancellationAlerts: true,
      promotionalEmails: false,
      systemUpdates: true,
      reminderTiming: 24
    },
    privacy: {
      profileVisibility: 'contacts',
      shareActivityStatus: true,
      allowDirectMessages: true,
      showOnlineStatus: true
    },
    appearance: {
      theme: 'light',
      fontSize: 'medium',
      reducedMotion: false,
      highContrast: false
    },
    security: {
      twoFactorEnabled: false,
      loginNotifications: true,
      sessionTimeout: 60
    }
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isLoadingRef = useRef(false)
  
  // Theme provider hook
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    // Hydrate the persisted store
    if (typeof window !== 'undefined') {
      useAuthStore.persist.rehydrate()
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user && isAuthenticated && !isLoadingRef.current) {
      loadUserSettings()
    }
  }, [user, isAuthenticated])

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Settings loading timeout - forcing load with fallback data')
        setLoadingTimeout(true)
        setLoading(false)
      }
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [loading])

  // Sync theme from ThemeProvider to local settings
  useEffect(() => {
    if (theme && settings.appearance.theme !== theme) {
      setSettings(prev => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          theme: theme
        }
      }))
    }
  }, [theme, settings.appearance.theme])

  const loadUserSettings = async () => {
    if (!user || isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setLoading(true)
    
    // Check if we're in development mode with fake token
    const authStore = useAuthStore.getState()
    const isDevelopmentMode = process.env.NODE_ENV === 'development'
    const hasFakeToken = authStore.token === 'fake-jwt-token-for-testing'
    
    try {
      // Skip API call in development with fake token to avoid 401 errors
      if (isDevelopmentMode && hasFakeToken) {
        console.log('🧪 Development mode: Using fallback user data instead of API call')
        setSettings(prev => ({
          ...prev,
          profile: {
            firstName: user.firstName || user.name?.split(' ')[0] || '',
            lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            phone: '',
            timezone: 'America/Sao_Paulo',
            language: 'pt-BR',
            bio: ''
          }
        }))
        return
      }
      
      console.log('🔄 Loading user settings for:', user.email)
      console.log('📡 Making API call to /api/v1/auth/me...')
      const response = await apiClient.get('/api/v1/auth/me')
      console.log('📡 API Response received:', response)
      
      if (response.success && response.data) {
        const userData = response.data
        console.log('✅ User data loaded successfully:', userData)
        
        setSettings(prev => ({
          ...prev,
          profile: {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            timezone: userData.timezone || 'America/Sao_Paulo',
            language: userData.language || 'pt-BR',
            bio: userData.bio || ''
          },
          notifications: userData.settings?.notifications || prev.notifications,
          privacy: userData.settings?.privacy || prev.privacy,
          appearance: userData.settings?.appearance || prev.appearance,
          security: userData.settings?.security || prev.security
        }))
      } else {
        console.warn('⚠️ API response was not successful:', response.error?.message || 'Unknown error')
        console.log('🔄 Using fallback data from user object:', user)
        // Fallback to basic user data
        setSettings(prev => ({
          ...prev,
          profile: {
            firstName: user.firstName || user.name?.split(' ')[0] || '',
            lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            phone: '',
            timezone: 'America/Sao_Paulo',
            language: 'pt-BR',
            bio: ''
          }
        }))
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error)
      // Fallback to basic user data on error
      setSettings(prev => ({
        ...prev,
        profile: {
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: '',
          timezone: 'America/Sao_Paulo',
          language: 'pt-BR',
          bio: ''
        }
      }))
    } finally {
      console.log('✅ Settings loading completed')
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  const saveSettings = async (section?: string) => {
    setSaving(true)
    try {
      console.log('💾 Saving settings:', section || 'all', settings)
      
      const response = await apiClient.patch('/api/v1/users/profile', {
        firstName: settings.profile.firstName,
        lastName: settings.profile.lastName,
        phone: settings.profile.phone,
        timezone: settings.profile.timezone,
        bio: settings.profile.bio,
        settings: {
          notifications: settings.notifications,
          privacy: settings.privacy,
          appearance: settings.appearance,
          security: {
            twoFactorEnabled: settings.security.twoFactorEnabled,
            loginNotifications: settings.security.loginNotifications,
            sessionTimeout: settings.security.sessionTimeout
          }
        }
      })
      
      if (response.success) {
        console.log('✅ Settings saved successfully:', section || 'all')
        toastUtils.success(
          'Configurações salvas!', 
          `Suas configurações de ${section === 'profile' ? 'perfil' : section === 'notifications' ? 'notificações' : section === 'privacy' ? 'privacidade' : section === 'appearance' ? 'aparência' : 'segurança'} foram atualizadas com sucesso.`
        )
      } else {
        console.error('❌ Save failed:', response.error)
        throw new Error(response.error?.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('❌ Error saving settings:', error)
      toastUtils.error(
        'Erro ao salvar configurações',
        'Houve um problema ao salvar suas configurações. Tente novamente.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toastUtils.error('Arquivo muito grande', 'Por favor, selecione uma imagem menor que 5MB.')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toastUtils.error('Tipo de arquivo inválido', 'Por favor, selecione apenas arquivos de imagem.')
        return
      }
      
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return
    
    const formData = new FormData()
    formData.append('avatar', avatarFile)
    
    try {
      setSaving(true)
      toastUtils.loading('Enviando foto...', 'Aguarde enquanto sua foto é enviada.')
      
      const response = await apiClient.post('/api/v1/users/avatar', formData)
      
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            avatar: response.data.avatarUrl
          }
        }))
        setAvatarFile(null)
        setAvatarPreview(null)
        toastUtils.success('Foto atualizada!', 'Sua foto de perfil foi atualizada com sucesso.')
      } else {
        throw new Error(response.error?.message || 'Failed to upload avatar')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toastUtils.error('Erro ao enviar foto', 'Houve um problema ao enviar sua foto. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      setSaving(true)
      const response = await apiClient.delete('/api/v1/users/avatar')
      
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            avatar: undefined
          }
        }))
        toastUtils.success('Foto removida!', 'Sua foto de perfil foi removida com sucesso.')
      } else {
        throw new Error(response.error?.message || 'Failed to remove avatar')
      }
    } catch (error) {
      console.error('Error removing avatar:', error)
      toastUtils.error('Erro ao remover foto', 'Houve um problema ao remover sua foto. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toastUtils.warning('Campos obrigatórios', 'Por favor, preencha todos os campos de senha.')
      return
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toastUtils.error('Senhas não coincidem', 'A nova senha e a confirmação devem ser iguais.')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      toastUtils.warning('Senha muito curta', 'A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    
    try {
      setSaving(true)
      const response = await apiClient.patch('/api/v1/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      if (response.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        toastUtils.success('Senha alterada!', 'Sua senha foi alterada com sucesso.')
      } else {
        throw new Error(response.error?.message || 'Failed to change password')
      }
    } catch (error: any) {
      console.error('Error changing password:', error)
      if (error.response?.status === 401) {
        toastUtils.error('Senha atual incorreta', 'A senha atual informada está incorreta.')
      } else {
        toastUtils.error('Erro ao alterar senha', 'Houve um problema ao alterar sua senha. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    
    // If updating theme, also update ThemeProvider
    if (section === 'appearance' && key === 'theme') {
      setTheme(value)
    }
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas preferências e configurações de conta
            </p>
            {loadingTimeout && (
              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md text-sm text-yellow-800">
                ⚠️ Algumas configurações podem não ter sido carregadas completamente.
              </div>
            )}
          </div>
          <Button onClick={() => saveSettings()} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Tudo
              </>
            )}
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize suas informações de perfil e dados pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <UserAvatar 
                    src={avatarPreview || getSafeAvatarUrl(settings.profile.avatar)}
                    name={`${settings.profile.firstName} ${settings.profile.lastName}`}
                    className="h-24 w-24"
                    fallbackClassName="text-lg font-semibold"
                  />
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-lg">Foto do Perfil</h3>
                      <p className="text-sm text-muted-foreground">
                        Escolha uma foto para representar seu perfil
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Alterar Foto
                      </Button>
                      {(avatarFile || settings.profile.avatar) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={avatarFile ? () => { setAvatarFile(null); setAvatarPreview(null) } : handleRemoveAvatar}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {avatarFile ? 'Cancelar' : 'Remover'}
                        </Button>
                      )}
                      {avatarFile && (
                        <Button 
                          size="sm"
                          onClick={handleAvatarUpload}
                          disabled={saving}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Foto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome</label>
                    <input
                      type="text"
                      value={settings.profile.firstName}
                      onChange={(e) => updateSetting('profile', 'firstName', e.target.value)}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sobrenome</label>
                    <input
                      type="text"
                      value={settings.profile.lastName}
                      onChange={(e) => updateSetting('profile', 'lastName', e.target.value)}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => updateSetting('profile', 'email', e.target.value)}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <input
                      type="tel"
                      value={settings.profile.phone}
                      onChange={(e) => updateSetting('profile', 'phone', e.target.value)}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fuso Horário</label>
                    <select
                      value={settings.profile.timezone}
                      onChange={(e) => updateSetting('profile', 'timezone', e.target.value)}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                      <option value="America/Manaus">Manaus (GMT-4)</option>
                      <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Idioma</label>
                    <select
                      value={settings.profile.language}
                      onChange={(e) => updateSetting('profile', 'language', e.target.value)}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Biografia</label>
                  <textarea
                    value={settings.profile.bio}
                    onChange={(e) => updateSetting('profile', 'bio', e.target.value)}
                    rows={4}
                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Conte um pouco sobre você..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo 500 caracteres
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveSettings('profile')} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Preferências de Notificação
                </CardTitle>
                <CardDescription>
                  Configure como e quando você deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Methods */}
                <div>
                  <h3 className="font-semibold mb-4">Métodos de Notificação</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">Receber notificações por email</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email}
                          onChange={(e) => updateSetting('notifications', 'email', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">SMS</p>
                          <p className="text-sm text-muted-foreground">Receber notificações por SMS</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sms}
                          onChange={(e) => updateSetting('notifications', 'sms', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Push</p>
                          <p className="text-sm text-muted-foreground">Notificações push no navegador</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.push}
                          onChange={(e) => updateSetting('notifications', 'push', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Notification Types */}
                <div>
                  <h3 className="font-semibold mb-4">Tipos de Notificação</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Lembretes de Consulta</p>
                          <p className="text-sm text-muted-foreground">Lembrar sobre consultas agendadas</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.appointmentReminders}
                          onChange={(e) => updateSetting('notifications', 'appointmentReminders', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium">Cancelamentos</p>
                          <p className="text-sm text-muted-foreground">Notificar sobre cancelamentos</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.cancellationAlerts}
                          onChange={(e) => updateSetting('notifications', 'cancellationAlerts', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Timing Settings */}
                <div>
                  <h3 className="font-semibold mb-4">Timing de Lembretes</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Lembrar com antecedência de:</label>
                      <select
                        value={settings.notifications.reminderTiming}
                        onChange={(e) => updateSetting('notifications', 'reminderTiming', parseInt(e.target.value))}
                        className="w-full mt-2 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={1}>1 hora</option>
                        <option value={2}>2 horas</option>
                        <option value={6}>6 horas</option>
                        <option value={24}>1 dia</option>
                        <option value={48}>2 dias</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveSettings('notifications')} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Notificações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Configurações de Privacidade
                </CardTitle>
                <CardDescription>
                  Controle quem pode ver suas informações e atividades
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Visibilidade do Perfil</h3>
                    <select
                      value={settings.privacy.profileVisibility}
                      onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="public">Público</option>
                      <option value="contacts">Apenas Contatos</option>
                      <option value="private">Privado</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compartilhar Status de Atividade</p>
                      <p className="text-sm text-muted-foreground">Permitir que outros vejam quando você está online</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.privacy.shareActivityStatus}
                        onChange={(e) => updateSetting('privacy', 'shareActivityStatus', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveSettings('privacy')} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Privacidade
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Preferências de Aparência
                </CardTitle>
                <CardDescription>
                  Personalize a aparência do sistema. Tema atual: <strong>{theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Tema</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        settings.appearance.theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => updateSetting('appearance', 'theme', 'light')}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Sun className="h-8 w-8" />
                        <span className="font-medium">Claro</span>
                      </div>
                    </div>
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        settings.appearance.theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => updateSetting('appearance', 'theme', 'dark')}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Moon className="h-8 w-8" />
                        <span className="font-medium">Escuro</span>
                      </div>
                    </div>
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        settings.appearance.theme === 'system' ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => updateSetting('appearance', 'theme', 'system')}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Monitor className="h-8 w-8" />
                        <span className="font-medium">Sistema</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Tamanho da Fonte</label>
                  <select
                    value={settings.appearance.fontSize}
                    onChange={(e) => updateSetting('appearance', 'fontSize', e.target.value)}
                    className="w-full mt-2 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="small">Pequena</option>
                    <option value="medium">Média</option>
                    <option value="large">Grande</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveSettings('appearance')} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Aparência
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>
                  Gerencie a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Autenticação de Dois Fatores</p>
                      <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {settings.security.twoFactorEnabled ? (
                        <Badge variant="secondary" className="text-green-700 bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inativo
                        </Badge>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateSetting('security', 'twoFactorEnabled', !settings.security.twoFactorEnabled)}
                      >
                        {settings.security.twoFactorEnabled ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Alterar Senha</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Senha Atual</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full p-3 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Digite sua senha atual"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nova Senha</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Digite a nova senha (mín. 6 caracteres)"
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Confirmar Nova Senha</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Confirme a nova senha"
                        />
                      </div>
                      <Button onClick={handlePasswordChange} disabled={saving}>
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Alterando...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Alterar Senha
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveSettings('security')} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Segurança
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer with Copyright */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>&copy; 2025 Jtarcio Desenvolvimento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </AppLayout>
  )
}