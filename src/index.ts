import { promises as fsp } from 'fs'
import fs from 'fs'
import path from 'path'
import resolve from 'enhanced-resolve'
import { init, parse } from 'es-module-lexer'
import { debug } from './constants'
import isBuiltin from 'is-builtin-module'

const defaultResolver = resolve.create.sync({
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
})

function isRelative(x: string) {
    return x.startsWith('.') || x.startsWith('/')
}

export type ResultType = {
    importPath: string
    resolved?: string
    importer: string
}

export function* walkEsModulesSync(
    entryPoint,
    resolver = defaultResolver,
): Generator<ResultType> {
    const content = fs.readFileSync(entryPoint).toString()
    const [imports, exports] = parse(content)
    for (const { s, e } of imports) {
        let importPath = content.slice(s, e).trim()
        debug(importPath)

        // TODO first resolve it
        if (isBuiltin(importPath)) {
            continue
        }
        const resolved = resolver(path.dirname(entryPoint), importPath) || undefined
        yield { importPath, resolved, importer: entryPoint }
        if (isRelative(importPath)) {
            yield* walkEsModulesSync(resolved, resolver)
        }
    }
}
