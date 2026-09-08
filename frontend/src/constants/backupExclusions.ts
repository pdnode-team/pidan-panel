export interface ExclusionCategory {
  id: string
  name: string
  description: string
  badgeText: string
  badgeVariant: 'emerald' | 'sky' | 'amber'
  warning?: string
  isImportantAlert?: boolean
  patterns: string[]
}

export const BACKUP_EXCLUSION_CATEGORIES: ExclusionCategory[] = [
  {
    id: 'general_cache',
    name: 'Temporary & Cache Files',
    description: 'Temporary locks and runtime cache. Safe to exclude.',
    badgeText: 'Safe',
    badgeVariant: 'emerald',
    patterns: [
      'cache/',
      '.cache/',
      'tmp/',
      'temp/',
      '*.tmp',
      '*.lck',
      'session.lock',
      '**/session.lock',
      '.replit'
    ]
  },
  {
    id: 'logs_and_dumps',
    name: 'Logs & Crash Reports',
    description: 'Historical server logs, crash reports, and heap dumps.',
    badgeText: 'Safe',
    badgeVariant: 'emerald',
    patterns: [
      'logs/',
      'crash-reports/',
      'debug/',
      '*.log',
      '*.log.gz',
      'hs_err_pid*.log',
      'hs_err_pid*',
      'dump.hprof'
    ]
  },
  {
    id: 'loader_caches',
    name: 'Loader Intermediate Caches',
    description: 'Paper plugin remapping, Fabric runtime, and Mixin output.',
    badgeText: 'Auto-rebuilds',
    badgeVariant: 'sky',
    patterns: [
      '.paper-remapped/',
      '.fabric/',
      '.mixin.out/',
      '.neoForge/'
    ]
  },
  {
    id: 'libraries_and_installers',
    name: 'Libraries & Installers',
    description: 'Maven runtime libraries and installer archives.',
    badgeText: 'Network Required',
    badgeVariant: 'amber',
    warning: 'Forge/NeoForge cannot start without network access or installer re-run if libraries/ is omitted.',
    isImportantAlert: true,
    patterns: [
      'libraries/',
      'installer/',
      '*installer*.jar',
      'forge-*installer.jar',
      'installer.jar.log',
      'versions/'
    ]
  },
  {
    id: 'server_jars',
    name: 'Server Core Executables',
    description: 'Server core binaries. Generates data-only snapshots (world, plugins, configs).',
    badgeText: 'Omits JAR',
    badgeVariant: 'amber',
    warning: 'Restored server will lack server.jar. You must upload or reinstall the core jar before starting.',
    isImportantAlert: true,
    patterns: [
      'paper*.jar',
      'paper.jar',
      'spigot*.jar',
      'spigot.jar',
      'bukkit*.jar',
      'bukkit.jar',
      'craftbukkit*.jar',
      'craftbukkit.jar',
      'purpur*.jar',
      'purpur.jar',
      'folia*.jar',
      'folia.jar',
      'fabric*.jar',
      'fabric-server*.jar',
      'fabric.jar',
      'forge*.jar',
      'forge.jar',
      'neoforge*.jar',
      'neoforge.jar',
      'server*.jar',
      'server.jar',
      'minecraft_server*.jar'
    ]
  }
]

export const LOCAL_STORAGE_EXCLUDES_KEY = 'pidan_backup_excludes_config_v1'

export interface BackupExcludesConfig {
  enabledCategoryIds: string[]
  customPatterns: string[]
}

export function getDefaultExcludesConfig(): BackupExcludesConfig {
  return {
    enabledCategoryIds: BACKUP_EXCLUSION_CATEGORIES.map(c => c.id),
    customPatterns: []
  }
}

export function loadExcludesConfig(): BackupExcludesConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EXCLUDES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.enabledCategoryIds)) {
        return {
          enabledCategoryIds: parsed.enabledCategoryIds,
          customPatterns: Array.isArray(parsed.customPatterns) ? parsed.customPatterns : []
        }
      }
    }
  } catch {}
  return getDefaultExcludesConfig()
}

export function saveExcludesConfig(config: BackupExcludesConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_EXCLUDES_KEY, JSON.stringify(config))
  } catch {}
}

export function compileExclusionList(config: BackupExcludesConfig): string[] {
  const set = new Set<string>()
  for (const cat of BACKUP_EXCLUSION_CATEGORIES) {
    if (config.enabledCategoryIds.includes(cat.id)) {
      cat.patterns.forEach(p => set.add(p))
    }
  }
  for (const custom of config.customPatterns) {
    const trimmed = custom.trim()
    if (trimmed) set.add(trimmed)
  }
  return Array.from(set)
}
