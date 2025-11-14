/**
 * Mock Supabase client for testing
 * This is set up globally in jest.setup.js
 */

// Use the globally available mock client
export const mockSupabaseClient = global.mockSupabaseClient || {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
  },
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    csv: jest.fn(),
    upsert: jest.fn().mockReturnThis(),
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
  removeChannel: jest.fn(),
  rpc: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
};

/**
 * The Supabase module is mocked in jest.setup.js
 * No need to duplicate the mock here
 */

/**
 * Helper to reset all Supabase mocks
 */
export const resetSupabaseMocks = () => {
  jest.clearAllMocks();
};

/**
 * Mock successful authentication response
 */
export const mockAuthSuccess = {
  data: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      aud: 'authenticated',
      role: 'authenticated',
    },
    session: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    },
  },
  error: null,
};

/**
 * Mock authentication error
 */
export const mockAuthError = {
  data: {
    user: null,
    session: null,
  },
  error: {
    message: 'Invalid credentials',
    status: 400,
  },
};

/**
 * Mock database query success
 */
export const mockQuerySuccess = (data: any) => ({
  data,
  error: null,
  count: Array.isArray(data) ? data.length : 1,
  status: 200,
  statusText: 'OK',
});

/**
 * Mock database query error
 */
export const mockQueryError = (message: string) => ({
  data: null,
  error: {
    message,
    details: '',
    hint: '',
    code: '',
  },
  count: null,
  status: 400,
  statusText: 'Bad Request',
});
