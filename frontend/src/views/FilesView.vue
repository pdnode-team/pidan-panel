<template>
  <AppLayout
    :breadcrumbs="[
      { label: 'Instances', to: '/instances' },
      { label: instance.name || `Server #${serverId}`, to: `/instances/${serverId}/terminal` },
      { label: 'Files' }
    ]"
    :wide="true"
  >
    <div class="w-full max-w-7xl mx-auto space-y-4">
      <!-- 1. Top Instance Header & Navigation Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-amber-400">
            <Folder class="w-6 h-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-zinc-100">{{ instance.name || `Server #${serverId}` }}</h1>
              <span 
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                :class="statusBadgeClasses"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClasses"></span>
                {{ instance.runtime?.status || 'stopped' }}
              </span>
            </div>
            <p class="text-xs text-zinc-400">File Manager & Instance Directory</p>
          </div>
        </div>

        <!-- Instance Quick Switcher (Terminal / MC Settings / Files / Configs / Backups) -->
        <div class="flex items-center gap-2 flex-wrap">
          <router-link
            :to="`/instances/${serverId}/terminal`"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Terminal class="w-4 h-4 text-emerald-400" />
            <span>Terminal</span>
          </router-link>
          <router-link
            :to="`/instances/${serverId}/settings`"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Settings2 class="w-4 h-4 text-blue-400" />
            <span>MC Settings</span>
          </router-link>
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/60">
            <Folder class="w-4 h-4 text-amber-400" />
            <span>Files</span>
          </div>
          <router-link
            :to="`/instances/${serverId}/configs`"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Sliders class="w-4 h-4 text-emerald-400" />
            <span>Configs</span>
          </router-link>
          <router-link
            :to="`/instances/${serverId}/backups`"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Archive class="w-4 h-4 text-sky-400" />
            <span>Backups</span>
          </router-link>
        </div>
      </div>

      <!-- Restart Server Required Alert Banner -->
      <InstanceRestartAlert
        :server-id="serverId"
        :server-status="instance.runtime?.status"
      />

      <!-- Error Alert -->
      <div v-if="errorMessage" class="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 flex-shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>
        <button type="button" @click="errorMessage = ''" class="text-red-400 hover:text-red-200">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Success Alert -->
      <div v-if="successMessage" class="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Check class="w-4 h-4 flex-shrink-0" />
          <span>{{ successMessage }}</span>
        </div>
        <button type="button" @click="successMessage = ''" class="text-emerald-400 hover:text-emerald-200">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 2. Path Breadcrumbs & Actions Bar -->
      <div class="bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Directory Navigation Breadcrumbs -->
        <div class="flex items-center gap-1 text-sm overflow-x-auto py-1 scrollbar-thin">
          <button
            type="button"
            @click="navigateTo('')"
            class="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium transition-colors"
            :class="{ 'text-amber-400 font-semibold': currentPath === '' }"
          >
            <HardDrive class="w-4 h-4 text-zinc-400" />
            <span>Root</span>
          </button>

          <template v-for="(seg, idx) in pathSegments" :key="idx">
            <ChevronRight class="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <button
              type="button"
              @click="navigateToSegment(idx)"
              class="px-2 py-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium transition-colors truncate max-w-[150px]"
              :class="{ 'text-amber-400 font-semibold': idx === pathSegments.length - 1 }"
            >
              {{ seg }}
            </button>
          </template>
        </div>

        <!-- Toolbar Buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Search in directory -->
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search files..."
              class="w-36 sm:w-48 pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <!-- New File -->
          <button
            type="button"
            @click="openNewFileModal"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Plus class="w-3.5 h-3.5 text-emerald-400" />
            <span>New File</span>
          </button>

          <!-- Upload File -->
          <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer">
            <Upload class="w-3.5 h-3.5 text-blue-400" />
            <span>{{ isUploading ? 'Uploading...' : 'Upload' }}</span>
            <input
              type="file"
              class="hidden"
              @change="handleFileUpload"
              :disabled="isUploading"
            />
          </label>

          <!-- Refresh -->
          <button
            type="button"
            @click="loadFiles"
            :disabled="isLoading"
            title="Refresh directory"
            class="p-2 rounded-lg text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 hover:text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
          </button>
        </div>
      </div>

      <!-- 3. Files Table View -->
      <div class="bg-[#202024] rounded-xl border border-zinc-800 shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-800 bg-[#18181b]/60 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th class="py-3 px-4">Name</th>
                <th class="py-3 px-4 w-28 text-right">Size</th>
                <th class="py-3 px-4 w-44 text-right">Last Modified</th>
                <th class="py-3 px-4 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/60 text-xs">
              <!-- Loading Skeleton / Spinner -->
              <tr v-if="isLoading && files.length === 0">
                <td colspan="4" class="py-12 text-center text-zinc-500">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <RefreshCw class="w-6 h-6 animate-spin text-amber-500" />
                    <span>Loading directory files...</span>
                  </div>
                </td>
              </tr>

              <!-- Back to parent directory row if not root -->
              <tr 
                v-else-if="currentPath !== ''"
                @click="navigateUp"
                class="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
              >
                <td class="py-2.5 px-4 font-medium text-zinc-400 group-hover:text-zinc-200 flex items-center gap-2.5">
                  <ArrowLeft class="w-4 h-4 text-zinc-500 group-hover:text-amber-400" />
                  <span>..</span>
                </td>
                <td class="py-2.5 px-4 text-right text-zinc-600">-</td>
                <td class="py-2.5 px-4 text-right text-zinc-600">-</td>
                <td class="py-2.5 px-4 text-center text-zinc-600">-</td>
              </tr>

              <!-- Empty folder state -->
              <tr v-if="!isLoading && filteredFiles.length === 0">
                <td colspan="4" class="py-12 text-center text-zinc-500">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <Folder class="w-8 h-8 text-zinc-700" />
                    <span>This directory is empty</span>
                  </div>
                </td>
              </tr>

              <!-- File Items -->
              <tr
                v-for="item in filteredFiles"
                :key="item.path"
                class="hover:bg-zinc-800/40 transition-colors group"
              >
                <!-- File Name & Icon -->
                <td class="py-2.5 px-4">
                  <div 
                    class="flex items-center gap-2.5 cursor-pointer select-none"
                    @click="handleItemClick(item)"
                  >
                    <!-- Icon based on directory or extension -->
                    <component 
                      :is="getFileIcon(item)" 
                      class="w-4 h-4 flex-shrink-0"
                      :class="getFileIconColor(item)"
                    />
                    <span 
                      class="font-medium text-zinc-200 group-hover:text-white transition-colors truncate max-w-md"
                      :title="item.name"
                    >
                      {{ item.name }}
                    </span>
                  </div>
                </td>

                <!-- Size -->
                <td class="py-2.5 px-4 text-right text-zinc-400 font-mono text-[11px]">
                  {{ item.isDirectory ? '-' : formatBytes(item.sizeBytes ?? (item as any).size) }}
                </td>

                <!-- Modified Date -->
                <td class="py-2.5 px-4 text-right text-zinc-400 font-mono text-[11px]">
                  {{ formatDate(item.modifiedAt) }}
                </td>

                <!-- Actions -->
                <td class="py-2.5 px-4 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <!-- Edit Button (if editable file) -->
                    <button
                      v-if="!item.isDirectory && isEditableFile(item.name)"
                      type="button"
                      @click="openEditor(item)"
                      title="Edit file"
                      class="p-1.5 rounded hover:bg-zinc-700/80 text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                    </button>

                    <!-- Rename Button -->
                    <button
                      type="button"
                      @click="openRenameModal(item)"
                      title="Rename or move"
                      class="p-1.5 rounded hover:bg-zinc-700/80 text-zinc-400 hover:text-amber-400 transition-colors"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>

                    <!-- Delete Button -->
                    <button
                      type="button"
                      @click="openDeleteModal(item)"
                      title="Delete file or folder"
                      class="p-1.5 rounded hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 4. Text / Code File Editor Modal -->
    <div
      v-if="isEditorOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div class="w-full max-w-5xl h-[85vh] flex flex-col bg-[#202024] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
        <!-- Editor Header -->
        <div class="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-[#18181b] flex-shrink-0">
          <div class="flex items-center gap-3">
            <FileCode class="w-5 h-5 text-emerald-400" />
            <div>
              <h3 class="text-sm font-semibold text-zinc-100 font-mono">{{ editorFilePath }}</h3>
              <p class="text-[11px] text-zinc-400">
                {{ isCreatingFile ? 'Create New File' : 'Editing File' }}
                <span v-if="hasUnsavedChanges" class="text-amber-400 font-medium ml-2">• Unsaved changes</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Save Button -->
            <button
              type="button"
              @click="handleSaveFile"
              :disabled="isSaving"
              class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-emerald-200 bg-emerald-900/60 border border-emerald-700/80 hover:bg-emerald-800 hover:text-white transition-colors disabled:opacity-50"
            >
              <Save class="w-3.5 h-3.5" :class="{ 'animate-spin': isSaving }" />
              <span>{{ isSaving ? 'Saving...' : 'Save File' }}</span>
            </button>

            <!-- Close Button -->
            <button
              type="button"
              @click="closeEditor"
              class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Editor Body -->
        <div class="flex-1 relative flex flex-col p-4 bg-[#141416] overflow-hidden">
          <textarea
            ref="editorTextArea"
            v-model="editorContent"
            @keydown.tab.prevent="handleTabKey"
            @input="hasUnsavedChanges = true"
            spellcheck="false"
            placeholder="File content..."
            class="flex-1 w-full h-full p-4 bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed rounded-lg border border-zinc-800/80 focus:outline-none focus:border-zinc-700 resize-none overflow-auto scrollbar-thin"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 5. New File Name Dialog -->
    <div
      v-if="isNewFileModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-[#202024] rounded-xl border border-zinc-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Plus class="w-4 h-4 text-emerald-400" />
          <span>Create New File</span>
        </h3>
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1.5">File Name</label>
          <input
            v-model="newFileName"
            type="text"
            placeholder="e.g. server.properties, whitelist.json"
            class="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            @keyup.enter="confirmNewFile"
          />
          <p class="text-[11px] text-zinc-500 mt-1">File will be created in current directory: /{{ currentPath }}</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="isNewFileModalOpen = false"
            class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmNewFile"
            :disabled="!newFileName.trim()"
            class="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-colors"
          >
            Create & Edit
          </button>
        </div>
      </div>
    </div>

    <!-- 6. Rename / Move Dialog -->
    <div
      v-if="isRenameModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-[#202024] rounded-xl border border-zinc-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Pencil class="w-4 h-4 text-amber-400" />
          <span>Rename or Move</span>
        </h3>
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1.5">Path / Name</label>
          <input
            v-model="renameTargetName"
            type="text"
            class="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
            @keyup.enter="handleRename"
          />
          <p class="text-[11px] text-zinc-500 mt-1">Relative to instance root directory</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="isRenameModalOpen = false"
            class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleRename"
            :disabled="isRenaming || !renameTargetName.trim()"
            class="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-colors"
          >
            {{ isRenaming ? 'Renaming...' : 'Confirm Rename' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 7. Delete Confirmation Dialog -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-[#202024] rounded-xl border border-zinc-800 shadow-2xl p-6 space-y-4">
        <h3 class="text-base font-bold text-red-400 flex items-center gap-2">
          <Trash2 class="w-5 h-5" />
          <span>Confirm Deletion</span>
        </h3>
        <p class="text-xs text-zinc-300">
          Are you sure you want to permanently delete
          <span class="font-mono text-white font-semibold">"{{ deleteTargetItem?.name }}"</span>?
        </p>
        <p v-if="deleteTargetItem?.isDirectory" class="text-[11px] text-red-400/90 bg-red-950/40 p-2.5 rounded border border-red-900/60">
          Warning: This is a directory. All files and subdirectories inside it will be permanently deleted!
        </p>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="isDeleteModalOpen = false"
            class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleDelete"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Sticky Bottom Save Bar for File Editor -->
    <UnsavedChangesBar
      :show="Boolean(isEditorOpen && hasUnsavedChanges)"
      :is-saving="isSaving"
      title="Unsaved Changes Detected"
      :message="`You have unsaved changes in ${editorFilePath}.`"
      save-label="Save File"
      saving-label="Saving File..."
      theme="emerald"
      @save="handleSaveFile"
      @discard="discardFileChanges"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import UnsavedChangesBar from '../components/UnsavedChangesBar.vue'
import InstanceRestartAlert from '../components/InstanceRestartAlert.vue'
import { useInstanceNotice } from '../stores/instanceNotice'
import {
  Folder,
  File,
  FileText,
  FileCode,
  FileArchive,
  Upload,
  Trash2,
  Edit3,
  Pencil,
  Plus,
  Search,
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  Save,
  HardDrive,
  Terminal,
  AlertTriangle,
  Sliders,
  Settings2,
  Archive
} from 'lucide-vue-next'
import {
  getServer,
  getPowerState,
  getServerFiles,
  getFileContent,
  saveFileContent,
  uploadServerFile,
  renameServerFile,
  deleteServerFile,
  type ServerInstance,
  type ServerFileItem
} from '../api/servers'

const route = useRoute()
const serverId = route.params.id as string
const { markRestartRequired } = useInstanceNotice()

const instance = ref<ServerInstance>({
  id: Number(serverId) || 1,
  name: `Server #${serverId}`,
  identifier: `server-${serverId}`,
  serverJar: 'server.jar',
  dockerImage: 'eclipse-temurin:21-jre-alpine',
  minMemoryMb: 1024,
  maxMemoryMb: 2048,
  serverPort: 25565,
  runtime: { status: 'stopped' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const currentPath = ref('')
const files = ref<ServerFileItem[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const errorMessage = ref('')
const successMessage = ref('')

// Computed path segments
const pathSegments = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('/').filter(Boolean)
})

// Filtered and sorted files (directories first, then alphabetical)
const filteredFiles = computed(() => {
  let list = files.value
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(f => f.name.toLowerCase().includes(q))
  }
  return [...list].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
})

// Status badge styling
const statusBadgeClasses = computed(() => {
  const st = instance.value.runtime?.status || 'stopped'
  switch (st) {
    case 'running': return 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
    case 'starting':
    case 'restarting': return 'bg-sky-950/60 border-sky-800 text-sky-400'
    case 'stopping': return 'bg-amber-950/60 border-amber-800 text-amber-400'
    default: return 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
  }
})

const statusDotClasses = computed(() => {
  const st = instance.value.runtime?.status || 'stopped'
  switch (st) {
    case 'running': return 'bg-emerald-400 animate-pulse'
    case 'starting':
    case 'restarting': return 'bg-sky-400 animate-spin'
    case 'stopping': return 'bg-amber-400'
    default: return 'bg-zinc-500'
  }
})

// 1. Load directory files
async function loadFiles() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getServerFiles(serverId, currentPath.value)
    files.value = res || []
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to load files'
  } finally {
    isLoading.value = false
  }
}

// 2. Navigation
function navigateTo(path: string) {
  currentPath.value = path.replace(/^\/+|\/+$/g, '')
  loadFiles()
}

function navigateToSegment(index: number) {
  const target = pathSegments.value.slice(0, index + 1).join('/')
  navigateTo(target)
}

function navigateUp() {
  const segs = [...pathSegments.value]
  segs.pop()
  navigateTo(segs.join('/'))
}

function handleItemClick(item: ServerFileItem) {
  if (item.isDirectory) {
    const next = currentPath.value ? `${currentPath.value}/${item.name}` : item.name
    navigateTo(next)
  } else if (isEditableFile(item.name)) {
    openEditor(item)
  }
}

// 3. File upload
const isUploading = ref(false)
async function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  isUploading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await uploadServerFile(serverId, currentPath.value, file)
    successMessage.value = `Successfully uploaded "${file.name}"`
    await loadFiles()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to upload file'
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

// 4. File Editor
const isEditorOpen = ref(false)
const isCreatingFile = ref(false)
const editorFilePath = ref('')
const editorContent = ref('')
const originalContent = ref('')
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const isNewFileModalOpen = ref(false)
const newFileName = ref('')

function isEditableFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const editableExts = [
    'txt', 'yml', 'yaml', 'json', 'properties', 'toml', 'cfg', 'conf', 
    'log', 'sh', 'bat', 'cmd', 'xml', 'md', 'env', 'sql', 'ini', 'csv'
  ]
  return editableExts.includes(ext) || !fileName.includes('.')
}

async function openEditor(item: ServerFileItem) {
  isCreatingFile.value = false
  editorFilePath.value = item.path || (currentPath.value ? `${currentPath.value}/${item.name}` : item.name)
  errorMessage.value = ''
  try {
    const res = await getFileContent(serverId, editorFilePath.value)
    editorContent.value = res.content ?? ''
    originalContent.value = editorContent.value
    hasUnsavedChanges.value = false
    isEditorOpen.value = true
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to read file content'
  }
}

function openNewFileModal() {
  newFileName.value = ''
  isNewFileModalOpen.value = true
}

function confirmNewFile() {
  if (!newFileName.value.trim()) return
  const cleanName = newFileName.value.trim()
  editorFilePath.value = currentPath.value ? `${currentPath.value}/${cleanName}` : cleanName
  editorContent.value = ''
  originalContent.value = ''
  hasUnsavedChanges.value = false
  isCreatingFile.value = true
  isNewFileModalOpen.value = false
  isEditorOpen.value = true
}

function handleTabKey(e: KeyboardEvent) {
  const target = e.target as HTMLTextAreaElement
  const start = target.selectionStart
  const end = target.selectionEnd
  editorContent.value = editorContent.value.substring(0, start) + '  ' + editorContent.value.substring(end)
  setTimeout(() => {
    target.selectionStart = target.selectionEnd = start + 2
  }, 0)
}

async function handleSaveFile() {
  isSaving.value = true
  errorMessage.value = ''
  try {
    await saveFileContent(serverId, editorFilePath.value, editorContent.value)
    originalContent.value = editorContent.value
    hasUnsavedChanges.value = false
    successMessage.value = `Saved "${editorFilePath.value}" successfully`
    if (instance.value.runtime?.status === 'running') {
      markRestartRequired(serverId)
    }
    if (isCreatingFile.value) {
      await loadFiles()
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save file'
  } finally {
    isSaving.value = false
  }
}

function discardFileChanges() {
  editorContent.value = originalContent.value
  hasUnsavedChanges.value = false
  successMessage.value = 'Changes discarded.'
  setTimeout(() => {
    if (successMessage.value === 'Changes discarded.') {
      successMessage.value = ''
    }
  }, 2500)
}

function closeEditor() {
  if (hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Are you sure you want to exit without saving?')) {
      return
    }
  }
  isEditorOpen.value = false
}

// 5. Rename / Move
const isRenameModalOpen = ref(false)
const renameTargetItem = ref<ServerFileItem | null>(null)
const renameTargetName = ref('')
const isRenaming = ref(false)

function openRenameModal(item: ServerFileItem) {
  renameTargetItem.value = item
  renameTargetName.value = item.path || (currentPath.value ? `${currentPath.value}/${item.name}` : item.name)
  isRenameModalOpen.value = true
}

async function handleRename() {
  if (!renameTargetItem.value || !renameTargetName.value.trim()) return
  const oldPath = renameTargetItem.value.path || (currentPath.value ? `${currentPath.value}/${renameTargetItem.value.name}` : renameTargetItem.value.name)
  const newPath = renameTargetName.value.trim()
  if (oldPath === newPath) {
    isRenameModalOpen.value = false
    return
  }

  isRenaming.value = true
  errorMessage.value = ''
  try {
    await renameServerFile(serverId, oldPath, newPath)
    successMessage.value = `Renamed to "${newPath}"`
    isRenameModalOpen.value = false
    await loadFiles()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to rename file'
  } finally {
    isRenaming.value = false
  }
}

// 6. Delete
const isDeleteModalOpen = ref(false)
const deleteTargetItem = ref<ServerFileItem | null>(null)
const isDeleting = ref(false)

function openDeleteModal(item: ServerFileItem) {
  deleteTargetItem.value = item
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!deleteTargetItem.value) return
  const targetPath = deleteTargetItem.value.path || (currentPath.value ? `${currentPath.value}/${deleteTargetItem.value.name}` : deleteTargetItem.value.name)
  isDeleting.value = true
  errorMessage.value = ''
  try {
    await deleteServerFile(serverId, targetPath)
    successMessage.value = `Deleted "${deleteTargetItem.value.name}"`
    isDeleteModalOpen.value = false
    await loadFiles()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to delete file'
  } finally {
    isDeleting.value = false
  }
}

// Formatting helpers
function formatBytes(bytes?: number | string | null): string {
  if (bytes === undefined || bytes === null || bytes === '') return '-'
  const num = Number(bytes)
  if (isNaN(num) || num < 0) return '-'
  if (num === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1)
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function getFileIcon(item: ServerFileItem) {
  if (item.isDirectory) return Folder
  const ext = item.name.split('.').pop()?.toLowerCase() || ''
  if (['jar', 'zip', 'tar', 'gz'].includes(ext)) return FileArchive
  if (['properties', 'yml', 'yaml', 'json', 'toml'].includes(ext)) return FileCode
  if (['txt', 'log', 'md'].includes(ext)) return FileText
  return File
}

function getFileIconColor(item: ServerFileItem): string {
  if (item.isDirectory) return 'text-amber-400'
  const ext = item.name.split('.').pop()?.toLowerCase() || ''
  if (['jar'].includes(ext)) return 'text-purple-400'
  if (['properties', 'yml', 'yaml'].includes(ext)) return 'text-emerald-400'
  if (['json', 'toml'].includes(ext)) return 'text-sky-400'
  if (['zip', 'tar', 'gz'].includes(ext)) return 'text-indigo-400'
  return 'text-zinc-400'
}

let pollTimer: ReturnType<typeof setInterval> | null = null

async function syncPowerState() {
  try {
    const ps = await getPowerState(serverId)
    if (ps && ps.status) {
      if (!instance.value.runtime) {
        instance.value.runtime = { status: ps.status }
      } else {
        instance.value.runtime.status = ps.status
      }
    }
  } catch {
    // Ignore polling errors
  }
}

onMounted(async () => {
  try {
    const s = await getServer(serverId)
    if (s) instance.value = s
  } catch {
    // Fallback info
  }
  await Promise.all([syncPowerState(), loadFiles()])

  // Poll power state every 2 seconds to keep status in sync
  pollTimer = setInterval(() => {
    syncPowerState()
  }, 2000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>
