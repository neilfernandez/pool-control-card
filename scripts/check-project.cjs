const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const pkg = JSON.parse(fs.readFileSync('package.json'));
const hacs = JSON.parse(fs.readFileSync('hacs.json'));
const code = fs.readFileSync('pool-control-card.js', 'utf8');
assert.equal(hacs.filename, `${pkg.name}.js`);
assert.ok(code.includes(`const POOL_VERSION = '${pkg.version}'`));
assert.equal(hacs.content_in_root, true);
for (const name of ['README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md']) assert.ok(fs.existsSync(name), `Missing ${name}`);
let files;
try { files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean); }
catch { files = ['pool-control-card.js', 'README.md', 'hacs.json']; }
for (const file of files) {
  if (!/\.(js|cjs|json|ya?ml|md)$/.test(file) || file === 'scripts/check-project.cjs') continue;
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(!/192\.168\.|\/Users\/|backyard_pool|pool-hero-photo|1ftfw|github_pat_|gh[pousr]_[A-Za-z0-9]{20,}/i.test(content), `Private data marker in ${file}`);
}
console.log(`Project metadata and privacy checks passed (${pkg.version}).`);
