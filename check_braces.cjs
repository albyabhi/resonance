const fs = require('fs');
let content = fs.readFileSync('src/components/actions/JudgeDashboard.jsx', 'utf8');
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const lines = content.split('\n');
let braceCount = 0;
let inFunction = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const JudgeDashboard = () => {')) {
    inFunction = true;
  }
  if (inFunction) {
    for (const ch of line) {
      if (ch === '{') braceCount++;
      if (ch === '}') braceCount--;
    }
    if (braceCount < 0) {
      console.log('Negative brace count at line', i+1, ':', lines[i]);
    }
    console.log('Line', i+1, 'Brace count:', braceCount, ':', lines[i].trim().slice(0, 80));
    if (braceCount === 0 && inFunction) {
      console.log('Function closes at line', i+1, ':', lines[i]);
      break;
    }
  }
}