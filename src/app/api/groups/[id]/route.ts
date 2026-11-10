import { groupRequest } from '@/features/groups/server';
import { contentId } from '@/features/publications/adapters';
import { parseGroup } from '@/features/groups/adapters';
import { json, errorResponse } from '@/features/auth/server/handlers';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const id = contentId((await params).id); return json(parseGroup(await (await groupRequest(`/groups/${id}`)).json())); }
  catch (error) { return errorResponse(error); }
}
