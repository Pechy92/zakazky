import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteTextTemplate } from './textTemplates';

test('text template deletion clears offer references in one transaction', async () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  let released = false;

  const client = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (sql.startsWith('DELETE FROM text_templates')) {
        return { rowCount: 1 };
      }
      return { rowCount: 0 };
    },
    release: () => {
      released = true;
    },
  };

  const deleted = await deleteTextTemplate(
    { connect: async () => client } as any,
    '42'
  );

  assert.equal(deleted, 1);
  assert.deepEqual(
    calls.map(({ sql }) => sql),
    [
      'BEGIN',
      'DELETE FROM offer_text_selections WHERE text_template_id = $1',
      'UPDATE offers SET text_template_id = NULL WHERE text_template_id = $1',
      'DELETE FROM text_templates WHERE id = $1 RETURNING id',
      'COMMIT',
    ]
  );
  assert.equal(released, true);
});

test('text template deletion rolls back when a database operation fails', async () => {
  const calls: string[] = [];
  let released = false;

  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.startsWith('UPDATE offers')) {
        throw new Error('database failure');
      }
      return { rowCount: 0 };
    },
    release: () => {
      released = true;
    },
  };

  await assert.rejects(
    deleteTextTemplate({ connect: async () => client } as any, '42'),
    /database failure/
  );

  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(released, true);
});
