import { cookie, currentUser, digest, hashPassword, issueSession, json, requireDb, sameOrigin, validText } from './_shared.js';

export async function onRequestGet({ request, env }) {
  try { return json({ session: await currentUser(request, env) }); }
  catch (error) { return json({ error: error.message }, 503); }
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Permintaan ditolak.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Format permintaan tidak valid.' }, 400); }
  const db = requireDb(env);
  const headers = {};

  if (body.action === 'logout') {
    const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)pf_session=([A-Za-z0-9_-]+)/)?.[1];
    if (token) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
    headers['Set-Cookie'] = cookie('', 0);
    return json({ ok: true }, 200, headers);
  }

  if (body.action === 'register') {
    const username = String(body.username || '').trim().toLowerCase();
    const password = body.password;
    if (!validText(username, 3, 40) || !/^[a-z0-9._-]+$/.test(username)) return json({ error: 'Username minimal 3 karakter; gunakan huruf, angka, titik, garis bawah, atau tanda hubung.' }, 400);
    if (!validText(password, 8, 256)) return json({ error: 'Password minimal 8 karakter.' }, 400);
    if (!validText(body.displayName, 2, 100)) return json({ error: 'Nama lengkap minimal 2 karakter.' }, 400);
    const id = crypto.randomUUID();
    const salt = crypto.randomUUID() + crypto.randomUUID();
    const inviteCode = String(body.inviteCode || '').trim().toUpperCase();
    let workspace;
    let role;
    let createWorkspace = false;
    if (inviteCode) {
      if (!/^[A-F0-9]{12}$/.test(inviteCode)) return json({ error: 'Format kode undangan tidak valid.' }, 400);
      workspace = await db.prepare('SELECT id,name FROM workspaces WHERE invite_code=?').bind(inviteCode).first();
      if (!workspace) return json({ error: 'Kode undangan tidak valid atau sudah diganti.' }, 400);
      role = 'user';
    } else {
      workspace = { id: crypto.randomUUID(), name: String(body.businessName || '').trim().slice(0, 120) || `${body.displayName.trim()} - Workspace` };
      const random = crypto.getRandomValues(new Uint8Array(6));
      workspace.inviteCode = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
      role = 'admin';
      createWorkspace = true;
    }
    try {
      const statements = [
        db.prepare('INSERT INTO users(id,username,display_name,business_name,password_salt,password_hash) VALUES(?,?,?,?,?,?)').bind(id, username, body.displayName.trim(), String(body.businessName || '').trim().slice(0, 120), salt, await hashPassword(password, salt))
      ];
      if (createWorkspace) statements.push(db.prepare('INSERT INTO workspaces(id,name,invite_code) VALUES(?,?,?)').bind(workspace.id, workspace.name, workspace.inviteCode));
      statements.push(db.prepare('INSERT INTO memberships(user_id,workspace_id,role) VALUES(?,?,?)').bind(id, workspace.id, role));
      await db.batch(statements);
    } catch (error) {
      if (String(error.message || '').includes('UNIQUE')) return json({ error: 'Username sudah digunakan.' }, 409);
      throw error;
    }
    return json({ ok: true, role, workspaceName: workspace.name });
  }

  if (body.action === 'login') {
    const username = String(body.username || '').trim().toLowerCase();
    const row = await db.prepare(`SELECT u.id, u.username, u.display_name AS displayName,
      COALESCE(w.name,u.business_name) AS businessName, u.password_salt, u.password_hash,
      m.workspace_id AS workspaceId, m.role
      FROM users u JOIN memberships m ON m.user_id=u.id JOIN workspaces w ON w.id=m.workspace_id
      WHERE u.username=?`).bind(username).first();
    if (!row || await hashPassword(String(body.password || ''), row.password_salt) !== row.password_hash) return json({ error: 'Username atau password salah.' }, 401);
    const token = await issueSession(db, row.id);
    headers['Set-Cookie'] = cookie(token);
    return json({ ok: true, session: { userId: row.id, username: row.username, displayName: row.displayName, businessName: row.businessName, workspaceId: row.workspaceId, role: row.role } }, 200, headers);
  }

  if (body.action === 'change-password') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, 401);
    if (!validText(body.newPassword, 8, 256)) return json({ error: 'Password baru minimal 8 karakter.' }, 400);
    const row = await db.prepare('SELECT password_salt,password_hash FROM users WHERE id=?').bind(user.id).first();
    if (!row || await hashPassword(String(body.currentPassword || ''), row.password_salt) !== row.password_hash) return json({ error: 'Password lama salah.' }, 401);
    const salt = crypto.randomUUID() + crypto.randomUUID();
    await db.prepare('UPDATE users SET password_salt=?,password_hash=? WHERE id=?').bind(salt, await hashPassword(body.newPassword, salt), user.id).run();
    return json({ ok: true, session: user }, 200, headers);
  }
  return json({ error: 'Aksi tidak dikenal.' }, 400);
}

