import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const pkgStr = fs.readFileSync(
    path.resolve(__filename, '../../package.json'),
    'utf8'
);
const pkg = JSON.parse(pkgStr);

export const banner = `
/**
 * ${pkg.name}@${pkg.version}
 * ${pkg.description}
 * @author ${pkg.author.name} <${pkg.author.email}>
 * @license ${pkg.license}
 */`;
