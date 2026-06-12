"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export function useSessionTimeout() {
  const { data: session, status } = useSession();
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (status === "authenticated" && session) {
      const restartSessionTimeout = () => {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
        
        sessionTimeoutRef.current = setTimeout(() => {
          signOut({ 
            callbackUrl: "/login?expired=true",
            redirect: true 
          });
        }, SESSION_TIMEOUT_MS);
      };

      restartSessionTimeout();

      const handleUserActivity = () => {
        restartSessionTimeout();
      };

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
