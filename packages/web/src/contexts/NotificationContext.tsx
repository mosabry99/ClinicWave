import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications as mantineNotifications } from '@mantine/notifications';
import { useLocalStorage } from '@mantine/hooks';

import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { NotificationService } from '@/services/notification.service';
import { NotificationType, NotificationPriority, NotificationChannel } from '@clinicwave/shared';

// Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  channels: {
    [key in NotificationChannel]: boolean;
  };
  types: {
    [key in NotificationType]: {
      enabled: boolean;
      channels: {
        [key in NotificationChannel]: boolean;
      };
    };
  };
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  preferences: NotificationPreferences;
  sendNotification: (notification: {
    title: string;
    body: string;
    type?: NotificationType;
    priority?: NotificationPriority;
    actionUrl?: string;
    metadata?: Record<string, any>;
    recipients?: string[];
  }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  showToast: (props: {
    title: string;
    message: string;
    color?: string;
    icon?: React.ReactNode;
    autoClose?: number;
  }) => void;
  filterNotifications: (filters: {
    type?: NotificationType;
    read?: boolean;
    priority?: NotificationPriority;
    startDate?: Date;
    endDate?: Date;
  }) => Notification[];
}

const defaultPreferences: NotificationPreferences = {
  channels: {
    EMAIL: true,
    SMS: true,
    PUSH: true,
    IN_APP: true,
  },
  types: {
    APPOINTMENT: {
      enabled: true,
      channels: {
        EMAIL: true,
        SMS: true,
        PUSH: true,
        IN_APP: true,
      },
    },
    PATIENT: {
      enabled: true,
      channels: {
        EMAIL: true,
        SMS: false,
        PUSH: true,
        IN_APP: true,
      },
    },
    BILLING: {
      enabled: true,
      channels: {
        EMAIL: true,
        SMS: false,
        PUSH: true,
        IN_APP: true,
      },
    },
    SYSTEM: {
      enabled: true,
      channels: {
        EMAIL: true,
        SMS: false,
        PUSH: true,
        IN_APP: true,
      },
    },
    MEDICAL_RECORD: {
      enabled: true,
      channels: {
        EMAIL: true,
        SMS: false,
        PUSH: true,
        IN_APP: true,
      },
    },
    TASK: {
      enabled: true,
      channels: {
        EMAIL: false,
        SMS: false,
        PUSH: true,
        IN_APP: true,
      },
    },
    MESSAGE: {
      enabled: true,
      channels: {
        EMAIL: false,
        SMS: false,
        PUSH: true,
        IN_APP: true,
      },
    },
  },
  doNotDisturb: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const socket = useWebSocket();
  const queryClient = useQueryClient();
  
  // State
  const [error, setError] = useState<Error | null>(null);
  const [storedPreferences, setStoredPreferences] = useLocalStorage<NotificationPreferences>({
    key: 'notification-preferences',
    defaultValue: defaultPreferences,
  });

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery(
    ['notifications'],
    () => NotificationService.getNotifications(),
    {
      enabled: !!user,
      staleTime: 60000, // 1 minute
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Fetch notification preferences
  const { data: preferences = storedPreferences } = useQuery(
    ['notification-preferences'],
    () => NotificationService.getPreferences(),
    {
      enabled: !!user,
      staleTime: 300000, // 5 minutes
      onSuccess: (data) => {
        setStoredPreferences(data);
      },
      onError: () => {
        // If API fails, use stored preferences
      },
    }
  );

  // Calculate unread count
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  // Mark as read mutation
  const markAsReadMutation = useMutation(
    (id: string) => NotificationService.markAsRead(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation(
    () => NotificationService.markAllAsRead(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Mark as unread mutation
  const markAsUnreadMutation = useMutation(
    (id: string) => NotificationService.markAsUnread(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Delete notification mutation
  const deleteNotificationMutation = useMutation(
    (id: string) => NotificationService.deleteNotification(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Clear all notifications mutation
  const clearAllMutation = useMutation(
    () => NotificationService.clearAll(),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
      },
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Update preferences mutation
  const updatePreferencesMutation = useMutation(
    (newPreferences: Partial<NotificationPreferences>) => 
      NotificationService.updatePreferences(newPreferences),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['notification-preferences']);
        setStoredPreferences(data);
      },
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Send notification mutation
  const sendNotificationMutation = useMutation(
    (notification: {
      title: string;
      body: string;
      type?: NotificationType;
      priority?: NotificationPriority;
      actionUrl?: string;
      metadata?: Record<string, any>;
      recipients?: string[];
    }) => NotificationService.sendNotification(notification),
    {
      onSuccess: () => {
        // No need to invalidate queries as the WebSocket will handle real-time updates
      },
      onError: (err: Error) => {
        setError(err);
      },
    }
  );

  // Show toast notification
  const showToast = useCallback(
    ({ title, message, color = 'blue', icon, autoClose = 5000 }) => {
      mantineNotifications.show({
        title,
        message,
        color,
        icon,
        autoClose,
      });
    },
    []
  );

  // Filter notifications
  const filterNotifications = useCallback(
    ({ type, read, priority, startDate, endDate }) => {
      return notifications.filter((notification) => {
        if (type && notification.type !== type) return false;
        if (read !== undefined && notification.read !== read) return false;
        if (priority && notification.priority !== priority) return false;
        
        if (startDate) {
          const notificationDate = new Date(notification.createdAt);
          if (notificationDate < startDate) return false;
        }
        
        if (endDate) {
          const notificationDate = new Date(notification.createdAt);
          if (notificationDate > endDate) return false;
        }
        
        return true;
      });
    },
    [notifications]
  );

  // WebSocket event handlers
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for new notifications
    socket.on('notification:created', (notification) => {
      // Refresh notifications list
      queryClient.invalidateQueries(['notifications']);
      
      // Show toast if it's for the current user and preferences allow it
      if (notification.userId === user.id) {
        const notificationType = notification.type as NotificationType;
        const typePreferences = preferences.types[notificationType];
        
        if (typePreferences?.enabled && typePreferences?.channels.IN_APP) {
          // Check do not disturb settings
          const shouldShowToast = !isInDoNotDisturbPeriod(preferences.doNotDisturb);
          
          if (shouldShowToast) {
            showToast({
              title: notification.title,
              message: notification.body,
              color: getPriorityColor(notification.priority),
              autoClose: notification.priority === 'HIGH' ? 10000 : 5000,
            });
          }
        }
      }
    });

    // Listen for updated notifications
    socket.on('notification:updated', () => {
      queryClient.invalidateQueries(['notifications']);
    });

    // Listen for deleted notifications
    socket.on('notification:deleted', () => {
      queryClient.invalidateQueries(['notifications']);
    });

    return () => {
      socket.off('notification:created');
      socket.off('notification:updated');
      socket.off('notification:deleted');
    };
  }, [socket, user, queryClient, preferences, showToast]);

  // Helper function to check if current time is in do not disturb period
  const isInDoNotDisturbPeriod = (dndSettings: NotificationPreferences['doNotDisturb']) => {
    if (!dndSettings.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = dndSettings.startTime.split(':').map(Number);
    const [endHour, endMinute] = dndSettings.endTime.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    if (startTimeMinutes < endTimeMinutes) {
      // Simple case: start time is before end time (e.g., 22:00 to 08:00)
      return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes;
    } else {
      // Complex case: start time is after end time (e.g., 22:00 to 08:00 next day)
      return currentTime >= startTimeMinutes || currentTime <= endTimeMinutes;
    }
  };

  // Helper function to get color based on priority
  const getPriorityColor = (priority: NotificationPriority): string => {
    switch (priority) {
      case 'HIGH':
        return 'red';
      case 'MEDIUM':
        return 'orange';
      case 'LOW':
      default:
        return 'blue';
    }
  };

  // Public API
  const value = {
    notifications,
    unreadCount,
    isLoading,
    error,
    preferences,
    sendNotification: (notification) => sendNotificationMutation.mutateAsync(notification),
    markAsRead: (id) => markAsReadMutation.mutateAsync(id),
    markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
    markAsUnread: (id) => markAsUnreadMutation.mutateAsync(id),
    deleteNotification: (id) => deleteNotificationMutation.mutateAsync(id),
    clearAll: () => clearAllMutation.mutateAsync(),
    updatePreferences: (newPreferences) => updatePreferencesMutation.mutateAsync(newPreferences),
    showToast,
    filterNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
