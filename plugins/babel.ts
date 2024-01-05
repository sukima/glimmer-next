import type Babel from "@babel/core";
import { SYMBOLS } from "./symbols";

export function processTemplate(hbsToProcess: string[], mode: 'development' | 'production') {
  return function babelPlugin(babel: { types: typeof Babel.types }) {
    const { types: t } = babel;
    return {
      name: "ast-transform", // not required
      visitor: {
        ClassMethod(path: any) {
          if (path.node.key.name === "$static") {
            path.replaceWith(
              t.classProperty(
                t.identifier("template"),
                // hbs literal
                t.taggedTemplateExpression(
                  t.identifier("hbs"),
                  path.node.body.body[0].expression.arguments[0]
                )
              )
            );
          }
        },
        CallExpression(path: any) {
          if (path.node.callee && path.node.callee.type === "Identifier") {
            if (path.node.callee.name === "scope") {
              path.remove();
            } else if (path.node.callee.name === "template") {
              path.replaceWith(
                t.taggedTemplateExpression(
                  t.identifier("hbs"),
                  path.node.arguments[0]
                )
              );
            } else if (path.node.callee.name === "formula") {
              if (mode === 'production') {
                // remove last argument if two arguments
                if (path.node.arguments.length === 2) {
                  path.node.arguments.pop();
                }
              }
            }
          }
        },
        ImportDeclaration(path: any) {
          if (path.node.source.value === "@ember/template-compiler") {
            path.node.source.value = "@/utils/template";
            path.node.specifiers.forEach((specifier: any) => {
              specifier.local.name = "hbs";
              specifier.imported.name = "hbs";
            });
          }
        },
        Program(path: any) {

          const PUBLIC_API = Object.values(SYMBOLS);
          const IMPORTS = PUBLIC_API.map((name) => {
            return t.importSpecifier(t.identifier(name), t.identifier(name));
          });
          path.node.body.unshift(
            t.importDeclaration(
              IMPORTS,
              t.stringLiteral("@/utils/dom")
            )
          );
        },
        TaggedTemplateExpression(path: any) {
          if (path.node.tag.name === "hbs") {
            hbsToProcess.push(path.node.quasi.quasis[0].value.raw);
            path.replaceWith(t.identifier("$placeholder"));
          }
        },
      },
    };
  };
}
