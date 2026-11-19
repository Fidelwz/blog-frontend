import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePost, parsePostPage, parseMyPostPage, parseAttachment } from '../src/features/publications/adapters.ts';
import { parseGroup, parseGroups, parseMembers } from '../src/features/groups/adapters.ts';
import { parseCategories } from '../src/features/categories/adapters.ts';

type Fixture = { method: string; path: string; status: number; body: unknown };
const fixtures = JSON.parse(readFileSync(new URL('../postman/contracts/community-http-fixtures.json', import.meta.url), 'utf8')) as { responses: Fixture[] };
const adapters: Record<string, (body: unknown) => unknown> = {
  'get /categories': parseCategories,
  'get /posts': parsePostPage,
  'get /posts/search': parsePostPage,
  'get /posts/group/{groupId}': parsePostPage,
  'get /users/me/feed': parsePostPage,
  'get /users/me/posts': parseMyPostPage,
  'get /posts/{id}': parsePost,
  'get /groups': parseGroups,
  'get /groups/{id}': parseGroup,
  'post /groups': parseGroup,
  'get /groups/{id}/members': parseMembers,
  // Historical comment captures use author.name. Current Nest commit 39ebe974
  // uses firstName and English states; comments.test.ts covers that contract.
  'post /posts/{id}/attachments': parseAttachment,
  // Historical Spanish notification fixtures are superseded by notifications.test.ts.
};
for (const [operation, parse] of Object.entries(adapters)) {
  test(`C01: adaptador acepta respuesta HTTP Nest capturada: ${operation}`, () => {
    const examples = fixtures.responses.filter(f => `${f.method} ${f.path}` === operation && f.status < 300);
    assert.ok(examples.length, `Falta fixture real para ${operation}`);
    for (const example of examples) assert.doesNotThrow(() => parse(example.body));
  });
}
