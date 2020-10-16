import { init } from 'es-module-lexer'
import { promises as fsp, read } from 'fs'
import fetch from 'node-fetch'
import path from 'path'
import fs from 'fs-extra'
import { URL } from 'url'
import {
    defaultReadFile,
    defaultResolver,
    isRelative,
    traverseEsModules,
} from '../src'
import { serve } from './support'

it('works', async () => {
    await init
    const currentFile = path.resolve(__dirname, __filename)
    const res = await traverseEsModules({
        entryPoint: currentFile,
    })
})

it('example', async () => {
    const currentFile = path.resolve('tests/example/entry.js')
    const res = await traverseEsModules({
        entryPoint: currentFile,
    })
    expect(res.map((x) => x.importPath)).toMatchSnapshot()
})

it('with server', async () => {
    const PORT = '7000'
    const stop = await serve(PORT)
    const currentFile = path.resolve('tests/example/entry.js')
    const readFile = async (url) => {
        let content = ''
        if (!url.startsWith('http')) {
            content = await defaultReadFile(url)
        } else {
            const res = await fetch(url, { headers: {} })
            content = await res.text()
        }
        return content
    }
    const res = await traverseEsModules({
        entryPoint: currentFile,
        resolver: (ctx, importPath) => {
            let importerDirectory = ctx.startsWith('http')
                ? relativePathFromUrl(ctx)
                : ctx
            if (!isRelative(importPath)) {
                return defaultResolver(
                    path.resolve(importerDirectory),
                    importPath,
                )
            }
            importerDirectory = path.relative(process.cwd(), importerDirectory)
            importPath = path.join(importerDirectory, importPath)
            // console.log({ importPath, pathname: importerDirectory })
            return `http://localhost:${PORT}/${importPath}`
        },
        readFile,
        onFile: async (url) => {
            // recreate server files structure on disk
            const content = await readFile(url)
            await writeUrlFileToDisk({ content, url, dest: './tests/mirror' })
        },
    })
    expect(res.map((x) => x.importPath)).toMatchSnapshot()
    await stop()
})

// add this to readFile to recreate the server files
async function writeUrlFileToDisk({ url, content, dest }) {
    // console.log({ url })
    let filePath = url.startsWith('http')
        ? relativePathFromUrl(url)
        : path.relative(process.cwd(), url)

    filePath = path.join(dest, filePath)

    await fs.createFile(filePath)
    await fs.writeFile(filePath, content)
    return
}

function relativePathFromUrl(ctx) {
    let pathname = new URL(ctx).pathname
    pathname = pathname.startsWith('/') ? pathname.slice(1) : pathname
    return pathname
}
