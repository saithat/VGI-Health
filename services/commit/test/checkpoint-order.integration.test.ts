import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pool } from '../src/store.ts';

const url = process.env.DATABASE_URL;
test('checkpoint-order migration preserves historical order and sequences new saves independently of time', { skip: !url }, async () => {
  if (!url) throw new Error('DATABASE_URL required');
  const db = pool(url);
  const client = await db.connect();
  const schema = `checkpoint_order_${randomUUID().replaceAll('-', '')}`;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`CREATE TABLE commit_draft_checkpoints (
      tenant text NOT NULL, id uuid NOT NULL, actor text NOT NULL, auth_session text NOT NULL,
      created_at timestamptz NOT NULL, PRIMARY KEY (tenant,id))`);
    const ids = [1, 2, 3, 0].map(n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`);
    await client.query(`INSERT INTO commit_draft_checkpoints VALUES
      ('test',$1,'actor','login','2026-11-02T10:00:00Z'),
      ('test',$2,'actor','login','2026-11-02T10:00:00Z'),
      ('test',$3,'actor','login','2026-11-01T10:00:00Z')`, ids.slice(0, 3));
    await client.query(readFileSync(new URL('../migrations/010-checkpoint-order.sql', import.meta.url), 'utf8'));
    const historical = (await client.query('SELECT id FROM commit_draft_checkpoints ORDER BY checkpoint_order')).rows;
    assert.deepEqual(historical.map(r => r.id), [ids[2], ids[0], ids[1]]);
    // A new save has both an earlier timestamp and a smaller UUID. Neither
    // may cause the deficiency list to select an older directory snapshot.
    await client.query(`INSERT INTO commit_draft_checkpoints(tenant,id,actor,auth_session,created_at)
      VALUES('test',$1,'actor','login','2026-10-01T10:00:00Z')`, [ids[3]]);
    const latest = (await client.query(`SELECT id FROM commit_draft_checkpoints
      WHERE tenant='test' AND actor='actor' AND auth_session='login' ORDER BY checkpoint_order DESC LIMIT 1`)).rows;
    assert.equal(latest[0].id, ids[3]);
  } finally {
    await client.query('RESET search_path');
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release();
    await db.end();
  }
});
