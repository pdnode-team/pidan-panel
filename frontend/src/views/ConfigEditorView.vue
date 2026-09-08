<template>
  <AppLayout
    :breadcrumbs="activeFile ? [
      { label: 'Instances', to: '/instances' },
      { label: instance.name || `Server #${serverId}`, to: `/instances/${serverId}/terminal` },
      { label: 'Config Editor', to: `/instances/${serverId}/configs` },
      { label: activeFile.name || activeFile.path }
    ] : [
      { label: 'Instances', to: '/instances' },
      { label: instance.name || `Server #${serverId}`, to: `/instances/${serverId}/terminal` },
      { label: 'Config Editor' }
    ]"
    :wide="true"
  >
    <div class="w-full max-w-7xl mx-auto space-y-4">
      <!-- 1. Top Instance Header & Quick Navigation Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400">
            <Sliders class="w-6 h-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-zinc-100">{{ instance.name || `Server #${serverId}` }}</h1>
              <span 
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-all duration-300"
                :class="statusBadgeClasses"
              >
                <span 
                  class="w-1.5 h-1.5 rounded-full transition-all duration-300" 
                  :class="statusDotClasses"
                ></span>
                {{ instance.runtime?.status || 'stopped' }}
              </span>
            </div>
            <p class="text-xs text-zinc-400">Visual Configuration Center (Properties, YAML, TOML, JSON)</p>
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
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/60">
            <Sliders class="w-4 h-4 text-emerald-400" />
            <span>Configs</span>
          </div>
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

      <!-- General Alerts -->
      <div v-if="errorMessage" class="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 flex-shrink-0" />
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

      <!-- 2. CATALOG VIEW (Preset Cards & Discovered Configs Selection) -->
      <div v-if="!activeFile" class="space-y-6">
        <!-- Top Toolbar & Custom File Opener -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-sm">
          <div>
            <h2 class="text-sm font-bold text-zinc-200">Core Configuration Presets</h2>
            <p class="text-xs text-zinc-500">Pick a standard server file to edit visually, or open any custom config file.</p>
          </div>

          <!-- Custom File Opener -->
          <div class="flex items-center gap-2">
            <input
              v-model="customFilePath"
              type="text"
              placeholder="e.g. plugins/Vault/config.yml"
              class="w-56 sm:w-64 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              @keyup.enter="openCustomFile"
            />
            <button
              type="button"
              @click="openCustomFile"
              :disabled="!customFilePath.trim()"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              Open File
            </button>
          </div>
        </div>

        <!-- Presets Grid with Disk Existence Probing -->
        <div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              v-for="preset in CONFIG_PRESETS"
              :key="preset.path"
              @click="selectPreset(preset)"
              class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-4 flex flex-col justify-between hover:border-emerald-500/60 hover:bg-zinc-800/40 transition-all group cursor-pointer relative"
            >
              <div>
                <div class="flex items-start justify-between gap-2 mb-2.5">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border" :class="preset.iconBgClass">
                    <component :is="preset.icon" class="w-5 h-5" :class="preset.iconColorClass" />
                  </div>
                  <div class="flex items-center gap-1.5">
                    <!-- Format Badge -->
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold" :class="preset.badgeClass">
                      {{ preset.format }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors font-mono">
                    {{ preset.name }}
                  </h3>
                  <!-- Existence Badge -->
                  <span 
                    v-if="existingFilesMap[preset.path]" 
                    class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-medium flex-shrink-0"
                  >
                    {{ formatBytes(existingFilesMap[preset.path].sizeBytes ?? existingFilesMap[preset.path].size) }}
                  </span>
                  <span 
                    v-else 
                    class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-medium flex-shrink-0"
                  >
                    Not Created
                  </span>
                </div>

                <p class="text-xs text-zinc-400 mt-1.5 line-clamp-2">
                  {{ preset.description }}
                </p>
              </div>

              <div class="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                <span class="font-mono text-[11px] truncate max-w-[170px]">/{{ preset.path }}</span>
                <span class="text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Edit <ChevronRight class="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Discovered Plugin & Mod Configs Section -->
        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Package class="w-4 h-4 text-purple-400" />
                <span>Discovered Plugin & Mod Configurations</span>
              </h3>
              <p class="text-xs text-zinc-500">Automatically detected from /plugins and /config directories on disk.</p>
            </div>
            <button
              type="button"
              @click="scanDiscoveredConfigs"
              :disabled="isScanning"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isScanning }" />
              <span>Refresh Scan</span>
            </button>
          </div>

          <div v-if="isScanning" class="p-8 text-center text-zinc-500 text-xs">
            <RotateCw class="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
            <span>Scanning plugin and mod directories...</span>
          </div>

          <div v-else-if="discoveredConfigs.length === 0" class="p-6 rounded-xl bg-[#202024] border border-zinc-800 text-center text-zinc-500 text-xs">
            No plugin or mod configuration files detected yet. Upload plugins/mods or use the custom file opener above.
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              v-for="cfg in discoveredConfigs"
              :key="cfg.path"
              @click="loadConfigFile(cfg.name, cfg.path)"
              class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-4 flex flex-col justify-between hover:border-purple-500/60 hover:bg-zinc-800/40 transition-all group cursor-pointer"
            >
              <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-950/50 border border-purple-800/50 text-purple-400">
                    <FileCode class="w-4 h-4" />
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-purple-950/50 border-purple-800 text-purple-400 font-semibold">
                    {{ (cfg.extension || cfg.name.split('.').pop() || 'CONFIG').toUpperCase() }}
                  </span>
                </div>

                <h4 class="text-sm font-bold text-zinc-100 group-hover:text-purple-400 transition-colors font-mono truncate" :title="cfg.name">
                  {{ cfg.name }}
                </h4>
                <p class="text-xs font-mono text-zinc-500 mt-1 truncate" :title="cfg.path">
                  /{{ cfg.path }}
                </p>
              </div>

              <div class="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                <span class="text-[11px] font-mono">{{ formatBytes(cfg.sizeBytes ?? cfg.size) }}</span>
                <span class="text-purple-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Edit <ChevronRight class="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. ACTIVE CONFIG EDITOR VIEW -->
      <div v-else class="space-y-4">
        <!-- Editor Sub-Header Toolbar -->
        <div class="bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          <!-- Back button & File info -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="closeEditor"
              title="Back to all configurations"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer flex-shrink-0"
            >
              <ArrowLeft class="w-4 h-4" />
              <span>All Configs</span>
            </button>
            <div class="relative pt-1">
              <!-- Floating Unsaved Changes Badge directly above filename, not occupying layout flow -->
              <div 
                v-if="hasUnsavedChanges" 
                class="absolute -top-3.5 left-0 text-[10px] text-amber-400 font-semibold tracking-wide flex items-center gap-1 pointer-events-none whitespace-nowrap select-none"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Unsaved changes</span>
              </div>

              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-zinc-100 font-mono">{{ activeFile.path }}</h2>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold" :class="formatBadgeClass">
                  {{ detectedFormat.toUpperCase() }}
                </span>
              </div>
              <p class="text-xs text-zinc-500">
                {{ activeFile.name || activeFile.path }}
              </p>
            </div>
          </div>

          <!-- Controls: Search, Mode Switcher, Save -->
          <div class="flex items-center gap-2.5 flex-wrap">
            <!-- In-Editor Search Filter -->
            <div class="relative">
              <Search class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="editorSearchQuery"
                type="text"
                placeholder="Search settings..."
                class="w-36 sm:w-48 pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <!-- Mode Switcher -->
            <div class="inline-flex rounded-lg bg-zinc-900 p-1 border border-zinc-700/60 text-xs">
              <button
                type="button"
                @click="switchMode('visual')"
                class="px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5"
                :class="editorMode === 'visual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
              >
                <Sliders class="w-3.5 h-3.5" />
                <span>Visual Form</span>
              </button>
              <button
                type="button"
                @click="switchMode('raw')"
                class="px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5"
                :class="editorMode === 'raw' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
              >
                <Code class="w-3.5 h-3.5" />
                <span>Raw Code</span>
              </button>
            </div>

            <!-- Add Item / Property Button -->
            <button
              v-if="editorMode === 'visual'"
              type="button"
              @click="openAddItemModal()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>{{ activeFile?.path.includes('ops') ? 'Add Operator' : (activeFile?.path.includes('whitelist') ? 'Add Player' : (detectedFormat === 'properties' ? 'Add Property' : 'Add Setting')) }}</span>
            </button>

            <!-- Save Button (Prompts Diff Confirmation) — only visible when there are unsaved changes -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 scale-90"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-90"
            >
              <button
                v-if="hasUnsavedChanges"
                type="button"
                @click="onSaveClick"
                :disabled="isSaving"
                class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                <Save class="w-3.5 h-3.5" :class="{ 'animate-spin': isSaving }" />
                <span>Save</span>
              </button>
            </Transition>
          </div>
        </div>

        <!-- Search Match Counter Banner -->
        <div v-if="editorSearchQuery.trim()" class="px-4 py-2 bg-zinc-900/90 rounded-lg border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
          <span>Filtering settings containing: <strong class="text-zinc-200">"{{ editorSearchQuery }}"</strong></span>
          <button type="button" @click="editorSearchQuery = ''" class="text-zinc-500 hover:text-zinc-300">
            Clear filter
          </button>
        </div>

        <!-- 3A. VISUAL EDITOR MODE -->
        <div v-if="editorMode === 'visual'" class="space-y-4">
          <!-- Properties Form (server.properties special categorization + parameter help) -->
          <template v-if="detectedFormat === 'properties'">
            <div 
              v-for="(group, groupKey) in filteredPropertiesGroups" 
              :key="groupKey" 
              class="bg-[#202024] rounded-xl border border-zinc-800 shadow-md overflow-hidden"
            >
              <div 
                @click="toggleGroup(groupKey)"
                class="px-5 py-3.5 border-b border-zinc-800/80 bg-[#1a1a1e] flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors select-none"
              >
                <div class="flex items-center gap-2.5">
                  <component :is="group.icon" class="w-4 h-4 text-emerald-400" />
                  <h3 class="text-sm font-bold text-zinc-200">{{ group.title }}</h3>
                  <span class="text-xs text-zinc-500 font-normal">({{ Object.keys(group.fields).length }} settings)</span>
                </div>
                <ChevronDown 
                  class="w-4 h-4 text-zinc-500 transition-transform duration-200" 
                  :class="{ '-rotate-90': collapsedGroups[groupKey] }" 
                />
              </div>

              <div v-show="!collapsedGroups[groupKey]" class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="(val, fieldKey) in group.fields" 
                  :key="fieldKey" 
                  class="bg-zinc-900/80 p-3.5 rounded-lg border border-zinc-800/80 flex flex-col justify-between space-y-2 hover:border-zinc-700/60 transition-colors"
                >
                  <!-- Field Header & Help Tooltip -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-1.5 truncate">
                        <label class="text-xs font-mono font-semibold text-zinc-200 truncate" :title="String(fieldKey)">
                          {{ fieldKey }}
                        </label>
                        <!-- Info Icon with Documentation Tooltip -->
                        <span 
                          v-if="SETTING_HELP[String(fieldKey)]" 
                          :title="`${SETTING_HELP[String(fieldKey)].description}${SETTING_HELP[String(fieldKey)].recommendation ? ' • Rec: ' + SETTING_HELP[String(fieldKey)].recommendation : ''}`"
                          class="cursor-help text-zinc-500 hover:text-emerald-400 transition-colors"
                        >
                          <HelpCircle class="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 flex-shrink-0">
                        <span class="text-[10px] font-mono text-zinc-500 uppercase">
                          {{ getFieldType(val) }}
                        </span>
                        <button
                          type="button"
                          @click="removePropertyKey(String(fieldKey))"
                          title="Remove this setting"
                          class="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 class="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <!-- Helpful English Description & Recommendations -->
                    <p v-if="SETTING_HELP[String(fieldKey)]" class="text-[11px] text-zinc-400 leading-tight">
                      {{ SETTING_HELP[String(fieldKey)].description }}
                      <span v-if="SETTING_HELP[String(fieldKey)].recommendation" class="text-emerald-400/90 font-medium block mt-0.5">
                        Tip: {{ SETTING_HELP[String(fieldKey)].recommendation }}
                      </span>
                    </p>
                  </div>

                  <!-- Input controls by type -->
                  <div class="pt-1">
                    <!-- Boolean Toggle Switch -->
                    <div v-if="isBooleanValue(val)" class="flex items-center justify-between">
                      <span class="text-xs text-zinc-400 font-mono">{{ propertiesData[fieldKey] ? 'true (Enabled)' : 'false (Disabled)' }}</span>
                      <button
                        type="button"
                        @click="togglePropertiesBool(String(fieldKey))"
                        class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        :class="propertiesData[fieldKey] ? 'bg-emerald-600' : 'bg-zinc-700'"
                      >
                        <span
                          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="propertiesData[fieldKey] ? 'translate-x-4' : 'translate-x-0'"
                        ></span>
                      </button>
                    </div>

                    <!-- Select Dropdown for Known Enums -->
                    <select
                      v-else-if="KNOWN_ENUMS[fieldKey]"
                      v-model="propertiesData[fieldKey]"
                      @change="hasUnsavedChanges = true"
                      class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                    >
                      <option v-for="opt in KNOWN_ENUMS[fieldKey]" :key="opt" :value="opt">
                        {{ opt }}
                      </option>
                    </select>

                    <!-- Numeric Input -->
                    <input
                      v-else-if="isNumericValue(val)"
                      v-model.number="propertiesData[fieldKey]"
                      type="number"
                      @input="hasUnsavedChanges = true"
                      class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                    />

                    <!-- String / Generic Input -->
                    <input
                      v-else
                      v-model="propertiesData[fieldKey]"
                      type="text"
                      @input="hasUnsavedChanges = true"
                      class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Hierarchical Tree Form (YAML, TOML, JSON) -->
          <template v-else>
            <div class="bg-[#202024] rounded-xl border border-zinc-800 shadow-lg p-5 space-y-4">
              <div v-if="parsedObjectError" class="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-red-400 text-xs">
                {{ parsedObjectError }}
              </div>

              <!-- Case A: Array of items (e.g. ops.json, whitelist.json, or generic list) -->
              <div v-else-if="Array.isArray(parsedObject)" class="space-y-4">
                <!-- Toolbar for Array list -->
                <div class="flex items-center justify-between p-3 bg-[#18181b] rounded-lg border border-zinc-800">
                  <div class="flex items-center gap-2">
                    <Users v-if="activeFile?.path.includes('whitelist') || activeFile?.path.includes('ops')" class="w-4 h-4 text-emerald-400" />
                    <Layers v-else class="w-4 h-4 text-emerald-400" />
                    <span class="text-xs font-bold text-zinc-200">
                      {{ activeFile?.path.includes('ops') ? 'Server Operators' : (activeFile?.path.includes('whitelist') ? 'Whitelisted Players' : 'List Entries') }}
                    </span>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold">
                      {{ parsedObject.length }} {{ parsedObject.length === 1 ? 'entry' : 'entries' }}
                    </span>
                  </div>

                  <button
                    type="button"
                    @click="openAddItemModal()"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>{{ activeFile?.path.includes('ops') ? 'Add Operator' : (activeFile?.path.includes('whitelist') ? 'Add Player' : 'Add Item') }}</span>
                  </button>
                </div>

                <!-- Empty State for Array -->
                <div v-if="parsedObject.length === 0" class="py-12 px-4 text-center bg-[#18181b] rounded-lg border border-zinc-800 space-y-3">
                  <div class="w-10 h-10 mx-auto rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                    <Users class="w-5 h-5" />
                  </div>
                  <div class="text-xs text-zinc-300 font-medium">No items found in this file</div>
                  <p class="text-[11px] text-zinc-500 max-w-sm mx-auto">
                    {{ activeFile?.path.includes('ops') ? 'No operator permissions configured yet. Click below to add an operator.' : 'No entries listed yet. Click below to add an item.' }}
                  </p>
                  <button
                    type="button"
                    @click="openAddItemModal()"
                    class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>{{ activeFile?.path.includes('ops') ? 'Add First Operator' : 'Add First Item' }}</span>
                  </button>
                </div>

                <!-- Array Items List -->
                <div v-else class="space-y-3">
                  <div 
                    v-for="(item, idx) in parsedObject" 
                    :key="idx"
                    class="bg-[#18181b] rounded-lg border border-zinc-800/90 overflow-hidden hover:border-zinc-700/70 transition-colors"
                  >
                    <!-- Item Header -->
                    <div class="px-4 py-3 bg-[#141416] border-b border-zinc-800 flex items-center justify-between">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <template v-if="isObject(item) && item.name">
                          <img 
                            :src="`https://mc-heads.net/avatar/${encodeURIComponent(item.name)}/20`"
                            class="w-5 h-5 rounded bg-zinc-800 flex-shrink-0"
                            alt=""
                            @error="($event.target as HTMLElement).style.display = 'none'"
                          />
                          <span class="text-xs font-bold text-zinc-200 font-mono truncate">{{ item.name }}</span>
                          <span v-if="item.level !== undefined" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 font-semibold flex-shrink-0">
                            OP Level {{ item.level }}
                          </span>
                        </template>
                        <template v-else>
                          <span class="text-xs font-bold text-zinc-300 font-mono">#{{ idx + 1 }}</span>
                        </template>
                      </div>

                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          @click="removeArrayItem(item, idx)"
                          title="Delete entry"
                          class="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <!-- Item Fields (if Object) -->
                    <div v-if="isObject(item)" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div 
                        v-for="(subVal, subKey) in item" 
                        :key="subKey"
                        class="bg-zinc-900/90 p-3 rounded-lg border border-zinc-800 flex flex-col justify-between space-y-1.5"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span class="text-xs font-mono font-semibold text-zinc-300 truncate">{{ subKey }}</span>
                          <span class="text-[10px] font-mono text-zinc-500 uppercase">{{ getFieldType(subVal) }}</span>
                        </div>

                        <!-- Boolean -->
                        <div v-if="typeof subVal === 'boolean'" class="flex items-center justify-between pt-1">
                          <span class="text-xs text-zinc-400 font-mono">{{ item[subKey] ? 'true' : 'false' }}</span>
                          <button
                            type="button"
                            @click="item[subKey] = !item[subKey]; hasUnsavedChanges = true"
                            class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                            :class="item[subKey] ? 'bg-emerald-600' : 'bg-zinc-700'"
                          >
                            <span
                              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                              :class="item[subKey] ? 'translate-x-4' : 'translate-x-0'"
                            ></span>
                          </button>
                        </div>

                        <!-- Op Level Select if String(subKey) === 'level' -->
                        <select
                          v-else-if="String(subKey) === 'level'"
                          v-model.number="item[subKey]"
                          @change="hasUnsavedChanges = true"
                          class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                        >
                          <option :value="1">Level 1 - Moderator</option>
                          <option :value="2">Level 2 - Gamemaster</option>
                          <option :value="3">Level 3 - Admin</option>
                          <option :value="4">Level 4 - Owner (Full Access)</option>
                        </select>

                        <!-- Number -->
                        <input
                          v-else-if="typeof subVal === 'number'"
                          v-model.number="item[subKey]"
                          type="number"
                          @input="hasUnsavedChanges = true"
                          class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                        />

                        <!-- String -->
                        <div v-else-if="typeof subVal === 'string'" class="flex items-center gap-1.5">
                          <input
                            v-model="item[subKey]"
                            type="text"
                            @input="hasUnsavedChanges = true"
                            class="flex-1 h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                          />
                          <button
                            v-if="String(subKey) === 'uuid'"
                            type="button"
                            @click="item[subKey] = generateOfflineUuid(); hasUnsavedChanges = true"
                            title="Generate New UUID"
                            class="px-2 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] font-mono transition-colors flex-shrink-0 cursor-pointer"
                          >
                            New UUID
                          </button>
                        </div>

                        <!-- Fallback / Object -->
                        <textarea
                          v-else
                          :value="JSON.stringify(subVal)"
                          @change="updateNestedJson(item, String(subKey), ($event.target as HTMLTextAreaElement).value)"
                          rows="2"
                          class="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500 resize-none"
                        ></textarea>
                      </div>
                    </div>

                    <!-- Primitive item in array -->
                    <div v-else class="p-3">
                      <input
                        v-model="parsedObject[idx]"
                        type="text"
                        @input="hasUnsavedChanges = true"
                        class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Case B: Hierarchical Object Visual Tree (YAML, TOML, JSON Object) -->
              <div v-else class="space-y-4">
                <template v-for="(val, key) in filteredParsedObject" :key="key">
                  <!-- If Child is Nested Object: Section Container -->
                  <div v-if="isObject(val)" class="bg-[#18181b] rounded-lg border border-zinc-800/90 overflow-hidden">
                    <div 
                      class="px-4 py-3 bg-[#141416] border-b border-zinc-800 flex items-center justify-between select-none"
                    >
                      <div 
                        @click="toggleSection(String(key))"
                        class="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                      >
                        <Folder class="w-4 h-4 text-emerald-400" />
                        <span class="text-xs font-bold text-zinc-200 font-mono">{{ key }}</span>
                        <span class="text-[11px] text-zinc-500">({{ Object.keys(val).length }} entries)</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          @click="openAddItemModal(String(key))"
                          title="Add setting inside this section"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-emerald-400 font-medium transition-colors cursor-pointer"
                        >
                          <Plus class="w-3 h-3" />
                          <span>Add Field</span>
                        </button>
                        <button
                          type="button"
                          @click="removeObjectKey(parsedObject, String(key))"
                          title="Delete entire section"
                          class="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                        <ChevronDown 
                          @click="toggleSection(String(key))"
                          class="w-4 h-4 text-zinc-500 cursor-pointer transition-transform duration-200" 
                          :class="{ '-rotate-90': collapsedSections[String(key)] }" 
                        />
                      </div>
                    </div>

                    <!-- Nested fields -->
                    <div v-show="!collapsedSections[String(key)]" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div 
                        v-for="(subVal, subKey) in val" 
                        :key="subKey"
                        class="bg-zinc-900/90 p-3 rounded-lg border border-zinc-800 flex flex-col justify-between space-y-1.5"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span class="text-xs font-mono font-semibold text-zinc-300 truncate">{{ subKey }}</span>
                          <div class="flex items-center gap-1.5 flex-shrink-0">
                            <span class="text-[10px] font-mono text-zinc-500 uppercase">{{ getFieldType(subVal) }}</span>
                            <button
                              type="button"
                              @click="removeObjectKey(val, String(subKey))"
                              title="Delete this setting"
                              class="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 class="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <!-- Boolean -->
                        <div v-if="typeof subVal === 'boolean'" class="flex items-center justify-between pt-1">
                          <span class="text-xs text-zinc-400 font-mono">{{ val[subKey] ? 'true' : 'false' }}</span>
                          <button
                            type="button"
                            @click="val[subKey] = !val[subKey]; hasUnsavedChanges = true"
                            class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                            :class="val[subKey] ? 'bg-emerald-600' : 'bg-zinc-700'"
                          >
                            <span
                              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                              :class="val[subKey] ? 'translate-x-4' : 'translate-x-0'"
                            ></span>
                          </button>
                        </div>

                        <!-- Number -->
                        <input
                          v-else-if="typeof subVal === 'number'"
                          v-model.number="val[subKey]"
                          type="number"
                          @input="hasUnsavedChanges = true"
                          class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                        />

                        <!-- String -->
                        <input
                          v-else-if="typeof subVal === 'string'"
                          v-model="val[subKey]"
                          type="text"
                          @input="hasUnsavedChanges = true"
                          class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                        />

                        <!-- Fallback / Object -->
                        <textarea
                          v-else
                          :value="JSON.stringify(subVal)"
                          @change="updateNestedJson(val, String(subKey), ($event.target as HTMLTextAreaElement).value)"
                          rows="2"
                          class="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500 resize-none"
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <!-- Top-level primitive field -->
                  <div v-else class="bg-[#18181b] p-3 rounded-lg border border-zinc-800 flex flex-col justify-between space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-mono font-semibold text-zinc-200 truncate">{{ key }}</span>
                      <div class="flex items-center gap-1.5 flex-shrink-0">
                        <span class="text-[10px] font-mono text-zinc-500 uppercase">{{ getFieldType(val) }}</span>
                        <button
                          type="button"
                          @click="removeObjectKey(parsedObject, String(key))"
                          title="Delete this setting"
                          class="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 class="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <!-- Boolean -->
                    <div v-if="typeof val === 'boolean'" class="flex items-center justify-between pt-1">
                      <span class="text-xs text-zinc-400 font-mono">{{ parsedObject[key] ? 'true' : 'false' }}</span>
                      <button
                        type="button"
                        @click="parsedObject[key] = !parsedObject[key]; hasUnsavedChanges = true"
                        class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        :class="parsedObject[key] ? 'bg-emerald-600' : 'bg-zinc-700'"
                      >
                        <span
                          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="parsedObject[key] ? 'translate-x-4' : 'translate-x-0'"
                        ></span>
                      </button>
                    </div>

                    <!-- Number -->
                    <input
                      v-else-if="typeof val === 'number'"
                      v-model.number="parsedObject[key]"
                      type="number"
                      @input="hasUnsavedChanges = true"
                      class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                    />

                    <!-- String -->
                    <input
                      v-else-if="typeof val === 'string'"
                      v-model="parsedObject[key]"
                      type="text"
                      @input="hasUnsavedChanges = true"
                      class="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                    />

                    <!-- Fallback -->
                    <textarea
                      v-else
                      :value="JSON.stringify(val)"
                      @change="updateNestedJson(parsedObject, String(key), ($event.target as HTMLTextAreaElement).value)"
                      rows="2"
                      class="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500 resize-none"
                    ></textarea>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>

        <!-- 3B. RAW CODE / TEXT EDITOR MODE -->
        <div v-else class="bg-[#202024] rounded-xl border border-zinc-800 shadow-lg p-4 h-[72vh] flex flex-col">
          <textarea
            v-model="rawContent"
            @keydown.tab.prevent="handleTabKey"
            @input="hasUnsavedChanges = true"
            spellcheck="false"
            placeholder="Configuration content..."
            class="flex-1 w-full h-full p-4 bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed rounded-lg border border-zinc-800 focus:outline-none focus:border-emerald-500 resize-none overflow-auto scrollbar-thin"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- 4. Review Changes (Diff) Modal Dialog -->
    <div 
      v-if="isDiffModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div class="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#202024] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100">
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0 bg-[#18181b]">
          <div class="flex items-center gap-2">
            <Eye class="w-5 h-5 text-sky-400" />
            <h3 class="text-base font-bold text-zinc-100">Review Changes</h3>
          </div>
          <button type="button" @click="isDiffModalOpen = false" class="text-zinc-400 hover:text-zinc-200">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono">
          <p class="text-zinc-400 font-sans text-xs">
            The following settings will be saved to <strong class="text-zinc-200">{{ activeFile?.path }}</strong>:
          </p>
          <div class="p-4 bg-zinc-950 rounded-lg border border-zinc-800/90 max-h-96 overflow-y-auto space-y-2">
            <div v-for="(val, k) in modifiedDiff" :key="k" class="flex items-start justify-between gap-4 border-b border-zinc-800/60 pb-2">
              <span class="text-emerald-400 font-semibold">{{ k }}:</span>
              <div class="text-right">
                <span class="text-red-400 line-through mr-2">{{ String(val.old) }}</span>
                <span class="text-emerald-300 font-bold">{{ String(val.new) }}</span>
              </div>
            </div>
            <div v-if="Object.keys(modifiedDiff).length === 0" class="text-zinc-500 italic">
              No modifications detected against initial loaded values.
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-zinc-800 flex-shrink-0 bg-[#18181b]">
          <button
            type="button"
            @click="isDiffModalOpen = false"
            class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="isDiffModalOpen = false; handleSave()"
            class="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm"
          >
            Confirm & Save
          </button>
        </div>
      </div>
    </div>

    <!-- 5. Add Item / Property Modal Dialog -->
    <div 
      v-if="isAddItemModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg flex flex-col bg-[#202024] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#18181b]">
          <div class="flex items-center gap-2">
            <Plus class="w-5 h-5 text-emerald-400" />
            <h3 class="text-base font-bold text-zinc-100">
              {{ activeFile?.path.includes('ops') ? 'Add Server Operator' : (activeFile?.path.includes('whitelist') ? 'Add Whitelisted Player' : (detectedFormat === 'properties' ? 'Add Property' : 'Add Configuration Item')) }}
            </h3>
          </div>
          <button type="button" @click="isAddItemModalOpen = false" class="text-zinc-400 hover:text-zinc-200 cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <!-- SUB-FORM A: whitelist.json -->
          <template v-if="activeFile?.path.includes('whitelist')">
            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Player Username <span class="text-red-400">*</span></label>
              <input 
                v-model="addItemForm.mcPlayerName" 
                type="text" 
                placeholder="e.g. Notch, Alex..." 
                @keydown.enter.prevent="submitAddItem"
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block font-semibold text-zinc-300">Player UUID</label>
                <button 
                  type="button" 
                  @click="addItemForm.mcPlayerUuid = generateOfflineUuid()" 
                  class="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  Generate New UUID
                </button>
              </div>
              <input 
                v-model="addItemForm.mcPlayerUuid" 
                type="text" 
                placeholder="Leave blank to auto-generate or fetch" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </template>

          <!-- SUB-FORM B: ops.json -->
          <template v-else-if="activeFile?.path.includes('ops')">
            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Operator Username <span class="text-red-400">*</span></label>
              <input 
                v-model="addItemForm.mcPlayerName" 
                type="text" 
                placeholder="e.g. Notch, Alex..." 
                @keydown.enter.prevent="submitAddItem"
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block font-semibold text-zinc-300">Operator UUID</label>
                <button 
                  type="button" 
                  @click="addItemForm.mcPlayerUuid = generateOfflineUuid()" 
                  class="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  Generate New UUID
                </button>
              </div>
              <input 
                v-model="addItemForm.mcPlayerUuid" 
                type="text" 
                placeholder="Leave blank to auto-generate or fetch" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Permission Level</label>
              <select 
                v-model.number="addItemForm.mcOpLevel" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              >
                <option :value="1">Level 1 - Moderator (Bypass Spawn Protection)</option>
                <option :value="2">Level 2 - Gamemaster (Command Blocks & Cheats)</option>
                <option :value="3">Level 3 - Admin (Ban, Kick, OP, Deop)</option>
                <option :value="4">Level 4 - Owner (Full Administrator Control)</option>
              </select>
            </div>
            <div class="flex items-center justify-between pt-2">
              <label class="font-medium text-zinc-300 cursor-pointer" for="op-bypass-toggle">Bypasses Player Limit</label>
              <input 
                id="op-bypass-toggle"
                v-model="addItemForm.mcBypassesPlayerLimit" 
                type="checkbox" 
                class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          </template>

          <!-- SUB-FORM C: Properties (server.properties) -->
          <template v-else-if="detectedFormat === 'properties'">
            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Property Key <span class="text-red-400">*</span></label>
              <input 
                v-model="addItemForm.key" 
                type="text" 
                placeholder="e.g. motd, level-seed, allow-flight..." 
                @keydown.enter.prevent="submitAddItem"
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Value Type</label>
              <select 
                v-model="addItemForm.dataType" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              >
                <option value="string">String (Text)</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean (true / false)</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Initial Value</label>
              <div v-if="addItemForm.dataType === 'boolean'" class="flex items-center gap-4 pt-1">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" :value="true" v-model="addItemForm.booleanValue" class="text-emerald-600" />
                  <span>true</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" :value="false" v-model="addItemForm.booleanValue" class="text-emerald-600" />
                  <span>false</span>
                </label>
              </div>
              <input 
                v-else-if="addItemForm.dataType === 'number'" 
                v-model.number="addItemForm.numberValue" 
                type="number" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
              <input 
                v-else 
                v-model="addItemForm.stringValue" 
                type="text" 
                placeholder="Value..." 
                @keydown.enter.prevent="submitAddItem"
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </template>

          <!-- SUB-FORM D: YAML / TOML / JSON Object -->
          <template v-else>
            <!-- Target Section (if parsedObject is object) -->
            <div v-if="!Array.isArray(parsedObject)" class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Target Section</label>
              <select 
                v-model="addItemForm.targetSection" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              >
                <option value="">[Root / Top-level]</option>
                <option v-for="secKey in availableSectionKeys" :key="secKey" :value="secKey">
                  {{ secKey }}
                </option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Key Name <span class="text-red-400">*</span></label>
              <input 
                v-model="addItemForm.key" 
                type="text" 
                placeholder="e.g. enable-metrics, timeout, memory..." 
                @keydown.enter.prevent="submitAddItem"
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Data Type</label>
              <select 
                v-model="addItemForm.dataType" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Nested Object / Section</option>
              </select>
            </div>

            <div v-if="addItemForm.dataType !== 'object'" class="space-y-1.5">
              <label class="block font-semibold text-zinc-300">Initial Value</label>
              <div v-if="addItemForm.dataType === 'boolean'" class="flex items-center gap-4 pt-1">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" :value="true" v-model="addItemForm.booleanValue" class="text-emerald-600" />
                  <span>true</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" :value="false" v-model="addItemForm.booleanValue" class="text-emerald-600" />
                  <span>false</span>
                </label>
              </div>
              <input 
                v-else-if="addItemForm.dataType === 'number'" 
                v-model.number="addItemForm.numberValue" 
                type="number" 
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
              <input 
                v-else 
                v-model="addItemForm.stringValue" 
                type="text" 
                placeholder="Value..." 
                @keydown.enter.prevent="submitAddItem"
                class="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </template>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-[#18181b]">
          <button
            type="button"
            @click="isAddItemModalOpen = false"
            class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="submitAddItem"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Add Item
          </button>
        </div>
      </div>
    </div>

    <!-- Sticky Bottom Save Bar Component -->
    <UnsavedChangesBar
      :show="Boolean(activeFile && hasUnsavedChanges)"
      :is-saving="isSaving"
      title="Unsaved Changes Detected"
      :message="`You have unsaved changes in ${activeFile?.name || activeFile?.path || 'configuration'}.`"
      save-label="Save Changes"
      saving-label="Saving..."
      theme="emerald"
      @save="onSaveClick"
      @discard="discardConfigChanges"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import YAML from 'yaml'
import * as toml from 'smol-toml'
import AppLayout from '../layouts/AppLayout.vue'
import UnsavedChangesBar from '../components/UnsavedChangesBar.vue'
import InstanceRestartAlert from '../components/InstanceRestartAlert.vue'
import { useInstanceNotice } from '../stores/instanceNotice'
import {
  Sliders,
  Settings2,
  Terminal,
  Folder,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Save,
  Code,
  Server,
  Layers,
  Cpu,
  FileCode,
  Globe,
  Shield,
  Users,
  Package,
  RotateCw,
  Search,
  Eye,
  HelpCircle,
  Archive,
  Plus,
  Trash2,
  User
} from 'lucide-vue-next'
import {
  getServer,
  getPowerState,
  restartServer,
  getServerFiles,
  getFileContent,
  saveFileContent,
  type ServerInstance,
  type ServerFileItem
} from '../api/servers'

const route = useRoute()
const router = useRouter()
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

let pollTimer: ReturnType<typeof setInterval> | null = null

const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const hasUnsavedChanges = ref(false)
const { markRestartRequired } = useInstanceNotice()

const isDiffModalOpen = ref(false)
const editorMode = ref<'visual' | 'raw'>('visual')
const customFilePath = ref('')
const editorSearchQuery = ref('')

// Setting Help & Optimization Recommendations Dictionary (English)
interface SettingHelp {
  description: string
  recommendation?: string
}

const SETTING_HELP: Record<string, SettingHelp> = {
  'gamemode': {
    description: 'Default game mode assigned to new players.',
    recommendation: 'survival'
  },
  'difficulty': {
    description: 'Game difficulty that controls hostile mob spawning, damage, and hunger.',
    recommendation: 'normal or hard'
  },
  'view-distance': {
    description: 'Maximum distance in chunks sent from server to client.',
    recommendation: '8-10 chunks (Higher values significantly impact TPS & memory)'
  },
  'simulation-distance': {
    description: 'Distance in chunks around player where blocks and entities are ticked.',
    recommendation: '4-6 chunks (Decoupled from view-distance to save CPU)'
  },
  'online-mode': {
    description: 'Verifies player accounts with Mojang/Microsoft authentication servers.',
    recommendation: 'true (Set to false only for offline networks or BungeeCord proxies)'
  },
  'white-list': {
    description: 'Enforces whitelist. Only usernames/UUIDs in whitelist.json can connect.',
    recommendation: 'true for private servers'
  },
  'enforce-whitelist': {
    description: 'When whitelist is reloaded, kicks online players not on the list.',
    recommendation: 'true'
  },
  'pvp': {
    description: 'Enables or disables player-vs-player combat.',
    recommendation: 'true for survival, false for peaceful build worlds'
  },
  'allow-flight': {
    description: 'Allows players to fly in survival mode if using modded flight abilities.',
    recommendation: 'true if using flight mods, otherwise false'
  },
  'max-players': {
    description: 'The maximum number of concurrent players allowed to join.',
    recommendation: 'Allocate 100-150MB RAM per expected player'
  },
  'server-port': {
    description: 'Network port the server listens on for Minecraft game connections.',
    recommendation: '25565 is the standard default'
  },
  'server-ip': {
    description: 'Host IP address to bind. Keep blank to bind to 0.0.0.0 (all interfaces).',
    recommendation: 'Leave empty unless specific IP binding is required'
  },
  'motd': {
    description: 'Message of the Day displayed in the multiplayer server list.',
    recommendation: 'Supports color codes (§ or formatting)'
  },
  'network-compression-threshold': {
    description: 'Byte size threshold for packet compression. Set to -1 to disable.',
    recommendation: '256 (Default), set to -1 on high-speed localhost proxy networks'
  },
  'max-tick-time': {
    description: 'Maximum time in milliseconds a tick can take before watchdog halts server.',
    recommendation: '60000 (Set to -1 to prevent crash during heavy world-generation)'
  },
  'spawn-protection': {
    description: 'Radius of blocks around world spawn point where non-OPs cannot build.',
    recommendation: '16 (Set to 0 if using protection plugins like WorldGuard)'
  },
  'level-name': {
    description: 'Folder name on disk containing the world directory.',
    recommendation: 'world'
  },
  'level-seed': {
    description: 'Seed used by procedural world generator for terrain generation.',
    recommendation: 'Leave empty for random seed'
  },
  'allow-nether': {
    description: 'Allows Nether portals to teleport players into the Nether dimension.',
    recommendation: 'true'
  },
  'generate-structures': {
    description: 'Enables generation of villages, temples, strongholds, and dungeons.',
    recommendation: 'true'
  },
  'spawn-monsters': {
    description: 'Enables natural spawning of hostile monsters.',
    recommendation: 'true'
  },
  'spawn-animals': {
    description: 'Enables natural spawning of passive animals.',
    recommendation: 'true'
  },
  'enable-rcon': {
    description: 'Enables remote console execution protocol.',
    recommendation: 'false unless using external management panels'
  },
  'enable-query': {
    description: 'Enables GameSpy4 protocol for querying server status and player list.',
    recommendation: 'true for public server list sites'
  },
  'sync-chunk-writes': {
    description: 'Synchronous disk chunk writes to prevent corruption on crash.',
    recommendation: 'false in Paper for asynchronous I/O performance'
  }
}

// Standard Config Presets Catalog
interface ConfigPreset {
  name: string
  path: string
  format: 'PROPERTIES' | 'YAML' | 'TOML' | 'JSON'
  description: string
  icon: any
  iconBgClass: string
  iconColorClass: string
  badgeClass: string
}

const CONFIG_PRESETS: ConfigPreset[] = [
  {
    name: 'server.properties',
    path: 'server.properties',
    format: 'PROPERTIES',
    description: 'Primary Minecraft server settings: ports, gamemode, motd, pvp, difficulty & whitelist.',
    icon: Server,
    iconBgClass: 'bg-emerald-950/50 border-emerald-800/50',
    iconColorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
  },
  {
    name: 'bukkit.yml',
    path: 'bukkit.yml',
    format: 'YAML',
    description: 'Bukkit settings: entity spawn limits, autosave ticks, chunk-gc, query plugins & database.',
    icon: Layers,
    iconBgClass: 'bg-amber-950/50 border-amber-800/50',
    iconColorClass: 'text-amber-400',
    badgeClass: 'bg-amber-950/50 border-amber-800 text-amber-400'
  },
  {
    name: 'spigot.yml',
    path: 'spigot.yml',
    format: 'YAML',
    description: 'Spigot performance optimizations: entity activation ranges, tracking ranges & view distance.',
    icon: Cpu,
    iconBgClass: 'bg-sky-950/50 border-sky-800/50',
    iconColorClass: 'text-sky-400',
    badgeClass: 'bg-sky-950/50 border-sky-800 text-sky-400'
  },
  {
    name: 'paper-global.yml',
    path: 'config/paper-global.yml',
    format: 'YAML',
    description: 'Paper global engine tuning: chunk loading, timings, watchdog & player data save intervals.',
    icon: FileCode,
    iconBgClass: 'bg-purple-950/50 border-purple-800/50',
    iconColorClass: 'text-purple-400',
    badgeClass: 'bg-purple-950/50 border-purple-800 text-purple-400'
  },
  {
    name: 'paper-world-defaults.yml',
    path: 'config/paper-world-defaults.yml',
    format: 'YAML',
    description: 'Paper world gameplay, hopper optimizations, mob spawning rules & anti-xray settings.',
    icon: Globe,
    iconBgClass: 'bg-indigo-950/50 border-indigo-800/50',
    iconColorClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-950/50 border-indigo-800 text-indigo-400'
  },
  {
    name: 'ops.json',
    path: 'ops.json',
    format: 'JSON',
    description: 'Server operators permissions and administrator levels hierarchy.',
    icon: Shield,
    iconBgClass: 'bg-red-950/50 border-red-800/50',
    iconColorClass: 'text-red-400',
    badgeClass: 'bg-red-950/50 border-red-800 text-red-400'
  },
  {
    name: 'whitelist.json',
    path: 'whitelist.json',
    format: 'JSON',
    description: 'Server player whitelist database and allowed usernames/UUIDs.',
    icon: Users,
    iconBgClass: 'bg-blue-950/50 border-blue-800/50',
    iconColorClass: 'text-blue-400',
    badgeClass: 'bg-blue-950/50 border-blue-800 text-blue-400'
  },
  {
    name: 'velocity.toml',
    path: 'velocity.toml',
    format: 'TOML',
    description: 'Velocity proxy configuration: bind address, motd, forwarding secret & player limits.',
    icon: Sliders,
    iconBgClass: 'bg-teal-950/50 border-teal-800/50',
    iconColorClass: 'text-teal-400',
    badgeClass: 'bg-teal-950/50 border-teal-800 text-teal-400'
  }
]

// Known Enum mappings for server.properties
const KNOWN_ENUMS: Record<string, string[]> = {
  gamemode: ['survival', 'creative', 'adventure', 'spectator'],
  difficulty: ['peaceful', 'easy', 'normal', 'hard']
}

// Active Editing State
const activeFile = ref<{ name: string; path: string } | null>(null)
const rawContent = ref('')
const initialSnapshot = ref('')
const propertiesData = reactive<Record<string, any>>({})
const propertiesComments = ref<string[]>([])
const parsedObject = ref<any>({})
const parsedObjectError = ref('')

const collapsedGroups = reactive<Record<string, boolean>>({})
const collapsedSections = reactive<Record<string, boolean>>({})

// Disk Inspection State
const existingFilesMap = reactive<Record<string, ServerFileItem>>({})
const discoveredConfigs = ref<ServerFileItem[]>([])
const isScanning = ref(false)

// Formatting Helpers
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

// Detect format based on filename extension
const detectedFormat = computed<'properties' | 'yaml' | 'toml' | 'json'>(() => {
  if (!activeFile.value) return 'yaml'
  const p = activeFile.value.path.toLowerCase()
  if (p.endsWith('.properties') || p.endsWith('.cfg') || p.endsWith('.ini')) return 'properties'
  if (p.endsWith('.toml')) return 'toml'
  if (p.endsWith('.json')) return 'json'
  return 'yaml'
})

const formatBadgeClass = computed(() => {
  switch (detectedFormat.value) {
    case 'properties': return 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
    case 'yaml': return 'bg-amber-950/60 border-amber-800 text-amber-400'
    case 'toml': return 'bg-teal-950/60 border-teal-800 text-teal-400'
    case 'json': return 'bg-sky-950/60 border-sky-800 text-sky-400'
  }
})

// Status Badge
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

// Server.properties Categorization with Real-time Search Filtering
const filteredPropertiesGroups = computed(() => {
  const gameplayKeys = ['gamemode', 'difficulty', 'hardcore', 'pvp', 'force-gamemode', 'allow-flight', 'spawn-protection', 'max-players']
  const networkKeys = ['server-port', 'server-ip', 'motd', 'max-tick-time', 'network-compression-threshold', 'rate-limit']
  const securityKeys = ['online-mode', 'white-list', 'enforce-whitelist', 'prevent-proxy-connections', 'hide-online-players', 'enable-status']
  const worldKeys = ['level-name', 'level-seed', 'level-type', 'generator-settings', 'view-distance', 'simulation-distance', 'max-world-size', 'generate-structures', 'allow-nether', 'spawn-animals', 'spawn-monsters', 'spawn-npcs']
  const rconKeys = ['enable-query', 'query.port', 'enable-rcon', 'rcon.port', 'rcon.password']

  const groups: Record<string, { title: string; icon: any; fields: Record<string, any> }> = {
    gameplay: { title: 'Gameplay & Game Rules', icon: Cpu, fields: {} },
    network: { title: 'Network & Connectivity', icon: Server, fields: {} },
    security: { title: 'Security & Access Control', icon: Shield, fields: {} },
    world: { title: 'World Generation & Entities', icon: Globe, fields: {} },
    rcon: { title: 'Query & Remote RCON', icon: Sliders, fields: {} },
    other: { title: 'Other Parameters', icon: Layers, fields: {} }
  }

  const query = editorSearchQuery.value.trim().toLowerCase()

  for (const [k, v] of Object.entries(propertiesData)) {
    if (query) {
      const matchKey = k.toLowerCase().includes(query)
      const matchVal = String(v).toLowerCase().includes(query)
      const matchDesc = SETTING_HELP[k]?.description.toLowerCase().includes(query)
      if (!matchKey && !matchVal && !matchDesc) continue
    }

    if (gameplayKeys.includes(k)) groups.gameplay.fields[k] = v
    else if (networkKeys.includes(k)) groups.network.fields[k] = v
    else if (securityKeys.includes(k)) groups.security.fields[k] = v
    else if (worldKeys.includes(k)) groups.world.fields[k] = v
    else if (rconKeys.includes(k)) groups.rcon.fields[k] = v
    else groups.other.fields[k] = v
  }

  // Remove empty groups
  for (const k of Object.keys(groups)) {
    if (Object.keys(groups[k].fields).length === 0) {
      delete groups[k]
    }
  }

  return groups
})

// Hierarchical Object Search Filter
const filteredParsedObject = computed(() => {
  const query = editorSearchQuery.value.trim().toLowerCase()
  if (!query) return parsedObject.value

  if (Array.isArray(parsedObject.value)) {
    return parsedObject.value.filter(item => {
      if (typeof item === 'string') return item.toLowerCase().includes(query)
      if (typeof item === 'object' && item !== null) {
        return Object.values(item).some(v => String(v).toLowerCase().includes(query))
      }
      return String(item).toLowerCase().includes(query)
    })
  }

  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(parsedObject.value)) {
    if (k.toLowerCase().includes(query)) {
      result[k] = v
    } else if (isObject(v)) {
      const nested: Record<string, any> = {}
      for (const [subK, subV] of Object.entries(v as any)) {
        if (subK.toLowerCase().includes(query) || String(subV).toLowerCase().includes(query)) {
          nested[subK] = subV
        }
      }
      if (Object.keys(nested).length > 0) {
        result[k] = nested
      }
    } else if (String(v).toLowerCase().includes(query)) {
      result[k] = v
    }
  }
  return result
})

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  if (!obj || typeof obj !== 'object') return result
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v, fullKey))
    } else {
      result[fullKey] = v
    }
  }
  return result
}

// Modified Diff calculation for review
const modifiedDiff = computed(() => {
  const diff: Record<string, { old: any; new: any }> = {}
  
  if (editorMode.value === 'visual' && detectedFormat.value === 'properties') {
    let initialObj: Record<string, any> = {}
    try {
      const lines = initialSnapshot.value.split('\n')
      for (const line of lines) {
        const t = line.trim()
        if (!t || t.startsWith('#') || t.startsWith('!')) continue
        const eq = line.indexOf('=')
        if (eq !== -1) {
          initialObj[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
        }
      }
    } catch {}

    for (const [k, v] of Object.entries(propertiesData)) {
      const oldVal = initialObj[k]
      if (String(oldVal ?? '') !== String(v ?? '')) {
        diff[k] = { old: oldVal ?? '(none)', new: v }
      }
    }
  } else if (editorMode.value === 'visual' && ['yaml', 'toml', 'json'].includes(detectedFormat.value)) {
    try {
      let initialObj: any = {}
      if (detectedFormat.value === 'yaml') initialObj = YAML.parse(initialSnapshot.value) || {}
      else if (detectedFormat.value === 'toml') initialObj = toml.parse(initialSnapshot.value) || {}
      else if (detectedFormat.value === 'json') initialObj = initialSnapshot.value.trim() ? JSON.parse(initialSnapshot.value) : {}

      const initialFlat = flattenObject(initialObj)
      const currentFlat = flattenObject(parsedObject.value)

      for (const [k, v] of Object.entries(currentFlat)) {
        if (JSON.stringify(v) !== JSON.stringify(initialFlat[k])) {
          diff[k] = { old: initialFlat[k] !== undefined ? JSON.stringify(initialFlat[k]) : '(none)', new: JSON.stringify(v) }
        }
      }
      for (const k of Object.keys(initialFlat)) {
        if (!(k in currentFlat)) {
          diff[k] = { old: JSON.stringify(initialFlat[k]), new: '(deleted)' }
        }
      }
    } catch {
      diff['file'] = { old: 'Original content', new: 'Modified visual content' }
    }
  } else {
    // Raw mode or plain text: line diff comparison
    const initialLines = initialSnapshot.value.split('\n')
    const currentLines = rawContent.value.split('\n')
    let changeCount = 0
    for (let i = 0; i < Math.max(initialLines.length, currentLines.length); i++) {
      const oldL = initialLines[i]
      const newL = currentLines[i]
      if (oldL !== newL) {
        diff[`Line ${i + 1}`] = { old: oldL !== undefined ? oldL : '(none)', new: newL !== undefined ? newL : '(deleted)' }
        changeCount++
        if (changeCount >= 40) {
          diff['...'] = { old: 'More diff lines truncated', new: '...' }
          break
        }
      }
    }
  }

  return diff
})

function toggleGroup(groupKey: string) {
  collapsedGroups[groupKey] = !collapsedGroups[groupKey]
}

function toggleSection(sectionKey: string) {
  collapsedSections[sectionKey] = !collapsedSections[sectionKey]
}

function isObject(val: any): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}

function isBooleanValue(val: any): boolean {
  return typeof val === 'boolean' || val === 'true' || val === 'false'
}

function isNumericValue(val: any): boolean {
  if (typeof val === 'number') return true
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return true
  return false
}

function getFieldType(val: any): string {
  if (isBooleanValue(val)) return 'bool'
  if (isNumericValue(val)) return 'number'
  if (Array.isArray(val)) return 'array'
  if (isObject(val)) return 'object'
  return 'text'
}

function togglePropertiesBool(key: string) {
  propertiesData[key] = !propertiesData[key]
  hasUnsavedChanges.value = true
}

function updateNestedJson(target: any, key: string, rawVal: string) {
  try {
    target[key] = JSON.parse(rawVal)
    hasUnsavedChanges.value = true
  } catch {
    target[key] = rawVal
  }
}

// Add Item / Property Dialog State
const isAddItemModalOpen = ref(false)
const addItemForm = reactive({
  targetSection: '',
  key: '',
  dataType: 'string' as 'string' | 'number' | 'boolean' | 'object',
  stringValue: '',
  numberValue: 0,
  booleanValue: false,
  mcPlayerName: '',
  mcPlayerUuid: '',
  mcOpLevel: 4,
  mcBypassesPlayerLimit: false
})

const availableSectionKeys = computed(() => {
  if (!parsedObject.value || typeof parsedObject.value !== 'object' || Array.isArray(parsedObject.value)) return []
  return Object.keys(parsedObject.value).filter(k => isObject(parsedObject.value[k]))
})

function openAddItemModal(prefilledSection = '') {
  addItemForm.targetSection = prefilledSection
  addItemForm.key = ''
  addItemForm.dataType = 'string'
  addItemForm.stringValue = ''
  addItemForm.numberValue = 0
  addItemForm.booleanValue = false
  addItemForm.mcPlayerName = ''
  addItemForm.mcPlayerUuid = ''
  addItemForm.mcOpLevel = 4
  addItemForm.mcBypassesPlayerLimit = false
  isAddItemModalOpen.value = true
}

function generateOfflineUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function submitAddItem() {
  // Case A: whitelist.json
  if (activeFile.value?.path.includes('whitelist')) {
    const name = addItemForm.mcPlayerName.trim()
    if (!name) return
    let uuid = addItemForm.mcPlayerUuid.trim()
    if (!uuid) {
      try {
        const resp = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`)
        if (resp.ok) {
          const d = await resp.json()
          if (d?.id) {
            const raw = d.id.replace(/-/g, '')
            if (raw.length === 32) {
              uuid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
            }
          }
        }
      } catch {}
      if (!uuid) uuid = generateOfflineUuid()
    }
    if (!Array.isArray(parsedObject.value)) parsedObject.value = []
    parsedObject.value.push({ name, uuid })
    hasUnsavedChanges.value = true
    isAddItemModalOpen.value = false
    return
  }

  // Case B: ops.json
  if (activeFile.value?.path.includes('ops')) {
    const name = addItemForm.mcPlayerName.trim()
    if (!name) return
    let uuid = addItemForm.mcPlayerUuid.trim()
    if (!uuid) {
      try {
        const resp = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`)
        if (resp.ok) {
          const d = await resp.json()
          if (d?.id) {
            const raw = d.id.replace(/-/g, '')
            if (raw.length === 32) {
              uuid = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
            }
          }
        }
      } catch {}
      if (!uuid) uuid = generateOfflineUuid()
    }
    if (!Array.isArray(parsedObject.value)) parsedObject.value = []
    parsedObject.value.push({
      uuid,
      name,
      level: Number(addItemForm.mcOpLevel) || 4,
      bypassesPlayerLimit: Boolean(addItemForm.mcBypassesPlayerLimit)
    })
    hasUnsavedChanges.value = true
    isAddItemModalOpen.value = false
    return
  }

  // Case C: Properties (server.properties)
  if (detectedFormat.value === 'properties') {
    const k = addItemForm.key.trim()
    if (!k) return
    let val: any = addItemForm.stringValue
    if (addItemForm.dataType === 'boolean') val = addItemForm.booleanValue
    else if (addItemForm.dataType === 'number') val = Number(addItemForm.numberValue) || 0
    propertiesData[k] = val
    hasUnsavedChanges.value = true
    isAddItemModalOpen.value = false
    return
  }

  // Case D: YAML / TOML / JSON Object or Generic Array
  const k = addItemForm.key.trim()
  if (!k && !Array.isArray(parsedObject.value)) return

  let val: any = addItemForm.stringValue
  if (addItemForm.dataType === 'boolean') val = addItemForm.booleanValue
  else if (addItemForm.dataType === 'number') val = Number(addItemForm.numberValue) || 0
  else if (addItemForm.dataType === 'object') val = {}

  if (Array.isArray(parsedObject.value)) {
    parsedObject.value.push(val)
  } else {
    const sec = addItemForm.targetSection
    if (sec) {
      if (!parsedObject.value[sec] || typeof parsedObject.value[sec] !== 'object') {
        parsedObject.value[sec] = {}
      }
      parsedObject.value[sec][k] = val
    } else {
      parsedObject.value[k] = val
    }
  }
  hasUnsavedChanges.value = true
  isAddItemModalOpen.value = false
}

function removeArrayItem(itemToRemove: any, fallbackIdx: number) {
  if (Array.isArray(parsedObject.value)) {
    const idx = parsedObject.value.indexOf(itemToRemove)
    if (idx !== -1) {
      parsedObject.value.splice(idx, 1)
    } else if (fallbackIdx >= 0 && fallbackIdx < parsedObject.value.length) {
      parsedObject.value.splice(fallbackIdx, 1)
    }
    hasUnsavedChanges.value = true
  }
}

function removePropertyKey(key: string) {
  delete propertiesData[key]
  hasUnsavedChanges.value = true
}

function removeObjectKey(parent: any, key: string) {
  if (parent && typeof parent === 'object') {
    delete parent[key]
    hasUnsavedChanges.value = true
  }
}

// 4. File Selection & Loading
async function selectPreset(preset: ConfigPreset) {
  await loadConfigFile(preset.name, preset.path)
  router.push({ query: { file: preset.path } })
}

async function openCustomFile() {
  if (!customFilePath.value.trim()) return
  const path = customFilePath.value.trim()
  const name = path.split('/').pop() || path
  await loadConfigFile(name, path)
  router.push({ query: { file: path } })
}

watch(
  () => route.query.file,
  async (fileQuery) => {
    if (fileQuery && typeof fileQuery === 'string') {
      let resolvedPath = fileQuery
      if (resolvedPath.toLowerCase() === 'whitelists.json') resolvedPath = 'whitelist.json'
      if (!activeFile.value || activeFile.value.path !== resolvedPath) {
        const name = resolvedPath.split('/').pop() || resolvedPath
        await loadConfigFile(name, resolvedPath)
      }
    } else if (!fileQuery && activeFile.value) {
      activeFile.value = null
      hasUnsavedChanges.value = false
      editorSearchQuery.value = ''
    }
  },
  { immediate: true }
)

async function loadConfigFile(name: string, path: string) {
  errorMessage.value = ''
  successMessage.value = ''
  parsedObjectError.value = ''
  editorSearchQuery.value = ''

  try {
    const res = await getFileContent(serverId, path)
    activeFile.value = { name, path }
    rawContent.value = res.content ?? ''
    initialSnapshot.value = rawContent.value
    hasUnsavedChanges.value = false
    parseToVisual()
  } catch (err: any) {
    // If file doesn't exist yet, start with blank content so user can create/save it
    activeFile.value = { name, path }
    rawContent.value = ''
    initialSnapshot.value = ''
    hasUnsavedChanges.value = false
    parseToVisual()
  }
}

// 5. Parse between Raw & Visual
function parseToVisual() {
  parsedObjectError.value = ''
  const content = rawContent.value

  if (detectedFormat.value === 'properties') {
    for (const k in propertiesData) delete propertiesData[k]
    propertiesComments.value = []

    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        propertiesComments.value.push(line)
        continue
      }
      const eqIdx = line.indexOf('=')
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim()
        let val: any = line.slice(eqIdx + 1).trim()
        if (val === 'true') val = true
        else if (val === 'false') val = false
        else if (!isNaN(Number(val)) && val !== '') val = Number(val)
        propertiesData[key] = val
      }
    }
  } else if (detectedFormat.value === 'yaml') {
    try {
      parsedObject.value = YAML.parse(content) || {}
    } catch (err: any) {
      parsedObjectError.value = `YAML Parse Warning: ${err.message}. Switch to Raw Code to view or fix.`
      parsedObject.value = {}
    }
  } else if (detectedFormat.value === 'toml') {
    try {
      parsedObject.value = toml.parse(content) || {}
    } catch (err: any) {
      parsedObjectError.value = `TOML Parse Warning: ${err.message}. Switch to Raw Code to view or fix.`
      parsedObject.value = {}
    }
  } else if (detectedFormat.value === 'json') {
    const isArrayPreset = activeFile.value?.path.endsWith('whitelist.json') || activeFile.value?.path.endsWith('ops.json')
    try {
      if (!content.trim()) {
        parsedObject.value = isArrayPreset ? [] : {}
      } else {
        parsedObject.value = JSON.parse(content)
      }
    } catch (err: any) {
      parsedObjectError.value = `JSON Parse Warning: ${err.message}. Switch to Raw Code to view or fix.`
      parsedObject.value = isArrayPreset ? [] : {}
    }
  }
}

function serializeFromVisual(): string {
  if (detectedFormat.value === 'properties') {
    const lines: string[] = []
    lines.push('# Minecraft server properties')
    lines.push(`# Saved by Pidan Panel at ${new Date().toISOString()}`)
    for (const [k, v] of Object.entries(propertiesData)) {
      lines.push(`${k}=${v}`)
    }
    return lines.join('\n') + '\n'
  } else if (detectedFormat.value === 'yaml') {
    return YAML.stringify(parsedObject.value)
  } else if (detectedFormat.value === 'toml') {
    return toml.stringify(parsedObject.value)
  } else if (detectedFormat.value === 'json') {
    return JSON.stringify(parsedObject.value, null, 2) + '\n'
  }
  return rawContent.value
}

function switchMode(targetMode: 'visual' | 'raw') {
  if (editorMode.value === targetMode) return
  if (targetMode === 'raw') {
    rawContent.value = serializeFromVisual()
  } else {
    parseToVisual()
  }
  editorMode.value = targetMode
}

function handleTabKey(e: KeyboardEvent) {
  const target = e.target as HTMLTextAreaElement
  const start = target.selectionStart
  const end = target.selectionEnd
  rawContent.value = rawContent.value.substring(0, start) + '  ' + rawContent.value.substring(end)
  setTimeout(() => {
    target.selectionStart = target.selectionEnd = start + 2
  }, 0)
}

function onSaveClick() {
  if (editorMode.value === 'visual') {
    rawContent.value = serializeFromVisual()
  }
  isDiffModalOpen.value = true
}

async function handleSave() {
  if (!activeFile.value) return
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const contentToSave = editorMode.value === 'visual' ? serializeFromVisual() : rawContent.value
    await saveFileContent(serverId, activeFile.value.path, contentToSave)
    rawContent.value = contentToSave
    initialSnapshot.value = contentToSave
    hasUnsavedChanges.value = false
    successMessage.value = `Successfully saved "${activeFile.value.path}"!`

    // If server is currently running, mark restart required across all pages
    if (instance.value.runtime?.status === 'running') {
      markRestartRequired(serverId)
    }

    // Refresh disk scan
    scanDiscoveredConfigs()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save configuration file'
  } finally {
    isSaving.value = false
  }
}

async function discardConfigChanges() {
  if (activeFile.value) {
    await loadConfigFile(activeFile.value.name, activeFile.value.path)
    successMessage.value = 'Changes discarded.'
    setTimeout(() => {
      if (successMessage.value === 'Changes discarded.') {
        successMessage.value = ''
      }
    }, 2500)
  }
}

function closeEditor() {
  activeFile.value = null
  hasUnsavedChanges.value = false
  editorSearchQuery.value = ''
  if (route.query.file) {
    router.push({ path: `/instances/${serverId}/configs` })
  }
}

// 6. Probing & Auto-Discovery on Disk
async function scanDiscoveredConfigs() {
  isScanning.value = true
  try {
    // 1. Check root files for preset existence
    const rootFiles = await getServerFiles(serverId, '')
    if (Array.isArray(rootFiles)) {
      for (const f of rootFiles) {
        existingFilesMap[f.name] = f
      }
    }

    // 2. Scan plugins and config directories for mod/plugin configs
    const discovered: ServerFileItem[] = []
    const configExts = ['yml', 'yaml', 'toml', 'json', 'properties']

    // Probing plugins/
    try {
      const pluginFiles = await getServerFiles(serverId, 'plugins')
      if (Array.isArray(pluginFiles)) {
        for (const item of pluginFiles) {
          const ext = item.name.split('.').pop()?.toLowerCase() || ''
          if (!item.isDirectory && configExts.includes(ext)) {
            item.extension = item.extension || ext
            discovered.push(item)
          } else if (item.isDirectory) {
            // Check 1 level deep inside each plugin's folder (e.g. plugins/Essentials/config.yml)
            try {
              const subItems = await getServerFiles(serverId, `plugins/${item.name}`)
              if (Array.isArray(subItems)) {
                for (const sub of subItems) {
                  const subExt = sub.name.split('.').pop()?.toLowerCase() || ''
                  if (!sub.isDirectory && configExts.includes(subExt)) {
                    sub.extension = sub.extension || subExt
                    discovered.push(sub)
                  }
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    // Probing config/ (Fabric, Forge, NeoForge, Paper configs)
    try {
      const cfgFiles = await getServerFiles(serverId, 'config')
      if (Array.isArray(cfgFiles)) {
        for (const item of cfgFiles) {
          const ext = item.name.split('.').pop()?.toLowerCase() || ''
          if (!item.isDirectory && configExts.includes(ext)) {
            item.extension = item.extension || ext
            existingFilesMap[item.path] = item
            discovered.push(item)
          }
        }
      }
    } catch {}

    discoveredConfigs.value = discovered
  } catch {
    // Fail silently
  } finally {
    isScanning.value = false
  }
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

onMounted(async () => {
  try {
    const s = await getServer(serverId)
    if (s) instance.value = s
  } catch {}

  await Promise.all([syncPowerState(), scanDiscoveredConfigs()])
  pollTimer = setInterval(syncPowerState, 2000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>
