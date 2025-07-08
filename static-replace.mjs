import fs from 'fs';

const indexHTML = fs.readFileSync('build/index.html', 'utf-8');
const staticBuild = fs.readFileSync('build/static.html', 'utf-8');

const rootKeyword = '<div id="root">';
const rootIndex = indexHTML.indexOf(rootKeyword) + rootKeyword.length;

if (!indexHTML.slice(rootIndex).startsWith('</div>')) {
  console.error('Already replaced');
  process.exit(1);
}

const newHTML =
  indexHTML.slice(0, rootIndex) + staticBuild + indexHTML.slice(rootIndex);

fs.writeFileSync('build/index.html', newHTML);
