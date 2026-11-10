import 'server-only';
import { cookies } from 'next/headers';
import { backendFetch } from '@/lib/server/backend-fetch';
import { SESSION_COOKIE } from '@/features/auth/server/cookie';
export async function groupRequest(path: string, options: Parameters<typeof backendFetch>[1] = {}) {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) throw new Error('Inicia sesión para continuar.');
  return backendFetch(path, { ...options, cookie });
}
