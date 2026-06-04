'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FaBell } from 'react-icons/fa6';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useSession } from 'next-auth/react';
import styled from 'styled-components';

interface NotificationBellProps {
  className?: string;
}

const BellButton = styled.button`
  position: relative;
  display: inline-grid;
  width: 42px;
  height: 42px;
  place-items: center;
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;

  &:hover {
    color: #e85d00;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #e85d00;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 900;
`;

const Dropdown = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 50;
  width: 20rem;
  margin-top: 0.5rem;
  background: rgba(10, 10, 10, 0.96);
  border: 1px solid rgba(255, 106, 0, 0.22);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);
  color: rgba(255, 255, 255, 0.72);
`;

const NotificationBell: React.FC<NotificationBellProps> = ({ className = "" }) => {
  const { data: session } = useSession();
  const { unreadCount } = useUnreadCount();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show notification bell if user is not logged in
  if (!session?.user) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <BellButton
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <FaBell className="w-6 h-6" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <Badge>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </BellButton>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <Dropdown>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-orange-900/30">
            <h3 className="text-lg font-black italic uppercase text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-sm text-gray-500">
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex space-x-2">
              <Link
                href="/notifications"
                onClick={() => setIsDropdownOpen(false)}
                className="flex-1 px-3 py-2 text-sm font-bold text-center text-white bg-orange-700/60 border border-orange-500/30 hover:bg-orange-600 transition-colors"
              >
                View All
              </Link>
              
              {unreadCount > 0 && (
                <button
                  className="flex-1 px-3 py-2 text-sm font-bold text-center text-white/70 bg-white/5 border border-white/20 hover:bg-white/10 transition-colors"
                  onClick={() => {
                    // TODO: Implement mark all as read functionality
                    setIsDropdownOpen(false);
                  }}
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          {/* Notification Preview */}
          <div className="max-h-64 overflow-y-auto">
            {unreadCount === 0 ? (
              <div className="p-6 text-center">
                <FaBell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-white/60 text-sm">No new notifications</p>
                <p className="text-white/40 text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="text-center">
                  <p className="text-sm text-white/60 mb-2">
                    You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                  <Link
                    href="/notifications"
                    onClick={() => setIsDropdownOpen(false)}
                    className="inline-flex items-center px-3 py-1 text-xs font-bold text-orange-400 bg-orange-950/40 border border-orange-500/30 hover:bg-orange-900/40 transition-colors"
                  >
                    View in Notification Center →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-white/5 border-t border-orange-900/30">
            <Link
              href="/notifications"
              onClick={() => setIsDropdownOpen(false)}
              className="block w-full text-center text-sm text-white/60 hover:text-orange-500 transition-colors"
            >
              Go to Notification Center
            </Link>
          </div>
        </Dropdown>
      )}
    </div>
  );
};

export default NotificationBell;
