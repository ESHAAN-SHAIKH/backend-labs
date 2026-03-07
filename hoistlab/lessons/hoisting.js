module.exports = function () {
  const results = {};
  const errors = {};

  // var hoisting
  results.varHoisted = (function () {
    return a;
    var a = 5;
  })();

  // function declaration
  results.funcDeclaration = declaredFunction();

  function declaredFunction() {
    return "I am hoisted fully";
  }

  // function expression
  try {
    exprFunction();
    var exprFunction = function () {};
  } catch (e) {
    errors.functionExpression = e.message;
  }

  return {
    description: "Demonstrates hoisting differences between var, let, const, function declarations, and function expressions.",
    results,
    errors
  };
};
