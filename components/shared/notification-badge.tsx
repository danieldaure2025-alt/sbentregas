'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Package, MessageCircle, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export function NotificationBadge() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length > 0) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: unreadIds }),
        });
        
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
    setLoading(false);
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return <Package className="w-4 h-4 text-orange-500" />;
      case 'ORDER_ACCEPTED':
      case 'ORDER_PICKED_UP':
      case 'ORDER_DELIVERED':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'ORDER_CANCELLED':
      case 'ORDER_REJECTED':
        return <X className="w-4 h-4 text-red-500" />;
      case 'CHAT_MESSAGE':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'EMERGENCY':
      case 'DELIVERY_PROBLEM':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'DAILY_REPORT':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Badge */}
      <Button
        variant="ghost"
        size="sm"
        className="relative text-gray-300 hover:text-white hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[hsl(220,20%,12%)] border border-orange-500/30 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/20 bg-[hsl(220,20%,8%)]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-white">Notificações</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium text-white bg-orange-500 rounded-full">
                  {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-orange-400 hover:text-orange-300 hover:bg-transparent p-1 h-auto"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Bell className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-700/50 cursor-pointer transition-colors ${
                    notification.isRead
                      ? 'bg-transparent hover:bg-white/5'
                      : 'bg-orange-500/10 hover:bg-orange-500/20'
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 mt-1 p-2 rounded-full ${
                    notification.isRead ? 'bg-gray-700/50' : 'bg-orange-500/20'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      notification.isRead ? 'text-gray-300' : 'text-white'
                    }`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                      {notification.body}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <span className="block w-2 h-2 bg-orange-500 rounded-full" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-orange-500/20 bg-[hsl(220,20%,8%)]">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                onClick={() => setIsOpen(false)}
              >
                Ver todas as notificações
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
