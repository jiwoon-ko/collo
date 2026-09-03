import { getPool, corsHeaders } from './_db.mjs';

export const handler = async (event) => {
  const headers = corsHeaders('GET');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const pool = getPool();
  try {
    // 관리자 계정(admin)과, 개발 중 API 테스트용으로 만들어졌던 임시 계정은 랭킹에서 제외
    const result = await pool.query(
      `SELECT username, points FROM users
       WHERE LOWER(username) <> 'admin'
         AND username NOT ILIKE 'schematest%'
         AND username NOT ILIKE 'authtest%'
         AND username NOT ILIKE 'logtest%'
       ORDER BY points DESC LIMIT 50`
    );
    const rankings = result.rows.map((r, i) => ({ rank: i + 1, username: r.username, points: r.points }));
    return { statusCode: 200, headers, body: JSON.stringify({ rankings }) };
  } catch (err) {
    console.error('Rankings function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '랭킹 조회 중 오류가 발생했습니다.' }) };
  } finally {
    await pool.end();
  }
};
