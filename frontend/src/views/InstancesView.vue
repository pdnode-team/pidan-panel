<template>
  <AppLayout :breadcrumbs="[{ label: 'Instances' }]">
    <div class="space-y-6">
      <!-- Top Action & Filter Toolbar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Title with Grid Icon -->
        <div class="flex items-center gap-2.5">
          <LayoutGrid class="w-5 h-5 text-zinc-300" />
          <h1 class="text-xl font-bold tracking-tight text-zinc-100">Instances</h1>
          <span class="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
            {{ filteredServers.length }}
          </span>
        </div>

        <!-- Controls: Filters, Search, and Action Buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Status Select -->
          <div class="relative">
            <select
              v-model="statusFilter"
              class="appearance-none bg-[#202024] border border-zinc-700/70 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <!-- Search Input -->
          <div class="relative flex items-center min-w-[200px] sm:min-w-[240px]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by instance name"
              class="w-full bg-[#202024] border border-zinc-700/70 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-all"
            />
            <Search class="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
          </div>

          <!-- Refresh Button -->
          <button
            type="button"
            @click="loadServers"
            :disabled="isLoading"
            class="px-3 py-1.5 rounded-lg bg-[#202024] border border-zinc-700/70 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors flex items-center gap-1.5"
          >
            <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
            <span>Refresh</span>
          </button>

          <!-- Create Button -->
          <router-link
            to="/instances/create"
            class="px-4 py-1.5 rounded-lg bg-[#3b82f6] hover:bg-blue-600 active:scale-95 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Create</span>
          </router-link>
        </div>
      </div>

      <!-- Docker Daemon Offline Red Alert Banner -->
      <div 
        v-if="isDockerDown" 
        class="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-red-900/60 border border-red-700/80 flex items-center justify-center flex-shrink-0 text-red-400">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-red-200">Docker Daemon Offline</h4>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-900/80 text-red-200 border border-red-700">
                ERROR
              </span>
            </div>
            <p class="text-[11px] text-red-300/90 mt-0.5 leading-relaxed">
              {{ dockerErrorMessage || 'Cannot connect to Docker engine. Container management, instance launches, and stats are currently offline.' }}
            </p>
          </div>
        </div>
        <button 
          type="button" 
          @click="checkDockerHealth" 
          :disabled="isCheckingDocker"
          class="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-xs transition-all shadow flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isCheckingDocker }" />
          <span>Retry Connection</span>
        </button>
      </div>

      <!-- Error Message Banner -->
      <div v-if="fetchError" class="p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-red-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AlertCircle class="w-4 h-4" />
          <span>{{ fetchError }}</span>
        </div>
        <button @click="loadServers" class="underline hover:text-red-300">Retry</button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && servers.length === 0" class="py-24 text-center text-zinc-500 text-sm flex flex-col items-center gap-3">
        <RotateCw class="w-6 h-6 animate-spin text-blue-500" />
        <span>Loading server instances from backend...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredServers.length === 0" class="py-20 text-center rounded-xl bg-[#202024]/50 border border-dashed border-zinc-800 p-8">
        <Box class="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <h3 class="text-sm font-semibold text-zinc-300">No instance found</h3>
        <p class="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          {{ searchQuery ? 'No servers match your search query.' : 'Click Create above to create your first Minecraft server instance.' }}
        </p>
      </div>

      <!-- Instance Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="server in filteredServers"
          :key="server.id"
          @click="router.push(`/instances/${server.id}/terminal`)"
          class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-5 flex flex-col justify-between hover:border-zinc-700/80 transition-all group cursor-pointer"
        >
          <!-- Card Header & Badge -->
          <div>
            <div class="flex items-start justify-between gap-3 mb-2">
              <h3 class="text-base font-bold text-zinc-100 tracking-tight truncate group-hover:text-blue-400 transition-colors">
                {{ server.name }}
              </h3>
              
              <!-- Status Badge -->
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize flex-shrink-0 transition-all"
                :class="getInstanceStatusBadgeClass(server)"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="getInstanceStatusDotClass(server)"></span>
                <span>{{ getInstanceStatusLabel(server) }}</span>
              </span>
            </div>

            <!-- Server Details -->
            <div class="space-y-1.5 text-xs text-zinc-400 mt-3 font-sans">
              <div class="flex items-center gap-2">
                <span class="text-zinc-500">Instance Type:</span>
                <span class="text-zinc-300 font-medium truncate">{{ detectJarType(server) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-zinc-500">Port / Memory:</span>
                <span class="text-zinc-300 font-mono">{{ server.serverPort }} / {{ server.maxMemoryMb }}MB</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-zinc-500">Runtime:</span>
                <span class="text-zinc-300 font-mono text-[11px] truncate">{{ getJavaLabel(server.dockerImage) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-zinc-500">Startup:</span>
                <span class="text-zinc-400 font-mono text-[11px] truncate">
                  {{ formatDate(server.createdAt) }}
                </span>
              </div>

              <!-- Watchdog & High Availability Indicators -->
              <div v-if="server.autoStartOnBoot || server.autoRestartOnCrash" class="flex items-center gap-1.5 pt-1 flex-wrap">
                <span 
                  v-if="server.autoStartOnBoot"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-950/50 border border-indigo-800/60 text-indigo-300"
                  title="Auto-starts on panel service boot"
                >
                  <Power class="w-2.5 h-2.5 text-indigo-400" />
                  <span>Boot Auto-Start</span>
                </span>
                <span 
                  v-if="server.autoRestartOnCrash"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/50 border border-emerald-800/60 text-emerald-300"
                  title="Crash exponential backoff auto-recovery active"
                >
                  <Activity class="w-2.5 h-2.5 text-emerald-400" />
                  <span>Crash Recovery</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons Row -->
          <div class="pt-5 mt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <!-- Left: Play/Start or Stop Button -->
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click.stop="togglePower(server)"
                :title="server.runtime?.status === 'running' ? 'Stop server' : 'Start server'"
                class="p-2 rounded-lg border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 transition-colors"
                :class="{ 'text-emerald-400 border-emerald-800/50 bg-emerald-950/20': server.runtime?.status === 'running' }"
              >
                <Square v-if="server.runtime?.status === 'running'" class="w-3.5 h-3.5 fill-current" />
                <Play v-else class="w-3.5 h-3.5 fill-current" />
              </button>

              <!-- Terminal Console Button -->
              <router-link
                :to="`/instances/${server.id}/terminal`"
                @click.stop
                title="Open Terminal Console"
                class="p-2 rounded-lg border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-white text-zinc-300 transition-colors flex items-center gap-1"
              >
                <Terminal class="w-3.5 h-3.5" />
              </router-link>

              <!-- File Manager Button -->
              <router-link
                :to="`/instances/${server.id}/files`"
                @click.stop
                title="Open File Manager"
                class="p-2 rounded-lg border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-white text-amber-400 transition-colors flex items-center gap-1"
              >
                <Folder class="w-3.5 h-3.5" />
              </router-link>

              <!-- MC Settings Button -->
              <router-link
                :to="`/instances/${server.id}/settings`"
                @click.stop
                title="Open MC Settings"
                class="p-2 rounded-lg border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-white text-blue-400 transition-colors flex items-center gap-1"
              >
                <Settings2 class="w-3.5 h-3.5" />
              </router-link>

              <!-- Config Editor Button -->
              <router-link
                :to="`/instances/${server.id}/configs`"
                @click.stop
                title="Open Visual Config Editor"
                class="p-2 rounded-lg border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-white text-emerald-400 transition-colors flex items-center gap-1"
              >
                <Sliders class="w-3.5 h-3.5" />
              </router-link>
            </div>

            <!-- Right: Delete Action Button -->
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click.stop="openDeleteModal(server)"
                title="Delete instance"
                class="p-2 rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-900/40 hover:border-red-600 text-red-400 transition-colors"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Instance Modal Dialog -->
    <div 
      v-if="isCreateModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between p-6 pb-4 border-b border-zinc-800 flex-shrink-0 bg-[#202024]">
          <h3 class="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Plus class="w-5 h-5 text-blue-400" />
            <span>Create Minecraft Server</span>
          </h3>
          <button 
            type="button" 
            @click="isCreateModalOpen = false" 
            class="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateSubmit" class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <!-- Error alert -->
          <div v-if="createError" class="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-400 text-xs">
            {{ createError }}
          </div>

          <!-- Server Name -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Display Name</label>
            <input
              v-model="createForm.name"
              type="text"
              required
              placeholder="e.g. My Survival World"
              class="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <!-- Identifier -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Identifier (English slug)</label>
            <input
              v-model="createForm.identifier"
              type="text"
              required
              pattern="[-a-z0-9]+"
              placeholder="e.g. survival-01"
              class="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 font-mono text-sm outline-none focus:border-blue-500"
            />
            <span class="text-[11px] text-zinc-500">2-50 characters, lowercase letters, numbers, and hyphens only.</span>
          </div>

          <!-- Java Runtime Selection -->
          <div class="space-y-1.5">
            <label class="font-medium text-zinc-300">Java Runtime</label>
            <div class="relative">
              <select
                v-model="createForm.dockerImage"
                class="w-full h-10 px-3.5 pr-9 rounded-lg bg-[#202024] border border-zinc-700/70 hover:border-zinc-600 text-zinc-100 text-sm font-sans outline-none focus:border-blue-500 appearance-none cursor-pointer transition-colors"
              >
                <option 
                  v-for="opt in JAVA_IMAGE_OPTIONS" 
                  :key="opt.image" 
                  :value="opt.image"
                  class="bg-[#202024] text-zinc-100 py-1.5"
                >
                  {{ opt.label }} ({{ opt.versionRange }})
                </option>
              </select>
              <ChevronDown class="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span class="text-[11px] text-zinc-500">Image: {{ createForm.dockerImage }}</span>
          </div>

          <!-- Port & Max Memory Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-medium text-zinc-300">Game Port</label>
              <input
                v-model.number="createForm.serverPort"
                type="number"
                min="1024"
                max="65535"
                required
                class="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div class="space-y-1">
              <label class="font-medium text-zinc-300">Max Memory (MB)</label>
              <input
                v-model.number="createForm.maxMemoryMb"
                type="number"
                min="256"
                max="65536"
                required
                class="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Server Jar -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Server Jar File</label>
            <input
              v-model="createForm.serverJar"
              type="text"
              required
              class="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500"
            />
          </div>

          <!-- Minecraft EULA Agreement -->
          <div class="pt-2 border-t border-zinc-800">
            <label class="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer select-none">
              <input
                v-model="agreeEula"
                type="checkbox"
                required
                class="mt-0.5 w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-blue-500/40 accent-blue-600 cursor-pointer flex-shrink-0"
              />
              <div class="text-xs text-zinc-300 leading-normal">
                <span>I agree to the </span>
                <a
                  href="https://www.minecraft.net/en-us/eula"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-0.5"
                  @click.stop
                >
                  <span>Minecraft EULA</span>
                  <ExternalLink class="w-3 h-3 inline-block" />
                </a>
                <span class="text-zinc-500 block text-[11px] mt-0.5">
                  By checking this box, you confirm that you accept Mojang's End User License Agreement required to run a Minecraft server.
                </span>
              </div>
            </label>
          </div>

          <!-- Modal Action Buttons -->
          <div class="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              @click="isCreateModalOpen = false"
              class="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isCreating || !agreeEula"
              class="px-5 py-2 rounded-lg bg-[#3b82f6] hover:bg-blue-600 active:scale-95 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              <RotateCw v-if="isCreating" class="w-4 h-4 animate-spin" />
              <span>Create Server</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Instance Confirmation Modal -->
    <div 
      v-if="isDeleteModalOpen && serverToDelete" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl p-6 space-y-5">
        <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div class="flex items-center gap-2 text-red-400">
            <Trash2 class="w-5 h-5" />
            <h3 class="text-base font-bold text-zinc-100">Delete Server Instance</h3>
          </div>
          <button 
            type="button" 
            @click="closeDeleteModal"
            class="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 text-sm text-zinc-300">
          <p>
            Are you sure you want to delete instance 
            <span class="font-bold text-white font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded">
              {{ serverToDelete.name }}
            </span>?
          </p>

          <div v-if="serverToDelete.runtime?.status === 'running'" class="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>This server is currently running. You must stop it before deleting.</span>
          </div>

          <!-- Delete Files Option Checkbox -->
          <div class="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
            <label class="flex items-start gap-2.5 cursor-pointer select-none">
              <input 
                v-model="deleteFilesOnDisk" 
                type="checkbox" 
                class="mt-0.5 w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-500/40 accent-red-600 cursor-pointer"
              />
              <div class="space-y-0.5">
                <span class="font-medium text-zinc-200 block text-xs">
                  Delete server data directory and files
                </span>
                <span class="text-[11px] text-zinc-500 block leading-normal">
                  Permanently erases world files, configs, and plugins from the host disk. If unchecked, files remain preserved on disk.
                </span>
              </div>
            </label>
          </div>

          <!-- Error Feedback Banner -->
          <div v-if="deleteError" class="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span>{{ deleteError }}</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            @click="closeDeleteModal"
            class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDelete"
            :disabled="isDeleting || serverToDelete.runtime?.status === 'running'"
            class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-red-600 disabled:active:scale-100"
          >
            <RotateCw v-if="isDeleting" class="w-3.5 h-3.5 animate-spin" />
            <span>{{ isDeleting ? 'Deleting...' : 'Delete Instance' }}</span>
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'

const router = useRouter()
import { 
  getServers, 
  getServer,
  getPowerState,
  createServer, 
  deleteServer, 
  startServer, 
  stopServer, 
  JAVA_IMAGE_OPTIONS,
  type ServerInstance 
} from '../api/servers'
import { getHealthCheck } from '../api/system'
import { 
  LayoutGrid, 
  Search, 
  RotateCw, 
  Plus, 
  Play, 
  Square, 
  Terminal, 
  Folder,
  Sliders,
  Settings2,
  Trash2, 
  ChevronDown, 
  Box, 
  X,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Power,
  Activity
} from 'lucide-vue-next'

const servers = ref<ServerInstance[]>([])
const isLoading = ref(false)
const fetchError = ref('')
const searchQuery = ref('')
const statusFilter = ref<'all' | 'running' | 'stopped'>('all')

// Create Modal state
const isCreateModalOpen = ref(false)
const isCreating = ref(false)
const createError = ref('')
const agreeEula = ref(false)

// Delete Modal state
const isDeleteModalOpen = ref(false)
const serverToDelete = ref<ServerInstance | null>(null)
const deleteFilesOnDisk = ref(false) // Default false (do not delete data)
const isDeleting = ref(false)
const deleteError = ref('')

const createForm = reactive({
  name: '',
  identifier: '',
  serverPort: 25565,
  minMemoryMb: 1024,
  maxMemoryMb: 2048,
  serverJar: 'server.jar',
  dockerImage: 'eclipse-temurin:21-jre-alpine'
})

function getJavaLabel(dockerImage?: string): string {
  if (!dockerImage) return 'Java 21 (Temurin)'
  const found = JAVA_IMAGE_OPTIONS.find(o => o.image === dockerImage)
  if (found) return found.label
  if (dockerImage.includes('25')) return 'Java 25'
  if (dockerImage.includes('21')) return 'Java 21'
  if (dockerImage.includes('17')) return 'Java 17'
  if (dockerImage.includes('11')) return 'Java 11'
  if (dockerImage.includes('8')) return 'Java 8'
  return dockerImage
}

const isDockerDown = ref(false)
const dockerErrorMessage = ref('')
const isCheckingDocker = ref(false)

async function checkDockerHealth() {
  isCheckingDocker.value = true
  try {
    const health = await getHealthCheck()
    if (health?.checks) {
      const dockerCheck = health.checks.find(c => c.name.toLowerCase().includes('docker'))
      if (dockerCheck) {
        const s = (dockerCheck.status || '').toLowerCase()
        if (s === 'error' || s === 'fatal') {
          isDockerDown.value = true
          dockerErrorMessage.value = dockerCheck.message || 'Docker engine service is offline or unreachable.'
          return
        }
      }
    }
    isDockerDown.value = false
    dockerErrorMessage.value = ''
  } catch {
    // silent catch
  } finally {
    isCheckingDocker.value = false
  }
}

onMounted(() => {
  loadServers()
  checkDockerHealth()
})

async function loadServers() {
  isLoading.value = true
  fetchError.value = ''
  try {
    const res = await getServers()
    const list = res.data || []
    servers.value = list.map(s => ({
      ...s,
      runtime: s.runtime || { status: 'stopped' }
    }))
    // Fetch live container power states in parallel
    Promise.allSettled(
      list.map(async (s) => {
        try {
          const power = await getPowerState(s.id)
          if (power && power.status) {
            const target = servers.value.find(item => item.id === s.id)
            if (target) {
              target.runtime = { ...target.runtime, status: power.status }
            }
          }
        } catch {}
      })
    )
  } catch (err: any) {
    fetchError.value = err.message || 'Failed to load server instances. Please ensure the backend is running.'
    servers.value = []
  } finally {
    isLoading.value = false
  }
}

const filteredServers = computed(() => {
  return servers.value.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          s.identifier.toLowerCase().includes(searchQuery.value.toLowerCase())
    if (!matchesSearch) return false
    if (statusFilter.value === 'all') return true
    return (s.runtime?.status || 'stopped') === statusFilter.value
  })
})

function detectJarType(server: ServerInstance): string {
  const jar = (server.serverJar || '').toLowerCase()
  if (jar.includes('paper')) return 'PaperMC Server'
  if (jar.includes('purpur')) return 'Purpur Server'
  if (jar.includes('forge')) return 'Forge Server'
  if (jar.includes('fabric')) return 'Fabric Server'
  return 'Java Edition Server'
}

function formatDate(iso: string): string {
  if (!iso) return 'N/A'
  try {
    const d = new Date(iso)
    return d.toISOString().replace('T', ' ').substring(0, 19)
  } catch {
    return iso
  }
}

function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case 'running': return 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
    case 'starting':
    case 'restarting': return 'bg-blue-950/40 border-blue-800/60 text-blue-400'
    default: return 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400'
  }
}

function getStatusDotClass(status?: string): string {
  switch (status) {
    case 'running': return 'bg-emerald-400 animate-pulse'
    case 'starting':
    case 'restarting': return 'bg-blue-400 animate-pulse'
    default: return 'bg-zinc-500'
  }
}

function getInstanceStatusLabel(server: ServerInstance): string {
  if (server.runtime?.autoRestart?.isWaitingRestart) {
    return `Restarting (${server.runtime.autoRestart.nextRetryInSeconds}s)`
  }
  if (server.runtime?.autoRestart?.haltedReason) {
    return 'Circuit Tripped'
  }
  return server.runtime?.status || 'stopped'
}

function getInstanceStatusBadgeClass(server: ServerInstance): string {
  if (server.runtime?.autoRestart?.isWaitingRestart) {
    return 'bg-amber-950/50 border-amber-800/70 text-amber-300 shadow-sm'
  }
  if (server.runtime?.autoRestart?.haltedReason) {
    return 'bg-red-950/50 border-red-800/70 text-red-300 shadow-sm'
  }
  return getStatusBadgeClass(server.runtime?.status)
}

function getInstanceStatusDotClass(server: ServerInstance): string {
  if (server.runtime?.autoRestart?.isWaitingRestart) {
    return 'bg-amber-400 animate-ping'
  }
  if (server.runtime?.autoRestart?.haltedReason) {
    return 'bg-red-500'
  }
  return getStatusDotClass(server.runtime?.status)
}

async function togglePower(server: ServerInstance) {
  if (!server.runtime) {
    server.runtime = { status: 'stopped' }
  }
  const isRunning = server.runtime.status === 'running'
  try {
    if (isRunning) {
      server.runtime.status = 'stopping'
      await stopServer(server.id)
      server.runtime.status = 'stopped'
    } else {
      server.runtime.status = 'starting'
      await startServer(server.id)
      server.runtime.status = 'running'
    }
    // Refresh container status shortly after
    setTimeout(async () => {
      try {
        const power = await getPowerState(server.id)
        if (power && power.status) {
          server.runtime.status = power.status
        }
      } catch {}
    }, 1200)
  } catch (err: any) {
    alert(`操作失败: ${err.message || '未知错误'}`)
    loadServers()
  }
}

function openDeleteModal(server: ServerInstance) {
  serverToDelete.value = server
  deleteFilesOnDisk.value = false // Default to false
  deleteError.value = ''
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
  serverToDelete.value = null
  deleteFilesOnDisk.value = false
  deleteError.value = ''
}

async function confirmDelete() {
  if (!serverToDelete.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await deleteServer(serverToDelete.value.id, deleteFilesOnDisk.value)
    servers.value = servers.value.filter(s => s.id !== serverToDelete.value!.id)
    closeDeleteModal()
  } catch (err: any) {
    deleteError.value = err.message || 'Failed to delete server instance'
  } finally {
    isDeleting.value = false
  }
}

async function handleCreateSubmit() {
  if (!agreeEula.value) {
    createError.value = 'You must accept the Minecraft EULA before creating a server.'
    return
  }
  createError.value = ''
  isCreating.value = true
  try {
    const created = await createServer({
      name: createForm.name,
      identifier: createForm.identifier,
      serverPort: createForm.serverPort,
      minMemoryMb: createForm.minMemoryMb,
      maxMemoryMb: createForm.maxMemoryMb,
      serverJar: createForm.serverJar,
      dockerImage: createForm.dockerImage
    })
    servers.value.unshift(created)
    isCreateModalOpen.value = false
    createForm.name = ''
    createForm.identifier = ''
    createForm.dockerImage = 'eclipse-temurin:21-jre-alpine'
    agreeEula.value = false
  } catch (err: any) {
    createError.value = err.message || 'Failed to create server, please verify your parameters'
  } finally {
    isCreating.value = false
  }
}
</script>
