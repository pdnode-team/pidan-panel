<template>
  <AppLayout
    :breadcrumbs="[{ label: 'Audit Logs' }]"
    :wide="true"
  >
    <div class="w-full max-w-7xl mx-auto space-y-4">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202024] p-5 rounded-xl border border-zinc-800 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-950/40 border border-violet-800/60 text-violet-400">
            <ClipboardList class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-zinc-100">Audit Logs</h1>
            <p class="text-xs text-zinc-400 mt-0.5">Complete record of all actions across all server instances</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-zinc-500">{{ meta.total.toLocaleString() }} total records</span>
          <button @click="load(1)" :disabled="loading" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 transition-colors">
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
            Refresh
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-[#202024] rounded-xl border border-zinc-800 px-4 py-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Search -->
          <div class="relative flex-1 min-w-[200px]">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              v-model="search"
              type="text"
              placeholder="Search actions or commands…"
              class="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
            />
          </div>
          <!-- Server filter -->
          <select v-model="filterServer" @change="load(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600 min-w-[120px]">
            <option value="">All Servers</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <!-- Category -->
          <select v-model="filterCategory" @change="load(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600">
            <option value="all">All Categories</option>
            <option value="command">Command</option>
            <option value="power">Power</option>
            <option value="file">File</option>
            <option value="auth">Auth</option>
            <option value="user">User</option>
            <option value="server">Server</option>
            <option value="backup">Backup</option>
            <option value="schedule">Schedule</option>
          </select>
          <!-- Status -->
          <select v-model="filterStatus" @change="load(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600">
            <option value="all">Any Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <!-- Date From -->
          <input v-model="dateFrom" type="date" @change="load(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600 [color-scheme:dark]" />
          <!-- Date To -->
          <input v-model="dateTo" type="date" @change="load(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600 [color-scheme:dark]" />
          <!-- Clear -->
          <button v-if="hasFilters" @click="clearFilters" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors">
            <X class="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-[#202024] rounded-xl border border-zinc-800 overflow-hidden">
        <div v-if="loading && logs.length === 0" class="flex items-center justify-center p-12 text-zinc-500 gap-2">
          <Loader2 class="w-5 h-5 animate-spin" /><span class="text-sm">Loading audit records…</span>
        </div>
        <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center p-14 text-zinc-500 gap-2">
          <ClipboardList class="w-10 h-10 text-zinc-700" />
          <p class="text-sm font-medium">No audit records found</p>
          <p class="text-xs text-zinc-600">Try adjusting your filters</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-500 uppercase tracking-wide text-[10px]">
                <th class="px-4 py-3 text-left font-semibold">Time</th>
                <th class="px-4 py-3 text-left font-semibold">User</th>
                <th class="px-4 py-3 text-left font-semibold">Server</th>
                <th class="px-4 py-3 text-left font-semibold">Category</th>
                <th class="px-4 py-3 text-left font-semibold">Action</th>
                <th class="px-4 py-3 text-left font-semibold">Status</th>
                <th class="px-4 py-3 text-left font-semibold">IP</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/60">
              <tr
                v-for="log in logs"
                :key="log.id"
                @click="drawer = log"
                class="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
              >
                <td class="px-4 py-2.5 text-zinc-400 whitespace-nowrap font-mono">{{ fmt(log.createdAt) }}</td>
                <td class="px-4 py-2.5 max-w-[130px]">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <div class="w-5 h-5 rounded-full bg-emerald-700/50 flex items-center justify-center text-[10px] font-bold text-emerald-300 flex-shrink-0">{{ (log.userFullName || log.userEmail || '?').charAt(0).toUpperCase() }}</div>
                    <span class="text-zinc-300 truncate">{{ log.userEmail }}</span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-zinc-400 max-w-[130px] truncate">
                  <router-link v-if="log.mcServerId" :to="`/instances/${log.mcServerId}/logs`" @click.stop class="hover:text-violet-400 transition-colors">
                    {{ log.serverName || `#${log.mcServerId}` }}
                  </router-link>
                  <span v-else class="text-zinc-600">—</span>
                </td>
                <td class="px-4 py-2.5">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase" :class="catBadge(log.category)">{{ log.category }}</span>
                </td>
                <td class="px-4 py-2.5 text-zinc-300 font-mono max-w-[220px] truncate">{{ log.action }}</td>
                <td class="px-4 py-2.5">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" :class="log.status === 'success' ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-400' : 'bg-red-950/50 border border-red-800/60 text-red-400'">
                    <component :is="log.status === 'success' ? CheckCircle : XCircle" class="w-3 h-3" />
                    {{ log.status }}
                  </span>
                </td>
                <td class="px-4 py-2.5 text-zinc-500 font-mono">{{ log.ipAddress }}</td>
                <td class="px-4 py-2.5"><ChevronRight class="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="meta.lastPage > 1 || logs.length > 0" class="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-[#1a1a1d]">
          <span class="text-xs text-zinc-500">
            Showing {{ ((meta.currentPage - 1) * meta.perPage) + 1 }}–{{ Math.min(meta.currentPage * meta.perPage, meta.total) }} of {{ meta.total.toLocaleString() }}
          </span>
          <div class="flex items-center gap-2">
            <button @click="load(meta.currentPage - 1)" :disabled="meta.currentPage <= 1" class="px-3 py-1 rounded-lg text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 transition-colors">Previous</button>
            <span class="text-xs text-zinc-400">{{ meta.currentPage }} / {{ meta.lastPage }}</span>
            <button @click="load(meta.currentPage + 1)" :disabled="meta.currentPage >= meta.lastPage" class="px-3 py-1 rounded-lg text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Drawer -->
    <Teleport to="body">
      <div v-if="drawer" class="fixed inset-0 z-50 flex" @click.self="drawer = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="drawer = null"></div>
        <div class="relative ml-auto h-full w-full max-w-md bg-[#1a1a1d] border-l border-zinc-800 shadow-2xl flex flex-col">
          <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div class="flex items-center gap-2">
              <ClipboardList class="w-4 h-4 text-violet-400" />
              <h2 class="text-sm font-semibold text-zinc-100">Event #{{ drawer.id }}</h2>
            </div>
            <button @click="drawer = null" class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-5 space-y-3">
            <div class="grid gap-2.5">
              <dr label="Action" :value="drawer.action" mono />
              <dr label="Category" :value="drawer.category" />
              <dr label="Status" :value="drawer.status" />
              <dr label="User" :value="drawer.userEmail" />
              <dr label="Full Name" :value="drawer.userFullName || '—'" />
              <dr v-if="drawer.serverName" label="Server" :value="`${drawer.serverName} (#${drawer.mcServerId})`" />
              <dr label="IP Address" :value="drawer.ipAddress" mono />
              <dr label="Timestamp" :value="fmt(drawer.createdAt)" />
              <dr v-if="drawer.errorMessage" label="Error" :value="drawer.errorMessage" />
            </div>
            <div v-if="drawer.details && Object.keys(drawer.details).length">
              <p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2 mt-4">Details</p>
              <pre class="bg-[#0e0e10] rounded-xl p-3 text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800">{{ JSON.stringify(drawer.details, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  ClipboardList, RefreshCw, Search, Loader2, ChevronRight,
  CheckCircle, XCircle, X
} from 'lucide-vue-next'
import AppLayout from '../layouts/AppLayout.vue'
import { getGlobalAuditLogs, type AuditLogRecord, type AuditLogMeta } from '../api/audit'
import { request } from '../api/client'

// Tiny detail-row sub-component
const Dr = {
  props: ['label', 'value', 'mono'],
  template: `<div class="flex gap-3 text-xs">
    <span class="text-zinc-500 w-24 flex-shrink-0">{{ label }}</span>
    <span :class="mono ? 'font-mono text-zinc-200' : 'text-zinc-300'" class="flex-1 break-all">{{ value }}</span>
  </div>`
}

const logs = ref<AuditLogRecord[]>([])
const meta = ref<AuditLogMeta>({ total: 0, perPage: 20, currentPage: 1, lastPage: 1 })
const loading = ref(false)
const drawer = ref<AuditLogRecord | null>(null)

const search = ref('')
const filterServer = ref('')
const filterCategory = ref('all')
const filterStatus = ref('all')
const dateFrom = ref('')
const dateTo = ref('')

const servers = ref<{ id: number; name: string }[]>([])

const hasFilters = computed(() =>
  search.value || filterServer.value || filterCategory.value !== 'all' || filterStatus.value !== 'all' || dateFrom.value || dateTo.value
)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 400)
})

async function load(page = 1) {
  loading.value = true
  try {
    const res = await getGlobalAuditLogs({
      page,
      perPage: 20,
      serverId: filterServer.value || undefined,
      category: filterCategory.value !== 'all' ? filterCategory.value : undefined,
      status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
      search: search.value.trim() || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    })
    logs.value = res.data
    meta.value = res.meta
  } catch {} finally { loading.value = false }
}

async function loadServers() {
  try {
    const res = await request<any[]>('/servers')
    servers.value = (Array.isArray(res) ? res : []).map(s => ({ id: s.id, name: s.name }))
  } catch {}
}

function clearFilters() {
  search.value = ''
  filterServer.value = ''
  filterCategory.value = 'all'
  filterStatus.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
  load(1)
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function catBadge(category: string) {
  const map: Record<string, string> = {
    command:  'bg-sky-950/50 border border-sky-800/60 text-sky-400',
    power:    'bg-orange-950/50 border border-orange-800/60 text-orange-400',
    file:     'bg-amber-950/50 border border-amber-800/60 text-amber-400',
    config:   'bg-blue-950/50 border border-blue-800/60 text-blue-400',
    backup:   'bg-emerald-950/50 border border-emerald-800/60 text-emerald-400',
    schedule: 'bg-purple-950/50 border border-purple-800/60 text-purple-400',
  }
  return map[category] || 'bg-zinc-800 border border-zinc-700 text-zinc-400'
}

onMounted(() => {
  loadServers()
  load(1)
})
</script>
