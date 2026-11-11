import type { QueryClient } from '@tanstack/react-query';

/** Membership changes revoke content access, without discarding unrelated forms. */
export async function clearGroupContent(client: QueryClient) {
  const affected = (query: { queryKey: readonly unknown[]; meta?: Record<string, unknown> }) =>
    ['groups', 'comments'].includes(String(query.queryKey[0])) ||
    (query.queryKey[0] === 'posts' && query.meta?.private === true);
  await client.cancelQueries({ predicate: affected });
  client.removeQueries({ predicate: affected });
  await Promise.all([
    client.invalidateQueries({ queryKey: ['notifications'] }),
    client.invalidateQueries({ queryKey: ['profile'], refetchType: 'none' }),
  ]);
}

export function refreshOnMembershipChange(pathname: string) {
  return /^\/(inicio|grupos|publicaciones|mis-publicaciones|moderacion)(\/|$)/.test(pathname);
}
