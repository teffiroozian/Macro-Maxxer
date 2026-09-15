"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type PendingBuildNavigation = {
  proceed: () => void;
};

type ActiveBuildGuard = {
  hasInProgressBuild: boolean;
  onAddToCart: (afterAdd: () => void) => void;
  onDiscard: () => void;
};

type BuildInProgressGuardContextValue = {
  pendingNavigation: PendingBuildNavigation | null;
  registerActiveBuild: (guard: ActiveBuildGuard | null) => void;
  guardNavigation: (proceed: () => void) => void;
  confirmAddToCart: () => void;
  confirmDiscardBuild: () => void;
  cancelPendingNavigation: () => void;
};

const BuildInProgressGuardContext = createContext<BuildInProgressGuardContextValue | null>(null);

export function BuildInProgressGuardProvider({ children }: { children: ReactNode }) {
  const activeBuildRef = useRef<ActiveBuildGuard | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingBuildNavigation | null>(null);

  const registerActiveBuild = useCallback((guard: ActiveBuildGuard | null) => {
    activeBuildRef.current = guard;
  }, []);

  const guardNavigation = useCallback((proceed: () => void) => {
    const activeBuild = activeBuildRef.current;
    if (!activeBuild || !activeBuild.hasInProgressBuild) {
      proceed();
      return;
    }
    setPendingNavigation({ proceed });
  }, []);

  const confirmAddToCart = useCallback(() => {
    if (!pendingNavigation) return;
    const activeBuild = activeBuildRef.current;
    const proceed = pendingNavigation.proceed;
    setPendingNavigation(null);
    if (activeBuild) {
      activeBuild.onAddToCart(proceed);
    } else {
      proceed();
    }
  }, [pendingNavigation]);

  const confirmDiscardBuild = useCallback(() => {
    if (!pendingNavigation) return;
    const proceed = pendingNavigation.proceed;
    setPendingNavigation(null);
    activeBuildRef.current?.onDiscard();
    proceed();
  }, [pendingNavigation]);

  const cancelPendingNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  return (
    <BuildInProgressGuardContext.Provider
      value={{
        pendingNavigation,
        registerActiveBuild,
        guardNavigation,
        confirmAddToCart,
        confirmDiscardBuild,
        cancelPendingNavigation,
      }}
    >
      {children}
    </BuildInProgressGuardContext.Provider>
  );
}

export function useBuildInProgressGuard() {
  const context = useContext(BuildInProgressGuardContext);
  if (!context) {
    throw new Error("useBuildInProgressGuard must be used within BuildInProgressGuardProvider");
  }
  return context;
}
