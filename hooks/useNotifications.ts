import { useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useNotificationStore } from '@/app/_zustand/notificationStore';
import { isSilentUnreadCountError, notificationApi } from '@/lib/notification-api';
import { NotificationFilters } from '@/types/notification';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing notifications
 */
export const useNotifications = () => {
  const { data: session } = useSession();
  const {
    notifications,
    unreadCount,
    total,
    page,
    totalPages,
    loading,
    error,
    filters,
    selectedIds,
    setNotifications,
    setLoading,
    setError,
    setFilters,
    markAsRead,
    deleteNotification,
    clearSelection,
    setUnreadCount
  } = useNotificationStore();

  // Fetch notifications
  const fetchNotifications = useCallback(async (customFilters?: NotificationFilters) => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const filtersToUse = customFilters || filters;
      const response = await notificationApi.getUserNotifications(filtersToUse);
      setNotifications(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [filters, session?.user?.id, setNotifications, setLoading, setError]);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { unreadCount } = await notificationApi.getUnreadCount();
      setUnreadCount(unreadCount);
    } catch (error) {
      if (isSilentUnreadCountError(error)) {
        setUnreadCount(0);
        return;
      }
      console.error('Error fetching unread count:', error);
    }
  }, [session?.user?.id, setUnreadCount]);

  // Mark single notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.updateNotification(notificationId, true);
      markAsRead(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark notification as read';
      toast.error(errorMessage);
    }
  }, [markAsRead]);

  // Mark multiple notifications as read
  const markSelectedAsRead = useCallback(async () => {
    const idsToMarkRead = [...selectedIds]; // Create snapshot
    
    if (!session?.user?.id || idsToMarkRead.length === 0) return;

    try {
      await notificationApi.bulkMarkAsRead({
        notificationIds: idsToMarkRead
      });
      
      idsToMarkRead.forEach(id => markAsRead(id));
      clearSelection();
      
      // Refresh unread count
      await fetchUnreadCount();
      
      toast.success(`${idsToMarkRead.length} notifications marked as read`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark notifications as read';
      toast.error(errorMessage);
    }
  }, [selectedIds, session?.user?.id, markAsRead, clearSelection, fetchUnreadCount]);

  // Delete single notification
  const deleteNotificationById = useCallback(async (notificationId: string) => {
    if (!session?.user?.id) return;

    try {
      await notificationApi.deleteNotification(notificationId);
      deleteNotification(notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete notification';
      toast.error(errorMessage);
    }
  }, [session?.user?.id, deleteNotification]);

  // Delete selected notifications
  const deleteSelectedNotifications = useCallback(async () => {
    const idsToDelete = [...selectedIds]; // Create snapshot
    
    if (!session?.user?.id || idsToDelete.length === 0) {
      return;
    }

    try {
      await notificationApi.bulkDeleteNotifications({
        notificationIds: idsToDelete
      });
      
      // Update local state - remove deleted notifications
      idsToDelete.forEach(id => deleteNotification(id));
      clearSelection();
      
      // Refresh data to ensure consistency
      await fetchNotifications();
      
      toast.success(`${idsToDelete.length} notifications deleted`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete notifications';
      toast.error(errorMessage);
    }
  }, [selectedIds, session?.user?.id, deleteNotification, clearSelection, fetchNotifications]);

  // Update filters and refetch
  const updateFilters = useCallback((newFilters: Partial<NotificationFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchNotifications(updatedFilters);
  }, [filters, setFilters, fetchNotifications]);

  // Load more notifications (pagination)
  const loadMore = useCallback(() => {
    if (page < totalPages) {
      updateFilters({ page: page + 1 });
    }
  }, [page, totalPages, updateFilters]);

  return {
    // Data
    notifications,
    unreadCount,
    total,
    page,
    totalPages,
    loading,
    error,
    filters,
    selectedIds,
    hasMore: page < totalPages,
    
    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markSelectedAsRead,
    deleteNotificationById,
    deleteSelectedNotifications,
    updateFilters,
    loadMore,
    
    // Store actions (direct access)
    setFilters,
    clearSelection
  };
};

/**
 * Hook for real-time unread count (for header badge)
 */
export const useUnreadCount = () => {
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const { data: session } = useSession();

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { unreadCount } = await notificationApi.getUnreadCount();
      setUnreadCount(unreadCount);
    } catch (error) {
      if (isSilentUnreadCountError(error)) {
        setUnreadCount(0);
        return;
      }
      console.error('Error fetching unread count:', error);
    }
  }, [session?.user?.id, setUnreadCount]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as { unreadCount?: number };
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      void fetchUnreadCount();
    };

    return () => eventSource.close();
  }, [fetchUnreadCount, session?.user?.id, setUnreadCount]);

  return {
    unreadCount,
    refreshUnreadCount: fetchUnreadCount
  };
};
