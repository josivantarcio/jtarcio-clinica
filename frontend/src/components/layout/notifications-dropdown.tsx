'use client'

import * as React from 'react'
import { Bell, Check, CheckCheck, Trash2, Clock, Bot, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useNotificationsStore } from '@/store/notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const getNotificationIcon = (type: string, aiGenerated?: boolean) => {
  if (aiGenerated) {
    return (
      <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <Bot className="h-2.5 w-2.5 text-white" />
      </div>
    )
  }
  
  switch (type) {
    case 'appointment':
      return (
        <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <Calendar className="h-2.5 w-2.5 text-white" />
        </div>
      )
    case 'ai_booking':
      return (
        <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
          <Bot className="h-2.5 w-2.5 text-white" />
        </div>
      )
    case 'reminder':
      return (
        <div className="w-4 h-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
          <Clock className="h-2.5 w-2.5 text-white" />
        </div>
      )
    case 'system':
      return (
        <div className="w-4 h-4 bg-gradient-to-br from-slate-500 to-gray-600 rounded-full flex items-center justify-center">
          <Bell className="h-2.5 w-2.5 text-white" />
        </div>
      )
    case 'urgent':
      return (
        <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center animate-pulse">
          <Bell className="h-2.5 w-2.5 text-white" />
        </div>
      )
    default:
      return (
        <div className="w-4 h-4 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full flex items-center justify-center">
          <Bell className="h-2.5 w-2.5 text-white" />
        </div>
      )
  }
}

const getNotificationStyles = (type: string, priority: string, read: boolean, aiGenerated?: boolean) => {
  const baseStyles = "relative p-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
  
  if (aiGenerated) {
    return `${baseStyles} ${
      !read 
        ? 'bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 border-2 border-blue-200 shadow-md shadow-blue-200/30' 
        : 'bg-gradient-to-br from-blue-50/40 via-purple-50/40 to-blue-50/40 border border-blue-100'
    }`
  }
  
  switch (type) {
    case 'appointment':
      return `${baseStyles} ${
        !read 
          ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 border-2 border-green-200 shadow-md shadow-green-200/30' 
          : 'bg-gradient-to-br from-green-50/40 via-emerald-50/40 to-green-50/40 border border-green-100'
      }`
    case 'ai_booking':
      return `${baseStyles} ${
        !read 
          ? 'bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-50 border-2 border-cyan-200 shadow-md shadow-cyan-200/30' 
          : 'bg-gradient-to-br from-cyan-50/40 via-blue-50/40 to-cyan-50/40 border border-cyan-100'
      }`
    case 'reminder':
      return `${baseStyles} ${
        !read 
          ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 shadow-md shadow-amber-200/30' 
          : 'bg-gradient-to-br from-amber-50/40 via-orange-50/40 to-amber-50/40 border border-amber-100'
      }`
    case 'urgent':
      return `${baseStyles} ${
        !read 
          ? 'bg-gradient-to-br from-red-50 via-rose-50 to-red-50 border-2 border-red-300 shadow-lg shadow-red-200/40 animate-pulse' 
          : 'bg-gradient-to-br from-red-50/40 via-rose-50/40 to-red-50/40 border border-red-100'
      }`
    case 'system':
      return `${baseStyles} ${
        !read 
          ? 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 border-2 border-slate-200 shadow-md shadow-slate-200/30' 
          : 'bg-gradient-to-br from-slate-50/40 via-gray-50/40 to-slate-50/40 border border-slate-100'
      }`
    default:
      return `${baseStyles} ${
        !read 
          ? 'bg-gradient-to-br from-gray-50 via-slate-50 to-gray-50 border-2 border-gray-200 shadow-md shadow-gray-200/30' 
          : 'bg-gradient-to-br from-gray-50/40 via-slate-50/40 to-gray-50/40 border border-gray-100'
      }`
  }
}

export function NotificationsDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  } = useNotificationsStore()

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    markAsRead(id)
  }

  const handleRemoveNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeNotification(id)
  }

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: ptBR 
      })
    } catch {
      return 'há alguns minutos'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
                {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-6 px-2 text-xs hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 text-green-700 hover:text-green-800 transition-all duration-200"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Ler todas
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificação</p>
            <p className="text-xs">Você está em dia!</p>
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {notifications.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className={getNotificationStyles(
                  notification.type, 
                  notification.priority, 
                  notification.read, 
                  notification.metadata?.aiGenerated
                )}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.metadata?.aiGenerated)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate drop-shadow-sm">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          notification.type === 'urgent' ? 'bg-red-500 animate-pulse' :
                          notification.metadata?.aiGenerated ? 'bg-blue-500' :
                          notification.type === 'appointment' ? 'bg-green-500' :
                          notification.type === 'reminder' ? 'bg-amber-500' :
                          'bg-slate-500'
                        }`} />
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-700 mb-2 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatTimeAgo(notification.timestamp)}</span>
                      
                      {/* AI Badge */}
                      {notification.metadata?.aiGenerated && (
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-300 shadow-sm font-semibold"
                        >
                          <Bot className="h-2.5 w-2.5 mr-1" />
                          IA
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gradient-to-br hover:from-green-100 hover:to-emerald-100 rounded-full transition-all duration-200"
                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                        title="Marcar como lida"
                      >
                        <Check className="h-3 w-3 text-green-600 hover:text-green-700" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gradient-to-br hover:from-red-100 hover:to-rose-100 rounded-full transition-all duration-200"
                      onClick={(e) => handleRemoveNotification(e, notification.id)}
                      title="Remover notificação"
                    >
                      <Trash2 className="h-3 w-3 text-red-600 hover:text-red-700" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {notifications.length > 10 && (
              <div className="text-center py-2 text-xs text-muted-foreground border-t">
                +{notifications.length - 10} notificações mais antigas
              </div>
            )}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:text-red-700 transition-all duration-200"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar todas
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}