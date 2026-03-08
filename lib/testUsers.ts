export interface TestUserAccount {
  loginId: string;
  password: string;
  name: string;
  email: string;
}

export const TEST_USER_ACCOUNTS: readonly TestUserAccount[] = [
  { loginId: 'guest1', password: 'wedding1', name: 'Rose & River', email: 'guest1@marryquest.test' },
  { loginId: 'guest2', password: 'wedding2', name: 'Lily & Joon', email: 'guest2@marryquest.test' },
  { loginId: 'guest3', password: 'wedding3', name: 'Noah & Emma', email: 'guest3@marryquest.test' },
  { loginId: 'guest4', password: 'wedding4', name: 'Mina & Theo', email: 'guest4@marryquest.test' },
  { loginId: 'guest5', password: 'wedding5', name: 'Ivy & Lucas', email: 'guest5@marryquest.test' },
  { loginId: 'guest6', password: 'wedding6', name: 'Hana & Min', email: 'guest6@marryquest.test' },
  { loginId: 'guest7', password: 'wedding7', name: 'Aria & Kai', email: 'guest7@marryquest.test' },
  { loginId: 'guest8', password: 'wedding8', name: 'Nora & Sean', email: 'guest8@marryquest.test' },
  { loginId: 'guest9', password: 'wedding9', name: 'Yuna & Eli', email: 'guest9@marryquest.test' },
  { loginId: 'guest10', password: 'wedding10', name: 'Sora & Liam', email: 'guest10@marryquest.test' }
] as const;

const accountMap = new Map(TEST_USER_ACCOUNTS.map((account) => [account.loginId.toLowerCase(), account]));

export function findTestUserAccount(loginId: string, password: string): TestUserAccount | null {
  const account = accountMap.get(loginId.trim().toLowerCase());
  if (!account) return null;
  return account.password === password ? account : null;
}
