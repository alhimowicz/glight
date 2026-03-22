// @ts-check
import esbuild from 'esbuild';
import sass from 'sass';
import { mkdir, copyFile, writeFile } from 'fs/promises';

// All modules provided by the GNOME Shell runtime — do NOT bundle them.
const gnomeExternalPlugin = {
  name: 'gnome-externals',
  setup(build) {
    // Match gi://, resource://, system, gettext, cairo
    build.onResolve(
      { filter: /^(gi:|resource:|system$|gettext$|cairo$)/ },
      args => ({ path: args.path, external: true })
    );
  },
};

/** @type {import('esbuild').BuildOptions} */
const baseOptions = {
  bundle: true,
  format: 'esm',
  target: 'es2022',
  plugins: [gnomeExternalPlugin],
  logLevel: 'info',
};

async function build() {
  await mkdir('./dist', { recursive: true });

  await Promise.all([
    // Main extension entry
    esbuild.build({
      ...baseOptions,
      entryPoints: ['src/extension.ts'],
      outfile: 'dist/extension.js',
    }),

    // Preferences window
    esbuild.build({
      ...baseOptions,
      entryPoints: ['src/prefs.ts'],
      outfile: 'dist/prefs.js',
    }),

    // Copy static assets
    copyFile('./metadata.json', './dist/metadata.json'),

    // Compile SCSS → stylesheet.css
    (async () => {
      const result = sass.compile('./src/theme/stylesheet.scss', { style: 'compressed' });
      await writeFile('./dist/stylesheet.css', result.css);
    })(),
  ]);

  console.log('✓ Build complete → dist/');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
