const http=require('http');
const crypto=require('crypto');

function generateId(){
    return crypto.randomUUID();
}

function generateETag(data){
const hash=crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex');
return '${hash}';
}


function sendJson(res, status, data, headers = {}) {
  const body = data ? JSON.stringify(data) : '';

  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers
  });

  res.end(body);
}

function sendEmpty(res, status, headers = {}) {
  res.writeHead(status, headers);
  res.end();
}

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



const server = http.createServer((req,res)=>{
    console.log('Method:',req.method);
    console.log('Url',req.Url);
    console.log('Headers',req.headers);
    res.statusCode=200;
    res.setHeader('Content-Type','text/plain');
    res.end('OK')
});


server.listen(3000,()=>{
    console.log("server listening at port http://localhost:3000")
});