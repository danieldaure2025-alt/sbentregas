'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  Send,
  Image as ImageIcon,
  Loader2,
  User,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  imageUrl?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    image?: string;
  };
}

interface ChatBoxProps {
  orderId: string;
  onClose?: () => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

const POLL_INTERVAL = 5000; // 5 segundos

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'text-red-400',
  CLIENT: 'text-blue-400',
  DELIVERY_PERSON: 'text-green-400',
  ESTABLISHMENT: 'text-purple-400',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CLIENT: 'Cliente',
  DELIVERY_PERSON: 'Entregador',
  ESTABLISHMENT: 'Estabelecimento',
};

export function ChatBox({ orderId, onClose, minimized = false, onToggleMinimize }: ChatBoxProps) {
  const { data: session } = useSession() || {};
  const { toast } = useToast();
  
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?orderId=${orderId}`);
      const data = await res.json();

      if (data.chat) {
        setChatId(data.chat.id);
        setMessages(data.chat.messages || []);
      } else {
        // Criar chat se não existir
        const createRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const createData = await createRes.json();
        if (createData.chat) {
          setChatId(createData.chat.id);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    
    try {
      const res = await fetch(`/api/chat/${chatId}/messages`);
      const data = await res.json();
      
      if (data.messages) {
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
            return data.messages;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [chatId]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  useEffect(() => {
    if (!chatId || minimized) return;

    // Poll para novas mensagens
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [chatId, minimized, fetchMessages]);

  useEffect(() => {
    if (!minimized) {
      scrollToBottom();
    }
  }, [messages, minimized, scrollToBottom]);

  const handleSend = async () => {
    if (!newMessage.trim() || !chatId || sending) return;

    setSending(true);
    const messageContent = newMessage;
    setNewMessage('');

    try {
      const res = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent, type: 'TEXT' }),
      });

      if (!res.ok) throw new Error('Erro ao enviar mensagem');

      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível enviar a mensagem', variant: 'destructive' });
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    setUploading(true);

    try {
      // 1. Obter URL de upload
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true,
        }),
      });

      if (!presignedRes.ok) throw new Error('Erro ao obter URL de upload');

      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // 2. Upload da imagem
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': file.type,
          'Content-Disposition': 'attachment',
        },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Erro ao fazer upload da imagem');

      // 3. Construir URL pública
      const imageUrl = `https://i.ytimg.com/vi/zBKLWmiMvZ4/mqdefault.jpg || 'bucket'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com/${cloud_storage_path}`;

      // 4. Enviar mensagem com imagem
      const msgRes = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '📷 Imagem',
          type: 'IMAGE',
          imageUrl,
          imageKey: cloud_storage_path,
        }),
      });

      if (!msgRes.ok) throw new Error('Erro ao enviar mensagem');

      const data = await msgRes.json();
      setMessages(prev => [...prev, data.message]);
      toast({ title: 'Imagem enviada!' });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar a imagem', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (minimized) {
    return (
      <div
        onClick={onToggleMinimize}
        className="fixed bottom-4 right-4 bg-orange-500 text-white p-4 rounded-full cursor-pointer shadow-lg hover:bg-orange-600 transition-colors z-50"
      >
        <MessageCircle className="w-6 h-6" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {messages.filter(m => m.sender.id !== session?.user?.id).length}
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl z-50 bg-card border-orange-500/30">
      <CardHeader className="py-3 px-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-orange-500" />
            Chat do Pedido
          </CardTitle>
          <div className="flex gap-1">
            {onToggleMinimize && (
              <Button variant="ghost" size="icon" onClick={onToggleMinimize} className="h-8 w-8">
                <Minimize2 className="w-4 h-4" />
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">
                    Nenhuma mensagem ainda. Inicie a conversa!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender.id === session?.user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isOwn
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-700 text-white'
                          }`}
                        >
                          {!isOwn && (
                            <p className={`text-xs font-medium mb-1 ${ROLE_COLORS[msg.sender.role] || 'text-gray-400'}`}>
                              {msg.sender.name || 'Usuário'} ({ROLE_LABELS[msg.sender.role] || msg.sender.role})
                            </p>
                          )}
                          {msg.type === 'IMAGE' && msg.imageUrl ? (
                            <img
                              src={msg.imageUrl}
                              alt="Imagem"
                              className="max-w-full rounded-lg mb-1"
                              onClick={() => window.open(msg.imageUrl, '_blank')}
                              style={{ cursor: 'pointer' }}
                            />
                          ) : (
                            <p className="text-sm break-words">{msg.content}</p>
                          )}
                          <p className={`text-xs mt-1 ${isOwn ? 'text-orange-200' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-gray-700 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-shrink-0"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="flex-shrink-0 bg-orange-500 hover:bg-orange-600"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
