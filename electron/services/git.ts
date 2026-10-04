import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { GitHubInfo, GitFileChange, GitRepoState, GitOperationResult } from '../../shared/types.js'

const execFileAsync = promisify(execFile)

const EMPTY_REPO_STATE: GitRepoState = {
  isRepo: false,
  branch: null,
  hasRemote: false,
  ahead: 0,
  behind: 0,
  changedFiles: [],
  hasChanges: false,
}

function getExecErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string }
    const stderr = e.stderr?.toString?.() ?? (typeof e.stderr === 'string' ? e.stderr : '')
    if (stderr.trim()) return stderr.trim()
    const stdout = e.stdout?.toString?.() ?? (typeof e.stdout === 'string' ? e.stdout : '')
    if (stdout.trim()) return stdout.trim()
    if (e.message) return e.message
  }
  return 'Git コマンドの実行に失敗しました'
}

async function runGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('git', args, {
    cwd,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  })
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}

function describeStatus(code: string): string {
  const x = code[0] ?? ' '
  const y = code[1] ?? ' '
  if (x === '?' && y === '?') return '未追跡'
  if (x === 'A' || y === 'A') return '追加'
  if (x === 'D' || y === 'D') return '削除'
  if (x === 'R' || y === 'R') return '名前変更'
  if (x === 'M' || y === 'M') return '変更'
  return code.trim() || '変更'
}

function parsePorcelainLine(line: string): GitFileChange | null {
  if (line.length < 4) return null
  const statusCode = line.slice(0, 2)
  const rawPath = line.slice(3).trim()
  const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop()!.trim() : rawPath
  return {
    path,
    status: describeStatus(statusCode),
  }
}

export async function getGitRepoStatus(folderPath: string): Promise<GitRepoState> {
  const gitDir = join(folderPath, '.git')
  if (!existsSync(gitDir)) {
    return EMPTY_REPO_STATE
  }

  try {
    const { stdout } = await runGit(folderPath, ['rev-parse', '--is-inside-work-tree'])
    if (stdout.trim() !== 'true') {
      return EMPTY_REPO_STATE
    }
  } catch {
    return EMPTY_REPO_STATE
  }

  let branch: string | null = null
  try {
    const { stdout } = await runGit(folderPath, ['branch', '--show-current'])
    branch = stdout.trim() || null
  } catch {
    branch = null
  }

  let hasRemote = false
  let ahead = 0
  let behind = 0

  try {
    await runGit(folderPath, ['rev-parse', '--abbrev-ref', '@{u}'])
    hasRemote = true
    const { stdout } = await runGit(folderPath, ['rev-list', '--left-right', '--count', 'HEAD...@{u}'])
    const [behindCount, aheadCount] = stdout.trim().split(/\s+/)
    behind = Number.parseInt(behindCount ?? '0', 10) || 0
    ahead = Number.parseInt(aheadCount ?? '0', 10) || 0
  } catch {
    try {
      const { stdout } = await runGit(folderPath, ['remote'])
      hasRemote = stdout.trim().length > 0
    } catch {
      hasRemote = false
    }
  }

  const changedFiles: GitFileChange[] = []
  try {
    const { stdout } = await runGit(folderPath, ['status', '--porcelain'])
    for (const line of stdout.split(/\r?\n/)) {
      const change = parsePorcelainLine(line)
      if (change) changedFiles.push(change)
    }
  } catch {
    // ignore
  }

  return {
    isRepo: true,
    branch,
    hasRemote,
    ahead,
    behind,
    changedFiles,
    hasChanges: changedFiles.length > 0,
  }
}

export async function gitCommit(folderPath: string, message: string): Promise<GitOperationResult> {
  const trimmed = message.trim()
  if (!trimmed) {
    return { success: false, error: 'コミットメッセージを入力してください' }
  }

  try {
    await runGit(folderPath, ['add', '-A'])
    const { stdout, stderr } = await runGit(folderPath, ['commit', '-m', trimmed])
    return { success: true, output: (stdout || stderr).trim() }
  } catch (err) {
    const error = getExecErrorMessage(err)
    if (error.includes('nothing to commit') || error.includes('コミットするものがありません')) {
      return { success: false, error: 'コミットする変更がありません' }
    }
    return { success: false, error }
  }
}

export async function gitPush(folderPath: string): Promise<GitOperationResult> {
  try {
    const { stdout, stderr } = await runGit(folderPath, ['push'])
    return { success: true, output: (stdout || stderr).trim() }
  } catch (err) {
    const error = getExecErrorMessage(err)
    if (error.includes('no upstream branch') || error.includes('upstream')) {
      try {
        const { stdout: branchOut } = await runGit(folderPath, ['branch', '--show-current'])
        const branch = branchOut.trim()
        if (!branch) {
          return { success: false, error: '現在のブランチを取得できませんでした' }
        }
        const { stdout, stderr } = await runGit(folderPath, ['push', '-u', 'origin', branch])
        return { success: true, output: (stdout || stderr).trim() }
      } catch (pushErr) {
        return { success: false, error: getExecErrorMessage(pushErr) }
      }
    }
    return { success: false, error }
  }
}

export async function gitCommitAndPush(folderPath: string, message: string): Promise<GitOperationResult> {
  const commitResult = await gitCommit(folderPath, message)
  const nothingToCommit = commitResult.error?.includes('コミットする変更がありません')

  if (!commitResult.success && !nothingToCommit) {
    return commitResult
  }

  const pushResult = await gitPush(folderPath)
  if (!pushResult.success) {
    return {
      success: false,
      error: pushResult.error,
      output: commitResult.output,
    }
  }

  const parts = [commitResult.output, pushResult.output].filter(Boolean)
  return {
    success: true,
    output: parts.join('\n'),
  }
}

function parseGitHubUrl(url: string): GitHubInfo | null {
  const cleaned = url.trim().replace(/\.git$/, '')

  const sshMatch = cleaned.match(/git@github\.com[:/]([^/]+)\/(.+)$/i)
  if (sshMatch) {
    const owner = sshMatch[1]
    const repo = sshMatch[2]
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    }
  }

  const httpsMatch = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/i)
  if (httpsMatch) {
    const owner = httpsMatch[1]
    const repo = httpsMatch[2]
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    }
  }

  return null
}

function extractRemoteUrl(configContent: string, remoteName = 'origin'): string | null {
  const lines = configContent.split(/\r?\n/)
  let inRemote = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === `[remote "${remoteName}"]`) {
      inRemote = true
      continue
    }
    if (inRemote && trimmed.startsWith('[')) {
      break
    }
    if (inRemote) {
      const match = trimmed.match(/^url\s*=\s*(.+)$/)
      if (match) {
        return match[1].trim()
      }
    }
  }

  return null
}

export function detectGitHubFromPath(folderPath: string): GitHubInfo | null {
  const configPath = join(folderPath, '.git', 'config')
  if (!existsSync(configPath)) {
    return null
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const remoteUrl = extractRemoteUrl(content, 'origin')
    if (!remoteUrl) return null
    return parseGitHubUrl(remoteUrl)
  } catch {
    return null
  }
}

export function parseGitHubInput(input: string): GitHubInfo | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  return parseGitHubUrl(trimmed)
}
