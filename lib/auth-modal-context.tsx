"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AuthModal } from "@/components/auth/auth-modal";

interface AuthModalContextType {
  openAuthModal: (tab?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  isOpen: boolean;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(
  undefined
);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  const openAuthModal = useCallback((tab: "signin" | "signup" = "signin") => {
    setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal, closeAuthModal, isOpen }}
    >
      {children}
      <AuthModal
        open={isOpen}
        onOpenChange={setIsOpen}
        defaultTab={activeTab}
      />
    </AuthModalContext.Provider>
  );
}
