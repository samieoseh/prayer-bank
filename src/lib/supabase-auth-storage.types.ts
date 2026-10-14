export type SupabaseAuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export class SupabaseAuthStorageError extends Error {
  constructor() {
    super('Secure authentication storage is unavailable.');
    this.name = 'SupabaseAuthStorageError';
  }
}
