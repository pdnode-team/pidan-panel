<template>
  <AppLayout
    :breadcrumbs="[
      { label: 'Instances', to: '/instances' },
      { label: instance.name || `Server #${serverId}`, to: `/instances/${serverId}/terminal` },
      { label: 'MC Settings' }
    ]"
    :wide="true"
  >
    <div class="w-full max-w-7xl mx-auto space-y-6 pb-24">
      <!-- 1. Top Instance Header & Quick Navigation Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202024] p-4 rounded-xl border border-zinc-800 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-400">
            <Settings2 class="w-6 h-6" />
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
            <p class="text-xs text-zinc-400">Visual Minecraft Server Configuration & Container Settings</p>
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
          
          <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-blue-300 bg-blue-950/40 border border-blue-800/60">
            <Settings2 class="w-4 h-4 text-blue-400" />
            <span>MC Settings</span>
          </div>

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

      <!-- Success & Error Banners -->
      <div v-if="successMessage" class="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Check class="w-4 h-4 flex-shrink-0" />
          <span>{{ successMessage }}</span>
        </div>
        <button type="button" @click="successMessage = ''" class="text-emerald-400 hover:text-emerald-200">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div v-if="errorMessage" class="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 flex-shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>
        <button type="button" @click="errorMessage = ''" class="text-red-400 hover:text-red-200">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-24 text-center text-zinc-500 text-sm flex flex-col items-center gap-3">
        <RotateCw class="w-6 h-6 animate-spin text-blue-500" />
        <span>Loading server settings and properties...</span>
      </div>

      <div v-else class="space-y-6">
        <!-- Category Navigation Tabs (Template-Style Filtering / Scrolling) -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            @click="activeCategory = cat.id"
            class="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap"
            :class="activeCategory === cat.id 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' 
              : 'bg-[#202024] text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'"
          >
            <component :is="cat.icon" class="w-4 h-4" />
            <span>{{ cat.name }}</span>
          </button>
        </div>

        <!-- PANEL 1: Networking & Access Control -->
        <section 
          v-show="activeCategory === 'all' || activeCategory === 'networking'"
          class="bg-[#202024] rounded-xl border border-zinc-800 p-6 space-y-6 shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-blue-950/40 border border-blue-800/60 flex items-center justify-center text-blue-400">
                <Globe class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-zinc-100">Networking & Access Control</h2>
                <p class="text-xs text-zinc-400">Game port, player whitelist, authentication, and live server ping display</p>
              </div>
            </div>
            <span class="text-xs text-zinc-500 font-mono">server.properties & container port</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Game Port Configuration -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Radio class="w-4 h-4 text-blue-400" />
                  <label class="text-xs font-bold text-zinc-200">Server Port</label>
                </div>
                <span class="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">Default: 25565</span>
              </div>
              <p class="text-xs text-zinc-400">
                Primary TCP listening port. Synchronizes both <code class="text-blue-300">server.properties</code> and container host port mapping.
              </p>
              <div class="flex items-center gap-3 pt-1">
                <div class="relative flex-1">
                  <input
                    v-model.number="form.serverPort"
                    type="number"
                    min="1024"
                    max="65535"
                    class="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <span class="absolute right-3 top-2.5 text-xs text-zinc-500 font-mono">TCP</span>
                </div>
                <button
                  type="button"
                  @click="copyPortAddress"
                  class="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 transition-colors flex items-center gap-1.5"
                  title="Copy Connection Address"
                >
                  <Copy class="w-3.5 h-3.5" />
                  <span>{{ copyPortState ? 'Copied!' : 'Copy Address' }}</span>
                </button>
              </div>
            </div>

            <!-- Player Whitelist Visual Card (Highlight Feature) -->
            <!-- Player Whitelist Card (Redirect to Config Editor) -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-3.5"
              :class="form.whitelist ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-zinc-900/60 border-zinc-800/80'"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <ShieldCheck class="w-4 h-4" :class="form.whitelist ? 'text-emerald-400' : 'text-zinc-400'" />
                  <label class="text-xs font-bold text-zinc-200">Player Whitelist</label>
                </div>
                <span 
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                  :class="form.whitelist 
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'"
                >
                  {{ form.whitelist ? 'Active Whitelist' : 'Open Access' }}
                </span>
              </div>
              <p class="text-xs text-zinc-400">
                When enabled, only player UUIDs/gamertags explicitly listed in <code class="text-emerald-300 font-mono">whitelist.json</code> can connect to the server.
              </p>
              <div class="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label class="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    v-model="form.whitelist"
                    class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span class="text-xs font-medium text-zinc-200">Enable Player Whitelist (<code class="text-xs text-zinc-400 font-mono">white-list</code>)</span>
                </label>
              </div>

              <!-- Enforce Whitelist Sub-toggle -->
              <div v-if="form.whitelist" class="pt-2 border-t border-emerald-900/40 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] text-zinc-300 font-medium">Enforce on Reload:</span>
                  <span class="text-[11px] text-zinc-400">Kick non-whitelisted players immediately when whitelist reloads</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="form.enforceWhitelist" class="sr-only peer" />
                  <div class="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <!-- Dedicated Redirect Banner to whitelist.json in Config Editor -->
              <div class="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div class="flex items-center gap-2.5">
                  <Users class="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div class="text-xs font-semibold text-zinc-200">Whitelisted Players Database</div>
                    <div class="text-[11px] text-zinc-400">Configure allowed player usernames, avatars, and UUIDs in Visual Form</div>
                  </div>
                </div>
                <router-link
                  :to="`/instances/${serverId}/configs?file=whitelist.json`"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors flex-shrink-0"
                >
                  <span>Edit whitelist.json</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </router-link>
              </div>
            </div>

            <!-- Server Operators (OP Permissions) Card (Redirect to Config Editor) -->
            <div class="p-4 rounded-xl border bg-zinc-900/60 border-zinc-800/80 transition-all space-y-3.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Shield class="w-4 h-4 text-rose-400" />
                  <label class="text-xs font-bold text-zinc-200">Server Operators & Permissions</label>
                </div>
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-rose-950/60 border-rose-800 text-rose-300">
                  ops.json
                </span>
              </div>
              <p class="text-xs text-zinc-400">
                Operators can execute privileged server commands, manage game mechanics, and bypass player capacity restrictions.
              </p>

              <!-- Default OP Permission Level in server.properties -->
              <div class="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label class="text-xs font-medium text-zinc-200">Default OP Permission Level (<code class="text-xs text-zinc-400 font-mono">op-permission-level</code>)</label>
                  <p class="text-[11px] text-zinc-500">Standard admin level granted when assigning new operators</p>
                </div>
                <select
                  v-model.number="form.opPermissionLevel"
                  class="w-full sm:w-56 h-8 px-2.5 rounded-lg bg-zinc-950 border border-zinc-700/80 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
                >
                  <option :value="1">Level 1 - Moderator (Bypass Spawn)</option>
                  <option :value="2">Level 2 - Gamemaster (Command Blocks)</option>
                  <option :value="3">Level 3 - Admin (Ban, Kick, OP)</option>
                  <option :value="4">Level 4 - Owner (Full Administrator)</option>
                </select>
              </div>

              <!-- Dedicated Redirect Banner to ops.json in Config Editor -->
              <div class="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                <div class="flex items-center gap-2.5">
                  <Shield class="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <div class="text-xs font-semibold text-zinc-200">Server Operator Database</div>
                    <div class="text-[11px] text-zinc-400">Configure operators, OP permission tiers, and bypass limits in Visual Form</div>
                  </div>
                </div>
                <router-link
                  :to="`/instances/${serverId}/configs?file=ops.json`"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors flex-shrink-0"
                >
                  <span>Edit ops.json</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </router-link>
              </div>
            </div>

            <!-- Online Mode / Mojang Auth Card -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-3"
              :class="form.onlineMode ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-amber-950/20 border-amber-800/60'"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Lock class="w-4 h-4" :class="form.onlineMode ? 'text-emerald-400' : 'text-amber-400'" />
                  <label class="text-xs font-bold text-zinc-200">Online Mode (Mojang Authentication)</label>
                </div>
                <span 
                  class="text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                  :class="form.onlineMode 
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400' 
                    : 'bg-amber-950/50 border-amber-800 text-amber-400'"
                >
                  {{ form.onlineMode ? 'Official Auth' : 'Offline / Cracked' }}
                </span>
              </div>
              <p class="text-xs text-zinc-400">
                Verifies connecting players against official Mojang/Microsoft session servers. Set to false for offline clients or custom proxy networks (e.g. BungeeCord/Velocity).
              </p>
              <div class="pt-1">
                <label class="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    v-model="form.onlineMode"
                    class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span class="text-xs font-medium text-zinc-200">Require Official Mojang Account (<code class="text-xs text-zinc-400">online-mode</code>)</span>
                </label>
              </div>
            </div>

            <!-- Max Players Card -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Users class="w-4 h-4 text-purple-400" />
                  <label class="text-xs font-bold text-zinc-200">Max Player Limit</label>
                </div>
                <span class="text-xs font-bold font-mono text-purple-400">{{ form.maxPlayers }} Players</span>
              </div>
              <p class="text-xs text-zinc-400">
                Maximum concurrent player connections allowed by the server.
              </p>
              <div class="space-y-2 pt-1">
                <input
                  v-model.number="form.maxPlayers"
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  class="w-full accent-purple-500 cursor-pointer"
                />
                <div class="flex items-center gap-1.5 flex-wrap pt-1">
                  <span class="text-[10px] text-zinc-500 mr-1">Quick Presets:</span>
                  <button
                    v-for="preset in [5, 10, 20, 50, 100]"
                    :key="preset"
                    type="button"
                    @click="form.maxPlayers = preset"
                    class="px-2 py-0.5 rounded text-[10px] font-mono border transition-all"
                    :class="form.maxPlayers === preset 
                      ? 'bg-purple-950 border-purple-700 text-purple-300' 
                      : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'"
                  >
                    {{ preset }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Server MOTD & Live Minecraft Multiplayer Server List Ping Preview -->
          <div class="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Tv class="w-4 h-4 text-amber-400" />
                <label class="text-xs font-bold text-zinc-200">Server MOTD (Message of the Day)</label>
              </div>
              <span class="text-[11px] text-zinc-400">Supports color codes like <code class="text-amber-300">&aGreen</code> or <code class="text-sky-300">&bAqua</code></span>
            </div>

            <input
              v-model="form.motd"
              type="text"
              placeholder="A Minecraft Server"
              class="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none transition-colors"
            />

            <!-- LIVE MINECRAFT MULTIPLAYER CARD PREVIEW -->
            <div class="space-y-1.5 pt-2">
              <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye class="w-3.5 h-3.5 text-blue-400" />
                Multiplayer Server List Live Preview
              </span>

              <!-- Minecraft Server Browser Row Card -->
              <div class="w-full rounded-xl bg-[#111113] border-2 border-zinc-800/90 p-3.5 flex items-center justify-between gap-4 shadow-inner">
                <!-- Left: Server Favicon & Text -->
                <div class="flex items-center gap-3.5 min-w-0">
                  <!-- Pixel Art Server Icon Placeholder -->
                  <div class="w-12 h-12 rounded bg-[#1e293b] border-2 border-zinc-700 flex items-center justify-center flex-shrink-0 shadow-md relative overflow-hidden group">
                    <Box class="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span class="absolute bottom-0 right-0 px-1 text-[8px] font-black bg-black/70 text-zinc-400 font-mono">MC</span>
                  </div>

                  <!-- Server Details & MOTD -->
                  <div class="min-w-0 space-y-0.5">
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-bold text-zinc-100 truncate font-mono">
                        {{ instance.name || 'Minecraft Server' }}
                      </h4>
                      <span class="text-[10px] text-zinc-500 font-mono">1.21.x</span>
                    </div>
                    <!-- Formatted MOTD Output -->
                    <div 
                      class="text-xs font-mono break-all leading-snug"
                      v-html="renderedMotdHtml"
                    ></div>
                  </div>
                </div>

                <!-- Right: Player Count & Ping Icon -->
                <div class="flex flex-col items-end flex-shrink-0 space-y-1 font-mono">
                  <div class="flex items-center gap-1 text-zinc-400 text-xs">
                    <span class="text-zinc-200 font-semibold">0</span>
                    <span class="text-zinc-600">/</span>
                    <span class="text-zinc-400">{{ form.maxPlayers }}</span>
                  </div>
                  <!-- 5-bar Green Ping Indicator -->
                  <div class="flex items-end gap-0.5 h-3.5" title="Ping: 18ms">
                    <span class="w-0.5 h-1.5 bg-emerald-500 rounded-sm"></span>
                    <span class="w-0.5 h-2 bg-emerald-500 rounded-sm"></span>
                    <span class="w-0.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                    <span class="w-0.5 h-3 bg-emerald-500 rounded-sm"></span>
                    <span class="w-0.5 h-3.5 bg-emerald-500 rounded-sm"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PANEL 2: Gameplay Rules & Difficulty -->
        <section 
          v-show="activeCategory === 'all' || activeCategory === 'gameplay'"
          class="bg-[#202024] rounded-xl border border-zinc-800 p-6 space-y-6 shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                <Swords class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-zinc-100">Gameplay Rules & Difficulty</h2>
                <p class="text-xs text-zinc-400">Default game mode, world difficulty, combat rules, and spawn protection</p>
              </div>
            </div>
            <span class="text-xs text-zinc-500 font-mono">server.properties</span>
          </div>

          <!-- 1. Gamemode Selection (Visual Template Cards) -->
          <div class="space-y-3">
            <label class="text-xs font-bold text-zinc-200 flex items-center gap-2">
              <Compass class="w-4 h-4 text-emerald-400" />
              <span>Default Game Mode (gamemode)</span>
            </label>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div
                v-for="mode in gamemodes"
                :key="mode.id"
                @click="form.gamemode = mode.id"
                class="p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between"
                :class="form.gamemode === mode.id 
                  ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/50' 
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40'"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div 
                      class="w-9 h-9 rounded-lg flex items-center justify-center"
                      :class="mode.iconBg"
                    >
                      <component :is="mode.icon" class="w-5 h-5" :class="mode.iconColor" />
                    </div>
                    <div 
                      v-if="form.gamemode === mode.id"
                      class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-900 shadow-sm"
                    >
                      <Check class="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                  <h4 class="text-sm font-bold text-zinc-100">{{ mode.title }}</h4>
                  <p class="text-xs text-zinc-400 mt-1 leading-relaxed">{{ mode.desc }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Difficulty Selector (Pill Matrix) -->
          <div class="space-y-3 pt-2">
            <label class="text-xs font-bold text-zinc-200 flex items-center gap-2">
              <ShieldAlert class="w-4 h-4 text-amber-400" />
              <span>World Difficulty (difficulty)</span>
            </label>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                v-for="diff in difficulties"
                :key="diff.id"
                type="button"
                @click="form.difficulty = diff.id"
                class="p-3.5 rounded-xl border text-left transition-all flex items-center gap-3"
                :class="form.difficulty === diff.id ? diff.activeClass : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'"
              >
                <component :is="diff.icon" class="w-4 h-4 flex-shrink-0" />
                <div>
                  <div class="text-xs font-bold capitalize">{{ diff.name }}</div>
                  <div class="text-[10px] opacity-80 mt-0.5">{{ diff.subtitle }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- 3. PvP, Hardcore & Spawn Protection -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <!-- PvP Combat -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-2 cursor-pointer"
              :class="form.pvp ? 'bg-red-950/20 border-red-800/60' : 'bg-zinc-900/60 border-zinc-800/80'"
              @click="form.pvp = !form.pvp"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Swords class="w-4 h-4 text-red-400" />
                  <span class="text-xs font-bold text-zinc-200">PvP Combat</span>
                </div>
                <input
                  type="checkbox"
                  v-model="form.pvp"
                  class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  @click.stop
                />
              </div>
              <p class="text-xs text-zinc-400">
                Allow players to attack and damage other players in multiplayer.
              </p>
            </div>

            <!-- Hardcore Mode -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-2 cursor-pointer"
              :class="form.hardcore ? 'bg-purple-950/30 border-purple-800/70' : 'bg-zinc-900/60 border-zinc-800/80'"
              @click="form.hardcore = !form.hardcore"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Skull class="w-4 h-4 text-purple-400" />
                  <span class="text-xs font-bold text-zinc-200">Hardcore Mode</span>
                </div>
                <input
                  type="checkbox"
                  v-model="form.hardcore"
                  class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  @click.stop
                />
              </div>
              <p class="text-xs text-zinc-400">
                Permadeath: locks difficulty to Hard and permanently puts players into spectator mode on death.
              </p>
            </div>

            <!-- Spawn Protection -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Shield class="w-4 h-4 text-blue-400" />
                  <label class="text-xs font-bold text-zinc-200">Spawn Protection</label>
                </div>
                <span class="text-xs font-mono text-blue-400 font-bold">{{ form.spawnProtection }} blocks</span>
              </div>
              <p class="text-xs text-zinc-400">
                Radius in blocks around world spawn protected from non-operator modifications (0 to disable).
              </p>
              <input
                v-model.number="form.spawnProtection"
                type="number"
                min="0"
                max="256"
                class="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </section>

        <!-- PANEL 3: World Generation & Environment -->
        <section 
          v-show="activeCategory === 'all' || activeCategory === 'world'"
          class="bg-[#202024] rounded-xl border border-zinc-800 p-6 space-y-6 shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                <Trees class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-zinc-100">World & Environment</h2>
                <p class="text-xs text-zinc-400">World seed, dimensions, entity spawning rules, and chunk render distances</p>
              </div>
            </div>
            <span class="text-xs text-zinc-500 font-mono">server.properties</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- World / Level Name -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-zinc-200">World Name (level-name)</label>
                <span class="text-[11px] text-zinc-500 font-mono">Default: world</span>
              </div>
              <p class="text-xs text-zinc-400">The directory name where your world files and region chunks are stored.</p>
              <input
                v-model="form.levelName"
                type="text"
                class="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            <!-- World Seed -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-zinc-200">World Generation Seed (level-seed)</label>
                <span class="text-[11px] text-zinc-500 font-mono">Leave blank for random</span>
              </div>
              <p class="text-xs text-zinc-400">Seed used to generate terrain, biomes, and structures.</p>
              <input
                v-model="form.levelSeed"
                type="text"
                placeholder="e.g. 4048921820491"
                class="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <!-- Entity & Dimension Toggles Matrix -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Allow Nether -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-2 cursor-pointer"
              :class="form.allowNether ? 'bg-red-950/20 border-red-800/60' : 'bg-zinc-900/60 border-zinc-800/80'"
              @click="form.allowNether = !form.allowNether"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Flame class="w-4 h-4 text-red-400" />
                  <span class="text-xs font-bold text-zinc-200">Nether</span>
                </div>
                <input
                  type="checkbox"
                  v-model="form.allowNether"
                  class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-0 cursor-pointer"
                  @click.stop
                />
              </div>
              <p class="text-xs text-zinc-400">Enable obsidian portals and travel to the Nether dimension.</p>
            </div>

            <!-- Spawn Monsters -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-2 cursor-pointer"
              :class="form.spawnMonsters ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-zinc-900/30 border-zinc-800/40 opacity-70'"
              @click="form.spawnMonsters = !form.spawnMonsters"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Bug class="w-4 h-4 text-amber-400" />
                  <span class="text-xs font-bold text-zinc-200">Spawn Monsters</span>
                </div>
                <input
                  type="checkbox"
                  v-model="form.spawnMonsters"
                  class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-amber-600 focus:ring-0 cursor-pointer"
                  @click.stop
                />
              </div>
              <p class="text-xs text-zinc-400">Allow hostile mobs (creepers, zombies, skeletons) to spawn.</p>
            </div>

            <!-- Spawn Animals -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-2 cursor-pointer"
              :class="form.spawnAnimals ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-zinc-900/30 border-zinc-800/40 opacity-70'"
              @click="form.spawnAnimals = !form.spawnAnimals"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Heart class="w-4 h-4 text-pink-400" />
                  <span class="text-xs font-bold text-zinc-200">Spawn Animals</span>
                </div>
                <input
                  type="checkbox"
                  v-model="form.spawnAnimals"
                  class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-pink-600 focus:ring-0 cursor-pointer"
                  @click.stop
                />
              </div>
              <p class="text-xs text-zinc-400">Allow passive friendly wildlife (cows, sheep, pigs, chickens) to spawn.</p>
            </div>

            <!-- Spawn NPCs / Villagers -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-2 cursor-pointer"
              :class="form.spawnNpcs ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-zinc-900/30 border-zinc-800/40 opacity-70'"
              @click="form.spawnNpcs = !form.spawnNpcs"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Users class="w-4 h-4 text-emerald-400" />
                  <span class="text-xs font-bold text-zinc-200">Spawn Villagers</span>
                </div>
                <input
                  type="checkbox"
                  v-model="form.spawnNpcs"
                  class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 cursor-pointer"
                  @click.stop
                />
              </div>
              <p class="text-xs text-zinc-400">Allow villagers and wandering traders to generate and trade.</p>
            </div>
          </div>

          <!-- View Distance & Simulation Distance Sliders -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <!-- View Distance -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Eye class="w-4 h-4 text-sky-400" />
                  <label class="text-xs font-bold text-zinc-200">View Distance (view-distance)</label>
                </div>
                <span class="text-xs font-mono text-sky-400 font-bold">{{ form.viewDistance }} Chunks</span>
              </div>
              <p class="text-xs text-zinc-400">
                Chunk render distance sent to connected players. Higher values significantly increase server memory usage.
              </p>
              <div class="space-y-1 pt-1">
                <input
                  v-model.number="form.viewDistance"
                  type="range"
                  min="4"
                  max="32"
                  step="1"
                  class="w-full accent-sky-500 cursor-pointer"
                />
                <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>4 Chunks (Fast)</span>
                  <span>10 (Default)</span>
                  <span>32 Chunks (Heavy)</span>
                </div>
              </div>
            </div>

            <!-- Simulation Distance -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Cpu class="w-4 h-4 text-indigo-400" />
                  <label class="text-xs font-bold text-zinc-200">Simulation Distance (simulation-distance)</label>
                </div>
                <span class="text-xs font-mono text-indigo-400 font-bold">{{ form.simulationDistance }} Chunks</span>
              </div>
              <p class="text-xs text-zinc-400">
                Radius in chunks around players where entities, redstone, mob AI, and crops are actively simulated.
              </p>
              <div class="space-y-1 pt-1">
                <input
                  v-model.number="form.simulationDistance"
                  type="range"
                  min="4"
                  max="32"
                  step="1"
                  class="w-full accent-indigo-500 cursor-pointer"
                />
                <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>4 Chunks (Light)</span>
                  <span>10 (Default)</span>
                  <span>32 Chunks (Intense)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PANEL 4: Container Resources & Runtime -->
        <section 
          v-show="activeCategory === 'all' || activeCategory === 'runtime'"
          class="bg-[#202024] rounded-xl border border-zinc-800 p-6 space-y-6 shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-purple-950/40 border border-purple-800/60 flex items-center justify-center text-purple-400">
                <Layers class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-zinc-100">Container Resources & Runtime</h2>
                <p class="text-xs text-zinc-400">Docker container memory limits, startup JAR file, Java runtime, and stop grace period</p>
              </div>
            </div>
            <span class="text-xs text-zinc-500 font-mono">Instance Container Engine</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Memory Allocation -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Database class="w-4 h-4 text-purple-400" />
                  <span>Max Memory Allocation (Xmx)</span>
                </label>
                <span class="text-xs font-mono text-purple-400 font-bold">
                  {{ (form.maxMemoryMb / 1024).toFixed(1) }} GB ({{ form.maxMemoryMb }} MB)
                </span>
              </div>
              <p class="text-xs text-zinc-400">
                Maximum heap memory allowed for the Minecraft Java process inside the Docker container.
              </p>
              <div class="space-y-2 pt-1">
                <input
                  v-model.number="form.maxMemoryMb"
                  type="range"
                  min="512"
                  max="16384"
                  step="256"
                  class="w-full accent-purple-500 cursor-pointer"
                />
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    v-for="ram in [1024, 2048, 4096, 8192, 12288]"
                    :key="ram"
                    type="button"
                    @click="form.maxMemoryMb = ram"
                    class="px-2.5 py-1 rounded text-xs font-mono border transition-all"
                    :class="form.maxMemoryMb === ram 
                      ? 'bg-purple-950 border-purple-700 text-purple-300' 
                      : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'"
                  >
                    {{ ram >= 1024 ? `${ram / 1024} GB` : `${ram} MB` }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Server Core Entry JAR -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <FileCode class="w-4 h-4 text-amber-400" />
                  <span>Server Core Entry File</span>
                </label>
                <span class="text-[11px] text-zinc-500 font-mono">serverJar</span>
              </div>
              <p class="text-xs text-zinc-400">The primary executable file invoked on server startup.</p>
              <div class="flex items-center gap-2 pt-1">
                <input
                  v-model="form.serverJar"
                  type="text"
                  placeholder="server.jar"
                  class="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
              <div class="flex items-center gap-2 text-[11px] text-zinc-400">
                <span>Presets:</span>
                <button 
                  type="button" 
                  @click="form.serverJar = 'server.jar'"
                  class="text-blue-400 hover:underline"
                >server.jar</button>
                <span>•</span>
                <button 
                  type="button" 
                  @click="form.serverJar = 'paper.jar'"
                  class="text-blue-400 hover:underline"
                >paper.jar</button>
                <span>•</span>
                <button 
                  type="button" 
                  @click="form.serverJar = 'fabric-server-launch.jar'"
                  class="text-blue-400 hover:underline"
                >fabric.jar</button>
              </div>
            </div>

            <!-- Docker Java Runtime Image -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Box class="w-4 h-4 text-blue-400" />
                  <span>Java Runtime Docker Image</span>
                </label>
                <span class="text-[11px] text-zinc-500 font-mono">dockerImage</span>
              </div>
              <p class="text-xs text-zinc-400">Base container image containing the corresponding Java OpenJDK/JRE version.</p>
              <select
                v-model="form.dockerImage"
                class="w-full bg-[#18181b] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option
                  v-for="opt in JAVA_IMAGE_OPTIONS"
                  :key="opt.image"
                  :value="opt.image"
                >
                  {{ opt.label }} ({{ opt.versionRange }}) - {{ opt.image }}
                </option>
                <option v-if="isCustomDockerImage" :value="form.dockerImage">
                  Custom Image ({{ form.dockerImage }})
                </option>
              </select>
            </div>

            <!-- Graceful Shutdown Timeout -->
            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Clock class="w-4 h-4 text-rose-400" />
                  <span>Graceful Stop Timeout</span>
                </label>
                <span class="text-xs font-mono text-rose-400 font-bold">{{ form.stopTimeoutSeconds }}s</span>
              </div>
              <p class="text-xs text-zinc-400">
                Seconds to wait after issuing <code class="text-zinc-300">/stop</code> before force terminating the container with SIGKILL.
              </p>
              <div class="space-y-2 pt-1">
                <input
                  v-model.number="form.stopTimeoutSeconds"
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  class="w-full accent-rose-500 cursor-pointer"
                />
                <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>5s (Fast)</span>
                  <span>60s (Default)</span>
                  <span>300s (Large World Save)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PANEL 5: Watchdog & High Availability -->
        <section 
          v-show="activeCategory === 'all' || activeCategory === 'watchdog'"
          class="bg-[#202024] rounded-xl border border-zinc-800 p-6 space-y-6 shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-indigo-950/40 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                <ShieldCheck class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-zinc-100">Watchdog & High Availability</h2>
                <p class="text-xs text-zinc-400">Boot auto-start, crash recovery with exponential backoff, and circuit-breaker protection</p>
              </div>
            </div>
            <span class="text-xs text-zinc-500 font-mono">system daemon & container watchdog</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Feature 1: Auto-start on Boot -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-3 cursor-pointer"
              :class="form.autoStartOnBoot ? 'bg-indigo-950/20 border-indigo-800/60' : 'bg-zinc-900/60 border-zinc-800/80'"
              @click="form.autoStartOnBoot = !form.autoStartOnBoot"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Power class="w-4 h-4" :class="form.autoStartOnBoot ? 'text-indigo-400' : 'text-zinc-400'" />
                  <label class="text-xs font-bold text-zinc-200 cursor-pointer">Auto-start on Boot</label>
                </div>
                <div class="flex items-center gap-2">
                  <span 
                    class="text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                    :class="form.autoStartOnBoot 
                      ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300' 
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'"
                  >
                    {{ form.autoStartOnBoot ? 'Enabled' : 'Disabled' }}
                  </span>
                  <input
                    type="checkbox"
                    v-model="form.autoStartOnBoot"
                    class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    @click.stop
                  />
                </div>
              </div>
              <p class="text-xs text-zinc-400 leading-relaxed">
                When the panel service launches, the watchdog scans and safely pulls up this instance if it was stopped.
              </p>
              <div class="flex items-center gap-2 text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                <Info class="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span>Zero manual intervention required after node or host server reboot.</span>
              </div>
            </div>

            <!-- Feature 2: Crash Auto-Restart Master Switch -->
            <div 
              class="p-4 rounded-xl border transition-all space-y-3 cursor-pointer"
              :class="form.autoRestartOnCrash ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-zinc-900/60 border-zinc-800/80'"
              @click="form.autoRestartOnCrash = !form.autoRestartOnCrash"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Activity class="w-4 h-4" :class="form.autoRestartOnCrash ? 'text-emerald-400' : 'text-zinc-400'" />
                  <label class="text-xs font-bold text-zinc-200 cursor-pointer">Crash Exponential Backoff Auto-Restart</label>
                </div>
                <div class="flex items-center gap-2">
                  <span 
                    class="text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                    :class="form.autoRestartOnCrash 
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'"
                  >
                    {{ form.autoRestartOnCrash ? 'Active Self-Healing' : 'Manual Restart Only' }}
                  </span>
                  <input
                    type="checkbox"
                    v-model="form.autoRestartOnCrash"
                    class="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    @click.stop
                  />
                </div>
              </div>
              <p class="text-xs text-zinc-400 leading-relaxed">
                Automatically monitors unexpected container exits and recovers using progressive backoff delays to prevent disk and resource exhaustion.
              </p>
              <div class="flex items-center gap-2 text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Manual stops or backup operations automatically cancel pending retry timers.</span>
              </div>
            </div>
          </div>

          <!-- Backoff Tuning Parameters (when autoRestartOnCrash is enabled) -->
          <div v-if="form.autoRestartOnCrash" class="space-y-4 pt-2 border-t border-zinc-800/80">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Timer class="w-4 h-4 text-emerald-400" />
                <span>Exponential Backoff Configuration</span>
              </h3>
              <span class="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                D(N) = min(T_initial × 2^(N-1), T_max)
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Initial Delay (1s ~ 60s, default 5s) -->
              <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold text-zinc-200">Initial Delay (T_initial)</label>
                  <span class="text-xs font-mono text-emerald-400 font-bold">{{ form.crashBackoffInitialSeconds }}s</span>
                </div>
                <p class="text-[11px] text-zinc-400">
                  Delay before the 1st restart attempt (Range: 1 ~ 60s).
                </p>
                <div class="space-y-1.5 pt-1">
                  <input
                    v-model.number="form.crashBackoffInitialSeconds"
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    class="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>1s</span>
                    <span>5s (Default)</span>
                    <span>60s</span>
                  </div>
                </div>
              </div>

              <!-- Max Delay (5s ~ 3600s, default 300s) -->
              <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold text-zinc-200">Max Delay Ceiling (T_max)</label>
                  <span class="text-xs font-mono text-emerald-400 font-bold">
                    {{ form.crashBackoffMaxSeconds >= 60 ? `${Math.floor(form.crashBackoffMaxSeconds / 60)}m ${form.crashBackoffMaxSeconds % 60 ? `${form.crashBackoffMaxSeconds % 60}s` : ''}` : `${form.crashBackoffMaxSeconds}s` }}
                  </span>
                </div>
                <p class="text-[11px] text-zinc-400">
                  Upper bound delay cap (Range: 5 ~ 3600s).
                </p>
                <div class="space-y-1.5 pt-1">
                  <input
                    v-model.number="form.crashBackoffMaxSeconds"
                    type="range"
                    min="5"
                    max="3600"
                    step="5"
                    class="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>5s</span>
                    <span>300s (5m Default)</span>
                    <span>3600s (1h)</span>
                  </div>
                </div>
              </div>

              <!-- Max Retries Circuit Breaker (0 ~ 50, default 5) -->
              <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold text-zinc-200">Circuit Breaker Retries</label>
                  <span class="text-xs font-mono text-emerald-400 font-bold">
                    {{ form.crashMaxRetries === 0 ? 'Unlimited (0)' : `${form.crashMaxRetries} retries` }}
                  </span>
                </div>
                <p class="text-[11px] text-zinc-400">
                  Continuous crash limit before halting (0 to disable circuit breaker).
                </p>
                <div class="space-y-1.5 pt-1">
                  <input
                    v-model.number="form.crashMaxRetries"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    class="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>0 (Unlimited)</span>
                    <span>5 (Default)</span>
                    <span>50</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dynamic Timeline Simulation -->
            <div class="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/90 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span class="text-xs font-semibold text-zinc-300">Calculated Progressive Retry Sequence</span>
                <span class="text-[11px] text-emerald-400 font-mono">
                  Continuous stable run &gt; 60s resets failure counter to 0
                </span>
              </div>
              <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <div 
                  v-for="(step, idx) in calculatedBackoffSteps" 
                  :key="idx"
                  class="flex-shrink-0 flex items-center gap-2"
                >
                  <div class="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/80 flex flex-col items-center min-w-[95px]">
                    <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Retry #{{ idx + 1 }}</span>
                    <span class="text-xs font-mono font-bold text-emerald-400 mt-0.5">{{ step }}s</span>
                    <span v-if="step === form.crashBackoffMaxSeconds" class="text-[9px] text-amber-400 mt-0.5 font-mono">(Max Cap)</span>
                  </div>
                  <span v-if="idx < calculatedBackoffSteps.length - 1" class="text-zinc-600 text-xs font-mono">➔</span>
                </div>
                <div v-if="form.crashMaxRetries > 0" class="flex-shrink-0 flex items-center gap-2">
                  <span class="text-zinc-600 text-xs font-mono">➔</span>
                  <div class="px-3 py-2 rounded-lg bg-red-950/40 border border-red-900/60 flex flex-col items-center min-w-[105px]">
                    <span class="text-[10px] text-red-400 uppercase font-bold tracking-wider">Circuit Breaker</span>
                    <span class="text-xs font-bold text-red-300 mt-0.5">Halt Watchdog</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- STICKY BOTTOM SAVE BAR COMPONENT -->
      <UnsavedChangesBar
        :show="hasUnsavedChanges"
        :is-saving="isSaving"
        title="Unsaved Changes Detected"
        message="You have unsaved changes in your Minecraft server settings."
        save-label="Save MC Settings"
        saving-label="Saving Settings..."
        theme="blue"
        @save="saveSettings"
        @discard="discardChanges"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import UnsavedChangesBar from '../components/UnsavedChangesBar.vue'
import InstanceRestartAlert from '../components/InstanceRestartAlert.vue'
import { useInstanceNotice } from '../stores/instanceNotice'
import {
  Settings2,
  Terminal,
  Folder,
  Sliders,
  Archive,
  RotateCw,
  AlertCircle,
  AlertTriangle,
  Check,
  X,
  Globe,
  Radio,
  Copy,
  ShieldCheck,
  ExternalLink,
  Lock,
  Users,
  Tv,
  Eye,
  Box,
  Swords,
  Compass,
  ShieldAlert,
  Skull,
  Shield,
  Trees,
  Flame,
  Bug,
  Heart,
  Cpu,
  Layers,
  Database,
  FileCode,
  Clock,
  Save,
  Boxes,
  Zap,
  Plus,
  Trash2,
  User,
  Power,
  Activity,
  Timer,
  CheckCircle2,
  Info
} from 'lucide-vue-next'
import {
  getServer,
  getPowerState,
  restartServer,
  getFileContent,
  saveFileContent,
  sendCommand,
  updateServer,
  JAVA_IMAGE_OPTIONS,
  type ServerInstance
} from '../api/servers'

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
  stopTimeoutSeconds: 60,
  runtime: { status: 'stopped' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const isLoading = ref(true)
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const copyPortState = ref(false)

const { markRestartRequired } = useInstanceNotice()

// Active category filter tab
const activeCategory = ref('all')
const categories = [
  { id: 'all', name: 'All Settings', icon: Sliders },
  { id: 'networking', name: 'Networking & Access', icon: Globe },
  { id: 'gameplay', name: 'Gameplay & Rules', icon: Swords },
  { id: 'world', name: 'World & Generation', icon: Trees },
  { id: 'runtime', name: 'Container & Hardware', icon: Layers },
  { id: 'watchdog', name: 'Watchdog & Reliability', icon: ShieldCheck }
]

// Gamemode Options
const gamemodes = [
  {
    id: 'survival',
    title: 'Survival',
    desc: 'Search for resources, craft tools, gain levels, health and hunger mechanics.',
    icon: Swords,
    iconBg: 'bg-emerald-950/50 border border-emerald-800/60',
    iconColor: 'text-emerald-400'
  },
  {
    id: 'creative',
    title: 'Creative',
    desc: 'Unlimited blocks, free flying, instant block destruction, and total invulnerability.',
    icon: Boxes,
    iconBg: 'bg-blue-950/50 border border-blue-800/60',
    iconColor: 'text-blue-400'
  },
  {
    id: 'adventure',
    title: 'Adventure',
    desc: 'Cannot destroy or place blocks without proper tools. Designed for custom adventure maps.',
    icon: Compass,
    iconBg: 'bg-amber-950/50 border border-amber-800/60',
    iconColor: 'text-amber-400'
  },
  {
    id: 'spectator',
    title: 'Spectator',
    desc: 'Invisible to players, noclip through blocks, and inspect mob/player first-person views.',
    icon: Eye,
    iconBg: 'bg-purple-950/50 border border-purple-800/60',
    iconColor: 'text-purple-400'
  }
]

// Difficulty Options
const difficulties = [
  {
    id: 'peaceful',
    name: 'Peaceful',
    subtitle: 'No hostile mobs, fast regen',
    icon: Heart,
    activeClass: 'bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
  },
  {
    id: 'easy',
    name: 'Easy',
    subtitle: 'Weaker mobs, cannot starve',
    icon: Shield,
    activeClass: 'bg-sky-950/50 border-sky-500 text-sky-300 ring-1 ring-sky-500/50'
  },
  {
    id: 'normal',
    name: 'Normal',
    subtitle: 'Standard vanilla gameplay',
    icon: Zap,
    activeClass: 'bg-amber-950/50 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
  },
  {
    id: 'hard',
    name: 'Hard',
    subtitle: 'Starvation kills, heavy mob dmg',
    icon: Skull,
    activeClass: 'bg-rose-950/50 border-rose-500 text-rose-300 ring-1 ring-rose-500/50'
  }
]

// Visual Form State (Normalized)
interface SettingsForm {
  // Networking & Access
  serverPort: number
  whitelist: boolean
  enforceWhitelist: boolean
  opPermissionLevel: number
  onlineMode: boolean
  maxPlayers: number
  motd: string
  // Gameplay
  gamemode: string
  difficulty: string
  pvp: boolean
  hardcore: boolean
  spawnProtection: number
  // World & Environment
  levelName: string
  levelSeed: string
  allowNether: boolean
  spawnMonsters: boolean
  spawnAnimals: boolean
  spawnNpcs: boolean
  viewDistance: number
  simulationDistance: number
  // Container & Runtime
  maxMemoryMb: number
  minMemoryMb: number
  serverJar: string
  dockerImage: string
  stopTimeoutSeconds: number
  // Watchdog & Reliability
  autoStartOnBoot: boolean
  autoRestartOnCrash: boolean
  crashBackoffInitialSeconds: number
  crashBackoffMaxSeconds: number
  crashMaxRetries: number
}

const form = reactive<SettingsForm>({
  serverPort: 25565,
  whitelist: false,
  enforceWhitelist: false,
  opPermissionLevel: 4,
  onlineMode: true,
  maxPlayers: 20,
  motd: 'A Minecraft Server',
  gamemode: 'survival',
  difficulty: 'normal',
  pvp: true,
  hardcore: false,
  spawnProtection: 16,
  levelName: 'world',
  levelSeed: '',
  allowNether: true,
  spawnMonsters: true,
  spawnAnimals: true,
  spawnNpcs: true,
  viewDistance: 10,
  simulationDistance: 10,
  maxMemoryMb: 2048,
  minMemoryMb: 1024,
  serverJar: 'server.jar',
  dockerImage: 'eclipse-temurin:21-jre-alpine',
  stopTimeoutSeconds: 60,
  autoStartOnBoot: false,
  autoRestartOnCrash: false,
  crashBackoffInitialSeconds: 5,
  crashBackoffMaxSeconds: 300,
  crashMaxRetries: 5
})

// Calculate simulated exponential backoff progression steps: D(N) = min(T_initial * 2^(N-1), T_max)
const calculatedBackoffSteps = computed(() => {
  const tInit = Math.max(1, form.crashBackoffInitialSeconds || 5)
  const tMax = Math.max(tInit, form.crashBackoffMaxSeconds || 300)
  const maxSteps = form.crashMaxRetries > 0 ? Math.min(form.crashMaxRetries, 8) : 6
  const steps: number[] = []
  for (let i = 1; i <= maxSteps; i++) {
    const delay = Math.min(tInit * Math.pow(2, i - 1), tMax)
    steps.push(Math.round(delay))
  }
  return steps
})

// Check if loaded dockerImage is custom
const isCustomDockerImage = computed(() => {
  if (!form.dockerImage) return false
  return !JAVA_IMAGE_OPTIONS.some(o => o.image === form.dockerImage)
})

// Original snapshot to track unsaved changes
const originalFormSnapshot = ref<string>('')
const rawPropertiesLines = ref<string[]>([])

// Dirty checker
const hasUnsavedChanges = computed(() => {
  if (!originalFormSnapshot.value) return false
  return JSON.stringify(form) !== originalFormSnapshot.value
})

// Status badge styling
const statusBadgeClasses = computed(() => {
  const status = instance.value.runtime?.status || 'stopped'
  switch (status) {
    case 'running':
      return 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
    case 'starting':
    case 'stopping':
    case 'restarting':
      return 'bg-amber-950/60 border-amber-800 text-amber-400'
    case 'error':
      return 'bg-red-950/60 border-red-800 text-red-400'
    default:
      return 'bg-zinc-800 border-zinc-700 text-zinc-400'
  }
})

const statusDotClasses = computed(() => {
  const status = instance.value.runtime?.status || 'stopped'
  switch (status) {
    case 'running':
      return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse'
    case 'starting':
    case 'stopping':
    case 'restarting':
      return 'bg-amber-400 animate-ping'
    case 'error':
      return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
    default:
      return 'bg-zinc-500'
  }
})

// Minecraft MOTD Color Parser (supports § and & codes)
const renderedMotdHtml = computed(() => {
  const text = form.motd || 'A Minecraft Server'
  const colorMap: Record<string, string> = {
    '0': '#000000',
    '1': '#0000AA',
    '2': '#00AA00',
    '3': '#00AAAA',
    '4': '#AA0000',
    '5': '#AA00AA',
    '6': '#FFAA00',
    '7': '#AAAAAA',
    '8': '#555555',
    '9': '#5555FF',
    'a': '#55FF55',
    'b': '#55FFFF',
    'c': '#FF5555',
    'd': '#FF55FF',
    'e': '#FFFF55',
    'f': '#FFFFFF'
  }

  // Normalize & to §
  const normalized = text.replace(/&([0-9a-fk-or])/gi, '§$1')
  const parts = normalized.split(/(§[0-9a-fk-or])/gi)

  let currentColor = '#AAAAAA'
  let isBold = false
  let isItalic = false
  let isUnderline = false
  let isStrikethrough = false
  let html = ''

  for (const part of parts) {
    if (part.startsWith('§')) {
      const code = part.charAt(1).toLowerCase()
      if (colorMap[code]) {
        currentColor = colorMap[code]
        isBold = false
        isItalic = false
        isUnderline = false
        isStrikethrough = false
      } else if (code === 'l') {
        isBold = true
      } else if (code === 'o') {
        isItalic = true
      } else if (code === 'n') {
        isUnderline = true
      } else if (code === 'm') {
        isStrikethrough = true
      } else if (code === 'r') {
        currentColor = '#AAAAAA'
        isBold = false
        isItalic = false
        isUnderline = false
        isStrikethrough = false
      }
    } else if (part) {
      const styles = [
        `color: ${currentColor}`,
        isBold ? 'font-weight: bold' : '',
        isItalic ? 'font-style: italic' : '',
        isUnderline && isStrikethrough 
          ? 'text-decoration: underline line-through' 
          : isUnderline 
            ? 'text-decoration: underline' 
            : isStrikethrough 
              ? 'text-decoration: line-through' 
              : ''
      ].filter(Boolean).join('; ')

      // Escape basic HTML chars
      const escaped = part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      html += `<span style="${styles}">${escaped}</span>`
    }
  }

  return html || '<span style="color: #AAAAAA">A Minecraft Server</span>'
})

// Copy connection port address
function copyPortAddress() {
  const host = window.location.hostname || 'localhost'
  const addr = `${host}:${form.serverPort}`
  navigator.clipboard.writeText(addr)
  copyPortState.value = true
  setTimeout(() => {
    copyPortState.value = false
  }, 2000)
}

// Discard changes
function discardChanges() {
  if (originalFormSnapshot.value) {
    const orig = JSON.parse(originalFormSnapshot.value)
    Object.assign(form, orig)
    successMessage.value = 'Changes discarded.'
    setTimeout(() => {
      successMessage.value = ''
    }, 2500)
  }
}

// Polling timer for runtime power state
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([loadServerData(), loadServerProperties()])
    originalFormSnapshot.value = JSON.stringify(form)
  } finally {
    isLoading.value = false
  }

  pollTimer = setInterval(async () => {
    try {
      const p = await getPowerState(serverId)
      if (p) {
        instance.value.runtime = {
          ...instance.value.runtime,
          status: p.status
        }
      }
    } catch {
      // ignore
    }
  }, 2500)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

// Load server instance configuration
async function loadServerData() {
  try {
    const s = await getServer(serverId)
    if (s) {
      instance.value = s
      if (s.serverPort) form.serverPort = s.serverPort
      if (s.maxMemoryMb) form.maxMemoryMb = s.maxMemoryMb
      if (s.minMemoryMb) form.minMemoryMb = s.minMemoryMb
      if (s.serverJar) form.serverJar = s.serverJar
      if (s.dockerImage) form.dockerImage = s.dockerImage
      form.stopTimeoutSeconds = s.stopTimeoutSeconds !== undefined ? s.stopTimeoutSeconds : 60
      form.autoStartOnBoot = s.autoStartOnBoot !== undefined ? Boolean(s.autoStartOnBoot) : false
      form.autoRestartOnCrash = s.autoRestartOnCrash !== undefined ? Boolean(s.autoRestartOnCrash) : false
      form.crashBackoffInitialSeconds = s.crashBackoffInitialSeconds !== undefined ? Number(s.crashBackoffInitialSeconds) : 5
      form.crashBackoffMaxSeconds = s.crashBackoffMaxSeconds !== undefined ? Number(s.crashBackoffMaxSeconds) : 300
      form.crashMaxRetries = s.crashMaxRetries !== undefined ? Number(s.crashMaxRetries) : 5
    }
  } catch (err: any) {
    console.error('Failed to load server details:', err)
  }
}

// Load server.properties
async function loadServerProperties() {
  errorMessage.value = ''
  try {
    const res = await getFileContent(serverId, 'server.properties')
    const content = res.content || ''
    rawPropertiesLines.value = content.split('\n')

    const props: Record<string, string> = {}
    for (const line of rawPropertiesLines.value) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx !== -1) {
        const k = line.slice(0, eqIdx).trim()
        const v = line.slice(eqIdx + 1).trim()
        props[k] = v
      }
    }

    // Map properties to form
    if (props['server-port']) form.serverPort = Number(props['server-port']) || form.serverPort
    if (props['white-list'] !== undefined) form.whitelist = props['white-list'] === 'true'
    if (props['enforce-whitelist'] !== undefined) form.enforceWhitelist = props['enforce-whitelist'] === 'true'
    if (props['op-permission-level']) form.opPermissionLevel = Number(props['op-permission-level']) || 4
    if (props['online-mode'] !== undefined) form.onlineMode = props['online-mode'] !== 'false'
    if (props['max-players']) form.maxPlayers = Number(props['max-players']) || 20
    if (props['motd'] !== undefined) form.motd = props['motd']

    if (props['gamemode']) form.gamemode = props['gamemode'].toLowerCase()
    if (props['difficulty']) form.difficulty = props['difficulty'].toLowerCase()
    if (props['pvp'] !== undefined) form.pvp = props['pvp'] !== 'false'
    if (props['hardcore'] !== undefined) form.hardcore = props['hardcore'] === 'true'
    if (props['spawn-protection']) form.spawnProtection = Number(props['spawn-protection']) || 16

    if (props['level-name']) form.levelName = props['level-name']
    if (props['level-seed'] !== undefined) form.levelSeed = props['level-seed']
    if (props['allow-nether'] !== undefined) form.allowNether = props['allow-nether'] !== 'false'
    if (props['spawn-monsters'] !== undefined) form.spawnMonsters = props['spawn-monsters'] !== 'false'
    if (props['spawn-animals'] !== undefined) form.spawnAnimals = props['spawn-animals'] !== 'false'
    if (props['spawn-npcs'] !== undefined) form.spawnNpcs = props['spawn-npcs'] !== 'false'
    if (props['view-distance']) form.viewDistance = Number(props['view-distance']) || 10
    if (props['simulation-distance']) form.simulationDistance = Number(props['simulation-distance']) || 10
  } catch (err: any) {
    // If server.properties doesn't exist yet, preserve defaults
    console.warn('server.properties not found or unreadable, using vanilla defaults', err)
  }
}

// Save Settings
async function saveSettings() {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // 1. Reconstruct server.properties preserving comments
    const propMap: Record<string, string> = {
      'server-port': String(form.serverPort),
      'white-list': String(form.whitelist),
      'enforce-whitelist': String(form.enforceWhitelist),
      'op-permission-level': String(form.opPermissionLevel),
      'online-mode': String(form.onlineMode),
      'max-players': String(form.maxPlayers),
      'motd': form.motd,
      'gamemode': form.gamemode,
      'difficulty': form.difficulty,
      'pvp': String(form.pvp),
      'hardcore': String(form.hardcore),
      'spawn-protection': String(form.spawnProtection),
      'level-name': form.levelName,
      'level-seed': form.levelSeed,
      'allow-nether': String(form.allowNether),
      'spawn-monsters': String(form.spawnMonsters),
      'spawn-animals': String(form.spawnAnimals),
      'spawn-npcs': String(form.spawnNpcs),
      'view-distance': String(form.viewDistance),
      'simulation-distance': String(form.simulationDistance)
    }

    const updatedKeys = new Set<string>()
    const outputLines: string[] = []

    if (rawPropertiesLines.value && rawPropertiesLines.value.length > 0) {
      for (const line of rawPropertiesLines.value) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
          outputLines.push(line)
          continue
        }
        const eqIdx = line.indexOf('=')
        if (eqIdx !== -1) {
          const k = line.slice(0, eqIdx).trim()
          if (propMap[k] !== undefined) {
            outputLines.push(`${k}=${propMap[k]}`)
            updatedKeys.add(k)
          } else {
            outputLines.push(line)
          }
        } else {
          outputLines.push(line)
        }
      }
    }

    // Append any keys that weren't in the original file
    for (const [k, v] of Object.entries(propMap)) {
      if (!updatedKeys.has(k)) {
        outputLines.push(`${k}=${v}`)
      }
    }

    const newPropertiesContent = outputLines.join('\n')

    // 2. Persist to server.properties
    await saveFileContent(serverId, 'server.properties', newPropertiesContent)
    rawPropertiesLines.value = newPropertiesContent.split('\n')

    // 3. Update server instance metadata & container parameters
    await updateServer(serverId, {
      serverPort: form.serverPort,
      maxMemoryMb: form.maxMemoryMb,
      minMemoryMb: form.minMemoryMb,
      serverJar: form.serverJar,
      dockerImage: form.dockerImage,
      stopTimeoutSeconds: form.stopTimeoutSeconds,
      autoStartOnBoot: form.autoStartOnBoot,
      autoRestartOnCrash: form.autoRestartOnCrash,
      crashBackoffInitialSeconds: form.crashBackoffInitialSeconds,
      crashBackoffMaxSeconds: form.crashBackoffMaxSeconds,
      crashMaxRetries: form.crashMaxRetries
    })

    // 4. Update local snapshot
    originalFormSnapshot.value = JSON.stringify(form)
    successMessage.value = 'Minecraft settings successfully saved!'

    // 5. If server is running, mark restart required across all pages
    if (instance.value.runtime?.status === 'running') {
      markRestartRequired(serverId)
    }

    setTimeout(() => {
      if (successMessage.value === 'Minecraft settings successfully saved!') {
        successMessage.value = ''
      }
    }, 4000)
  } catch (err: any) {
    console.error('Failed to save settings:', err)
    errorMessage.value = `Failed to save settings: ${err.message || 'Unknown error'}`
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
@keyframes slideUp {
  from {
    transform: translate(-50%, 20px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
