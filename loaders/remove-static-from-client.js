const crypto = require('crypto');
const parse = require('@babel/parser').parse;
const traverse = require("@babel/traverse").default;

module.exports = function(source) {
  const hash = crypto.createHash('md5').update(source).digest("hex");
  let hashPosition;
  const injections = {};
  const positions = [];
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['classProperties', 'jsx']
  });
  traverse(ast, {
    ClassBody(path) {
      const start = path.node.body[0].start;
      hashPosition = start;
    },
    ClassMethod(path) {
      if(path.node.static && path.node.async) {
        injections[path.node.start] = {end: path.node.end, name: path.node.key.name};
        positions.push(path.node.start);
      }
    }
  });
  positions.reverse();
  positions.push(0);
  let outputs = [];
  let last;
  for(const position of positions) {
    let code = source.slice(position, last);
    last = position;
    const injection = injections[position];
    if (position) {
      const location = injection.end - position;
      if(injection.name === 'start') {
        code = code.substring(location).trimStart();
      } else {
        code = `static ${injection.name} = true;` + code.substring(location);
      }
      outputs.push(code);
    } else {
      outputs.push(code);
    }
    if(position === hashPosition) {
      if(positions.length > 1) {
        outputs.push(`static hash = '${hash}';\n\n  `);
      }
    } 
  }
  return outputs.reverse().join('');
}