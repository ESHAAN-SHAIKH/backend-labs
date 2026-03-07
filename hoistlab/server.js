const express=require('express')
const letLesson=require('./lessons/let');
const constLesson=require('./lessons/const');
const namingLesson=require('./lessons/naming');
const tdzLesson=require('./lessons/tdz');
const hoistingLesson=require('./lessons/hoisting');
const app=express();
const port=3000;

app.get('/let',(req,res)=>{
res.json(letLesson());

})

app.get('/const',(req,res)=>{
    res.json(constLesson());
})

app.get('/naming',(req,res)=>{
    res.json(namingLesson());
})

app.get('/tdz',(req,res)=>{
    res.json(tdzLesson());
})

app.get('/hoisting',(req,res)=>{
    res.json(hoistingLesson());
})

app.listen(port,console.log(`App listening on ${port}`))