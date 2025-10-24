/**
 * Layout Wrapper
 * Handles enter screen and main content display
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { EnterScreen } from './enter-screen';
import { StarfieldBackground } from './starfield-background';

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const [hasEntered, setHasEntered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has already entered in this session
    const entered = sessionStorage.getItem('echo-arena-entered');
    if (entered === 'true') {
      setHasEntered(true);
    }
  }, []);

  const handleEnter = () => {
    sessionStorage.setItem('echo-arena-entered', 'true');
    setHasEntered(true);
  };

  if (!mounted) {
    return null; // Prevent SSR flash
  }

  return (
    <>
      {!hasEntered && <EnterScreen onEnter={handleEnter} />}

      {hasEntered && (
        <>
          <StarfieldBackground />
          {children}
        </>
      )}
    </>
  );
}
