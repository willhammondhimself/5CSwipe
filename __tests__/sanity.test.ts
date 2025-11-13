/**
 * Sanity test to verify Jest is configured correctly
 */

describe('Jest Configuration', () => {
  it('should run tests', () => {
    expect(true).toBe(true);
  });

  it('should have access to test environment variables', () => {
    expect(process.env.EXPO_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    expect(process.env.EXPO_PUBLIC_ENV).toBe('test');
  });
});
