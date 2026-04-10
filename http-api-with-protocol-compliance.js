const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const querystring = require('querystring');

const PORT = 3000;

// In-memory store
const posts = new Map();

// ---- Utilities ----

// Generate request ID
function generateRequestId() {
  return crypto.randomUUID();
}

// Generate ETag from data
function generateETag(data) {
  const hash = crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

// Send JSON response
function sendJson(res, status, data, headers = {}) {
  const body = data ? JSON.stringify(data) : '';

  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers
  });

  res.end(body);
}

// Send empty response
function sendEmpty(res, status, headers = {}) {
  res.writeHead(status, headers);
  res.end();
}

// Parse body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';

      try {
        if (contentType.includes('application/json')) {
          resolve(body ? JSON.parse(body) : {});
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          resolve(querystring.parse(body));
        } else {
          resolve({});
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Validation
function validatePost(data, partial = false) {
  const errors = {};

  if (!partial || 'title' in data) {
    if (!data.title || data.title.trim() === '') {
      errors.title = 'Title is required';
    }
  }

  if (!partial || 'content' in data) {
    if (!data.content || data.content.trim() === '') {
      errors.content = 'Content is required';
    }
  }

  if (!partial || 'author' in data) {
    if (!data.author || data.author.trim() === '') {
      errors.author = 'Author is required';
    }
  }

  return Object.keys(errors).length ? errors : null;
}

// ---- Server ----

const server = http.createServer(async (req, res) => {
  const requestId = generateRequestId();
  res.setHeader('X-Request-Id', requestId);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // Routing
  const postIdMatch = path.match(/^\/posts\/([^/]+)$/);

  try {

    // ---- OPTIONS ----
    if (method === 'OPTIONS') {
      if (path === '/posts') {
        return sendEmpty(res, 200, {
          'Allow': 'GET,POST,OPTIONS',
          'Content-Type': 'text/plain'
        });
      }

      if (postIdMatch) {
        return sendEmpty(res, 200, {
          'Allow': 'GET,PUT,PATCH,DELETE,OPTIONS',
          'Content-Type': 'text/plain'
        });
      }
    }

    // ---- GET /posts ----
    if (method === 'GET' && path === '/posts') {
      const allPosts = Array.from(posts.values());
      const etag = generateETag(allPosts);

      if (req.headers['if-none-match'] === etag) {
        return sendEmpty(res, 304, {
          'ETag': etag
        });
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
        'ETag': etag,
        'Transfer-Encoding': 'chunked'
      });

      res.write('[');

      allPosts.forEach((post, index) => {
        if (index > 0) res.write(',');
        res.write(JSON.stringify(post));
      });

      res.write(']');
      return res.end();
    }

    // ---- GET /posts/:id ----
    if (method === 'GET' && postIdMatch) {
      const id = postIdMatch[1];
      const post = posts.get(id);

      if (!post) {
        return sendJson(res, 404, { error: 'Not Found' });
      }

      const etag = generateETag(post);

      if (req.headers['if-none-match'] === etag) {
        return sendEmpty(res, 304, { 'ETag': etag });
      }

      return sendJson(res, 200, post, {
        'ETag': etag
      });
    }

    // ---- POST /posts ----
    if (method === 'POST' && path === '/posts') {
      const body = await parseBody(req);
      const errors = validatePost(body);

      if (errors) {
        return sendJson(res, 422, { errors });
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const post = {
        id,
        title: body.title,
        content: body.content,
        author: body.author,
        createdAt: now,
        updatedAt: now
      };

      posts.set(id, post);

      return sendJson(res, 201, post, {
        'Location': `/posts/${id}`
      });
    }

    // ---- PUT /posts/:id ----
    if (method === 'PUT' && postIdMatch) {
      const id = postIdMatch[1];
      const existing = posts.get(id);

      if (!existing) {
        return sendJson(res, 404, { error: 'Not Found' });
      }

      const body = await parseBody(req);
      const errors = validatePost(body);

      if (errors) {
        return sendJson(res, 422, { errors });
      }

      const updated = {
        id,
        title: body.title,
        content: body.content,
        author: body.author,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      };

      posts.set(id, updated);

      return sendJson(res, 200, updated);
    }

    // ---- PATCH /posts/:id ----
    if (method === 'PATCH' && postIdMatch) {
      const id = postIdMatch[1];
      const existing = posts.get(id);

      if (!existing) {
        return sendJson(res, 404, { error: 'Not Found' });
      }

      const body = await parseBody(req);
      const errors = validatePost(body, true);

      if (errors) {
        return sendJson(res, 422, { errors });
      }

      const updated = {
        ...existing,
        ...body,
        updatedAt: new Date().toISOString()
      };

      posts.set(id, updated);

      return sendJson(res, 200, updated);
    }

    // ---- DELETE /posts/:id ----
    if (method === 'DELETE' && postIdMatch) {
      const id = postIdMatch[1];

      if (!posts.has(id)) {
        return sendJson(res, 404, { error: 'Not Found' });
      }

      posts.delete(id);

      return sendEmpty(res, 204, {
        'Content-Type': 'application/json'
      });
    }

    // ---- 404 fallback ----
    sendJson(res, 404, { error: 'Not Found' });

  } catch (err) {
    sendJson(res, 500, { error: 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});