import type { Session } from '@supabase/supabase-js';
import { createContext } from 'react';

export type AuthState =
  | { status: 'loading' }
  | {
      status: 'unauthenticated';
      configurationError?: string;
      initializationError?: string;
    }
  | { status: 'authenticated'; session: Session; userId: string };

export const AuthContext = createContext<AuthState | undefined>(undefined);
