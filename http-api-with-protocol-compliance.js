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

function parseBody(req){
    return new Promise((resolve,reject)=>{
        let body="";
        req.on('data',chunk=>{
            
        })
    })
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