'use client'

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, Search, User, LogOut, Settings } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/auth"
import { NotificationsDropdown } from "./notifications-dropdown"
import { AIDemoButton } from "./ai-demo-button"

interface HeaderProps {
  onMenuClick?: () => void
  showSidebar?: boolean
}

export function Header({ onMenuClick, showSidebar = true }: HeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  const handleSettings = () => {
    router.push('/settings')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="mr-4 flex">
          {showSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <span className="text-xs font-bold text-primary-foreground">EO</span>
            </div>
            <span className="hidden font-bold sm:inline-block">
              EO Clínica
            </span>
          </Link>
        </div>

        {/* Search */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar pacientes, consultas..."
                className="w-full pl-8 md:w-[300px] lg:w-[400px]"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* AI Demo Button (temporary) */}
            <AIDemoButton />
            
            {/* Notifications */}
            <NotificationsDropdown />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <UserAvatar 
                    src={user?.avatar} 
                    name={user?.fullName || user?.name}
                    size="sm"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.fullName || user?.name || ''}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfile}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}