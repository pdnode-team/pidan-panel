<template>
  <AppLayout
    :breadcrumbs="[
      { label: 'Instances', to: '/instances' },
      { label: instance.name || `Server #${serverId}`, to: `/instances/${serverId}/terminal` },
      { label: 'Backups' }
    ]"
    :wide="true"
  >
    <div class="w-full max-w-7xl mx-auto space-y-4">
      <!-- 1. Top Instance Header & Quick Navigation Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-950/40 border border-sky-800/60 text-sky-400">
            <Archive class="w-6 h-6" />
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
            <p class="text-xs text-zinc-400">Full Instance Snapshots (World, Plugins, Configs & Jar Archive)</p>
          </div>
        </div>

        <!-- Quick Switcher (Terminal / MC Settings / Files / Configs / Backups) -->
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
          <router-link
            :to="`/instances/${serverId}/files`"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Folder class="w-4 h-4 text-amber-400" />
            <span>Files</span>
          </router-link>
          <router-link
            :to="`/instances/${serverId}/configs`"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Sliders class="w-4 h-4 text-purple-400" />
            <span>Configs</span>
          </router-link>
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-sky-300 bg-sky-950/40 border border-sky-800/60">
            <Archive class="w-4 h-4 text-sky-400" />
            <span>Backups</span>
          </div>
          <router-link
            :to="`/instances/${serverId}/logs`"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <ScrollText class="w-4 h-4 text-violet-400" />
            <span>Logs</span>
          </router-link>
        </div>
      </div>

      <!-- Restart Server Required Alert Banner -->
      <InstanceRestartAlert
        :server-id="serverId"
        :server-status="instance.runtime?.status"
      />

      <!-- General Alerts -->
      <div v-if="errorMessage" class="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>
        <button type="button" @click="errorMessage = ''" class="text-red-400 hover:text-red-200">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div v-if="successMessage" class="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Check class="w-4 h-4 flex-shrink-0" />
          <span>{{ successMessage }}</span>
        </div>
        <button type="button" @click="successMessage = ''" class="text-emerald-400 hover:text-emerald-200">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 2. Main Backups Content Card -->
      <div class="rounded-xl bg-[#202024] border border-zinc-800 shadow-lg p-5 space-y-4">
        <!-- Toolbar: Title, Info, Refresh, Create Backup -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h2 class="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>Instance Snapshots</span>
              <span class="text-xs font-normal text-zinc-400">({{ meta.total }} total)</span>
            </h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Snapshots are stored securely outside the server directory and do not inflate future archives.
            </p>
          </div>

          <div class="flex items-center gap-2.5">
            <button
              type="button"
              @click="fetchBackupsList()"
              :disabled="isLoading"
              class="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/70 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              @click="openCreateModal"
              class="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Create Backup</span>
            </button>
          </div>
        </div>

        <!-- Backups Table -->
        <div class="overflow-x-auto rounded-lg border border-zinc-800/80">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-zinc-800 bg-[#1a1a1e] text-zinc-400 font-semibold select-none">
                <th class="py-3 px-4 w-12">ID</th>
                <th class="py-3 px-4">Snapshot Name</th>
                <th class="py-3 px-4">Archive Filename</th>
                <th class="py-3 px-4">Size</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Created At</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
              <!-- Loading -->
              <tr v-if="isLoading && backups.length === 0">
                <td colspan="7" class="py-12 text-center text-zinc-500">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <RotateCw class="w-5 h-5 animate-spin text-sky-400" />
                    <span>Loading snapshots...</span>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-else-if="backups.length === 0">
                <td colspan="7" class="py-14 text-center">
                  <div class="flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <div class="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                      <Archive class="w-6 h-6" />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-zinc-200">No backups found</p>
                      <p class="text-xs text-zinc-500 mt-1">Create your first full instance snapshot to preserve world data and configuration.</p>
                    </div>
                    <button
                      type="button"
                      @click="openCreateModal"
                      class="mt-1 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow transition-colors cursor-pointer"
                    >
                      Create First Backup
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Backups Rows -->
              <tr 
                v-for="b in backups" 
                :key="b.id"
                class="hover:bg-zinc-800/30 transition-colors"
              >
                <!-- ID -->
                <td class="py-3.5 px-4 font-mono text-zinc-500 text-[11px]">
                  #{{ b.id }}
                </td>

                <!-- Name -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-2 font-medium text-zinc-100">
                    <FileArchive class="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span class="truncate max-w-[200px]" :title="b.name">{{ b.name }}</span>
                  </div>
                </td>

                <!-- Archive Filename -->
                <td class="py-3.5 px-4 font-mono text-zinc-400 text-[11px] truncate max-w-[220px]" :title="b.fileName || b.file_name">
                  {{ b.fileName || b.file_name || '—' }}
                </td>

                <!-- Size -->
                <td class="py-3.5 px-4 font-mono text-zinc-300">
                  {{ formatBytes(b.sizeBytes ?? b.size_bytes) }}
                </td>

                <!-- Status Badge -->
                <td class="py-3.5 px-4">
                  <!-- Ready -->
                  <span 
                    v-if="b.status === 'ready'"
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/50 border border-emerald-800/60 text-emerald-400"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Ready</span>
                  </span>

                  <!-- In Progress -->
                  <span 
                    v-else-if="b.status === 'in_progress'"
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/50 border border-amber-800/60 text-amber-400"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>Creating...</span>
                  </span>

                  <!-- Failed -->
                  <span 
                    v-else
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-950/50 border border-red-800/60 text-red-400"
                    :title="b.errorMessage || b.error_message || 'Snapshot creation failed'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span>Failed</span>
                  </span>
                </td>

                <!-- Created At -->
                <td class="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                  {{ formatDate(b.createdAt || b.created_at) }}
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <!-- Download Button -->
                    <button
                      type="button"
                      @click="handleDownload(b)"
                      :disabled="b.status !== 'ready' || isDownloadingId === b.id"
                      class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      title="Download backup zip archive"
                    >
                      <RotateCw class="w-3 h-3 animate-spin" v-if="isDownloadingId === b.id" />
                      <Download class="w-3 h-3 text-sky-400" v-else />
                      <span>Download</span>
                    </button>

                    <!-- Restore Button -->
                    <button
                      type="button"
                      @click="openRestoreModal(b)"
                      :disabled="b.status !== 'ready'"
                      class="px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 hover:text-amber-200 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      title="Restore server from this snapshot"
                    >
                      <RotateCcw class="w-3 h-3 text-amber-400" />
                      <span>Restore</span>
                    </button>

                    <!-- Delete Button -->
                    <button
                      type="button"
                      @click="handleDelete(b)"
                      :disabled="b.status === 'in_progress'"
                      class="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-red-950/60 hover:text-red-300 border border-zinc-700/60 hover:border-red-800/60 text-zinc-400 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      title="Delete snapshot"
                    >
                      <Trash2 class="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bottom Pagination -->
        <div class="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 select-none">
          <div>
            Showing <strong class="text-zinc-200">{{ backups.length }}</strong> of <strong class="text-zinc-200">{{ meta.total }}</strong> snapshots
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1">
              <button 
                type="button"
                @click="changePage(meta.currentPage - 1)"
                :disabled="meta.currentPage <= 1 || isLoading"
                class="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <span class="px-2.5 py-0.5 rounded bg-sky-600/20 border border-sky-500/40 text-sky-400 font-mono text-xs">
                {{ meta.currentPage }} / {{ meta.lastPage || 1 }}
              </span>
              <button 
                type="button"
                @click="changePage(meta.currentPage + 1)"
                :disabled="meta.currentPage >= meta.lastPage || isLoading"
                class="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
            <div class="text-zinc-500 font-mono text-[11px]">
              20 / page
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Create Backup Modal Dialog -->
    <div 
      v-if="isCreateModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-[#1a1a1e] flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
              <Archive class="w-4 h-4" />
            </div>
            <h3 class="text-sm font-bold text-zinc-100">Create Instance Snapshot</h3>
          </div>
          <button type="button" @click="isCreateModalOpen = false" class="text-zinc-400 hover:text-zinc-200">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Form (Scrollable Content) -->
        <form @submit.prevent="submitCreateBackup" class="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <!-- 1. Snapshot Display Name -->
          <div class="space-y-1.5">
            <label class="font-medium text-zinc-300">Snapshot Display Name</label>
            <input
              v-model="createName"
              type="text"
              maxlength="100"
              placeholder="e.g. before-1.21-update (leave empty for timestamp)"
              class="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-sky-500"
            />
            <p class="text-[11px] text-zinc-500">
              Optional display identifier. If omitted, the panel will automatically assign a timestamp.
            </p>
          </div>

          <!-- 2. Backup Exclusion & Volume Optimization Accordion -->
          <div class="rounded-xl border border-zinc-800 bg-[#17171a] overflow-hidden">
            <button
              type="button"
              @click="isExcludesExpanded = !isExcludesExpanded"
              class="w-full px-3.5 py-3 flex items-center justify-between bg-zinc-900/70 hover:bg-zinc-800/50 transition-colors text-left"
            >
              <div class="flex items-center gap-2">
                <Filter class="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span class="font-semibold text-zinc-200">Exclusion Rules & Volume Optimization</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-950/60 border border-sky-800/60 text-sky-300">
                  {{ compiledExcludes.length }} active rules
                </span>
              </div>
              <div class="flex items-center gap-1 text-[11px] text-zinc-400">
                <span>{{ isExcludesExpanded ? 'Hide' : 'Customize' }}</span>
                <ChevronUp class="w-3.5 h-3.5" v-if="isExcludesExpanded" />
                <ChevronDown class="w-3.5 h-3.5" v-else />
              </div>
            </button>

            <!-- Exclusion Settings Body -->
            <div v-show="isExcludesExpanded" class="p-3.5 space-y-3.5 border-t border-zinc-800/80 bg-zinc-950/40">
              <!-- Quick Batch Actions -->
              <div class="flex items-center justify-between pb-2 border-b border-zinc-800/70 text-[11px]">
                <span class="text-zinc-400">Preset filters (select all for minimal size):</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="selectAllCategories"
                    class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    @click="clearAllCategories"
                    class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    @click="resetDefaultCategories"
                    class="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              <!-- Categories List -->
              <div class="space-y-2">
                <div
                  v-for="cat in BACKUP_EXCLUSION_CATEGORIES"
                  :key="cat.id"
                  @click="toggleCategory(cat.id)"
                  :class="[
                    'p-2.5 rounded-lg border transition-all cursor-pointer select-none space-y-1',
                    excludesConfig.enabledCategoryIds.includes(cat.id)
                      ? 'bg-zinc-900 border-sky-600/50'
                      : 'bg-zinc-900/40 border-zinc-800/80 opacity-70 hover:opacity-100 hover:border-zinc-700'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        :checked="excludesConfig.enabledCategoryIds.includes(cat.id)"
                        @click.stop="toggleCategory(cat.id)"
                        class="rounded border-zinc-700 bg-zinc-800 text-sky-600 focus:ring-0 cursor-pointer"
                      />
                      <span class="font-semibold text-zinc-200">{{ cat.name }}</span>
                    </label>

                    <div class="flex items-center gap-1.5">
                      <!-- Simple concise badge for safety/impact -->
                      <span
                        v-if="cat.badgeVariant === 'emerald'"
                        class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-400"
                      >
                        {{ cat.badgeText }}
                      </span>
                      <span
                        v-else-if="cat.badgeVariant === 'sky'"
                        class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-950/60 border border-sky-800/60 text-sky-400"
                      >
                        {{ cat.badgeText }}
                      </span>
                      <span
                        v-else
                        class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 border border-amber-800/60 text-amber-300"
                      >
                        {{ cat.badgeText }}
                      </span>

                      <span class="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                        {{ cat.patterns.length }} patterns
                      </span>
                    </div>
                  </div>

                  <p class="text-[11px] text-zinc-400 pl-6">
                    {{ cat.description }}
                  </p>

                  <!-- Important Dependency Alert Banner -->
                  <div
                    v-if="cat.isImportantAlert && cat.warning && excludesConfig.enabledCategoryIds.includes(cat.id)"
                    class="mt-1.5 ml-6 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-[10px] flex items-start gap-1.5"
                  >
                    <AlertTriangle class="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{{ cat.warning }}</span>
                  </div>

                  <!-- Patterns preview chips -->
                  <div class="flex flex-wrap gap-1 pt-0.5 pl-6">
                    <span
                      v-for="pat in cat.patterns.slice(0, 6)"
                      :key="pat"
                      class="px-1.5 py-0.2 rounded bg-zinc-800/90 font-mono text-[9.5px] text-zinc-400"
                    >
                      {{ pat }}
                    </span>
                    <span
                      v-if="cat.patterns.length > 6"
                      class="px-1 py-0.2 font-mono text-[9.5px] text-zinc-500"
                    >
                      +{{ cat.patterns.length - 6 }} more
                    </span>
                  </div>
                </div>
              </div>

              <!-- Custom Patterns Textarea with larger height -->
              <div class="space-y-1.5 pt-2 border-t border-zinc-800/70">
                <div class="flex items-center justify-between text-[11px]">
                  <label class="font-medium text-zinc-300">Custom Exclusion Rules (Globs / Paths)</label>
                  <span class="text-zinc-500 text-[10px]">One per line or comma-separated</span>
                </div>
                <textarea
                  v-model="customExcludesInput"
                  @input="onCustomExcludesChange"
                  rows="4"
                  placeholder="e.g.&#10;dynmap/web/tiles/&#10;*.bak&#10;backups/&#10;world_nether/data/"
                  class="w-full h-28 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono outline-none focus:border-sky-500 resize-y leading-relaxed"
                ></textarea>
                <p class="text-[10px] text-zinc-500">
                  Rules are automatically remembered in local browser storage.
                </p>
              </div>
            </div>
          </div>

          <div v-if="instance.runtime?.status === 'running'" class="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] flex items-start gap-2">
            <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <span>Server is currently running. World data will be automatically flushed to disk before archiving to guarantee snapshot integrity.</span>
          </div>

          <div class="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
            <button
              type="button"
              @click="isCreateModalOpen = false"
              class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RotateCw class="w-3.5 h-3.5 animate-spin" v-if="isSubmitting" />
              <span>Start Backup</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 4. High-Security Restore Confirmation Modal -->
    <div 
      v-if="isRestoreModalOpen && targetBackup" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-[#202024] text-zinc-100 rounded-xl border border-red-900/60 shadow-2xl overflow-hidden flex flex-col">
        <!-- Warning Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-red-900/50 bg-red-950/40">
          <div class="flex items-center gap-2.5 text-red-400">
            <ShieldAlert class="w-5 h-5" />
            <h3 class="text-sm font-bold text-red-200">Confirm Snapshot Restoration</h3>
          </div>
          <button type="button" @click="isRestoreModalOpen = false" class="text-zinc-400 hover:text-zinc-200">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <!-- Danger Banner -->
          <div class="p-3.5 rounded-lg bg-red-950/30 border border-red-800/60 text-red-300 space-y-1.5">
            <div class="font-bold flex items-center gap-1.5 text-red-200">
              <AlertTriangle class="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>Destructive Overwrite Warning</span>
            </div>
            <p class="text-[11px] leading-relaxed text-red-300/90">
              Restoring will <strong>completely wipe and replace</strong> current server files with snapshot 
              <span class="font-mono text-zinc-100 font-semibold">"{{ targetBackup.name }}"</span>. 
              Any progress, files, or mod changes created after <strong>{{ formatDate(targetBackup.createdAt || targetBackup.created_at) }}</strong> will be lost permanently.
            </p>
          </div>

          <!-- Server Running Precondition Check -->
          <div 
            v-if="instance.runtime?.status === 'running'" 
            class="p-3.5 rounded-lg bg-amber-950/50 border border-amber-800/70 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2">
              <AlertCircle class="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p class="font-semibold text-amber-200">Server is currently running</p>
                <p class="text-[11px] text-amber-300/80">Restoration requires the server to be completely stopped first.</p>
              </div>
            </div>
            <button
              type="button"
              @click="handleStopServerBeforeRestore"
              :disabled="isStoppingServer"
              class="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-xs flex items-center gap-1.5 transition-all flex-shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <RotateCw class="w-3 h-3 animate-spin" v-if="isStoppingServer" />
              <span>{{ isStoppingServer ? 'Stopping...' : 'Stop Server Now' }}</span>
            </button>
          </div>

          <div 
            v-else 
            class="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[11px] flex items-center gap-2"
          >
            <Check class="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Server is stopped and ready for restoration. The server will remain stopped after restoration completes.</span>
          </div>

          <!-- Snapshot Details -->
          <div class="p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
            <div>Snapshot: <strong class="text-zinc-200">{{ targetBackup.name }}</strong></div>
            <div>Archive: <span class="font-mono text-zinc-200">{{ targetBackup.fileName || targetBackup.file_name || '—' }}</span></div>
            <div>Size: <span class="font-mono text-zinc-200">{{ formatBytes(targetBackup.sizeBytes ?? targetBackup.size_bytes) }}</span></div>
            <div>Created: <span class="font-mono text-zinc-200">{{ formatDate(targetBackup.createdAt || targetBackup.created_at) }}</span></div>
          </div>

          <!-- Modal Action Buttons -->
          <div class="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800">
            <button
              type="button"
              @click="isRestoreModalOpen = false"
              class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="submitRestore"
              :disabled="isRestoring || instance.runtime?.status === 'running'"
              class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCw class="w-3.5 h-3.5 animate-spin" v-if="isRestoring" />
              <span>{{ isRestoring ? 'Restoring Archive...' : 'I Understand, Restore Snapshot' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import InstanceRestartAlert from '../components/InstanceRestartAlert.vue'
import {
  getServer,
  getPowerState,
  stopServer,
  type ServerInstance
} from '../api/servers'
import {
  getBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  downloadBackupArchive,
  type BackupItem,
  type BackupsMeta
} from '../api/backups'
import {
  Archive,
  Terminal,
  Folder,
  Sliders,
  Settings2,
  RotateCw,
  Plus,
  Download,
  RotateCcw,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
  ScrollText
} from 'lucide-vue-next'
import {
  BACKUP_EXCLUSION_CATEGORIES,
  loadExcludesConfig,
  saveExcludesConfig,
  compileExclusionList,
  getDefaultExcludesConfig,
  type BackupExcludesConfig
} from '../constants/backupExclusions'

const route = useRoute()
const serverId = route.params.id as string

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

const backups = ref<BackupItem[]>([])
const meta = reactive<BackupsMeta>({
  total: 0,
  perPage: 20,
  currentPage: 1,
  lastPage: 1
})

const isLoading = ref(false)
const isSubmitting = ref(false)
const isRestoring = ref(false)
const isStoppingServer = ref(false)
const isDownloadingId = ref<number | null>(null)

const errorMessage = ref('')
const successMessage = ref('')

// Modals
const isCreateModalOpen = ref(false)
const createName = ref('')

// Backup Exclusion State
const isExcludesExpanded = ref(false)
const excludesConfig = ref<BackupExcludesConfig>(loadExcludesConfig())
const customExcludesInput = ref(excludesConfig.value.customPatterns.join('\n'))

const compiledExcludes = computed(() => compileExclusionList(excludesConfig.value))

function toggleCategory(catId: string) {
  const idx = excludesConfig.value.enabledCategoryIds.indexOf(catId)
  if (idx >= 0) {
    excludesConfig.value.enabledCategoryIds.splice(idx, 1)
  } else {
    excludesConfig.value.enabledCategoryIds.push(catId)
  }
  saveExcludesConfig(excludesConfig.value)
}

function selectAllCategories() {
  excludesConfig.value.enabledCategoryIds = BACKUP_EXCLUSION_CATEGORIES.map(c => c.id)
  saveExcludesConfig(excludesConfig.value)
}

function clearAllCategories() {
  excludesConfig.value.enabledCategoryIds = []
  saveExcludesConfig(excludesConfig.value)
}

function resetDefaultCategories() {
  excludesConfig.value = getDefaultExcludesConfig()
  customExcludesInput.value = ''
  saveExcludesConfig(excludesConfig.value)
}

function onCustomExcludesChange() {
  const lines = customExcludesInput.value
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
  excludesConfig.value.customPatterns = lines
  saveExcludesConfig(excludesConfig.value)
}

const isRestoreModalOpen = ref(false)
const targetBackup = ref<BackupItem | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

const statusBadgeClasses = computed(() => {
  const s = instance.value.runtime?.status
  if (s === 'running') return 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
  if (s === 'starting') return 'bg-amber-950/60 border-amber-800/60 text-amber-400'
  return 'bg-zinc-800 border-zinc-700 text-zinc-400'
})

const statusDotClasses = computed(() => {
  const s = instance.value.runtime?.status
  if (s === 'running') return 'bg-emerald-400 animate-pulse'
  if (s === 'starting') return 'bg-amber-400 animate-pulse'
  return 'bg-zinc-500'
})

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(isoString?: string): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString()
  } catch {
    return isoString
  }
}

onMounted(async () => {
  await Promise.all([fetchServerInfo(), syncPowerState(), fetchBackupsList()])
  // Poll backup list & server status every 2.5s
  pollTimer = setInterval(async () => {
    await syncPowerState()
    const hasActiveTask = backups.value.some(b => b.status === 'in_progress') || isRestoring.value
    if (hasActiveTask) {
      await fetchBackupsList(true)
    }
  }, 2500)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

async function fetchServerInfo() {
  try {
    const s = await getServer(serverId)
    if (s) instance.value = s
  } catch {}
}

async function syncPowerState() {
  try {
    const ps = await getPowerState(serverId)
    if (ps && ps.status) {
      if (!instance.value.runtime) instance.value.runtime = { status: ps.status }
      else instance.value.runtime.status = ps.status
    }
  } catch {}
}

async function fetchBackupsList(silent = false) {
  if (!silent) isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getBackups(serverId, {
      page: meta.currentPage,
      perPage: meta.perPage
    })
    if (res) {
      const list = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : [])
      backups.value = list
      if (res.meta) {
        meta.total = res.meta.total ?? list.length
        meta.perPage = res.meta.perPage ?? 20
        meta.currentPage = res.meta.currentPage ?? 1
        meta.lastPage = res.meta.lastPage ?? 1
      } else {
        meta.total = list.length
      }
    }
  } catch (err: any) {
    if (!silent) {
      errorMessage.value = err.message || 'Failed to load snapshots list'
    }
  } finally {
    if (!silent) isLoading.value = false
  }
}

function changePage(page: number) {
  if (page < 1 || page > meta.lastPage) return
  meta.currentPage = page
  fetchBackupsList()
}

// 1. Create Backup
function openCreateModal() {
  createName.value = ''
  customExcludesInput.value = excludesConfig.value.customPatterns.join('\n')
  isCreateModalOpen.value = true
}

async function submitCreateBackup() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    onCustomExcludesChange()
    const excludes = compileExclusionList(excludesConfig.value)
    const payload = {
      ...(createName.value.trim() ? { name: createName.value.trim() } : {}),
      excludes
    }
    await createBackup(serverId, payload)
    successMessage.value = 'Snapshot task initiated! Packing server files in progress...'
    isCreateModalOpen.value = false
    await fetchBackupsList()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to initiate backup snapshot'
  } finally {
    isSubmitting.value = false
  }
}

// 2. Download Archive
async function handleDownload(b: BackupItem) {
  if (b.status !== 'ready') return
  isDownloadingId.value = b.id
  errorMessage.value = ''
  try {
    await downloadBackupArchive(serverId, b.id, b.fileName || b.file_name)
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to download snapshot archive'
  } finally {
    isDownloadingId.value = null
  }
}

// 3. Restore Backup
function openRestoreModal(b: BackupItem) {
  targetBackup.value = b
  isRestoreModalOpen.value = true
}

async function handleStopServerBeforeRestore() {
  isStoppingServer.value = true
  errorMessage.value = ''
  try {
    await stopServer(serverId)
    await syncPowerState()
    successMessage.value = 'Server stop signal sent. Waiting for container shutdown...'
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to stop server'
  } finally {
    isStoppingServer.value = false
  }
}

async function submitRestore() {
  if (!targetBackup.value) return
  isRestoring.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const res = await restoreBackup(serverId, targetBackup.value.id)
    successMessage.value = res.message || `Server successfully restored from snapshot "${targetBackup.value.name}"!`
    isRestoreModalOpen.value = false
    await syncPowerState()
    await fetchBackupsList()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to restore snapshot'
  } finally {
    isRestoring.value = false
  }
}

// 4. Delete Backup
async function handleDelete(b: BackupItem) {
  if (b.status === 'in_progress') return
  const fileName = b.fileName || b.file_name || 'backup.zip'
  const confirmMsg = `Are you sure you want to delete snapshot "${b.name}" (${fileName})? This cannot be undone.`
  if (!window.confirm(confirmMsg)) return

  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deleteBackup(serverId, b.id)
    successMessage.value = `Snapshot "${b.name}" deleted successfully.`
    await fetchBackupsList()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to delete snapshot'
  }
}
</script>
