import * as esbuild from 'esbuild';

const shared = {
  entryPoints: ['src/intentlm.ts'],
  bundle:      true,
  sourcemap:   true,
  target:      ['es2020'],
};

const reactEntry = {
  entryPoints: ['src/react-views.ts'],
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
  external: ['react'],
};

const taxonomyEntry = {
  entryPoints: ['src/taxonomy.ts'],
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
};

const actionsEntry = {
  entryPoints: ['src/intentlm-actions.ts'],
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
};

/**
 * ESM/CJS actions must import the same intentLM singleton as the main package.
 * Rewrite ./intentlm.js → external "intentlm-sdk" (no self-dependency in package.json).
 * IIFE actions keep bundling intentlm.ts for standalone <script> usage.
 */
const actionsSdkExternalPlugin = {
  name: 'actions-intentlm-external',
  setup(build) {
    build.onResolve({ filter: /^\.\/intentlm\.js$/ }, (args) => {
      if (!args.importer?.includes('intentlm-actions')) return;
      return { path: 'intentlm-sdk', external: true };
    });
  },
};

const actionsLinked = {
  ...actionsEntry,
  plugins: [actionsSdkExternalPlugin],
};

await Promise.all([
  esbuild.build({
    ...shared,
    format:    'esm',
    outfile:   'dist/intentlm.esm.js',
    splitting: false,
  }),

  esbuild.build({
    ...shared,
    format:  'cjs',
    outfile: 'dist/intentlm.cjs.js',
  }),

  esbuild.build({
    ...shared,
    format:        'iife',
    globalName:    'intentLMModule',
    outfile:       'dist/intentlm.iife.js',
    minify:        true,
  }),

  esbuild.build({ ...taxonomyEntry, format: 'esm', outfile: 'dist/taxonomy.esm.js' }),
  esbuild.build({ ...taxonomyEntry, format: 'cjs', outfile: 'dist/taxonomy.cjs.js' }),

  esbuild.build({ ...reactEntry, format: 'esm', outfile: 'dist/react-views.esm.js' }),
  esbuild.build({ ...reactEntry, format: 'cjs', outfile: 'dist/react-views.cjs.js' }),

  esbuild.build({ ...actionsLinked, format: 'esm', outfile: 'dist/intentlm-actions.esm.js' }),
  esbuild.build({ ...actionsLinked, format: 'cjs', outfile: 'dist/intentlm-actions.cjs.js' }),
  esbuild.build({
    ...actionsEntry,
    format: 'iife',
    globalName: 'intentLMActionsModule',
    outfile: 'dist/intentlm-actions.iife.js',
    minify: true,
  }),
]);

console.log('Build complete → dist/');
