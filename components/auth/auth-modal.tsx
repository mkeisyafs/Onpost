"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
  onRegisterSuccess?: () => void;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "signin",
  onRegisterSuccess,
}: AuthModalProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sign In state
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation checks
  const passwordChecks = {
    hasMinLength: signUpPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(signUpPassword),
    hasLowercase: /[a-z]/.test(signUpPassword),
    hasNumber: /[0-9]/.test(signUpPassword),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(signUpPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setSignInError(null);

    try {
      await login(loginId, loginPassword);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check password requirements
    if (!isPasswordValid) {
      setSignUpError("Password does not meet all requirements");
      return;
    }
    
    if (signUpPassword !== confirmPassword) {
      setSignUpError("Passwords do not match");
      return;
    }

    setIsSigningUp(true);
    setSignUpError(null);

    try {
      await register(email, username, signUpPassword, displayName || username);
      onOpenChange(false);
      
      // Trigger welcome modal callback
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
      
      router.refresh();
    } catch (err) {
      setSignUpError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to ONPOST</DialogTitle>
          <DialogDescription>
            Sign in to start trading or create a new account
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "signin" | "signup")}
        >
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger 
              value="signin"
              className="data-[state=active]:!bg-green-600 data-[state=active]:!text-white data-[state=active]:shadow-sm transition-all"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:!bg-green-600 data-[state=active]:!text-white data-[state=active]:shadow-sm transition-all"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="login">Email or Username</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="you@example.com or username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {signInError && (
                <Alert variant="destructive">
                  <AlertDescription>{signInError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signUpPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="signUpPassword"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password Requirements */}
                {signUpPassword.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordChecks.hasMinLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordChecks.hasMinLength ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordChecks.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordChecks.hasUppercase ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      <span>One uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordChecks.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordChecks.hasLowercase ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      <span>One lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordChecks.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordChecks.hasNumber ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      <span>One number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordChecks.hasSpecial ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordChecks.hasSpecial ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      <span>One special character (!@#$%^&*...)</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {signUpError && (
                <Alert variant="destructive">
                  <AlertDescription>{signUpError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isSigningUp}>
                {isSigningUp ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
