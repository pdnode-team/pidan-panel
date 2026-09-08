<template>
  <AppLayout :breadcrumbs="[{ label: 'Overview' }]">
    <div class="space-y-6">
      <!-- 1. Top Section: System Resources Card -->
      <div class="w-full">
        <div class="p-6 rounded-xl bg-[#202024] border border-zinc-800 shadow-sm text-zinc-100 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-semibold text-zinc-100">System Resources</h2>
              <p class="text-xs text-zinc-400 mt-0.5">Host CPU & Memory Real-time Telemetry</p>
            </div>
            <div class="flex items-center gap-2">
              <span 
                v-if="isOnline"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-400"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active</span>
              </span>
              <span 
                v-else
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-400"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                <span>Connecting...</span>
              </span>
            </div>
          </div>

          <!-- Meters Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <!-- CPU Meter -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-300">CPU</span>
                <span class="font-mono font-semibold text-sky-400">{{ systemStatus.cpuPercent.toFixed(1) }}%</span>
              </div>
              <div class="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                <div 
                  class="h-full bg-sky-500 rounded-full transition-all duration-500"
                  :style="{ width: `${Math.min(100, Math.max(2, systemStatus.cpuPercent))}%` }"
                ></div>
              </div>
            </div>

            <!-- Memory Meter -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-300">Memory</span>
                <span class="font-mono text-zinc-400">
                  <strong class="font-semibold text-amber-400">{{ systemStatus.memoryPercent.toFixed(1) }}%</strong> 
                  <span class="ml-1.5 text-zinc-500">
                    ({{ formatGb(systemStatus.usedMemoryBytes) }} GB / {{ formatGb(systemStatus.totalMemoryBytes) }} GB)
                  </span>
                </span>
              </div>
              <div class="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                <div 
                  class="h-full bg-amber-500 rounded-full transition-all duration-500"
                  :style="{ width: `${Math.min(100, Math.max(2, systemStatus.memoryPercent))}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. System Health & Probes Diagnostic Card -->
      <div class="p-6 rounded-xl bg-[#202024] border border-zinc-800 shadow-sm text-zinc-100">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80">
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-emerald-400" />
            <h2 class="text-base font-semibold text-zinc-100">System Health & Probes</h2>
          </div>
          <span 
            v-if="healthData"
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
            :class="hasErrors 
              ? 'bg-red-950/60 border-red-800/70 text-red-400' 
              : (hasWarnings ? 'bg-amber-950/60 border-amber-800/60 text-amber-300' : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400')"
          >
            <span 
              class="w-1.5 h-1.5 rounded-full" 
              :class="hasErrors ? 'bg-red-400' : (hasWarnings ? 'bg-amber-400' : 'bg-emerald-400')"
            ></span>
            <span>{{ hasErrors ? 'Critical Error Detected' : (hasWarnings ? 'Degraded Performance' : 'All Systems Operational') }}</span>
          </span>
          <span 
            v-else
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-zinc-800 border-zinc-700 text-zinc-400"
          >
            <RotateCw class="w-3 h-3 animate-spin text-zinc-400" />
            <span>Connecting...</span>
          </span>
        </div>

        <!-- 4 Probes Grid -->
        <div v-if="healthData?.checks?.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div 
            v-for="check in healthData.checks" 
            :key="check.name"
            class="p-3 rounded-lg border flex flex-col justify-between gap-2"
            :class="getCheckCardClass(check.status)"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium block text-zinc-200">{{ check.name }}</span>
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border"
                :class="getCheckBadgeClass(check.status)"
              >
                {{ check.status }}
              </span>
            </div>

            <!-- Detail / Warning / Error Message / Version -->
            <div class="text-[11px] leading-tight">
              <p v-if="check.message" :class="getCheckMessageClass(check.status)">
                {{ check.message }}
              </p>
              <p v-else-if="check.meta?.version" class="text-zinc-500 font-mono">
                Version {{ check.meta.version }}
              </p>
              <p v-else class="text-zinc-500">
                Operating normally
              </p>
            </div>
          </div>
        </div>

        <!-- Loading / Connecting State -->
        <div v-else class="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <RotateCw class="w-4 h-4 animate-spin text-zinc-400" />
          <span>Probing system health diagnostics...</span>
        </div>
      </div>

      <!-- 3. Bottom Section: Data Overview Card -->
      <div class="p-6 rounded-xl bg-[#202024] border border-zinc-800 shadow-sm text-zinc-100">
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80">
          <h2 class="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span>Data Overview</span>
          </h2>
          <span class="text-xs text-zinc-500 font-mono">Pidan Panel Core {{ systemStatus.panelVersion || 'v1.0' }}</span>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8 text-xs">
          <!-- Node.js Version -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Terminal class="w-4 h-4 text-sky-400" />
              <span>Node.js Version</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6">
              {{ systemStatus.nodeVersion || 'Loading...' }}
            </div>
          </div>

          <!-- Panel Version -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Layers class="w-4 h-4 text-emerald-400" />
              <span>Panel Version</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6">
              {{ systemStatus.panelVersion || '1.0.0 (Adonis + Vue3)' }}
            </div>
          </div>

          <!-- User to run process -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <UserCheck class="w-4 h-4 text-purple-400" />
              <span>Process User</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6 truncate">
              {{ systemStatus.processUser || 'root' }}
            </div>
          </div>

          <!-- Panel Time -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Clock class="w-4 h-4 text-blue-400" />
              <span>Panel Time</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6">
              {{ currentTimeString }}
            </div>
          </div>

          <!-- Memory Specs -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <HardDrive class="w-4 h-4 text-amber-400" />
              <span>System Memory</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6">
              {{ systemStatus.memoryPercent.toFixed(0) }}% 
              <span class="text-zinc-400 font-normal">
                ({{ formatGb(systemStatus.usedMemoryBytes) }} GB / {{ formatGb(systemStatus.totalMemoryBytes) }} GB)
              </span>
            </div>
          </div>

          <!-- CPU Specs -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Cpu class="w-4 h-4 text-cyan-400" />
              <span>CPU Usage</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6">
              {{ systemStatus.cpuPercent.toFixed(1) }}%
            </div>
          </div>

          <!-- Unix Load Average -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Activity class="w-4 h-4 text-emerald-400" />
              <span>Load Average</span>
            </div>
            <div class="flex items-center gap-1.5 pl-6 font-mono text-xs">
              <span 
                v-for="(load, idx) in displayedLoadAverage" 
                :key="idx"
                class="px-1.5 py-0.5 rounded border"
                :class="idx === 0 ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300'"
              >
                {{ typeof load === 'number' ? load.toFixed(2) : load }}
              </span>
            </div>
          </div>

          <!-- Hostname -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Server class="w-4 h-4 text-rose-400" />
              <span>Host Machine</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6 truncate" :title="systemStatus.hostMachine">
              {{ systemStatus.hostMachine || 'localhost' }}
            </div>
          </div>

          <!-- OS Version -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Computer class="w-4 h-4 text-indigo-400" />
              <span>OS Environment</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6 truncate">
              {{ systemStatus.osEnvironment || 'Unknown' }}
            </div>
          </div>

          <!-- Container Engine -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 text-zinc-400 font-medium">
              <Box class="w-4 h-4 text-sky-400" />
              <span>Container Engine</span>
            </div>
            <div class="font-mono text-zinc-200 text-sm pl-6 truncate" :title="displayedContainerEngine">
              {{ displayedContainerEngine }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import { getSystemStatus, getHealthCheck, type SystemStatusData, type HealthCheckResponse } from '../api/system'
import { 
  Cpu, 
  Terminal, 
  Layers, 
  UserCheck, 
  Clock, 
  HardDrive, 
  Activity, 
  Server, 
  Computer, 
  Box,
  ShieldCheck,
  RotateCw
} from 'lucide-vue-next'

const systemStatus = ref<SystemStatusData>({
  cpuPercent: 0,
  memoryPercent: 0,
  usedMemoryBytes: 0,
  totalMemoryBytes: 0,
  freeMemoryBytes: 0,
  nodeVersion: '',
  panelVersion: '1.0.0 (Adonis + Vue3)',
  processUser: '',
  panelTime: new Date().toISOString(),
  loadAverage: [0, 0, 0],
  hostMachine: '',
  osEnvironment: '',
  containerEngine: ''
})

const isOnline = ref(false)
const currentTimeString = ref(new Date().toLocaleString())
const healthData = ref<HealthCheckResponse | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

const displayedContainerEngine = computed(() => {
  if (healthData.value?.checks) {
    const dockerCheck = healthData.value.checks.find(c => c.name.toLowerCase().includes('docker'))
    if (dockerCheck?.meta?.version) {
      return `Docker Engine v${dockerCheck.meta.version} (${dockerCheck.status.toUpperCase()})`
    }
  }
  return systemStatus.value.containerEngine || 'Docker Engine'
})

const hasErrors = computed(() => {
  return healthData.value?.checks?.some(c => {
    const s = (c.status || '').toLowerCase()
    return s === 'error' || s === 'fatal'
  }) || false
})

const hasWarnings = computed(() => {
  return healthData.value?.checks?.some(c => (c.status || '').toLowerCase() === 'warning') || false
})

function getCheckCardClass(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'error' || s === 'fatal') {
    return 'bg-red-950/25 border-red-800/70'
  }
  if (s === 'warning') {
    return 'bg-amber-950/20 border-amber-800/60'
  }
  return 'bg-zinc-900/80 border-zinc-800'
}

function getCheckBadgeClass(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'error' || s === 'fatal') {
    return 'bg-red-950/60 text-red-400 border-red-800/80'
  }
  if (s === 'warning') {
    return 'bg-amber-950/40 text-amber-300 border-amber-800/60'
  }
  return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
}

function getCheckMessageClass(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'error' || s === 'fatal') {
    return 'text-red-400 font-medium'
  }
  if (s === 'warning') {
    return 'text-amber-300 font-medium'
  }
  return 'text-zinc-400'
}

const displayedLoadAverage = computed(() => {
  if (Array.isArray(systemStatus.value.loadAverage) && systemStatus.value.loadAverage.length > 0) {
    return systemStatus.value.loadAverage
  }
  return [0, 0, 0]
})

function formatGb(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0.0'
  return (bytes / 1024 / 1024 / 1024).toFixed(1)
}

async function fetchTelemetry() {
  try {
    const [data, health] = await Promise.allSettled([
      getSystemStatus(),
      getHealthCheck()
    ])
    if (data.status === 'fulfilled' && data.value) {
      systemStatus.value = data.value
      isOnline.value = true
      if (data.value.panelTime) {
        currentTimeString.value = new Date(data.value.panelTime).toLocaleString()
      }
    } else if (data.status === 'rejected') {
      isOnline.value = false
    }
    if (health.status === 'fulfilled' && health.value) {
      healthData.value = health.value
    }
  } catch (err) {
    console.error('Failed to fetch system telemetry:', err)
    isOnline.value = false
  }
}

onMounted(async () => {
  await fetchTelemetry()

  // Poll system status every 3 seconds
  pollTimer = setInterval(fetchTelemetry, 3000)

  // Advance clock every 1 second
  clockTimer = setInterval(() => {
    currentTimeString.value = new Date().toLocaleString()
  }, 1000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (clockTimer) clearInterval(clockTimer)
})
</script>
