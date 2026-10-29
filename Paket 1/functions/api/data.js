import { currentUser, json, requireDb, sameOrigin } from './_shared.js';

function mergeRecords(serverRows, baseRows, localRows) {
  const base = new Map(baseRows.map(row => [row.id, JSON.stringify(row)]));
  const local = new Map(localRows.map(row => [row.id, JSON.stringify(row)]));
  const merged = [...serverRows];
  for (const [id] of base) {
    if (!local.has(id)) {
      const index = merged.findIndex(row => row.id === id);
      if (index !== -1) merged.splice(index, 1);
    }
  }
  for (const row of localRows) {
    const id = row.id;
    const changed = !base.has(id) || base.get(id) !== JSON.stringify(row);
    if (!changed) continue;
    const index = merged.findIndex(existing => existing.id === id);
    if (index === -1) merged.unshift(row);
    else merged[index] = row;
  }
  return merged;
}

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Silakan masuk kembali.' }, 401);
    const row = await requireDb(env).prepare('SELECT transactions_json,projects_json,revision FROM business_data WHERE workspace_id=?').bind(user.workspaceId).first();
    return json({ transactions: row ? JSON.parse(row.transactions_json) : [], projects: row ? JSON.parse(row.projects_json) : [], hasData: !!row, revision: row?.revision || 0 });
  } catch (error) { return json({ error: error.message || 'Gagal memuat data.' }, 503); }
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Permintaan ditolak.' }, 403);
  try {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Silakan masuk kembali.' }, 401);
    const body = await request.json();
    if (!Array.isArray(body.transactions) || !Array.isArray(body.projects)) return json({ error: 'Data tidak valid.' }, 400);
    if (!Array.isArray(body.baseTransactions) || !Array.isArray(body.baseProjects)) return json({ error: 'Data dasar untuk sinkronisasi tidak valid.' }, 400);
    const baseTransactions = body.baseTransactions;
    const baseProjects = body.baseProjects;
    const db = requireDb(env);
    for (let attempt = 0; attempt < 6; attempt++) {
      const current = await db.prepare('SELECT transactions_json,projects_json,revision FROM business_data WHERE workspace_id=?').bind(user.workspaceId).first();
      const serverTransactions = current ? JSON.parse(current.transactions_json) : [];
      const serverProjects = current ? JSON.parse(current.projects_json) : [];
      const transactions = mergeRecords(serverTransactions, baseTransactions, body.transactions);
      const projects = mergeRecords(serverProjects, baseProjects, body.projects);
      const tx = JSON.stringify(transactions);
      const projectJson = JSON.stringify(projects);
      if (tx.length + projectJson.length > 1_000_000) return json({ error: 'Ukuran data terlalu besar.' }, 413);
      if (!current) {
        const inserted = await db.prepare(`INSERT OR IGNORE INTO business_data(workspace_id,transactions_json,projects_json,revision,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)`).bind(user.workspaceId, tx, projectJson, 1).run();
        if (inserted.meta.changes === 1) return json({ ok: true, transactions, projects, revision: 1, savedAt: new Date().toISOString() });
      } else {
        const updated = await db.prepare(`UPDATE business_data SET transactions_json=?,projects_json=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND revision=?`).bind(tx, projectJson, user.workspaceId, current.revision).run();
        if (updated.meta.changes === 1) return json({ ok: true, transactions, projects, revision: current.revision + 1, savedAt: new Date().toISOString() });
      }
    }
    return json({ error: 'Ada perubahan lain yang sedang disimpan. Coba lagi sebentar.' }, 409);
  } catch (error) { return json({ error: error.message || 'Gagal menyimpan data.' }, 503); }
}
