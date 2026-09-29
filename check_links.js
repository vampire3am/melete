const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const linkRegex = /href=["']([^"'#][^"']*)["']/g;
const allLinks = new Map();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const raw = match[1];
    const target = raw.split('?')[0].split('#')[0];
    if (!target.startsWith('http') && !target.startsWith('mailto:') && !target.startsWith('tel:') && !target.startsWith('javascript:') && !target.startsWith('${')) {
      if (!allLinks.has(target)) allLinks.set(target, []);
      allLinks.get(target).push(f);
    }
  }
});

console.log('--- LINK AUDIT RESULTS ---');
let brokenCount = 0;
for (const [target, sources] of allLinks.entries()) {
  const exists = fs.existsSync(target);
  if (!exists) {
    brokenCount++;
    console.log('✗ BROKEN:', target, 'in', sources.join(', '));
  } else {
    console.log('✓ OK:', target);
  }
}
console.log('Total broken internal links:', brokenCount);
