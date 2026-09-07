import type { RepoStatus } from '../../shared/types.js'
import { loadGitHubToken } from './store.js'

export async function fetchRepoStatus(owner: string, repo: string): Promise<RepoStatus> {
  const token = loadGitHubToken()
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    })

    if (response.status === 401 || response.status === 403) {
      return {
        name: repo,
        fullName: `${owner}/${repo}`,
        description: null,
        private: false,
        language: null,
        stargazersCount: 0,
        updatedAt: '',
        defaultBranch: 'main',
        htmlUrl: `https://github.com/${owner}/${repo}`,
        needsToken: true,
        error: 'プライベートリポジトリの場合、GitHubトークンが必要です',
      }
    }

    if (response.status === 404) {
      return {
        name: repo,
        fullName: `${owner}/${repo}`,
        description: null,
        private: false,
        language: null,
        stargazersCount: 0,
        updatedAt: '',
        defaultBranch: 'main',
        htmlUrl: `https://github.com/${owner}/${repo}`,
        error: 'リポジトリが見つかりません',
      }
    }

    if (!response.ok) {
      return {
        name: repo,
        fullName: `${owner}/${repo}`,
        description: null,
        private: false,
        language: null,
        stargazersCount: 0,
        updatedAt: '',
        defaultBranch: 'main',
        htmlUrl: `https://github.com/${owner}/${repo}`,
        error: `GitHub API エラー: ${response.status}`,
      }
    }

    const data = await response.json()

    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      private: data.private,
      language: data.language,
      stargazersCount: data.stargazers_count,
      updatedAt: data.updated_at,
      defaultBranch: data.default_branch,
      htmlUrl: data.html_url,
    }
  } catch (err) {
    return {
      name: repo,
      fullName: `${owner}/${repo}`,
      description: null,
      private: false,
      language: null,
      stargazersCount: 0,
      updatedAt: '',
      defaultBranch: 'main',
      htmlUrl: `https://github.com/${owner}/${repo}`,
      error: err instanceof Error ? err.message : 'ネットワークエラー',
    }
  }
}
