import fs from 'node:fs';
import { exec } from 'node:child_process';
import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import { banner } from './banner.mjs';

(async () => {
    fs.rmSync('./dist', { force: true, recursive: true });
    fs.mkdirSync('./dist');

    exec('tsc --outDir dist --declaration --emitDeclarationOnly');
    fs.copyFile('package.json', './dist/package.json', console.warn);
    fs.copyFile('LICENSE', './dist/LICENSE', console.warn);
    fs.copyFile('README.md', './dist/README.md', console.warn);

    rollup({
        input: 'src/request.ts',
        plugins: [
            typescript({
                compilerOptions: { target: 'ES5' },
            }),
            terser(),
        ],
        external: ['tslib', 'lodash-es'],
    }).then((bundle) => {
        bundle.write({
            dir: 'dist',
            format: 'esm',
            sourcemap: true,
            banner,
        });
    });

    rollup({
        input: 'src/nest/index.ts',
        plugins: [
            typescript({
                compilerOptions: { target: 'ES2017' },
            }),
        ],
        external: [/^node:/, '@nestjs/common'],
    }).then((bundle) => {
        bundle.write({
            dir: 'dist/nest',
            format: 'cjs',
            sourcemap: true,
            banner,
        });
    });

    rollup({
        input: 'src/nest/vite.ts',
        plugins: [
            typescript({
                compilerOptions: { target: 'ES2017' },
            }),
        ],
        external: [/^node:/, 'typescript'],
    }).then((bundle) => {
        bundle.write({
            dir: 'dist/nest',
            format: 'cjs',
            sourcemap: true,
            banner,
        });
    });
})();
