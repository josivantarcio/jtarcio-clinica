import { create } from 'zustand'
import { ChatMessage } from '@/types'
import { apiClient } from '@/lib/api'

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isTyping: boolean
  conversationId: string | null
  error: string | null
  
  // Actions
  sendMessage: (message: string) => Promise<void>
  loadChatHistory: (conversationId: string) => Promise<void>
  clearChat: () => void
  setTyping: (typing: boolean) => void
  clearError: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isTyping: false,
  conversationId: null,
  error: null,

  sendMessage: async (message: string) => {
    const { conversationId } = get()
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    }
    
    set(state => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null
    }))
    
    try {
      const response = await apiClient.sendChatMessage(message, conversationId || undefined)
      
      if (response.success && response.data) {
        const aiMessage: ChatMessage = {
          id: response.data.id || Date.now().toString(),
          content: response.data.response || response.data.content,
          sender: 'assistant',
          timestamp: new Date(response.data.timestamp || Date.now()),
          metadata: response.data.metadata
        }
        
        set(state => ({
          messages: [...state.messages, aiMessage],
          conversationId: response.data.conversationId || conversationId,
          isLoading: false
        }))
      } else {
        set({
          error: response.error?.message || 'Failed to send message',
          isLoading: false
        })
      }
    } catch (_error) {
      set({
        error: 'Network error',
        isLoading: false
      })
    }
  },

  loadChatHistory: async (conversationId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getChatHistory(conversationId)
      
      if (response.success && response.data) {
        set({
          messages: response.data.messages || [],
          conversationId,
          isLoading: false
        })
      } else {
        set({
          error: response.error?.message || 'Failed to load chat history',
          isLoading: false
        })
      }
    } catch (_error) {
      set({
        error: 'Network error',
        isLoading: false
      })
    }
  },

  clearChat: () => {
    set({
      messages: [],
      conversationId: null,
      error: null
    })
  },

  setTyping: (typing: boolean) => {
    set({ isTyping: typing })
  },

  clearError: () => {
    set({ error: null })
  }
}))