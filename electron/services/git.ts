import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { GitHubInfo } from '../../shared/types.js'

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
