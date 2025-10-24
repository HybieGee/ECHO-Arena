/**
 * Wallet authentication hook
 * Handles EIP-191 signature-based authentication flow
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { api } from '@/lib/api';

interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  user: { id: string; address: string } | null;
  error: string | null;
}

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAuthenticating: false,
    user: null,
    error: null,
  });

  // Check if already authenticated for this address
  useEffect(() => {
    if (!address || !isConnected) {
      setAuthState({
        isAuthenticated: false,
        isAuthenticating: false,
        user: null,
        error: null,
      });
      return;
    }

    // Check localStorage for existing auth
    const storedAuth = localStorage.getItem(`auth:${address.toLowerCase()}`);
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        // Check if auth is still valid (24 hour expiry)
        if (parsed.expiresAt > Date.now()) {
          setAuthState({
            isAuthenticated: true,
            isAuthenticating: false,
            user: parsed.user,
            error: null,
          });
        } else {
          localStorage.removeItem(`auth:${address.toLowerCase()}`);
        }
      } catch (error) {
        localStorage.removeItem(`auth:${address.toLowerCase()}`);
      }
    }
  }, [address, isConnected]);

  const authenticate = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setAuthState((prev) => ({
      ...prev,
      isAuthenticating: true,
      error: null,
    }));

    try {
      // Step 1: Get nonce
      const nonceData = await api.getNonce(address);

      // Step 2: Sign message
      const signature = await signMessageAsync({
        message: nonceData.message,
      });

      // Step 3: Verify signature
      const verifyResult = await api.verifySignature(
        address,
        signature,
        nonceData.nonce
      );

      if (!verifyResult.success) {
        throw new Error('Signature verification failed');
      }

      // Store auth in localStorage (24 hour expiry)
      const authData = {
        user: verifyResult.user,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(`auth:${address.toLowerCase()}`, JSON.stringify(authData));

      setAuthState({
        isAuthenticated: true,
        isAuthenticating: false,
        user: verifyResult.user,
        error: null,
      });

      return verifyResult.user;
    } catch (error: any) {
      const errorMessage = error.message || 'Authentication failed';
      setAuthState({
        isAuthenticated: false,
        isAuthenticating: false,
        user: null,
        error: errorMessage,
      });
      throw error;
    }
  }, [address, isConnected, signMessageAsync]);

  const logout = useCallback(() => {
    if (address) {
      localStorage.removeItem(`auth:${address.toLowerCase()}`);
    }
    setAuthState({
      isAuthenticated: false,
      isAuthenticating: false,
      user: null,
      error: null,
    });
  }, [address]);

  return {
    ...authState,
    authenticate,
    logout,
  };
}
