import jwt from 'jsonwebtoken';
import { getPool, corsHeaders } from './_db.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'aegis_cyber_wargame_super_secret_key_2026';

export const handler = async (event) => {
  const headers = corsHeaders('GET');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: '인증 토큰이 필요합니다.' }) };

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: '유효하지 않거나 만료된 토큰입니다.' }) };
  }

  const pool = getPool();
  try {
    const result = await pool.query(
      'SELECT id, username, points, solved_ids, tactical_mastery FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: '사용자를 찾을 수 없습니다.' }) };
    }
    const u = result.rows[0];
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        user: {
          id: u.id,
          username: u.username,
          points: u.points,
          solvedIds: u.solved_ids || [],
          tacticalMastery: u.tactical_mastery || {},
        }
      })
    };
  } catch (err) {
    console.error('Me function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '프로필 조회 중 오류가 발생했습니다.' }) };
  } finally {
    await pool.end();
  }
};
