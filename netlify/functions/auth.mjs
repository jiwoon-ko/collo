import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, corsHeaders } from './_db.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'aegis_cyber_wargame_super_secret_key_2026';

const toClientUser = (u) => ({
  id: u.id,
  username: u.username,
  points: u.points,
  solvedIds: u.solved_ids || [],
  tacticalMastery: u.tactical_mastery || {},
});

export const handler = async (event) => {
  const headers = corsHeaders('POST, DELETE');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '');
  const pool = getPool();

  try {
    // DELETE /delete — 계정 삭제 (비밀번호 재확인 필요)
    if (event.httpMethod === 'DELETE') {
      const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
      const token = authHeader.split(' ')[1];
      if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: '인증 토큰이 필요합니다.' }) };

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        return { statusCode: 403, headers, body: JSON.stringify({ error: '유효하지 않거나 만료된 토큰입니다.' }) };
      }

      const body = JSON.parse(event.body || '{}');
      const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: '사용자를 찾을 수 없습니다.' }) };
      }
      const match = await bcrypt.compare(body.password || '', userRes.rows[0].password);
      if (!match) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '비밀번호가 일치하지 않습니다.' }) };
      }

      await pool.query('DELETE FROM users WHERE id = $1', [decoded.id]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const username = (body.username || '').trim();
    const password = body.password || '';

    if (!username || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '아이디와 비밀번호를 입력해주세요.' }) };
    }

    if (path === '/register') {
      const check = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (check.rows.length > 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '이미 존재하는 에이전트 이름입니다.' }) };
      }

      const hashed = await bcrypt.hash(password, 10);
      const insertRes = await pool.query(
        `INSERT INTO users (username, password, points, solved_ids, tactical_mastery)
         VALUES ($1, $2, 0, '[]'::jsonb, '{}'::jsonb)
         RETURNING id, username, points, solved_ids, tactical_mastery`,
        [username, hashed]
      );
      const user = insertRes.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
      return { statusCode: 201, headers, body: JSON.stringify({ token, user: toClientUser(user) }) };
    }

    if (path === '/login') {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '존재하지 않는 에이전트이거나 비밀번호가 틀립니다.' }) };
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '존재하지 않는 에이전트이거나 비밀번호가 틀립니다.' }) };
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
      return { statusCode: 200, headers, body: JSON.stringify({ token, user: toClientUser(user) }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    console.error('Auth function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '서버 내부 오류가 발생했습니다.' }) };
  } finally {
    await pool.end();
  }
};
