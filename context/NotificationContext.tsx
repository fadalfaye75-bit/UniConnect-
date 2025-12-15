import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppNotification, UserRole } from '../types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Initialize mock notifications based on role
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const initialNotifications: AppNotification[] = [];

    // Common notification
    initialNotifications.push({
      id: 'n-1',
      title: 'Bienvenue sur UniConnect',
      message: 'La plateforme a été mise à jour avec de nouvelles fonctionnalités.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      isRead: true
    });

    if (user.role === UserRole.STUDENT || user.role === UserRole.DELEGATE) {
      initialNotifications.push({
        id: 'n-2',
        title: 'Rappel Examen',
        message: 'N\'oubliez pas votre examen d\'Algorithmique dans 2 jours.',
        type: 'warning',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        isRead: false,
        link: '/exams'
      });
    }

    if (user.role === UserRole.ADMIN) {
      initialNotifications.push({
        id: 'n-3',
        title: 'Activité Système',
        message: '5 nouveaux comptes étudiants créés ce matin.',
        type: 'success',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        isRead: false,
        link: '/admin'
      });
    }

    if (user.role === UserRole.DELEGATE) {
      initialNotifications.push({
        id: 'n-4',
        title: 'Nouveau Sondage',
        message: 'Votre sondage sur le rattrapage Java a reçu 10 nouvelles réponses.',
        type: 'info',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        isRead: false,
        link: '/polls'
      });
    }

    setNotifications(initialNotifications);
  }, [user?.role]);

  // Simulate Push Notification
  useEffect(() => {
    if (!user) return;

    // Simulate an incoming notification after 10 seconds
    const timer = setTimeout(() => {
      const newNotif: AppNotification = {
        id: `n-${Date.now()}`,
        title: user.role === UserRole.ADMIN ? 'Nouvelle Inscription' : 'Nouvelle Annonce',
        message: user.role === UserRole.ADMIN 
          ? 'Un nouvel étudiant vient de rejoindre la classe L2 Info.'
          : 'Le secrétariat a publié une nouvelle note d\'information importante.',
        type: 'info',
        timestamp: new Date().toISOString(),
        isRead: false,
        link: user.role === UserRole.ADMIN ? '/admin' : '/announcements'
      };
      
      addNotification(newNotif);
      
      // Play a subtle sound (optional, browser policy might block)
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio autoplay blocked'));
      } catch (e) {}

    }, 10000);

    return () => clearTimeout(timer);
  }, [user]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'> | AppNotification) => {
    const fullNotif: AppNotification = {
      id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      ...notif
    };
    setNotifications(prev => [fullNotif, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};