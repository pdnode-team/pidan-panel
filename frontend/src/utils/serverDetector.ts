import { getServerFiles, getFileContent } from '@/api/servers'

export interface ServerDetectionResult {
  family: string // 'paper' | 'purpur' | 'folia' | 'spigot' | 'craftbukkit' | 'fabric' | 'quilt' | 'forge' | 'neoforge' | 'mohist' | 'arclight' | 'vanilla'
  familyName: string
  version?: string
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
}

const FAMILY_DISPLAY_NAMES: Record<string, string> = {
  paper: 'Paper',
  purpur: 'Purpur',
  folia: 'Folia',
  spigot: 'Spigot',
  craftbukkit: 'CraftBukkit',
  fabric: 'Fabric',
  quilt: 'Quilt',
  forge: 'Forge',
  neoforge: 'NeoForge',
  mohist: 'Mohist (Hybrid)',
  arclight: 'Arclight (Hybrid)',
  vanilla: 'Vanilla'
}

/**
 * Intelligent server core & Minecraft version detector.
 * Inspects directory layout, signature configuration files, and metadata
 * (e.g. version_history.json) without relying on the executable core jar name.
 */
export async function detectServerCore(
  serverId: number | string,
  _dockerImage?: string
): Promise<ServerDetectionResult> {
  const reasons: string[] = []
  let detectedFamily = 'vanilla'
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let detectedVersion: string | undefined = undefined

  try {
    // 1. Scan root directory files & directories
    const rootItems = await getServerFiles(serverId, '')
    const rootNameSet = new Set(rootItems.map(item => item.name.toLowerCase().trim()))

    // Check if plugins/ or mods/ exist and whether they are non-empty
    let hasNonEmptyPlugins = false
    let hasNonEmptyMods = false

    if (rootNameSet.has('plugins')) {
      try {
        const pluginFiles = await getServerFiles(serverId, 'plugins')
        hasNonEmptyPlugins = pluginFiles.length > 0
      } catch {
        // ignore
      }
    }

    if (rootNameSet.has('mods')) {
      try {
        const modFiles = await getServerFiles(serverId, 'mods')
        hasNonEmptyMods = modFiles.length > 0
      } catch {
        // ignore
      }
    }

    // Check config/ directory if present
    let configFiles: string[] = []
    if (rootNameSet.has('config')) {
      try {
        const configs = await getServerFiles(serverId, 'config')
        configFiles = configs.map(c => c.name.toLowerCase().trim())
      } catch {
        // ignore
      }
    }

    // 2. Classify Server Family
    // Heuristic 1: Hybrid servers (Plugins + Mods or dedicated hybrid signatures)
    const hasMohist = rootNameSet.has('mohist-config') || rootNameSet.has('mohist.yml')
    const hasArclight = rootNameSet.has('arclight.conf') || rootNameSet.has('arclight')
    const hasCatServer = Array.from(rootNameSet).some(n => n.includes('catserver'))

    if (hasArclight) {
      detectedFamily = 'arclight'
      confidence = 'high'
      reasons.push('Found Arclight hybrid server configuration (arclight.conf)')
    } else if (hasMohist) {
      detectedFamily = 'mohist'
      confidence = 'high'
      reasons.push('Found Mohist hybrid server directory or configuration')
    } else if (hasCatServer) {
      detectedFamily = 'mohist'
      confidence = 'medium'
      reasons.push('Found CatServer hybrid configuration')
    } else if (hasNonEmptyPlugins && hasNonEmptyMods) {
      detectedFamily = 'mohist'
      confidence = 'medium'
      reasons.push('Found non-empty plugins/ and mods/ directories (Hybrid server)')
    }
    // Heuristic 2: Purpur / Folia / Paper
    else if (rootNameSet.has('purpur.yml')) {
      detectedFamily = 'purpur'
      confidence = 'high'
      reasons.push('Found Purpur signature file (purpur.yml)')
    } else if (
      rootNameSet.has('folia.yml') || 
      configFiles.includes('folia.yml') ||
      configFiles.some(f => f.includes('folia'))
    ) {
      detectedFamily = 'folia'
      confidence = 'high'
      reasons.push('Found Folia multi-threaded signature file')
    } else if (
      rootNameSet.has('paper.yml') ||
      configFiles.includes('paper-global.yml') ||
      configFiles.includes('paper-world-defaults.yml') ||
      rootNameSet.has('version_history.json')
    ) {
      detectedFamily = 'paper'
      confidence = 'high'
      if (rootNameSet.has('version_history.json')) {
        reasons.push('Found Paper version history metadata (version_history.json)')
      } else if (rootNameSet.has('paper.yml')) {
        reasons.push('Found paper.yml server configuration')
      } else {
        reasons.push('Found Paper modern global configuration (config/paper-global.yml)')
      }
    }
    // Heuristic 3: Spigot / CraftBukkit
    else if (rootNameSet.has('spigot.yml')) {
      detectedFamily = 'spigot'
      confidence = 'high'
      reasons.push('Found spigot.yml server configuration')
    } else if (rootNameSet.has('bukkit.yml')) {
      detectedFamily = 'craftbukkit'
      confidence = 'medium'
      reasons.push('Found standalone bukkit.yml without Paper/Spigot configurations')
    }
    // Heuristic 4: Fabric / Quilt / NeoForge / Forge
    else if (rootNameSet.has('fabric-server-launch.properties') || rootNameSet.has('.fabric')) {
      detectedFamily = 'fabric'
      confidence = 'high'
      reasons.push('Found Fabric server launch configuration')
    } else if (rootNameSet.has('quilt-server-launch.properties') || rootNameSet.has('.quilt')) {
      detectedFamily = 'quilt'
      confidence = 'high'
      reasons.push('Found Quilt server launch configuration')
    } else if (rootNameSet.has('neoforge') || configFiles.includes('neoforge')) {
      detectedFamily = 'neoforge'
      confidence = 'high'
      reasons.push('Found NeoForge configuration directory')
    } else if (
      rootNameSet.has('user_jvm_args.txt') ||
      rootNameSet.has('defaultconfigs') ||
      rootNameSet.has('run.bat') ||
      rootNameSet.has('run.sh')
    ) {
      detectedFamily = 'forge'
      confidence = 'medium'
      reasons.push('Found Forge signature files (user_jvm_args.txt / defaultconfigs)')
    } else if (hasNonEmptyPlugins) {
      detectedFamily = 'paper'
      confidence = 'medium'
      reasons.push('Found active plugins/ directory (suggesting Paper ecosystem)')
    } else if (hasNonEmptyMods) {
      detectedFamily = 'fabric'
      confidence = 'medium'
      reasons.push('Found active mods/ directory')
    } else {
      detectedFamily = 'vanilla'
      confidence = 'low'
      reasons.push('Standard server directory layout without specialized plugin/mod signatures')
    }

    // 3. Resolve Minecraft Version (without jar name)
    // Source A: version_history.json (Paper / Purpur / Folia)
    if (rootNameSet.has('version_history.json')) {
      try {
        const file = await getFileContent(serverId, 'version_history.json')
        if (file && file.content) {
          // Look for (MC: 1.21.4) or "MC: 26.2" or "version": "1.21.4"
          const mcMatch = file.content.match(/(?:MC:\s*|Minecraft\s+)([0-9]+(?:\.[0-9]+)*)/i)
          if (mcMatch && mcMatch[1]) {
            detectedVersion = mcMatch[1]
            reasons.push(`Extracted Minecraft ${detectedVersion} from version_history.json`)
          } else {
            // Try parsing JSON structure
            try {
              const data = JSON.parse(file.content)
              const rawStr = JSON.stringify(data)
              const versionMatch = rawStr.match(/(\d+\.\d+(?:\.\d+)?)/)
              if (versionMatch && versionMatch[1]) {
                detectedVersion = versionMatch[1]
                reasons.push(`Detected Minecraft ${detectedVersion} from version_history.json metadata`)
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // Source B: fabric-server-launch.properties
    if (!detectedVersion && rootNameSet.has('fabric-server-launch.properties')) {
      try {
        const file = await getFileContent(serverId, 'fabric-server-launch.properties')
        if (file && file.content) {
          const gameVerMatch = file.content.match(/fabric\.gameVersion\s*=\s*([0-9.]+)/i)
          if (gameVerMatch && gameVerMatch[1]) {
            detectedVersion = gameVerMatch[1]
            reasons.push(`Extracted Minecraft ${detectedVersion} from fabric-server-launch.properties`)
          }
        }
      } catch {
        // ignore
      }
    }

  } catch (err) {
    console.warn('Auto-detection error:', err)
  }

  return {
    family: detectedFamily,
    familyName: FAMILY_DISPLAY_NAMES[detectedFamily] || detectedFamily,
    version: detectedVersion,
    confidence,
    reasons
  }
}
