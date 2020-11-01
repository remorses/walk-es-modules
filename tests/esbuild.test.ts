import { Metadata } from 'esbuild'
import path from 'path'
import { metaToTraversalResult, traverseWithEsbuild } from '../src/esbuild'
import { osAgnosticResult } from './support'

it('metaToTraversalResult', async () => {
    const meta: Metadata = {
        outputs: {},
        inputs: {
            entry: {
                bytes: 0,
                imports: [{ path: 'some-file' }],
            },
            'some-file': {
                bytes: 0,
                imports: [{ path: 'other-file' }],
            },
            'other-file': {
                bytes: 0,
                imports: [],
            },
        },
    }
    const res = metaToTraversalResult({
        meta: meta as any,
        entry: '/usr/someFolder/entry',
        esbuildCwd: '/usr/someFolder',
    })
        .map(osAgnosticResult)
        .sort((a, b) =>
            a.resolvedImportPath.localeCompare(b.resolvedImportPath),
        )
    // console.log(res)
    expect(res).toMatchSnapshot('simple metaToTraversalResult')
})
it('traverseWithEsbuild', async () => {
    const currentFile = path.resolve(__dirname, __filename)
    let res = await traverseWithEsbuild({
        entryPoints: [currentFile],
        esbuildOptions: {
            platform: 'node',
        },
    })
    res = res
        .map(osAgnosticResult)
        .sort((a, b) =>
            a.resolvedImportPath.localeCompare(b.resolvedImportPath),
        )
    console.log(res)
    expect(res).toMatchSnapshot('traverseWithEsbuild')
})
it('traverseWithEsbuild stop traversing', async () => {
    const currentFile = path.resolve(__dirname, __filename)
    let res = await traverseWithEsbuild({
        entryPoints: [currentFile],
        stopTraversing: (file) => {
            return file.includes('node_modules')
        },
        esbuildOptions: {
            platform: 'node',
        },
    })
    res = res
        .map(osAgnosticResult)
        .sort((a, b) =>
            a.resolvedImportPath.localeCompare(b.resolvedImportPath),
        )
    expect(
        res.map((x) => x.importer).filter((x) => x.includes('node_modules'))
            .length,
    ).toBe(0)
    console.log(res)
    expect(res).toMatchSnapshot('traverseWithEsbuild')
})
