import type { RepoStatus, GitHubRepoSummary } from '../../shared/types.js'
import { loadGitHubToken } from './store.js'

export async function fetchUserRepos(): Promise<GitHubRepoSummary[]> {
  const token = loadGitHubToken()
  if (!token) {
    return []
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  }

  try {
    const response = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
      { headers },
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.map((repo: Record<string, unknown>) => ({
      id: repo.id as number,
      name: repo.name as string,
      fullName: repo.full_name as string,
      description: (repo.description as string | null) ?? null,
      private: repo.private as boolean,
      language: (repo.language as string | null) ?? null,
      stargazersCount: repo.stargazers_count as number,
      updatedAt: repo.updated_at as string,
      htmlUrl: repo.html_url as string,
      defaultBranch: repo.default_branch as string,
    }))
  } catch {
    return []
  }
}

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
