import { execFile } from 'child_process'
import { readdir, lstat } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

async function getFolderSizeWindows(folderPath: string): Promise<number> {
  const script = [
    '$ErrorActionPreference = "SilentlyContinue"',
    `$sum = (Get-ChildItem -LiteralPath '${folderPath.replace(/'/g, "''")}' -Recurse -Force -File | Measure-Object -Property Length -Sum).Sum`,
    'if ($null -eq $sum) { 0 } else { $sum }',
  ].join('; ')

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-Command', script],
    { maxBuffer: 1024 * 1024, windowsHide: true },
  )

  const size = parseInt(stdout.trim(), 10)
  return Number.isFinite(size) ? size : 0
}

async function getFolderSizeWalk(folderPath: string): Promise<number> {
  let total = 0
  const visited = new Set<string>()

  async function walk(dir: string): Promise<void> {
    const normalized = dir.toLowerCase()
    if (visited.has(normalized)) return
    visited.add(normalized)

    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      try {
        const entryStat = await lstat(fullPath)
        if (entryStat.isSymbolicLink()) continue

        if (entryStat.isDirectory()) {
          await walk(fullPath)
        } else if (entryStat.isFile()) {
          total += entryStat.size
        }
      } catch {
        // skip inaccessible entries
      }
    }
  }

  await walk(folderPath)
  return total
}

export async function getFolderSize(folderPath: string): Promise<number> {
  if (process.platform === 'win32') {
    try {
      return await getFolderSizeWindows(folderPath)
    } catch {
      return getFolderSizeWalk(folderPath)
    }
  }
  return getFolderSizeWalk(folderPath)
}
