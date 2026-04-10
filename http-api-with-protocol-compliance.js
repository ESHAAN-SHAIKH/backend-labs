const http=require('http');
const crypto=require('crypto');

function generateId(){
    return crypto.randomUUID();
}

function generateETag(data){
const hash=crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex');
return '${hash}';
}
function sendResponse(res,req,{status=200,headers={},body=null}) {
    const baseHeaders={
        "Content-Type":"application/json",
        "X-Request-Id":req.id,
        ...headers
    };
    res.writeHead(status,baseHeaders);
    if(status==204||status==304){
       return res.end();
    }
    res.end(body?JSON.stringify(body):null);
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