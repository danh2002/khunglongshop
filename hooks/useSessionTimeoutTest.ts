"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

// Use 30 seconds for testing
const SESSION_TIMEOUT_MS = 30 * 1000; // 30 seconds for testing

export function useSessionTimeoutTest() {
  const { data: session, status } = useSession();
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    if (status === "authenticated" && session) {
      console.log('🕐 Session timeout test started - 30 seconds');
      
      const restartSessionTimeout = () => {
        // Clear existing timeout
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
        
        // Set new timeout
        sessionTimeoutRef.current = setTimeout(() => {
          console.log('🚪 Session expired - signing out');
          signOut({ 
            callbackUrl: "/login?expired=true",
            redirect: true 
          });
        }, SESSION_TIMEOUT_MS);
      };

      // Start the initial timeout
      restartSessionTimeout();

      // Reset timeout on user activity
      const handleUserActivity = () => {
        console.log('🔄 User activity detected - resetting timeout');
        restartSessionTimeout();
      };

      // Listen for user activity
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      activityEvents.forEach(activityEvent => {
        document.addEventListener(activityEvent, handleUserActivity, true);
      });

      return () => {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
        activityEvents.forEach(activityEvent => {
          document.removeEventListener(activityEvent, handleUserActivity, true);
        });
      };
    }
  }, [session, status]);
}
