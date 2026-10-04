import { execFile } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import type { LanguageStat, ExcludedLanguageStat } from '../../shared/types.js'
import { LARGE_LANGUAGE_LINE_THRESHOLD } from '../../shared/types.js'

const execFileAsync = promisify(execFile)

interface TokeiLangEntry {
  code?: number
  blanks?: number
  comments?: number
}

export interface TokeiAnalysisResult {
  languages: LanguageStat[]
  tokeiWarning?: string
}

let cachedTokeiPath: string | null | undefined

function getExecErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { stderr?: Buffer | string; message?: string }
    const stderr = e.stderr?.toString?.() ?? (typeof e.stderr === 'string' ? e.stderr : '')
    if (stderr.trim()) return stderr.trim()
    if (e.message) return e.message
  }
  return 'tokei の実行に失敗しました'
}

function collectTokeiCandidates(): string[] {
  const candidates: string[] = []

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) {
      const packagesDir = join(localAppData, 'Microsoft', 'WinGet', 'Packages')
      if (existsSync(packagesDir)) {
        for (const entry of readdirSync(packagesDir)) {
          if (!entry.toLowerCase().includes('tokei')) continue
          candidates.push(join(packagesDir, entry, 'tokei.exe'))
        }
      }
    }
  }

  candidates.push('tokei')
  return candidates
}

async function resolveTokeiExecutable(): Promise<string | null> {
  if (cachedTokeiPath !== undefined) {
    return cachedTokeiPath
  }

  const candidates = collectTokeiCandidates()

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('where.exe', ['tokei'], { windowsHide: true })
      for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (trimmed && !candidates.includes(trimmed)) {
          candidates.unshift(trimmed)
        }
      }
    } catch {
      // where.exe failed — fall back to known candidates
    }
  }

  for (const cmd of candidates) {
    if (cmd !== 'tokei' && !existsSync(cmd)) continue
    try {
      await execFileAsync(cmd, ['--version'], { windowsHide: true })
      cachedTokeiPath = cmd
      return cmd
    } catch {
      continue
    }
  }

  cachedTokeiPath = null
  return null
}

function parseTokeiJson(stdout: string): LanguageStat[] {
  const data = JSON.parse(stdout) as Record<string, TokeiLangEntry>
  const languages: LanguageStat[] = []

  for (const [lang, info] of Object.entries(data)) {
    if (lang === 'Total' || !info.code || info.code <= 0) continue
    languages.push({ language: lang, lines: info.code })
  }

  return languages.sort((a, b) => b.lines - a.lines)
}

export async function isTokeiAvailable(): Promise<boolean> {
  return (await resolveTokeiExecutable()) !== null
}

export async function analyzeLanguages(folderPath: string): Promise<TokeiAnalysisResult> {
  if (!existsSync(folderPath)) {
    return {
      languages: [],
      tokeiWarning: `フォルダが見つかりません: ${folderPath}`,
    }
  }

  const tokei = await resolveTokeiExecutable()
  if (!tokei) {
    return {
      languages: [],
      tokeiWarning:
        'tokei が見つかりません。ターミナルで winget install XAMPPRocky.tokei を実行するか、tokei を PATH に追加してください。',
    }
  }

  try {
    const { stdout } = await execFileAsync(tokei, [folderPath, '-o', 'json'], {
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
    })
    const languages = parseTokeiJson(stdout)
    return { languages }
  } catch (err) {
    return {
      languages: [],
      tokeiWarning: getExecErrorMessage(err),
    }
  }
}

export function applyLanguageLineCap(languages: LanguageStat[]): {
  languages: LanguageStat[]
  excludedLanguages: ExcludedLanguageStat[]
} {
  const counted: LanguageStat[] = []
  const excludedLanguages: ExcludedLanguageStat[] = []

  for (const item of languages) {
    if (item.lines > LARGE_LANGUAGE_LINE_THRESHOLD) {
      excludedLanguages.push({ language: item.language, lines: item.lines })
    } else {
      counted.push(item)
    }
  }

  return { languages: counted, excludedLanguages }
}

export function mergeLanguageStats(stats: LanguageStat[][]): LanguageStat[] {
  const map = new Map<string, number>()
  for (const list of stats) {
    for (const item of list) {
      map.set(item.language, (map.get(item.language) ?? 0) + item.lines)
    }
  }
  return Array.from(map.entries())
    .map(([language, lines]) => ({ language, lines }))
    .sort((a, b) => b.lines - a.lines)
}
