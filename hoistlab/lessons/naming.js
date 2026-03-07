module.exports=function(){
    const results={};
    const errors={};
    try { eval('let 1abc = 5;'); }
  catch (e) { errors.startsWithNumber = e.message; }

  try { eval('let for = 5;'); }
  catch (e) { errors.reservedKeyword = e.message; }

  try { eval('let $valid = 5;'); results.dollarValid = true; }
  catch {}

  try { eval('let _valid = 5;'); results.underscoreValid = true; }
  catch {}

  try {
    eval('let caseTest = 1; let CaseTest = 2;');
    results.caseSensitive = true;
  } catch {}

  return {
    description: "Demonstrates variable naming rules and parse-time syntax violations.",
    results,
    errors
  };

};