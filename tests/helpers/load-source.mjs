// Memuat kode produksi TypeScript tanpa memuat modul native pada pengujian Node.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { compileFunction } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

export function loadSource(relativePath, mocks = {}) {
  const path = fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: path,
  });
  const module = { exports: {} };
  const mockedRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === "react") return require(name);
    throw new Error(`Import yang belum dimock: ${name}`);
  };
  compileFunction(outputText, ["require", "module", "exports"], { filename: path })(
    mockedRequire, module, module.exports,
  );
  return module.exports;
}
