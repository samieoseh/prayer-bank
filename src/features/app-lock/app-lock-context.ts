import { createContext } from 'react';

import type { AppLockContextValue } from '@/features/app-lock/app-lock-types';

export const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);
