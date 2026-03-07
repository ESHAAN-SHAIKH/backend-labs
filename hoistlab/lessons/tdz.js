module.exports = function () {
  const results = {};
  const errors = {};

  // var before declaration
  results.varBefore = (function () {
    return x;
    var x = 10;
  })();

  // let before declaration
  try {
    eval('(function(){ return y; let y = 10; })()');
  } catch (e) {
    errors.letTDZ = e.message;
  }

  // const before declaration
  try {
    eval('(function(){ return z; const z = 10; })()');
  } catch (e) {
    errors.constTDZ = e.message;
  }

  return {
    description: "Demonstrates TDZ for let and const and contrasts with var initialization behavior.",
    results,
    errors
  };
};
