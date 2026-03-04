const express=require('express')
const letLesson=require('./lessons/let');
const constLesson=require('./lessons/const')
const app=express();
const port=3000;

app.get('/let',(req,res)=>{
res.json(letLesson());

})

app.get('/const',(req,res)=>{
    res.json(constLesson());
})
app.listen(port,console.log(`App listening on ${port}`))