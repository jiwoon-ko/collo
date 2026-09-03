import { getPool, corsHeaders } from './_db.mjs';

export const handler = async (event) => {
  const headers = corsHeaders('GET, POST');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const path = event.path.replace('/.netlify/functions/posts', '').replace('/api/posts', '');
  const parts = path.split('/').filter(Boolean); // [] | [id] | [id, 'like'] | [id, 'comments']

  const pool = getPool();
  try {
    // POST /:id/like
    if (parts.length === 2 && parts[1] === 'like') {
      if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
      const postId = parseInt(parts[0]);
      const result = await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING likes', [postId]);
      if (result.rows.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: '게시글을 찾을 수 없습니다.' }) };
      return { statusCode: 200, headers, body: JSON.stringify({ likes: result.rows[0].likes }) };
    }

    // GET/POST /:id/comments
    if (parts.length === 2 && parts[1] === 'comments') {
      const postId = parseInt(parts[0]);
      if (event.httpMethod === 'GET') {
        const result = await pool.query('SELECT * FROM comments WHERE post_id = $1 ORDER BY id ASC', [postId]);
        return { statusCode: 200, headers, body: JSON.stringify({ comments: result.rows }) };
      }
      if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const author = (body.author || 'Anonymous Operator').trim();
        const content = (body.content || '').trim();
        if (!content) return { statusCode: 400, headers, body: JSON.stringify({ error: '댓글 내용을 입력해주세요.' }) };
        const result = await pool.query(
          'INSERT INTO comments (post_id, author, content) VALUES ($1, $2, $3) RETURNING *',
          [postId, author, content]
        );
        return { statusCode: 201, headers, body: JSON.stringify({ comment: result.rows[0] }) };
      }
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // GET / — list, POST / — create
    if (event.httpMethod === 'GET') {
      const result = await pool.query('SELECT * FROM posts ORDER BY id DESC LIMIT 100');
      return { statusCode: 200, headers, body: JSON.stringify({ posts: result.rows }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const title = (body.title || '').trim();
      const content = (body.content || '').trim();
      const author = (body.author || 'Anonymous Operator').trim();
      const category = body.category === 'problem' ? 'problem' : 'free';
      if (!title || !content) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '통신 제목과 내용을 모두 입력해 주세요.' }) };
      }
      const result = await pool.query(
        'INSERT INTO posts (title, content, author, category, likes) VALUES ($1, $2, $3, $4, 0) RETURNING *',
        [title, content, author, category]
      );
      return { statusCode: 201, headers, body: JSON.stringify({ post: result.rows[0] }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    console.error('Posts function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '게시글 처리 중 오류가 발생했습니다.' }) };
  } finally {
    await pool.end();
  }
};
