import api from './api';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
}

export interface Conversation {
  id: string;
  participants: Participant[];
  contract_id?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export const chatService = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get('/conversations');
    return response.data;
  },

  createConversation: async (participantId: string, contractId?: string): Promise<Conversation> => {
    const response = await api.post('/conversations', {
      participant_id: participantId,
      contract_id: contractId,
    });
    return response.data;
  },

  getMessages: async (conversationId: string, skip = 0, limit = 50): Promise<Message[]> => {
    const response = await api.get(`/conversations/${conversationId}/messages`, {
      params: { skip, limit },
    });
    return response.data;
  },

  sendMessage: async (conversationId: string, content: string): Promise<Message> => {
    const response = await api.post(`/conversations/${conversationId}/messages`, { content });
    return response.data;
  },
};
