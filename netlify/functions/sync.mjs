import jwt from 'jsonwebtoken';
import { getPool, corsHeaders } from './_db.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'aegis_cyber_wargame_super_secret_key_2026';

export const handler = async (event) => {
  const headers = corsHeaders('POST');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

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
  const points = Number.isFinite(body.points) ? Math.max(0, Math.floor(body.points)) : 0;
  const solvedIds = Array.isArray(body.solvedIds) ? body.solvedIds.slice(0, 2000) : [];
  const tacticalMastery = typeof body.tacticalMastery === 'object' && body.tacticalMastery !== null ? body.tacticalMastery : {};

  const pool = getPool();
  try {
    await pool.query(
      `UPDATE users SET points = $1, solved_ids = $2::jsonb, tactical_mastery = $3::jsonb WHERE id = $4`,
      [points, JSON.stringify(solvedIds), JSON.stringify(tacticalMastery), decoded.id]
    );
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Sync function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '진행 상황 저장 중 오류가 발생했습니다.' }) };
  } finally {
    await pool.end();
  }
};
