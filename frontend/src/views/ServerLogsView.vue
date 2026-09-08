<template>
  <AppLayout
    :breadcrumbs="[
      { label: 'Instances', to: '/instances' },
      { label: instance.name || `Server #${serverId}`, to: `/instances/${serverId}/terminal` },
      { label: 'Logs' }
    ]"
    :wide="true"
  >
    <div class="w-full max-w-7xl mx-auto space-y-4">
      <!-- Instance Header & Quick Nav -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-950/40 border border-violet-800/60 text-violet-400">
            <ScrollText class="w-6 h-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-zinc-100">{{ instance.name || `Server #${serverId}` }}</h1>
              <span
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border capitalize"
                :class="statusBadgeClasses"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClasses"></span>
                {{ instance.runtime?.status || 'stopped' }}
              </span>
            </div>
            <p class="text-xs text-zinc-400">Log Archives &amp; Audit Trail</p>
          </div>
        </div>
        <!-- Quick Switcher -->
        <div class="flex items-center gap-2 flex-wrap">
          <router-link :to="`/instances/${serverId}/terminal`" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors">
            <Terminal class="w-4 h-4 text-emerald-400" /><span>Terminal</span>
          </router-link>
          <router-link :to="`/instances/${serverId}/settings`" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors">
            <Settings2 class="w-4 h-4 text-blue-400" /><span>MC Settings</span>
          </router-link>
          <router-link :to="`/instances/${serverId}/files`" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors">
            <Folder class="w-4 h-4 text-amber-400" /><span>Files</span>
          </router-link>
          <router-link :to="`/instances/${serverId}/configs`" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors">
            <Sliders class="w-4 h-4 text-purple-400" /><span>Configs</span>
          </router-link>
          <router-link :to="`/instances/${serverId}/backups`" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors">
            <Archive class="w-4 h-4 text-sky-400" /><span>Backups</span>
          </router-link>
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-violet-300 bg-violet-950/40 border border-violet-800/60">
            <ScrollText class="w-4 h-4 text-violet-400" /><span>Logs</span>
          </div>
        </div>
      </div>

      <!-- Restart Alert -->
      <InstanceRestartAlert :server-id="serverId" :server-status="instance.runtime?.status" />

      <!-- Tabs -->
      <div class="flex items-center gap-1 border-b border-zinc-800">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
          :class="activeTab === tab.id
            ? 'border-violet-500 text-violet-400'
            : 'border-transparent text-zinc-400 hover:text-zinc-200'"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- ─── Tab: Log Archives ──────────────────────────────────── -->
      <div v-if="activeTab === 'archives'" class="space-y-4">
        <!-- Archive file list -->
        <div class="bg-[#202024] rounded-xl border border-zinc-800 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div class="flex items-center gap-2">
              <Files class="w-4 h-4 text-zinc-400" />
              <span class="text-sm font-semibold text-zinc-200">Log Files</span>
            </div>
            <button @click="loadArchives" :disabled="archivesLoading" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50">
              <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': archivesLoading }" />
              Refresh
            </button>
          </div>
          <div v-if="archivesLoading" class="flex items-center justify-center p-8 text-zinc-500 gap-2">
            <Loader2 class="w-5 h-5 animate-spin" />
            <span class="text-sm">Loading archives…</span>
          </div>
          <div v-else-if="archives.length === 0" class="flex flex-col items-center justify-center p-10 text-zinc-500 gap-2">
            <FileX class="w-8 h-8 text-zinc-700" />
            <p class="text-sm">No log files found.</p>
          </div>
          <div v-else class="divide-y divide-zinc-800">
            <div
              v-for="file in archives"
              :key="file.name"
              @click="openLogFile(file)"
              class="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-800/60 transition-colors group"
              :class="{ 'bg-violet-950/20': selectedFile?.name === file.name }"
            >
              <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex-shrink-0">
                <FileText class="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-zinc-200 truncate">{{ file.name }}</span>
                  <span v-if="file.name === 'latest.log'" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/50 border border-emerald-800/60 text-emerald-400">
                    <Zap class="w-2.5 h-2.5" />LIVE
                  </span>
                  <span v-if="file.isCompressed" class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-400">.gz</span>
                </div>
                <p class="text-xs text-zinc-500 mt-0.5">{{ formatDate(file.modifiedAt) }} · {{ formatBytes(file.size) }}</p>
              </div>
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  :href="getDownloadUrl(file.name)"
                  target="_blank"
                  @click.stop
                  class="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                  :title="`Download ${file.name}`"
                >
                  <Download class="w-3.5 h-3.5" />
                </a>
                <ChevronRight class="w-4 h-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>

        <!-- Log Viewer -->
        <div v-if="selectedFile" class="bg-[#202024] rounded-xl border border-zinc-800 overflow-hidden">
          <!-- Viewer Toolbar -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <div class="flex items-center gap-2 min-w-0">
              <FileText class="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span class="text-sm font-semibold text-zinc-200 truncate">{{ selectedFile.name }}</span>
              <span class="text-xs text-zinc-500 flex-shrink-0">{{ logContent.totalLines.toLocaleString() }} lines</span>
            </div>
            <div class="flex items-center gap-2 ml-auto">
              <!-- Level Filter -->
              <select v-model="levelFilter" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-violet-600">
                <option value="all">All Levels</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="FATAL">FATAL</option>
                <option value="DEBUG">DEBUG</option>
              </select>
              <!-- Search -->
              <div class="relative">
                <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input v-model="searchQuery" type="text" placeholder="Search…" class="bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-600 w-44" />
              </div>
              <!-- Tail toggle (latest.log only) -->
              <button
                v-if="selectedFile.name === 'latest.log'"
                @click="toggleTail"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="isTailing ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-800/60' : 'text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'"
              >
                <Radio class="w-3.5 h-3.5" :class="isTailing ? 'text-emerald-400' : 'text-zinc-400'" />
                {{ isTailing ? 'Tailing' : 'Tail' }}
              </button>
              <!-- Pagination -->
              <select v-model.number="perPage" @change="loadPage(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-violet-600">
                <option :value="200">200 lines</option>
                <option :value="500">500 lines</option>
                <option :value="1000">1000 lines</option>
              </select>
              <!-- Copy -->
              <button @click="copyVisibleLines" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors" title="Copy visible lines">
                <Copy class="w-3.5 h-3.5" />
              </button>
              <!-- Download -->
              <a :href="getDownloadUrl(selectedFile.name)" target="_blank" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors" title="Download log file">
                <Download class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <!-- Log Lines -->
          <div class="relative">
            <div v-if="contentLoading" class="flex items-center justify-center p-10 text-zinc-500 gap-2">
              <Loader2 class="w-5 h-5 animate-spin" />
              <span class="text-sm">Loading log…</span>
            </div>
            <div
              v-else
              ref="logViewerEl"
              class="overflow-auto max-h-[60vh] bg-[#0e0e10] font-mono text-xs leading-5 px-4 py-3"
            >
              <div
                v-for="(line, idx) in filteredLines"
                :key="idx"
                class="flex gap-3 hover:bg-white/[0.03] rounded px-1 -mx-1"
                :class="lineClass(line)"
              >
                <span class="text-zinc-600 select-none w-10 flex-shrink-0 text-right">{{ lineStartIndex + idx + 1 }}</span>
                <span class="whitespace-pre-wrap break-all flex-1" v-html="highlightLine(line)"></span>
              </div>
              <div v-if="filteredLines.length === 0" class="text-zinc-600 py-4 text-center">No lines match current filter.</div>
            </div>
          </div>

          <!-- Pagination controls -->
          <div v-if="!isTailing && logContent.totalLines > perPage" class="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-[#1a1a1d]">
            <span class="text-xs text-zinc-500">
              Lines {{ lineStartIndex + 1 }}–{{ Math.min(lineStartIndex + perPage, logContent.totalLines) }} of {{ logContent.totalLines.toLocaleString() }}
            </span>
            <div class="flex items-center gap-2">
              <button @click="loadPage(currentPage - 1)" :disabled="currentPage <= 1" class="px-3 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 transition-colors">Previous</button>
              <span class="text-xs text-zinc-400">Page {{ currentPage }} / {{ totalPages }}</span>
              <button @click="loadPage(currentPage + 1)" :disabled="currentPage >= totalPages" class="px-3 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Tab: Server Audit ──────────────────────────────────── -->
      <div v-if="activeTab === 'audit'" class="space-y-4">
        <!-- Filters Row -->
        <div class="flex flex-wrap items-center gap-3 bg-[#202024] px-4 py-3 rounded-xl border border-zinc-800">
          <div class="relative flex-1 min-w-[180px]">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input v-model="auditSearch" type="text" placeholder="Search actions…" class="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-600" />
          </div>
          <select v-model="auditCategory" @change="loadAuditLogs(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600">
            <option value="all">All Categories</option>
            <option value="command">Command</option>
            <option value="power">Power</option>
            <option value="file">File</option>
            <option value="config">Config</option>
            <option value="backup">Backup</option>
          </select>
          <select v-model="auditStatus" @change="loadAuditLogs(1)" class="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600">
            <option value="all">Any Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <button @click="loadAuditLogs(1)" :disabled="auditLoading" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 transition-colors ml-auto">
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': auditLoading }" />
            Refresh
          </button>
        </div>

        <!-- Table -->
        <div class="bg-[#202024] rounded-xl border border-zinc-800 overflow-hidden">
          <div v-if="auditLoading && auditLogs.length === 0" class="flex items-center justify-center p-10 text-zinc-500 gap-2">
            <Loader2 class="w-5 h-5 animate-spin" /><span class="text-sm">Loading…</span>
          </div>
          <div v-else-if="auditLogs.length === 0" class="flex flex-col items-center justify-center p-10 text-zinc-500 gap-2">
            <ClipboardList class="w-8 h-8 text-zinc-700" />
            <p class="text-sm">No audit records found.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-zinc-800 text-zinc-500 uppercase tracking-wide text-[10px]">
                  <th class="px-4 py-2.5 text-left font-semibold">Time</th>
                  <th class="px-4 py-2.5 text-left font-semibold">User</th>
                  <th class="px-4 py-2.5 text-left font-semibold">Category</th>
                  <th class="px-4 py-2.5 text-left font-semibold">Action</th>
                  <th class="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th class="px-4 py-2.5 text-left font-semibold">IP</th>
                  <th class="px-4 py-2.5 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/60">
                <tr
                  v-for="log in auditLogs"
                  :key="log.id"
                  @click="selectedAuditLog = log"
                  class="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td class="px-4 py-2.5 text-zinc-400 whitespace-nowrap font-mono">{{ formatDate(log.createdAt) }}</td>
                  <td class="px-4 py-2.5 text-zinc-300 max-w-[120px] truncate">{{ log.userEmail }}</td>
                  <td class="px-4 py-2.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase" :class="categoryBadge(log.category)">{{ log.category }}</span>
                  </td>
                  <td class="px-4 py-2.5 text-zinc-300 font-mono max-w-[200px] truncate">{{ log.action }}</td>
                  <td class="px-4 py-2.5">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase" :class="log.status === 'success' ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-400' : 'bg-red-950/50 border border-red-800/60 text-red-400'">
                      <component :is="log.status === 'success' ? CheckCircle : XCircle" class="w-3 h-3" />
                      {{ log.status }}
                    </span>
                  </td>
                  <td class="px-4 py-2.5 text-zinc-500 font-mono">{{ log.ipAddress }}</td>
                  <td class="px-4 py-2.5"><ChevronRight class="w-3.5 h-3.5 text-zinc-600" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Audit Pagination -->
          <div v-if="auditMeta.lastPage > 1" class="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-[#1a1a1d]">
            <span class="text-xs text-zinc-500">{{ auditMeta.total.toLocaleString() }} records</span>
            <div class="flex items-center gap-2">
              <button @click="loadAuditLogs(auditMeta.currentPage - 1)" :disabled="auditMeta.currentPage <= 1" class="px-3 py-1 rounded-lg text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 transition-colors">Previous</button>
              <span class="text-xs text-zinc-400">Page {{ auditMeta.currentPage }} / {{ auditMeta.lastPage }}</span>
              <button @click="loadAuditLogs(auditMeta.currentPage + 1)" :disabled="auditMeta.currentPage >= auditMeta.lastPage" class="px-3 py-1 rounded-lg text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Audit Detail Drawer -->
    <Teleport to="body">
      <div v-if="selectedAuditLog" class="fixed inset-0 z-50 flex" @click.self="selectedAuditLog = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedAuditLog = null"></div>
        <div class="relative ml-auto h-full w-full max-w-md bg-[#1a1a1d] border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div class="flex items-center gap-2">
              <ClipboardList class="w-4 h-4 text-violet-400" />
              <h2 class="text-sm font-semibold text-zinc-100">Audit Event #{{ selectedAuditLog.id }}</h2>
            </div>
            <button @click="selectedAuditLog = null" class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            <div class="space-y-2">
              <detail-row label="Action" :value="selectedAuditLog.action" mono />
              <detail-row label="Category" :value="selectedAuditLog.category" />
              <detail-row label="Status" :value="selectedAuditLog.status" />
              <detail-row label="User" :value="selectedAuditLog.userEmail" />
              <detail-row label="Full Name" :value="selectedAuditLog.userFullName || '—'" />
              <detail-row label="IP Address" :value="selectedAuditLog.ipAddress" mono />
              <detail-row label="Timestamp" :value="formatDate(selectedAuditLog.createdAt)" />
              <detail-row v-if="selectedAuditLog.errorMessage" label="Error" :value="selectedAuditLog.errorMessage" class="text-red-400" />
            </div>
            <div v-if="selectedAuditLog.details && Object.keys(selectedAuditLog.details).length">
              <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Details</p>
              <pre class="bg-[#0e0e10] rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800">{{ JSON.stringify(selectedAuditLog.details, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  ScrollText, Terminal, Settings2, Folder, Sliders, Archive,
  Files, FileText, FileX, Download, ChevronRight, Zap,
  Search, Radio, Copy, RefreshCw, Loader2, ClipboardList,
  CheckCircle, XCircle, X
} from 'lucide-vue-next'
import AppLayout from '../layouts/AppLayout.vue'
import InstanceRestartAlert from '../components/InstanceRestartAlert.vue'
import { listLogArchives, getLogContent, streamLatestLog, getLogDownloadUrl, type LogArchiveFile, type LogContentResponse } from '../api/serverLogs'
import { getServerAuditLogs, type AuditLogRecord, type AuditLogMeta } from '../api/audit'
import { request } from '../api/client'

// ─── Component to avoid repetition ────────────────────────────────────────────
const DetailRow = {
  props: ['label', 'value', 'mono'],
  template: `<div class="flex gap-3 text-xs">
    <span class="text-zinc-500 w-24 flex-shrink-0">{{ label }}</span>
    <span :class="mono ? 'font-mono text-zinc-200' : 'text-zinc-300'" class="flex-1 break-all">{{ value }}</span>
  </div>`
}

const route = useRoute()
const serverId = computed(() => route.params.id as string)

// ─── Server info ───────────────────────────────────────────────────────────────
const instance = ref<any>({})
async function loadInstance() {
  try { instance.value = await request(`/servers/${serverId.value}`) } catch {}
}

// ─── Status badge helpers ──────────────────────────────────────────────────────
const statusBadgeClasses = computed(() => {
  const s = instance.value?.runtime?.status || 'stopped'
  if (s === 'running') return 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400'
  if (s === 'starting') return 'bg-yellow-950/50 border-yellow-800/60 text-yellow-400'
  if (s === 'stopping') return 'bg-orange-950/50 border-orange-800/60 text-orange-400'
  return 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
})
const statusDotClasses = computed(() => {
  const s = instance.value?.runtime?.status || 'stopped'
  if (s === 'running') return 'bg-emerald-400 animate-pulse'
  if (s === 'starting') return 'bg-yellow-400 animate-pulse'
  return 'bg-zinc-500'
})

// ─── Tabs ──────────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'archives', label: 'Log Archives', icon: Files },
  { id: 'audit', label: 'Server Audit', icon: ClipboardList }
]
const activeTab = ref('archives')

// ─── Log Archives ──────────────────────────────────────────────────────────────
const archives = ref<LogArchiveFile[]>([])
const archivesLoading = ref(false)
const selectedFile = ref<LogArchiveFile | null>(null)

async function loadArchives() {
  archivesLoading.value = true
  try {
    const res = await listLogArchives(serverId.value)
    archives.value = res.files.sort((a, b) => {
      if (a.name === 'latest.log') return -1
      if (b.name === 'latest.log') return 1
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    })
  } catch { archives.value = [] } finally { archivesLoading.value = false }
}

// ─── Log Viewer ────────────────────────────────────────────────────────────────
const logContent = ref<LogContentResponse>({ lines: [], totalLines: 0, page: 1, perPage: 200, fileName: '' })
const tailLines = ref<string[]>([])
const contentLoading = ref(false)
const perPage = ref(200)
const currentPage = ref(1)
const isTailing = ref(false)
const searchQuery = ref('')
const levelFilter = ref('all')
const logViewerEl = ref<HTMLDivElement | null>(null)
let stopTail: (() => void) | null = null

const lineStartIndex = computed(() => (currentPage.value - 1) * perPage.value)
const totalPages = computed(() => Math.ceil(logContent.value.totalLines / perPage.value) || 1)

const displayLines = computed(() => isTailing.value ? tailLines.value : logContent.value.lines)

const filteredLines = computed(() => {
  let lines = displayLines.value
  if (levelFilter.value !== 'all') {
    lines = lines.filter(l => l.includes(`[${levelFilter.value}]`) || l.toUpperCase().includes(levelFilter.value))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    lines = lines.filter(l => l.toLowerCase().includes(q))
  }
  return lines
})

function lineClass(line: string) {
  if (/\[ERROR]|\bERROR\b|\[FATAL]|\bFATAL\b/i.test(line)) return 'text-red-400'
  if (/\[WARN]|\bWARN\b|\bWARNING\b/i.test(line)) return 'text-yellow-400'
  if (/\[INFO]|\bINFO\b/i.test(line)) return 'text-zinc-300'
  if (/\[DEBUG]|\bDEBUG\b/i.test(line)) return 'text-zinc-500'
  return 'text-zinc-400'
}

function highlightLine(line: string): string {
  // Escape HTML
  const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!searchQuery.value.trim()) return safe
  const q = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safe.replace(new RegExp(q, 'gi'), m => `<mark class="bg-yellow-400/30 text-yellow-300 rounded">${m}</mark>`)
}

async function openLogFile(file: LogArchiveFile) {
  stopTailIfActive()
  selectedFile.value = file
  currentPage.value = 1
  tailLines.value = []
  isTailing.value = false
  await loadPage(1)
  if (file.name === 'latest.log') {
    startTail()
  }
}

async function loadPage(page: number) {
  if (!selectedFile.value) return
  contentLoading.value = true
  try {
    logContent.value = await getLogContent(serverId.value, selectedFile.value.name, { page, perPage: perPage.value })
    currentPage.value = page
    await nextTick()
    logViewerEl.value?.scrollTo({ top: 0 })
  } catch { } finally { contentLoading.value = false }
}

function startTail() {
  isTailing.value = true
  tailLines.value = [...logContent.value.lines]
  stopTail = streamLatestLog(
    serverId.value,
    (line) => {
      tailLines.value.push(line)
      if (tailLines.value.length > 2000) tailLines.value = tailLines.value.slice(-2000)
      nextTick(() => {
        if (logViewerEl.value) logViewerEl.value.scrollTop = logViewerEl.value.scrollHeight
      })
    },
    () => { isTailing.value = false }
  )
}

function stopTailIfActive() {
  if (stopTail) { stopTail(); stopTail = null }
  isTailing.value = false
}

function toggleTail() {
  if (isTailing.value) stopTailIfActive()
  else startTail()
}

function copyVisibleLines() {
  navigator.clipboard.writeText(filteredLines.value.join('\n'))
}

function getDownloadUrl(name: string) {
  return getLogDownloadUrl(serverId.value, name)
}

// ─── Audit Logs ────────────────────────────────────────────────────────────────
const auditLogs = ref<AuditLogRecord[]>([])
const auditMeta = ref<AuditLogMeta>({ total: 0, perPage: 20, currentPage: 1, lastPage: 1 })
const auditLoading = ref(false)
const auditSearch = ref('')
const auditCategory = ref('all')
const auditStatus = ref('all')

let auditSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(auditSearch, () => {
  if (auditSearchTimer) clearTimeout(auditSearchTimer)
  auditSearchTimer = setTimeout(() => loadAuditLogs(1), 400)
})

async function loadAuditLogs(page = 1) {
  auditLoading.value = true
  try {
    const res = await getServerAuditLogs(serverId.value, {
      page,
      perPage: 20,
      category: auditCategory.value,
      status: auditStatus.value,
      search: auditSearch.value.trim() || undefined
    })
    auditLogs.value = res.data
    auditMeta.value = res.meta
  } catch { } finally { auditLoading.value = false }
}

const selectedAuditLog = ref<AuditLogRecord | null>(null)

// ─── Formatters ────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}
function formatBytes(bytes: number | null | undefined) {
  if (bytes == null || isNaN(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function categoryBadge(category: string) {
  const map: Record<string, string> = {
    command: 'bg-sky-950/50 border border-sky-800/60 text-sky-400',
    power:   'bg-orange-950/50 border border-orange-800/60 text-orange-400',
    file:    'bg-amber-950/50 border border-amber-800/60 text-amber-400',
    config:  'bg-blue-950/50 border border-blue-800/60 text-blue-400',
    backup:  'bg-emerald-950/50 border border-emerald-800/60 text-emerald-400',
  }
  return map[category] || 'bg-zinc-800 border border-zinc-700 text-zinc-400'
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadInstance(), loadArchives(), loadAuditLogs()])
})
onUnmounted(() => stopTailIfActive())
</script>
