import { useCallback, useState } from "react";

export interface AdminSessionState {
  isAdmin: boolean;
  unlockAdmin: (passcode?: string, expectedDevPasscode?: string) => boolean;
  lockAdmin: () => void;
}

/**
 * Starter admin access controller for app management screens.
 * In production, pair this with a verified backend/database admin role
 * rather than relying solely on a client-side passcode.
 */
export function useAdminAccess(initialAdmin = false): AdminSessionState {
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(initialAdmin));

  const unlockAdmin = useCallback(
    (passcode?: string, expectedDevPasscode?: string) => {
      if (!expectedDevPasscode) {
        setIsAdmin(true);
        return true;
      }
      const matched = String(passcode ?? "").trim() === String(expectedDevPasscode).trim();
      if (matched) {
        setIsAdmin(true);
      }
      return matched;
    },
    []
  );

  const lockAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  return {
    isAdmin,
    unlockAdmin,
    lockAdmin,
  };
}
