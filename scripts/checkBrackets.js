const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'server', 'server.js');
const s = fs.readFileSync(file, 'utf8');
let st = [];
let ln = 1, col = 0;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === '\n') { ln++; col = 0; } else { col++; }
  if (c === '{' || c === '(' || c === '[') st.push({ c, ln, col });
  if (c === '}' || c === ')' || c === ']') {
    const m = st.pop();
    if (!m) {
      console.log('Unmatched closing', c, 'at', ln, col);
      process.exit(1);
    }
    const pairs = { '}': '{', ')': '(', ']': '[' };
    if (m.c !== pairs[c]) {
      console.log('Mismatched', c, 'at', ln, col, 'expected to match', m.c, 'from', m.ln, m.col);
      process.exit(1);
    }
  }
}
if (st.length) {
  const last = st[st.length - 1];
  console.log('Unclosed opener at line', last.ln, 'col', last.col, 'char', last.c);
  process.exit(2);
} else {
  console.log('Brackets balanced');
}

