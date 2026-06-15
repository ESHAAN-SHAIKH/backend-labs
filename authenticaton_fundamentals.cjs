const http = require('http');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const querystring = require('querystring');
const { URL } = require('url');

const saltRounds = 12;
const users = new Map();
const sessions = new Map();

function validatePost(data) {
  return (
    typeof data.username === 'string' &&
    data.username.trim() !== '' &&
    typeof data.password === 'string' &&
    data.password.trim() !== ''
  );
}

function getSessionId(req) {
  const cookieHeader = req.headers.cookie || '';

  return cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('session='))
    ?.split('=')[1];
}

async function hashPassword(password) {
  return bcrypt.hash(password, saltRounds);
}

function generateId() {
  return crypto.randomUUID();
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function parseRequestBody(req) {
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
        } else if (
          contentType.includes('application/x-www-form-urlencoded')
        ) {
          resolve(querystring.parse(body));
        } else {
          resolve({});
        }
      } catch (err) {
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

// Create admin user once during startup
async function initializeAdmin() {
  const adminId = generateId();
  const hash = await hashPassword('Eshaan123');

  users.set(adminId, {
    id: adminId,
    username: 'admin',
    passwordHash: hash,
    role: 'admin'
  });
}
function getAuthenticatedUser(req) {
  const sessionId = getSessionId(req);
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  return users.get(session.userId) || null;
}

function requireRole(role) {
  return req => {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return {
        status: 401,
        error: 'Unauthorized'
      };
    }

    if (user.role !== role) {
      return {
        status: 403,
        error: 'Forbidden'
      };
    }

    return {
      status: 200,
      user
    };
  };
}

const requireAdmin = requireRole('admin');
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  if (method === 'POST' && path === '/register') {
    let body;

    try {
      body = await parseRequestBody(req);
    } catch (err) {
      res.writeHead(400, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Invalid JSON'
        })
      );

      return;
    }

    if (!validatePost(body)) {
      res.writeHead(400, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Username and password are required'
        })
      );

      return;
    }

    const existingUser = [...users.values()].find(
      user => user.username === body.username
    );

    if (existingUser) {
      res.writeHead(409, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Username already exists'
        })
      );

      return;
    }

    const id = generateId();
    const passwordHash = await hashPassword(body.password);

    const user = {
      id,
      username: body.username,
      role: 'user',
      passwordHash
    };

    users.set(id, user);

    res.writeHead(201, {
      'Content-Type': 'application/json'
    });

    res.end(
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role
      })
    );

    return;
  }

  if (method === 'POST' && path === '/login') {
    let body;

    try {
      body = await parseRequestBody(req);
    } catch (err) {
      res.writeHead(400, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Invalid JSON'
        })
      );

      return;
    }

    const existingUser = [...users.values()].find(
      user => user.username === body.username
    );

    if (!existingUser) {
      res.writeHead(401, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Invalid username or password'
        })
      );

      return;
    }

    const isMatch = await bcrypt.compare(
      body.password,
      existingUser.passwordHash
    );

    if (!isMatch) {
      res.writeHead(401, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Invalid username or password'
        })
      );

      return;
    }

    const sessionId = generateSessionId();

    sessions.set(sessionId, {
      userId: existingUser.id,
      createdAt: new Date().toISOString()
    });

    res.setHeader('Set-Cookie', `session=${sessionId};HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(
      JSON.stringify({
        message: 'Logged in',
        username: existingUser.username
      })
    );

    return;
  }

  if (method === 'GET' && path === '/me') {
    const sessionId = getSessionId(req);
    const session = sessions.get(sessionId);

    if (!session) {
      res.writeHead(401, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Unauthorized'
        })
      );

      return;
    }

    const user = users.get(session.userId);

    if (!user) {
      res.writeHead(401, {
        'Content-Type': 'application/json'
      });

      res.end(
        JSON.stringify({
          error: 'Unauthorized'
        })
      );

      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role
      })
    );

    return;
  }

  if (method === 'POST' && path === '/logout') {
    const sessionId = getSessionId(req);

    if (sessionId) {
      sessions.delete(sessionId);
    }
     res.setHeader('Set-Cookie','session=;HttpOnly;SameSite=Strict; Max-Age=0')

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    

    res.end(
      JSON.stringify({
        message: 'Logged out'
      })
    );

    return;
  }
  if (method === 'GET' && path === '/admin') {
  const auth = requireAdmin(req);

  if (auth.status !== 200) {
    res.writeHead(auth.status, {
      'Content-Type': 'application/json'
    });

    res.end(
      JSON.stringify({
        error: auth.error
      })
    );

    return;
  }

  const userList = [...users.values()].map(user => ({
    id: user.id,
    username: user.username,
    role: user.role
  }));

  res.writeHead(200, {
    'Content-Type': 'application/json'
  });

  res.end(JSON.stringify(userList));

  return;
}

  res.writeHead(404, {
    'Content-Type': 'application/json'
  });

  res.end(
    JSON.stringify({
      error: 'Route not found'
    })
  );
});

initializeAdmin()
  .then(() => {
    server.listen(3000, () => {
      console.log('Server running on http://localhost:3000');
    });
  })
  .catch(err => {
    console.error('Failed to initialize admin:', err);
    process.exit(1);
  });