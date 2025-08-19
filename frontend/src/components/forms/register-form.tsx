'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth"
import { cn, validateCPF, formatCPF, formatPhone } from "@/lib/utils"
import { cleanCPF } from "@/lib/cpf-validation"
import { apiClient } from "@/lib/api"

const registerSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  cpf: z.string().refine((cpf) => validateCPF(cpf), "CPF inválido"),
  phone: z.string().min(10, "Telefone inválido")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
})

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterFormProps {
  className?: string
  onSuccess?: () => void
}

export function RegisterForm({ className, onSuccess }: RegisterFormProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [cpfError, setCpfError] = React.useState<string>('')
  const [checkingCpf, setCheckingCpf] = React.useState(false)
  const router = useRouter()
  const { register: registerUser, isLoading, error, clearError } = useAuthStore()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  // Clear errors when component mounts
  React.useEffect(() => {
    clearError()
  }, [clearError])

  const checkCpfDuplicate = async (cpf: string) => {
    if (!cpf || cpf.trim() === '') {
      setCpfError('')
      return
    }

    const cleanedCpf = cleanCPF(cpf)
    if (cleanedCpf.length < 11) {
      setCpfError('')
      return
    }

    // First validate CPF format
    if (!validateCPF(cleanedCpf)) {
      setCpfError('CPF inválido')
      return
    }

    setCheckingCpf(true)
    setCpfError('')
    
    try {
      const response = await apiClient.request({
        method: 'GET',
        url: `/api/v1/users/check-cpf/${cleanedCpf}`
      })
      
      if (response.success && response.data.exists) {
        const existingUser = response.data.user
        setCpfError(`CPF já cadastrado para: ${existingUser.fullName} (${existingUser.email})`)
      }
    } catch (error) {
      console.error('Error checking CPF:', error)
    } finally {
      setCheckingCpf(false)
    }
  }

  // Format CPF and phone as user types
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setValue('cpf', formatCPF(value))
    setCpfError('')
  }

  const handleCPFBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    checkCpfDuplicate(e.target.value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setValue('phone', formatPhone(value))
  }

  const onSubmit = async (data: RegisterFormData) => {
    // Check if there are CPF errors
    if (cpfError) {
      return
    }

    // Final CPF validation before submit
    if (!validateCPF(data.cpf)) {
      setCpfError('CPF inválido')
      return
    }

    const userData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: 'PATIENT', // Default role for registration
      cpf: data.cpf.replace(/\D/g, ''),
      phone: data.phone.replace(/\D/g, '')
    }
    
    const success = await registerUser(userData)
    
    if (success) {
      onSuccess?.()
      router.push('/dashboard')
    }
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          Criar Conta
        </CardTitle>
        <CardDescription className="text-center">
          Preencha os dados abaixo para criar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Seu nome"
                disabled={isLoading}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Seu sobrenome"
                disabled={isLoading}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              disabled={isLoading}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <div className="relative">
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                disabled={isLoading}
                {...register("cpf")}
                onChange={handleCPFChange}
                onBlur={handleCPFBlur}
                className={`${errors.cpf || cpfError ? 'border-destructive' : ''}`}
              />
              {checkingCpf && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </div>
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
            {cpfError && (
              <p className="text-sm text-destructive">{cpfError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="text"
              placeholder="(00) 00000-0000"
              disabled={isLoading}
              {...register("phone")}
              onChange={handlePhoneChange}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={isLoading}
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                disabled={isLoading}
                {...register("confirmPassword")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              "Criar Conta"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-normal text-primary hover:underline"
              onClick={() => router.push('/auth/login')}
            >
              Entrar
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}