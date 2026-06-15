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

  if (method === 'POST' && path === '/login'){
    
    try{
     const body= parseRequestBody(req);
    }catch(err){
      res.writeHead(401,{'Content-Type':'application/json'});
      res.end(JSON.stringify({
        error:"Invalid JSON"
      }));
      return;
    }
    const existingUser = [...users.values()].find(
      user=>user.username===body.username
    );
    if(!existingUser){
      res.writeHead(401,{'Content-Type':'application/json'});
      res.end(JSON.stringify({
        error:"Username or password doesn't exist"}
      ))
      return;
    }
    const isMatch= await bcrypt.compare(body.password, existingUser.passwordHash);
    if(!isMatch){
      res.writeHead(401,{'Content-Type':'application/json'});
      res.end(JSON.stringify({
        error:"Username or password doesn't exist"}
      ))
      return;
    }
    
      const sessionId= generateSessionId();

      
      sessions.set(sessionId,{id:existingUser.id,
        createdAt: new Date().toISOString()
      })

      res.setHeader('Set-Cookie',sessionId=`${sessionId}`);
      res.writeHead(200,{
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify({
    message: "Logged in", 
    username:existingUser.username
  }));
  return;
    

  }
  if(method==='GET'&& path==='/me'){
    const cookieHeader = req.headers.cookie ||'';
    const sessionId=cookieHeader.split(',').map(cookie=>cookie.trim()).find(cookie=>cookie.startsWith("sessionId="))?.split("=")[1];
    const session=sessionId?sessions.get(sessionId):null;
    if(!session){
      res.writeHead(401,{'Content-Type':'application/json'});
      res.end();
      return;
    }
    const { id, username, role } = session;
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({
      id, username, role
    }))


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