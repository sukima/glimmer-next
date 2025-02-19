import { PluginOption, defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compiler } from "./plugins/compiler.ts";
// import circleDependency from "vite-plugin-circular-dependency";
import dts from "vite-plugin-dts";
import babel from "vite-plugin-babel";
import { stripGXTDebug } from "./plugins/babel.ts";

const isLibBuild = process.env["npm_lifecycle_script"]?.includes("--lib");
const withSourcemaps =
  process.env["npm_lifecycle_script"]?.includes("--with-sourcemaps");
const self = import.meta.url;
const currentPath = path.dirname(fileURLToPath(self));

const plugins: PluginOption[] = [];

if (isLibBuild) {
  // this section responsible for @lifeart/gxt build itself
  // @todo - move to compiler plugin
  plugins.push(
    babel({
      filter: /\.ts$/,
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: [
          [
            "@babel/preset-typescript",
            {
              allowDeclareFields: true,
              allExtensions: false,
            },
          ],
        ],
      },
    }),
    dts({
      insertTypesEntry: true,
      exclude: [
        "src/components/**/*",
        "src/index.ts",
        "src/utils/benchmark.ts",
        "src/utils/compat.ts",
        "src/utils/data.ts",
        "src/utils/measure-render.ts",
      ],
    }),
  );
}

export default defineConfig(({ mode }) => ({
  plugins: [
    ...plugins,
    isLibBuild
      ? null
      : babel({
          filter: /\.ts$/,
          babelConfig: {
            babelrc: false,
            configFile: false,
            presets: [
              [
                "@babel/preset-typescript",
                {
                  allowDeclareFields: true,
                  allExtensions: true,
                },
              ],
            ],
            plugins:
              mode === "production"
                ? [stripGXTDebug, ["module:decorator-transforms"]]
                : [["module:decorator-transforms"]],
          },
        }),
    compiler(mode, {
      authorMode: true,
    }),
  ],
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
    ],
  },
  build: {
    sourcemap: withSourcemaps ? "inline" : undefined,
    lib: isLibBuild
      ? {
          entry: [
            path.join(currentPath, "src", "utils", "index.ts"),
            path.join(currentPath, "plugins", "compiler.ts"),
            path.join(currentPath, "src", "utils", "inspector", "ember-inspector.ts"),
            path.join(currentPath, "src", "utils", "glimmer", "glimmer-compat.ts"),
            path.join(currentPath, "src", "tests", "utils.ts"),
          ],
          name: "gxt",
          formats: ["es"],
          fileName: (format, entry) => `gxt.${entry}.${format}.js`,
        }
      : undefined,
    modulePreload: false,
    target: isLibBuild ? "esnext" : "es2015",
    minify: mode === "production" ? "terser" : false,
    rollupOptions: {
      treeshake: "recommended",
      onwarn(warning, warn) {
        // suppress eval warnings (we use it for HMR)
        if (warning.code === "EVAL") return;
        warn(warning);
      },
      input: !isLibBuild
        ? {
            main: "index.html",
            nested: "tests.html",
          }
        : undefined,
      external: isLibBuild
        ? [
            "@babel/core",
            "@babel/preset-typescript",
            "@glimmer/syntax",
            "content-tag",
            "happy-dom",
            "express",
            "vite",
          ]
        : ["happy-dom", "express", "vite"],
    },
    terserOptions:
      mode === "production"
        ? {
            module: true,
            compress: {
              hoist_funs: true,
              inline: 1,
              passes: 3,
              unsafe: true,
              unsafe_symbols: true,
              computed_props: true,
            },
            mangle: {
              module: true,
              toplevel: true,
              properties: false,
            },
          }
        : {},
  },
  resolve: {
    alias: {
      "@/components": path.join(currentPath, "src", "components"),
      "@/utils": path.join(currentPath, "src", "utils"),
      "@/services": path.join(currentPath, "src", "services"),
      "@/tests": path.join(currentPath, "src", "tests"),
      "@lifeart/gxt/ember-inspector": path.join(
        currentPath,
        "src",
        "utils","inspector",
        "ember-inspector.ts",
      ),
      "@lifeart/gxt/test-utils": path.join(
        currentPath,
        "src",
        "tests",
        "utils.ts",
      ),
      "@lifeart/gxt": path.join(currentPath, "src", "utils", "index.ts"),
    },
  },
}));
