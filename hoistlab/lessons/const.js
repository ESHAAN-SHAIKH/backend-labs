module.exports=function(){
results={};
errors={};

const user={
    name:"eshaan"
}
user.name="shaikh"
results.mutation=user.name;


try{
eval('const a')
}catch(e){
    errors.notInitialized=e.message;
}

try{
    eval('const b=10; b=20')
}catch(e){
    errors.reassigned=e.message;
}
return {
    "description":"this lesson teach us about const , No initiliazation throw error, const can't be reassigned and how mutation is allowed",
    results,
    errors
}
};