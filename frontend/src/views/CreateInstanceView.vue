<template>
  <AppLayout 
    :breadcrumbs="[
      { label: 'Instances', to: '/instances' },
      { label: 'Choose Template' }
    ]"
    :wide="true"
  >
    <div class="space-y-6">
      <!-- Top Action & Navigation Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <router-link
            to="/instances"
            class="p-2 rounded-lg bg-[#202024] border border-zinc-700/70 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center justify-center"
            title="Back to Instances"
          >
            <ArrowLeft class="w-4 h-4" />
          </router-link>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              Choose Server Template
            </h1>
            <p class="text-xs text-zinc-400 mt-0.5">
              Select a pre-configured server software framework or start with a custom blank template.
            </p>
          </div>
        </div>

        <!-- Search / Filter -->
        <div class="relative flex items-center min-w-[220px]">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search templates..."
            class="w-full bg-[#202024] border border-zinc-700/70 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-all"
          />
          <Search class="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingTypes" class="py-24 text-center text-zinc-500 text-sm flex flex-col items-center gap-3">
        <RotateCw class="w-6 h-6 animate-spin text-blue-500" />
        <span>Loading server software templates...</span>
      </div>

      <!-- Templates Matrix Grid (Wider with multiple columns) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        <!-- 1. Custom / Empty Template Card -->
        <div
          v-if="matchesSearch('custom empty blank manual')"
          class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-6 flex flex-col justify-between hover:border-emerald-500/60 hover:shadow-emerald-950/20 transition-all group cursor-pointer relative"
          @click="selectTemplate(emptyTemplate)"
        >
          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <FolderCode class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                    Custom / Empty
                  </h3>
                  <span class="text-[11px] text-zinc-500">Manual upload</span>
                </div>
              </div>
            </div>

            <p class="text-xs text-zinc-400 leading-relaxed mt-2">
              Start with a blank server directory. Upload your own custom jar, Forge/Fabric modpack, or legacy server core.
            </p>
          </div>

          <div class="pt-5 mt-5 border-t border-zinc-800/80 flex items-center justify-between">
            <span class="text-xs text-zinc-500">Self-provided core</span>
            <button
              type="button"
              class="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <span>Select</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- 2. Dynamically Loaded Core Framework Templates -->
        <div
          v-for="item in filteredJarTypes"
          :key="item.type"
          class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-6 flex flex-col justify-between hover:border-blue-500/60 hover:shadow-blue-950/20 transition-all group cursor-pointer"
          @click="selectTemplate(item)"
        >
          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3">
                <div 
                  class="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                  :class="getTemplateIconClass(item.type)"
                >
                  <img v-if="item.icon" :src="item.icon" class="w-6 h-6 object-contain rounded" alt="" />
                  <Box v-else class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                    {{ item.name }}
                  </h3>
                  <span class="text-[11px] text-zinc-500 capitalize">{{ item.category || 'server' }}</span>
                </div>
              </div>

              <!-- Only show badge if template is deprecated -->
              <span 
                v-if="isDeprecatedTemplate(item)"
                class="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-950/50 border-amber-800/70 text-amber-400"
              >
                Deprecated
              </span>
            </div>

            <p class="text-xs text-zinc-400 leading-relaxed mt-2">
              {{ getTemplateDescription(item) }}
            </p>
          </div>

          <div class="pt-5 mt-5 border-t border-zinc-800/80 flex items-center justify-between">
            <span class="text-xs text-zinc-500">Core library supported</span>
            <button
              type="button"
              class="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <span>Select</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Instance Modal Dialog (with Template Pre-configured) -->
    <div 
      v-if="isModalOpen && activeTemplate" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 pb-4 border-b border-zinc-800 flex-shrink-0 bg-[#202024]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-blue-950/50 border border-blue-800/50 flex items-center justify-center text-blue-400">
              <Plus class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-zinc-100">
                Create {{ activeTemplate.name }} Server
              </h3>
              <span class="text-xs text-zinc-500 font-mono">Template: {{ activeTemplate.type }}</span>
            </div>
          </div>
          <button 
            type="button" 
            @click="isModalOpen = false" 
            class="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Create Form (Scrollable body) -->
        <form @submit.prevent="handleCreateSubmit" class="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <!-- Error Banner -->
          <div v-if="createError" class="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span>{{ createError }}</span>
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

          <!-- Version Dropdown (for official templates) -->
          <div v-if="activeTemplate.type !== 'empty'" class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="font-medium text-zinc-300">Minecraft Version</label>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none hover:text-zinc-200">
                  <input type="checkbox" v-model="showSnapshots" class="rounded bg-zinc-800 border-zinc-700 accent-blue-600 w-3.5 h-3.5" />
                  <span>Show snapshots</span>
                </label>
                <span v-if="isLoadingVersions" class="text-[11px] text-blue-400 flex items-center gap-1">
                  <RotateCw class="w-3 h-3 animate-spin" />
                  <span>Fetching versions...</span>
                </span>
              </div>
            </div>

            <div class="relative">
              <select
                v-model="selectedVersion"
                :disabled="isLoadingVersions || displayedVersions.length === 0"
                class="w-full h-10 px-3.5 pr-9 rounded-lg bg-[#202024] border border-zinc-700/70 hover:border-zinc-600 text-zinc-100 text-sm font-sans outline-none focus:border-blue-500 appearance-none cursor-pointer disabled:opacity-50 transition-colors"
              >
                <option v-for="ver in displayedVersions" :key="ver.version" :value="ver.version" class="bg-[#202024] text-zinc-100 py-1.5">
                  {{ ver.version }} {{ ver.build ? `(Build #${ver.build})` : '' }} {{ ver.isZip ? '[Bundle]' : '' }} {{ ver.experimental ? '[Experimental]' : '' }}
                </option>
              </select>
              <ChevronDown class="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span class="text-[11px] text-zinc-500">
              The core will be downloaded automatically from the official repository upon creation.
            </span>
          </div>

          <!-- Java Runtime Selection (Docker Image) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="font-medium text-zinc-300">Java Runtime</label>
              <span v-if="autoMatchedJavaVersion" class="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                Auto-assigned Java {{ autoMatchedJavaVersion }}
              </span>
            </div>

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
            <div class="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Docker Image: <span class="text-zinc-400 font-mono">{{ createForm.dockerImage }}</span></span>
            </div>
          </div>

          <!-- Game Port & Max Memory -->
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

          <!-- Server Jar File Name -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Server Jar Name</label>
            <input
              v-model="createForm.serverJar"
              type="text"
              required
              class="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500"
            />
          </div>

          <!-- Graceful Stop Timeout -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="font-medium text-zinc-300">Graceful Stop Timeout (Seconds)</label>
              <span class="text-[11px] font-mono text-zinc-400">{{ createForm.stopTimeoutSeconds }}s</span>
            </div>
            <input
              v-model.number="createForm.stopTimeoutSeconds"
              type="number"
              min="5"
              max="300"
              required
              class="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500"
            />
            <span class="text-[11px] text-zinc-500">
              Grace period (5-300s, default 60s) for world saving before Docker force-kills the container.
            </span>
          </div>

          <!-- High Availability & Watchdog Settings (Collapsible Accordion) -->
          <div class="pt-2 border-t border-zinc-800">
            <button
              type="button"
              @click="showWatchdogSettings = !showWatchdogSettings"
              class="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-left transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2.5">
                <ShieldCheck class="w-4 h-4 text-indigo-400" />
                <div>
                  <span class="text-xs font-bold text-zinc-200 block">High Availability & Watchdog</span>
                  <span class="text-[11px] text-zinc-500">
                    {{ (createForm.autoStartOnBoot || createForm.autoRestartOnCrash) 
                      ? `${createForm.autoStartOnBoot ? 'Boot Auto-Start' : ''}${createForm.autoStartOnBoot && createForm.autoRestartOnCrash ? ' • ' : ''}${createForm.autoRestartOnCrash ? 'Crash Recovery' : ''}` 
                      : 'Optional: Auto-start on boot & crash self-healing' }}
                  </span>
                </div>
              </div>
              <ChevronDown 
                class="w-4 h-4 text-zinc-400 transition-transform duration-200"
                :class="{ 'rotate-180': showWatchdogSettings }"
              />
            </button>

            <!-- Expanded Watchdog Form -->
            <div v-if="showWatchdogSettings" class="mt-3 p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-4 animate-fade-in">
              <!-- Auto-start on boot -->
              <label class="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#202024] border border-zinc-800 hover:border-zinc-700 cursor-pointer select-none">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <Power class="w-3.5 h-3.5 text-indigo-400" />
                    <span class="text-xs font-semibold text-zinc-200">Auto-start on Boot</span>
                  </div>
                  <p class="text-[11px] text-zinc-400 leading-tight">
                    Automatically boots up this instance when the panel service starts.
                  </p>
                </div>
                <input
                  type="checkbox"
                  v-model="createForm.autoStartOnBoot"
                  class="mt-1 w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                />
              </label>

              <!-- Crash Auto-restart -->
              <div class="space-y-3">
                <label class="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[#202024] border border-zinc-800 hover:border-zinc-700 cursor-pointer select-none">
                  <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                      <Activity class="w-3.5 h-3.5 text-emerald-400" />
                      <span class="text-xs font-semibold text-zinc-200">Crash Auto-Restart</span>
                    </div>
                    <p class="text-[11px] text-zinc-400 leading-tight">
                      Exponential backoff self-healing on unexpected exits.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    v-model="createForm.autoRestartOnCrash"
                    class="mt-1 w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                  />
                </label>

                <!-- Granular Tuning when autoRestartOnCrash is enabled -->
                <div v-if="createForm.autoRestartOnCrash" class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <!-- Initial delay -->
                  <div class="p-2.5 rounded-lg bg-[#18181b] border border-zinc-800 space-y-1.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-zinc-300 font-medium">Initial Delay</span>
                      <span class="font-mono text-emerald-400 font-bold">{{ createForm.crashBackoffInitialSeconds }}s</span>
                    </div>
                    <input
                      v-model.number="createForm.crashBackoffInitialSeconds"
                      type="number"
                      min="1"
                      max="60"
                      class="w-full h-8 px-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <!-- Max delay -->
                  <div class="p-2.5 rounded-lg bg-[#18181b] border border-zinc-800 space-y-1.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-zinc-300 font-medium">Max Delay</span>
                      <span class="font-mono text-emerald-400 font-bold">{{ createForm.crashBackoffMaxSeconds }}s</span>
                    </div>
                    <input
                      v-model.number="createForm.crashBackoffMaxSeconds"
                      type="number"
                      min="5"
                      max="3600"
                      class="w-full h-8 px-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <!-- Max retries -->
                  <div class="p-2.5 rounded-lg bg-[#18181b] border border-zinc-800 space-y-1.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-zinc-300 font-medium">Max Retries</span>
                      <span class="font-mono text-emerald-400 font-bold">{{ createForm.crashMaxRetries }}</span>
                    </div>
                    <input
                      v-model.number="createForm.crashMaxRetries"
                      type="number"
                      min="0"
                      max="50"
                      class="w-full h-8 px-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
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

          <!-- Action Buttons -->
          <div class="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !agreeEula"
              class="px-5 py-2 rounded-lg bg-[#3b82f6] hover:bg-blue-600 active:scale-95 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              <RotateCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <span>{{ isSubmitting ? 'Creating & Launching...' : 'Create Server' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import { 
  getJarTypes, 
  getJarVersions, 
  installJar, 
  createServer,
  JAVA_IMAGE_OPTIONS,
  matchDefaultJavaImage,
  type JarType,
  type JarVersion 
} from '../api/servers'
import { 
  ArrowLeft, 
  Search, 
  Box, 
  FolderCode, 
  ChevronRight, 
  Plus, 
  X, 
  RotateCw, 
  AlertCircle,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Power,
  Activity
} from 'lucide-vue-next'

const router = useRouter()

// Empty Template Definition
const emptyTemplate: JarType = {
  type: 'empty',
  name: 'Custom / Empty Template',
  category: 'custom',
  compatibility: ['custom']
}

// State
const jarTypes = ref<JarType[]>([])
const isLoadingTypes = ref(false)
const searchQuery = ref('')

// Modal & Selection State
const isModalOpen = ref(false)
const activeTemplate = ref<JarType | null>(null)
const versionsList = ref<JarVersion[]>([])
const isLoadingVersions = ref(false)
const selectedVersion = ref('')
const showSnapshots = ref(false)
const agreeEula = ref(false)
const isSubmitting = ref(false)
const createError = ref('')
const showWatchdogSettings = ref(false)

const isSnapshotVersion = (v: string) => {
  return /^\d{2}w\d+[a-z]/i.test(v) || /-pre|-rc|-snapshot/i.test(v)
}

const displayedVersions = computed(() => {
  if (showSnapshots.value) {
    return versionsList.value
  }
  const releases = versionsList.value.filter(v => !v.experimental && !isSnapshotVersion(v.version))
  return releases.length > 0 ? releases : versionsList.value
})

watch(displayedVersions, (newDisplayed) => {
  if (newDisplayed.length > 0 && !newDisplayed.some(v => v.version === selectedVersion.value)) {
    selectedVersion.value = newDisplayed[0].version
  }
})

const createForm = reactive({
  name: '',
  identifier: '',
  serverPort: 25565,
  minMemoryMb: 1024,
  maxMemoryMb: 2048,
  serverJar: 'server.jar',
  dockerImage: 'eclipse-temurin:21-jre-alpine',
  stopTimeoutSeconds: 60,
  autoStartOnBoot: false,
  autoRestartOnCrash: false,
  crashBackoffInitialSeconds: 5,
  crashBackoffMaxSeconds: 300,
  crashMaxRetries: 5
})

const autoMatchedJavaVersion = computed(() => {
  const current = JAVA_IMAGE_OPTIONS.find(o => o.image === createForm.dockerImage)
  return current ? current.javaVersion : null
})

// Automatically allocate the best matching Java runtime whenever the Minecraft version changes
watch(selectedVersion, (newVer) => {
  if (!newVer) return
  const verObj = versionsList.value.find(v => v.version === newVer)
  createForm.dockerImage = matchDefaultJavaImage(verObj?.java, newVer)
})

onMounted(async () => {
  await loadTemplates()
})

async function loadTemplates() {
  isLoadingTypes.value = true
  try {
    jarTypes.value = await getJarTypes()
  } catch (err) {
    console.error('Failed to load jar types:', err)
  } finally {
    isLoadingTypes.value = false
  }
}

const filteredJarTypes = computed(() => {
  if (!searchQuery.value.trim()) return jarTypes.value
  const q = searchQuery.value.toLowerCase()
  return jarTypes.value.filter(item => 
    item.name.toLowerCase().includes(q) ||
    item.type.toLowerCase().includes(q) ||
    (item.category && item.category.toLowerCase().includes(q))
  )
})

function matchesSearch(keywords: string): boolean {
  if (!searchQuery.value.trim()) return true
  const q = searchQuery.value.toLowerCase()
  return keywords.toLowerCase().includes(q)
}

function getTemplateDescription(item: JarType): string {
  if (item.description) return item.description
  const t = item.type.toLowerCase()
  if (t === 'paper') {
    return 'High performance Minecraft server software with plugin support and active exploit protection.'
  }
  if (t === 'purpur') {
    return 'Drop-in replacement for Paper designed for configurability, fun gameplay mechanics, and performance.'
  }
  if (t === 'vanilla') {
    return 'Official vanilla Minecraft server directly from Mojang with no modifications or plugins.'
  }
  if (t.includes('fabric')) {
    return 'Lightweight, modular modding ecosystem for modern Minecraft versions.'
  }
  if (t.includes('forge')) {
    return 'Classic modding platform supporting thousands of complex mods, dimensions, and items.'
  }
  return `Official ${item.name} server software framework for Minecraft.`
}

function getTemplateIconClass(type: string): string {
  const t = type.toLowerCase()
  if (t === 'paper') return 'bg-amber-950/40 border border-amber-800/60 text-amber-400'
  if (t === 'purpur') return 'bg-purple-950/40 border border-purple-800/60 text-purple-400'
  if (t === 'vanilla') return 'bg-sky-950/40 border border-sky-800/60 text-sky-400'
  return 'bg-blue-950/40 border border-blue-800/60 text-blue-400'
}

function isDeprecatedTemplate(item: JarType): boolean {
  if (item.deprecated) return true
  const t = item.type.toLowerCase()
  return ['craftbukkit', 'spigot', 'bukkit', 'spongevanilla', 'magma'].includes(t)
}

async function selectTemplate(template: JarType) {
  activeTemplate.value = template
  createError.value = ''
  
  // Pre-fill form
  const randomSuffix = Math.floor(Math.random() * 900) + 100
  if (template.type === 'empty') {
    createForm.name = 'Custom Minecraft Server'
    createForm.identifier = `custom-${randomSuffix}`
    createForm.serverJar = 'server.jar'
    createForm.dockerImage = 'eclipse-temurin:21-jre-alpine'
    versionsList.value = []
    selectedVersion.value = ''
  } else {
    createForm.name = `${template.name} Server`
    createForm.identifier = `${template.type}-${randomSuffix}`
    createForm.serverJar = `${template.type}.jar`
    
    // Fetch available versions
    await fetchVersions(template.type)
  }

  agreeEula.value = false
  isModalOpen.value = true
}

async function fetchVersions(type: string) {
  isLoadingVersions.value = true
  versionsList.value = []
  selectedVersion.value = ''
  try {
    const list = await getJarVersions(type)
    versionsList.value = list
    // Select first non-experimental version, or simply the first
    const firstStable = list.find(v => !v.experimental) || list[0]
    if (firstStable) {
      selectedVersion.value = firstStable.version
      // Explicitly trigger auto allocation for initial version
      createForm.dockerImage = matchDefaultJavaImage(firstStable.java, firstStable.version)
    }
  } catch (err) {
    console.error('Failed to fetch versions for', type, err)
  } finally {
    isLoadingVersions.value = false
  }
}

async function handleCreateSubmit() {
  if (!agreeEula.value) {
    createError.value = 'You must accept the Minecraft EULA before creating a server.'
    return
  }
  createError.value = ''
  isSubmitting.value = true

  try {
    // 1. Create Server Instance with matched or selected Docker Java image
    const created = await createServer({
      name: createForm.name,
      identifier: createForm.identifier,
      serverPort: createForm.serverPort,
      minMemoryMb: createForm.minMemoryMb,
      maxMemoryMb: createForm.maxMemoryMb,
      serverJar: createForm.serverJar,
      dockerImage: createForm.dockerImage,
      stopTimeoutSeconds: createForm.stopTimeoutSeconds,
      autoStartOnBoot: createForm.autoStartOnBoot,
      autoRestartOnCrash: createForm.autoRestartOnCrash,
      crashBackoffInitialSeconds: createForm.crashBackoffInitialSeconds,
      crashBackoffMaxSeconds: createForm.crashBackoffMaxSeconds,
      crashMaxRetries: createForm.crashMaxRetries
    })

    // 2. If a core template was chosen and a version was selected, trigger core download
    if (activeTemplate.value && activeTemplate.value.type !== 'empty' && selectedVersion.value) {
      try {
        await installJar(created.id, {
          type: activeTemplate.value.type,
          version: selectedVersion.value,
          targetFileName: createForm.serverJar,
          updateServerJar: true
        })
      } catch (jarErr: any) {
        console.warn('Server created but jar download could not be initiated:', jarErr)
      }
    }

    // 3. Immediately redirect to terminal console of new server!
    isModalOpen.value = false
    router.push(`/instances/${created.id}/terminal`)
  } catch (err: any) {
    createError.value = err.message || 'Failed to create server instance'
  } finally {
    isSubmitting.value = false
  }
}
</script>
