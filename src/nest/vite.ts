import path from 'node:path';
import fs from 'node:fs';
import { PluginOption } from 'vite';
import {
    ClassDeclaration,
    createSourceFile,
    findConfigFile,
    isCallExpression,
    isClassDeclaration,
    isExportAssignment,
    isIdentifier,
    isMethodDeclaration,
    isObjectLiteralExpression,
    isPropertyAssignment,
    isStringLiteral,
    ScriptTarget,
    SourceFile,
    sys,
    resolveModuleName,
    createCompilerHost,
    readConfigFile,
} from 'typescript';
import { generateRoute } from '..';

export function vitePluginForNest({
    alias = '@@api',
    baseUrl = '',
} = {}): PluginOption {
    if (!alias.endsWith('/')) {
        alias = alias + '/';
    }
    const SUFFIX = '?raw&_api';
    return {
        name: 'vite-plugin-nest',
        resolveId(source, importer) {
            if (!source.startsWith(alias)) {
                return;
            }
            const currentDir = sys.getCurrentDirectory();
            const configPath = findConfigFile(currentDir, sys.fileExists);
            if (!configPath) {
                throw new Error('cannot find a valid "tsconfig.json"');
            }
            const {
                config: { compilerOptions },
            } = readConfigFile(configPath, (path) =>
                fs.readFileSync(path, 'utf8')
            );
            delete compilerOptions.moduleResolution; // FIXME: moduleResolution 不被识别
            const compilerHost = createCompilerHost(compilerOptions);
            const { resolvedModule } = resolveModuleName(
                source,
                importer || '',
                compilerOptions,
                compilerHost
            );
            if (resolvedModule) {
                return (
                    path.resolve(currentDir, resolvedModule.resolvedFileName) +
                    SUFFIX
                );
            }
            throw new Error(
                `cannot resolve "${source}", please add "${alias}*" to ${configPath}`
            );
        },
        transform(code, id) {
            if (id.endsWith(SUFFIX)) {
                return {
                    code: transformCode(
                        id.replace(SUFFIX, ''),
                        code.replace(/(\\r)|(\\n)/g, (m, p1, p2) =>
                            p1 ? '\r' : '\n'
                        ),
                        baseUrl
                    ),
                    map: { mappings: '' },
                };
            }
        },
    };
}

function transformCode(filePath: string, sourceText: string, baseUrl: string) {
    const sourceFile = createSourceFile(
        filePath,
        sourceText,
        ScriptTarget.ESNext
    );
    const ctorNode = findCtorNode(sourceFile);
    if (ctorNode) {
        let prefix = getPrefix(ctorNode);
        if (prefix === '##') {
            prefix = generateRoute(filePath, 'src');
        }
        const apiConfig = getApiConfig(ctorNode);
        return [
            `import { createApis } from 'forget-api/request';`,
            `export default createApis('${baseUrl + prefix}', ${JSON.stringify(
                apiConfig
            )})`,
        ].join('\n');
    }
    throw new Error(`cannot find a valid controller in ${filePath}`);
}

function findCtorNode(sourceFile: SourceFile) {
    let ctorName: string = '';
    const classNodes: ClassDeclaration[] = [];
    for (const node of sourceFile.statements) {
        if (
            isExportAssignment(node) &&
            isCallExpression(node.expression) &&
            (node.expression.expression as any).text === 'defineExpose'
        ) {
            const [firstParam] = node.expression.arguments;
            if (firstParam) {
                ctorName = (firstParam as any).text;
            }
            break;
        } else if (isClassDeclaration(node)) {
            classNodes.push(node);
        }
    }
    for (const node of classNodes) {
        if (node.name?.text === ctorName) {
            return node;
        }
    }
}

function getPrefix(ctorNode: ClassDeclaration) {
    for (const { expression } of ctorNode.decorators || []) {
        if (
            !(
                isCallExpression(expression) &&
                isIdentifier(expression.expression) &&
                expression.expression.text === 'Controller'
            )
        ) {
            continue;
        }
        const [firstParam] = expression.arguments;
        if (firstParam) {
            if (isObjectLiteralExpression(firstParam)) {
                // 入参是对象
                for (const propNode of firstParam.properties) {
                    if (
                        isPropertyAssignment(propNode) &&
                        isIdentifier(propNode.name) &&
                        propNode.name.text === 'path'
                    ) {
                        return propNode.name.text;
                    }
                }
            } else if (isStringLiteral(firstParam)) {
                // 入参是字符串
                return firstParam.text;
            } else if (
                isIdentifier(firstParam) &&
                firstParam.text === '__filename'
            ) {
                return '##';
            }
        }
        break;
    }
    return '';
}

const METHOD_DECORATORS = [
    'Delete',
    'Get',
    'Head',
    'Options',
    'Patch',
    'Post',
    'Put',
];

function getApiConfig(ctorNode: ClassDeclaration) {
    const map: Record<string, unknown> = {};
    for (const node of ctorNode.members) {
        if (!(isMethodDeclaration(node) && isIdentifier(node.name))) {
            continue;
        }
        const method = node.name.text;
        let httpMethod = '';
        let path = '';
        for (const { expression } of node.decorators || []) {
            if (
                !(
                    isCallExpression(expression) &&
                    isIdentifier(expression.expression) &&
                    METHOD_DECORATORS.includes(expression.expression.text)
                )
            ) {
                continue;
            }
            httpMethod = expression.expression.text.toUpperCase();
            const [firstParam] = expression.arguments;
            if (firstParam && isStringLiteral(firstParam)) {
                if (/[?+*()]/.test(firstParam.text)) {
                    httpMethod = 'PATH_HAS_WILDCARD';
                } else {
                    const { text } = firstParam;
                    path = text.startsWith('/') ? text : '/' + text;
                }
            }
            // TODO: 判断装饰器入参为 string[] undefined null 等
            break;
        }
        if (!httpMethod) {
            httpMethod = 'GET';
            // TODO: 考虑 filename 情况
        }
        map[method] = [httpMethod, path];
    }
    return map;
}
