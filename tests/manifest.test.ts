import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface Manifest {
  readonly dependencies?: Record<string, string>
}

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Manifest

describe('published manifest', () => {
  it('leaves host runtime packages to the DSH installation fallback', () => {
    const dependencies = Object.keys(manifest.dependencies ?? {})
    const hostPackages = dependencies.filter(name => name === '@deepseek-ai/cordis'
      || name === '@deepseek-ai/schemastery'
      || name.startsWith('@deepseek-ai/dsh-'))
    expect(hostPackages).toEqual([])
  })
})
