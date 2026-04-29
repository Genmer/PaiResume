const STORAGE_KEY = 'pai_saved_accounts'
const MAX_ACCOUNTS = 5

export interface SavedAccount {
  email: string
  nickname: string
  lastLoginAt: string
}

function loadAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAccounts(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)))
}

export function rememberAccount(email: string, nickname: string) {
  const accounts = loadAccounts()
  const filtered = accounts.filter((a) => a.email !== email)
  filtered.unshift({ email, nickname: nickname || email.split('@')[0], lastLoginAt: new Date().toISOString() })
  saveAccounts(filtered)
}

export function forgetAccount(email: string) {
  const accounts = loadAccounts().filter((a) => a.email !== email)
  saveAccounts(accounts)
}

export function getSavedAccounts(excludeEmail?: string): SavedAccount[] {
  const accounts = loadAccounts()
  return excludeEmail ? accounts.filter((a) => a.email !== excludeEmail) : accounts
}
