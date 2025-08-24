'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/ui/user-avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Mic, MicOff, Loader2, Calendar, Phone, MapPin } from 'lucide-react'
import { useChatStore } from '@/store/chat'
import { useAuthStore } from '@/store/auth'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface QuickAction {
  label: string
  action: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Agendar consulta', action: 'Gostaria de agendar uma consulta' },
  { label: 'Cancelar agendamento', action: 'Preciso cancelar um agendamento' },
  { label: 'Reagendar consulta', action: 'Gostaria de reagendar uma consulta' },
  { label: 'Horário de funcionamento', action: 'Qual o horário de funcionamento?' },
  { label: 'Localização', action: 'Onde fica a clínica?' },
  { label: 'Especialidades', action: 'Quais especialidades vocês atendem?' }
]

export function ChatInterface() {
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { messages, isLoading, sendMessage, clearChat } = useChatStore()
  const { user } = useAuthStore()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim()) return
    
    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
    setTimeout(() => handleSend(), 100)
  }

  const handleVoiceToggle = () => {
    if (isRecording) {
      // Stop recording logic would go here
      setIsRecording(false)
    } else {
      // Start recording logic would go here
      // For now, just toggle state
      setIsRecording(true)
      // Simulate stopping after 3 seconds
      setTimeout(() => setIsRecording(false), 3000)
    }
  }

  const MessageBubble = ({ message }: { message: any }) => {
    const isUser = message.sender === 'user'
    const isSystem = message.sender === 'system'
    
    return (
      <div className={cn(
        'flex gap-3 mb-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
{isUser ? (
          <UserAvatar 
            src={user?.avatar} 
            name={user?.fullName || user?.name}
            size="sm"
            className="flex-shrink-0"
          />
        ) : (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          'max-w-[80%] rounded-lg px-3 py-2',
          isUser 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted',
          isSystem && 'bg-blue-50 border border-blue-200 text-blue-800'
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <p className={cn(
            'text-xs mt-1 opacity-70',
            isUser ? 'text-right' : 'text-left'
          )}>
            {formatTime(message.timestamp)}
          </p>
          
          {/* Display extracted entities or actions */}
          {message.metadata?.entities && message.metadata.entities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.metadata.entities.map((entity: any, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {entity.type}: {entity.value}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">Assistente Virtual EO</h2>
              <p className="text-sm text-muted-foreground">Online - Resposta instantânea</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearChat}
          >
            Nova Conversa
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Olá! Como posso ajudar?</h3>
              <p className="text-muted-foreground">
                Sou sua assistente virtual. Posso ajudar com agendamentos, 
                informações sobre a clínica e muito mais!
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
              {QUICK_ACTIONS.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start h-auto p-3"
                  onClick={() => handleQuickAction(action.action)}
                >
                  <div>
                    <div className="font-medium text-sm">{action.label}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 mb-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm text-muted-foreground">Digitando...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        {/* Voice Recording Indicator */}
        {isRecording && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
              Gravando... Fale agora
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={handleVoiceToggle}
            className="flex-shrink-0"
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Pressione Enter para enviar, Shift+Enter para quebrar linha
        </p>
      </div>
    </div>
  )
}