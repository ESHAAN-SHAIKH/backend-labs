module.exports=function(){
    const results={};
    const errors={};

    let x=1;
    {
        let x=2;
        results.innerBlock=x;
    }
    results.outerBlock=x;

    try{
        eval('let y=1; let y=2')
    }catch(e){
        errors.redeclaration=e.message;
    }
    try{
        eval('z;let z=5;')
    }catch(e){
        errors.tdzAccess=e.message;
    }

    return {
        description:"Demonstrates let block scope, shadowing, redeclaration error, and TDZ behavior.",
        results,
        errors
    };
};