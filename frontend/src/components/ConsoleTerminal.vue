<template>
  <div 
    ref="wrapperRef"
    class="w-full flex flex-col font-sans transition-all duration-300"
    :class="[
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-zinc-950 p-4 h-screen' 
        : 'relative max-w-7xl mx-auto'
    ]"
  >
    <!-- 1. Instance Control Header Bar (matches MCSManager screenshot) -->
    <div v-if="!isFullscreen" class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
          <!-- Cube / Minecraft Instance Icon -->
          <Box class="w-5 h-5 text-emerald-400" />
        </div>
        
        <h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          {{ instanceName }}
        </h1>

        <!-- Status Badge -->
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
          :class="statusBadgeClasses"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClasses"></span>
          <span>{{ statusText }}</span>
        </div>

        <!-- Node / Index Badge -->
        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 text-xs font-mono">
          <Layers class="w-3.5 h-3.5" />
          <span>{{ nodeId }}</span>
        </div>

        <!-- Real-time Container Telemetry Badges -->
        <div v-if="internalStatus === 'running' && serverStats" class="hidden sm:flex items-center gap-2">
          <!-- CPU Badge -->
          <div 
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-950/50 border border-sky-800/60 text-xs font-mono text-sky-300 shadow-sm"
            title="Container CPU usage"
          >
            <Cpu class="w-3.5 h-3.5 text-sky-400" />
            <span class="font-semibold">{{ serverStats.cpuPercent?.toFixed(1) || '0.0' }}%</span>
          </div>

          <!-- Memory Badge -->
          <div 
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/50 border border-amber-800/60 text-xs font-mono text-amber-300 shadow-sm"
            title="JVM heap usage vs. configured -Xmx limit"
          >
            <HardDrive class="w-3.5 h-3.5 text-amber-400" />
            <span>
              <strong class="font-semibold text-amber-200">{{ formatMetricBytes(serverStats.memoryBytes || serverStats.memoryUsageBytes) }}</strong>
              <span class="text-zinc-500 font-normal"> / {{ formatMetricBytes(activeMaxMemory * 1024 * 1024) }}</span>
              <span class="text-zinc-400 font-sans ml-1 text-[10px]">({{ jvmMemPercent }}%)</span>
            </span>
          </div>

          <!-- Disk Badge (30s TTL cached) -->
          <div 
            v-if="serverStats.diskBytes"
            class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700/60 text-xs font-mono text-zinc-400 shadow-sm"
            title="Data directory disk volume (cached 30s)"
          >
            <Folder class="w-3.5 h-3.5 text-zinc-400" />
            <span>{{ formatMetricBytes(serverStats.diskBytes) }}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <!-- If starting / restarting: Show loading state -->
        <button
          v-if="internalStatus === 'starting' || internalStatus === 'restarting'"
          type="button"
          disabled
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium text-sky-400 bg-zinc-900 border border-sky-800/80 cursor-wait opacity-80"
        >
          <RotateCw class="w-4 h-4 text-sky-400 animate-spin" />
          <span>{{ internalStatus === 'starting' ? 'Starting...' : 'Restarting...' }}</span>
        </button>

        <!-- If stopping: Show stopping state -->
        <button
          v-else-if="internalStatus === 'stopping'"
          type="button"
          disabled
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium text-amber-400 bg-zinc-900 border border-amber-800/80 cursor-wait opacity-80"
        >
          <RotateCw class="w-4 h-4 text-amber-400 animate-spin" />
          <span>Stopping...</span>
        </button>

        <!-- If stopped or error: Show Start button -->
        <button
          v-else-if="internalStatus === 'stopped' || internalStatus === 'error'"
          type="button"
          @click="handleStart"
          :disabled="isActionLoading"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium text-emerald-400 bg-zinc-900 border border-emerald-800/80 hover:bg-emerald-950/40 hover:border-emerald-500 transition-colors disabled:opacity-50"
        >
          <Play class="w-4 h-4 text-emerald-400 fill-current" />
          <span>Start Server</span>
        </button>

        <!-- If running: Show Stop, Restart, Terminate -->
        <template v-else>
          <button
            type="button"
            @click="handleStop"
            :disabled="isActionLoading"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-700/70 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
          >
            <CircleStop class="w-4 h-4 text-amber-400" />
            <span>Stop</span>
          </button>

          <button
            type="button"
            @click="handleRestart"
            :disabled="isActionLoading"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-700/70 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
          >
            <RotateCw class="w-4 h-4 text-sky-400" :class="{ 'animate-spin': isRestarting }" />
            <span>Restart</span>
          </button>

          <button
            type="button"
            @click="handleTerminate"
            :disabled="isActionLoading"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-red-400 bg-zinc-900 border border-red-900/60 hover:bg-red-950/40 hover:border-red-600 transition-colors disabled:opacity-50"
          >
            <XCircle class="w-4 h-4 text-red-400" />
            <span>Terminate</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Watchdog Auto-Recovery Active Countdown Banner -->
    <div 
      v-if="!isFullscreen && autoRestart?.isWaitingRestart && (internalStatus === 'stopped' || internalStatus === 'error')"
      class="mb-4 p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-900/50 border border-amber-700/70 flex items-center justify-center flex-shrink-0 text-amber-400 animate-pulse">
          <RotateCw class="w-5 h-5 animate-spin" style="animation-duration: 3s;" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-amber-100">Crash Auto-Recovery Active</h4>
            <span class="font-mono text-xs px-2 py-0.5 rounded bg-amber-900/80 border border-amber-700 text-amber-200">
              Attempt {{ autoRestart.crashAttempts }} / {{ autoRestart.maxRetries > 0 ? autoRestart.maxRetries : '∞' }}
            </span>
          </div>
          <p class="text-xs text-amber-300/90 mt-0.5 leading-relaxed">
            Instance unexpectedly crashed. Exponential backoff delay active. Retrying automatically in 
            <span class="font-mono font-bold text-amber-100 underline decoration-amber-400 underline-offset-2">{{ remainingSeconds }}s</span>.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Restart Now Button -->
        <button
          type="button"
          @click="handleStart"
          :disabled="isActionLoading"
          class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Restart Now</span>
        </button>

        <!-- Cancel Auto-Restart Button -->
        <button
          type="button"
          @click="handleCancelAutoRestart"
          :disabled="isActionLoading"
          class="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <CircleStop class="w-3.5 h-3.5 text-red-400" />
          <span>Cancel Auto-Restart</span>
        </button>
      </div>
    </div>

    <!-- Circuit Breaker Tripped Warning Banner -->
    <div 
      v-if="!isFullscreen && autoRestart?.haltedReason && (internalStatus === 'stopped' || internalStatus === 'error')"
      class="mb-4 p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-red-900/60 border border-red-700/80 flex items-center justify-center flex-shrink-0 text-red-400">
          <AlertTriangle class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-red-100">Auto-Recovery Circuit Breaker Tripped</h4>
            <span class="font-mono text-xs px-2 py-0.5 rounded bg-red-900/80 border border-red-700 text-red-200">
              Watchdog Halted
            </span>
          </div>
          <p class="text-xs text-red-300/90 mt-0.5 leading-relaxed">
            Continuous crashes exceeded limit ({{ autoRestart.crashAttempts }}/{{ autoRestart.maxRetries }}). 
            {{ autoRestart.haltedReason || 'Watchdog halted automatic restarts to prevent crash loops and protect server files.' }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          @click="handleStart"
          :disabled="isActionLoading"
          class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Manual Start</span>
        </button>
      </div>
    </div>

    <!-- Missing Server Core Warning Banner -->
    <div 
      v-if="!isFullscreen && isServerJarMissing && (internalStatus === 'stopped' || internalStatus === 'error')"
      class="mb-4 p-4 rounded-xl bg-amber-950/40 border border-amber-800/70 text-amber-300 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
    >
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-amber-900/50 border border-amber-700/60 flex items-center justify-center flex-shrink-0 text-amber-400">
          <PackageOpen class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-amber-200">Core Server JAR Missing</h4>
            <span class="font-mono text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300">
              {{ currentServerJar || 'server.jar' }}
            </span>
          </div>
          <p class="text-xs text-amber-300/80 mt-0.5">
            The configured executable JAR was not found in the root directory. Server cannot boot without its core file.
          </p>
        </div>
      </div>

      <button
        type="button"
        @click="openReinstallModal"
        class="px-3.5 py-2 rounded-lg text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all shadow flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
      >
        <Download class="w-4 h-4" />
        <span>Reinstall Server Core</span>
      </button>
    </div>

    <!-- 2. Terminal Container -->
    <div 
      class="flex-1 flex flex-col rounded-xl overflow-hidden border border-zinc-800 bg-[#121212] shadow-2xl transition-all"
      :class="[isFullscreen ? 'h-[calc(100vh-80px)]' : 'min-h-[380px] h-[450px]']"
    >
      <!-- Terminal Sub-Header Toolbar -->
      <div class="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800/80 bg-zinc-900/90 text-xs select-none backdrop-blur-sm">
        <!-- Left: Stream connection status -->
        <div class="flex items-center gap-2.5">
          <div class="flex items-center gap-1.5">
            <span 
              class="w-2 h-2 rounded-full transition-colors"
              :class="connectionStatusClasses"
            ></span>
            <span class="font-medium text-zinc-300">
              {{ connectionText }}
            </span>
          </div>
          <span class="text-zinc-500 font-mono text-[11px] hidden sm:inline">
            {{ instanceId }}
          </span>
        </div>

        <!-- Right: Control Actions -->
        <div class="flex items-center gap-1">
          <!-- Auto Scroll Toggle -->
          <button
            type="button"
            @click="toggleAutoScroll"
            :title="autoScroll ? 'Disable Auto Scroll' : 'Enable Auto Scroll'"
            class="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            :class="{ 'text-emerald-400 bg-emerald-950/40': autoScroll }"
          >
            <ArrowDownToLine class="w-3.5 h-3.5" />
          </button>

          <!-- Scroll to Bottom -->
          <button
            type="button"
            @click="scrollToBottom"
            title="Scroll to Bottom"
            class="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronsDown class="w-3.5 h-3.5" />
          </button>

          <!-- Clear Terminal -->
          <button
            type="button"
            @click="clearTerminal"
            title="Clear Console Screen"
            class="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>

          <!-- Fullscreen Toggle -->
          <button
            type="button"
            @click="toggleFullscreen"
            :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
            class="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors ml-1"
          >
            <Minimize2 v-if="isFullscreen" class="w-3.5 h-3.5" />
            <Maximize2 v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- 3. Terminal Canvas Mount Target -->
      <div 
        ref="terminalRef" 
        class="flex-1 w-full overflow-hidden bg-[#121212] relative cursor-text"
        @click="focusInput"
      >
        <!-- Loading Overlay during connection -->
        <div 
          v-if="isConnecting && !hasReceivedFirstMessage" 
          class="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[1px] z-10 text-zinc-400 text-sm gap-2"
        >
          <RotateCw class="w-4 h-4 animate-spin text-emerald-400" />
          <span>Connecting to console stream...</span>
        </div>
      </div>
    </div>

    <!-- 4. Bottom Command Input Bar -->
    <div class="mt-3 relative">
      <form 
        @submit.prevent="submitCommand"
        class="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all"
      >
        <!-- Prompt icon -->
        <div class="pl-2 pr-1 text-zinc-500 select-none flex items-center gap-1 font-mono text-sm">
          <Terminal class="w-4 h-4 text-zinc-400" />
          <span class="text-zinc-600">&gt;</span>
        </div>

        <!-- Input Field -->
        <input
          ref="inputRef"
          v-model="commandInput"
          type="text"
          :disabled="isSending"
          @keydown="handleKeyDown"
          placeholder="Enter command and press enter to send, use arrow keys to navigate historical commands"
          class="flex-1 bg-transparent py-1.5 px-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none font-mono"
          autocomplete="off"
          spellcheck="false"
        />

        <!-- Send / Loading Button -->
        <button
          type="submit"
          :disabled="!commandInput.trim() || isSending"
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans flex items-center gap-1.5 transition-all text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:active:scale-100"
        >
          <Send v-if="!isSending" class="w-3.5 h-3.5" />
          <RotateCw v-else class="w-3.5 h-3.5 animate-spin" />
          <span>Send</span>
        </button>
      </form>

      <!-- Keyboard Shortcut Helper Hints & Command Status -->
      <div class="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 px-2">
        <div class="flex items-center gap-2">
          <span>Use <kbd class="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">↑</kbd> <kbd class="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">↓</kbd> for history</span>
          <span v-if="internalStatus === 'stopped'" class="text-amber-400 font-medium">
            (Server is stopped. Start server to send commands)
          </span>
        </div>
        <div v-if="lastCommandStatus">
          <span :class="lastCommandStatus.success ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'">
            {{ lastCommandStatus.text }}
          </span>
        </div>
      </div>
    </div>

    <!-- 5. Quick Action Cards (Files, Configs, Backups, Settings & Logs) -->
    <div v-if="!isFullscreen" class="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- File Manager Card -->
      <router-link
        :to="`/instances/${instanceId}/files`"
        class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-4 flex items-center justify-between hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group cursor-pointer"
      >
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform flex-shrink-0">
            <Folder class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
              File Manager
            </h4>
            <p class="text-xs text-zinc-400 mt-0.5">
              Browse files, upload jars & plugins
            </p>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </router-link>

      <!-- Config Editor Card -->
      <router-link
        :to="`/instances/${instanceId}/configs`"
        class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-4 flex items-center justify-between hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group cursor-pointer"
      >
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform flex-shrink-0">
            <Sliders class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
              Config Editor
            </h4>
            <p class="text-xs text-zinc-400 mt-0.5">
              Visual editor for properties, YAML, TOML
            </p>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </router-link>

      <!-- Backups & Snapshots Card -->
      <router-link
        :to="`/instances/${instanceId}/backups`"
        class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-4 flex items-center justify-between hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group cursor-pointer"
      >
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-lg bg-sky-950/40 border border-sky-800/60 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform flex-shrink-0">
            <Archive class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-zinc-100 group-hover:text-sky-400 transition-colors">
              Backups
            </h4>
            <p class="text-xs text-zinc-400 mt-0.5">
              Full instance snapshots & restore
            </p>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </router-link>

      <!-- MC Settings Card -->
      <router-link
        :to="`/instances/${instanceId}/settings`"
        class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-4 flex items-center justify-between hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group cursor-pointer"
      >
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-800/60 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform flex-shrink-0">
            <Settings2 class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
              MC Settings
            </h4>
            <p class="text-xs text-zinc-400 mt-0.5">
              Port, whitelist, gamemode & runtime
            </p>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </router-link>

      <!-- Logs Card -->
      <router-link
        :to="`/instances/${instanceId}/logs`"
        class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm p-4 flex items-center justify-between hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group cursor-pointer"
      >
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-lg bg-violet-950/40 border border-violet-800/60 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform flex-shrink-0">
            <ScrollText class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-zinc-100 group-hover:text-violet-400 transition-colors">
              Logs
            </h4>
            <p class="text-xs text-zinc-400 mt-0.5">
              Log archives &amp; audit trail
            </p>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </router-link>
    </div>

    <!-- Instance Settings Modal -->
    <div 
      v-if="isSettingsModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div class="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
        <!-- Header (Fixed at top) -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0 bg-[#202024]">
          <div class="flex items-center gap-2.5">
            <Settings class="w-5 h-5 text-blue-400" />
            <h3 class="text-base font-bold text-zinc-100">Instance Settings</h3>
          </div>
          <button 
            type="button" 
            @click="isSettingsModalOpen = false"
            class="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Scrollable Modal Body (max-h-[90vh] content) -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <!-- Instance Overview -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div>
              <span class="text-zinc-500 block">Instance Name</span>
              <span class="font-medium text-zinc-200 truncate block mt-0.5">{{ instanceName }}</span>
            </div>
            <div>
              <span class="text-zinc-500 block">Instance ID / Slug</span>
              <span class="font-mono text-zinc-300 block mt-0.5">{{ instanceId }}</span>
            </div>
            <div>
              <span class="text-zinc-500 block">Current Status</span>
              <span class="font-medium capitalize block mt-0.5" :class="internalStatus === 'running' ? 'text-emerald-400' : 'text-zinc-400'">{{ internalStatus }}</span>
            </div>
            <div>
              <span class="text-zinc-500 block">Cluster Node</span>
              <span class="font-mono text-zinc-300 block mt-0.5">Node #{{ nodeId }}</span>
            </div>
          </div>

          <!-- Resource Allocation & Server Settings -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-blue-400">
                <HardDrive class="w-4 h-4" />
                <h4 class="text-sm font-bold uppercase tracking-wider">Memory & Entry Configuration</h4>
              </div>
              <span class="text-[11px] text-zinc-500 font-mono">Resource Limits</span>
            </div>

            <div class="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <!-- Server Entry JAR -->
              <div>
                <label class="font-medium text-zinc-300 block text-xs mb-1.5">Server Entry JAR</label>
                <div class="relative">
                  <input
                    v-model="selectedServerJar"
                    type="text"
                    placeholder="e.g. server.jar"
                    class="w-full h-10 px-3.5 rounded-lg bg-[#202024] border border-zinc-700/70 hover:border-zinc-600 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div class="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                  <span>Executable archive invoked upon container boot</span>
                  <span v-if="selectedServerJar.trim() !== currentServerJar" class="text-amber-400 font-medium">Unsaved</span>
                </div>
              </div>

              <!-- Memory Grid: Min & Max Memory -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Min Memory -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="font-medium text-zinc-300 text-xs">Minimum Memory (MB)</label>
                    <span class="font-mono text-[11px] text-zinc-400">{{ (Number(selectedMinMemory) / 1024).toFixed(1) }} GB</span>
                  </div>
                  <input
                    v-model.number="selectedMinMemory"
                    type="number"
                    step="256"
                    min="256"
                    max="65536"
                    class="w-full h-10 px-3.5 rounded-lg bg-[#202024] border border-zinc-700/70 hover:border-zinc-600 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                  <p class="text-[10px] text-zinc-500 mt-1">Initial JVM heap allocation (-Xms)</p>
                </div>

                <!-- Max Memory -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="font-medium text-zinc-300 text-xs">Maximum Memory (MB)</label>
                    <span class="font-mono text-[11px] text-zinc-400">{{ (Number(selectedMaxMemory) / 1024).toFixed(1) }} GB</span>
                  </div>
                  <input
                    v-model.number="selectedMaxMemory"
                    type="number"
                    step="256"
                    min="512"
                    max="131072"
                    class="w-full h-10 px-3.5 rounded-lg bg-[#202024] border border-zinc-700/70 hover:border-zinc-600 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                  <p class="text-[10px] text-zinc-500 mt-1">Max JVM heap & container limit (-Xmx)</p>
                </div>
              </div>

              <!-- Java Runtime -->
              <div class="pt-2 border-t border-zinc-800">
                <label class="font-medium text-zinc-300 block text-xs mb-1.5">Java Runtime (Docker Image)</label>
                <div class="relative">
                  <select
                    v-model="selectedDockerImage"
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
                <div class="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5 font-mono">
                  <span>Current image: <span class="text-zinc-300">{{ activeDockerImage }}</span></span>
                  <span v-if="selectedDockerImage !== activeDockerImage" class="text-amber-400 font-sans font-medium">Unsaved</span>
                </div>
              </div>

              <!-- Graceful Stop Timeout -->
              <div class="pt-2 border-t border-zinc-800">
                <div class="flex items-center justify-between mb-1.5">
                  <label class="font-medium text-zinc-300 text-xs">Graceful Stop Timeout (Seconds)</label>
                  <span class="font-mono text-[11px] text-zinc-400">{{ selectedStopTimeout }}s</span>
                </div>
                <input
                  v-model.number="selectedStopTimeout"
                  type="number"
                  min="5"
                  max="300"
                  step="5"
                  class="w-full h-10 px-3.5 rounded-lg bg-[#202024] border border-zinc-700/70 hover:border-zinc-600 text-zinc-100 font-mono text-sm outline-none focus:border-blue-500 transition-colors"
                />
                <div class="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Grace period (5-300s, default 60s) allowing Minecraft to save all chunks before shutdown.</span>
                  <span v-if="Number(selectedStopTimeout) !== Number(activeStopTimeout)" class="text-amber-400 font-sans font-medium">Unsaved</span>
                </div>
              </div>

              <!-- Save Success / Error Messages -->
              <div v-if="settingsSaveSuccess" class="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Check class="w-4 h-4 flex-shrink-0" />
                  <span>Configuration saved! Restart server to apply memory & runtime changes.</span>
                </div>
                <button 
                  v-if="internalStatus === 'running'"
                  type="button"
                  @click="handleRestart"
                  class="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-[11px] transition-colors"
                >
                  Restart Now
                </button>
              </div>

              <div v-if="settingsSaveError" class="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle class="w-4 h-4 flex-shrink-0" />
                <span>{{ settingsSaveError }}</span>
              </div>

              <!-- Save Settings Button -->
              <div class="flex justify-end pt-1">
                <button
                  type="button"
                  @click="handleSaveSettings"
                  :disabled="isSavingSettings || !hasUnsavedSettings"
                  class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-blue-600 disabled:active:scale-100 cursor-pointer"
                >
                  <RotateCw v-if="isSavingSettings" class="w-3.5 h-3.5 animate-spin" />
                  <Check v-else class="w-3.5 h-3.5" />
                  <span>{{ isSavingSettings ? 'Saving...' : (hasUnsavedSettings ? 'Save Configuration Changes' : 'Saved') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Danger Zone Section -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-2 text-red-400">
              <AlertTriangle class="w-4 h-4" />
              <h4 class="text-sm font-bold uppercase tracking-wider">Danger Zone</h4>
            </div>

            <div class="p-4 rounded-xl bg-red-950/20 border border-red-900/40 space-y-4">
              <div>
                <h5 class="text-xs font-semibold text-zinc-200">Delete Server Instance</h5>
                <p class="text-[11px] text-zinc-400 mt-0.5">
                  Permanently deletes this instance container and database registration.
                </p>
              </div>

              <div v-if="internalStatus === 'running'" class="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle class="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>Server is running. Please stop the server before deleting.</span>
              </div>

              <!-- Checkbox: Delete Server Data on Disk -->
              <label class="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 cursor-pointer select-none hover:border-zinc-700 transition-colors">
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
                    Permanently erases world saves, plugins, logs, and configs from disk. If unchecked, files remain preserved on disk.
                  </span>
                </div>
              </label>

              <!-- Delete Error Banner -->
              <div v-if="deleteError" class="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle class="w-4 h-4 flex-shrink-0" />
                <span>{{ deleteError }}</span>
              </div>

              <!-- Delete Button -->
              <button
                type="button"
                @click="handleDeleteInstance"
                :disabled="isDeletingInstance || internalStatus === 'running'"
                class="w-full py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:bg-red-600 disabled:active:scale-100"
              >
                <RotateCw v-if="isDeletingInstance" class="w-3.5 h-3.5 animate-spin" />
                <Trash2 v-else class="w-3.5 h-3.5" />
                <span>{{ isDeletingInstance ? 'Deleting Instance...' : 'Delete This Instance' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer (Fixed at bottom) -->
        <div class="flex items-center justify-end px-6 py-3.5 border-t border-zinc-800 flex-shrink-0 bg-[#202024]">
          <button
            type="button"
            @click="isSettingsModalOpen = false"
            class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Reinstall Server Core Modal Dialog -->
    <div 
      v-if="isReinstallModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#1a1a1e] flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Download class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-100">Reinstall Server Core</h3>
              <p class="text-[11px] text-zinc-500">Download and configure executable server core</p>
            </div>
          </div>
          <button 
            type="button" 
            @click="isReinstallModalOpen = false" 
            class="text-zinc-400 hover:text-zinc-200"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          <!-- Info Notice -->
          <div class="p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-300 text-[11px] space-y-1">
            <div class="flex items-center justify-between font-mono">
              <span class="text-zinc-400">Target Executable File:</span>
              <span class="text-sky-400 font-semibold">{{ currentServerJar || 'server.jar' }}</span>
            </div>
            <p class="text-zinc-500 text-[10px]">
              Existing worlds, player data, plugins, and configs will be completely preserved. Only the server core executable is downloaded and linked.
            </p>
          </div>

          <!-- Auto-Detection Status Banner -->
          <div v-if="detectedEnv" class="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-zinc-900 border border-blue-800/40 text-xs space-y-2 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 font-semibold text-blue-200">
                <Sparkles class="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />
                <span>Smart Environment Detection</span>
              </div>
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wide border"
                :class="detectedEnv.confidence === 'high' 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60' 
                  : (detectedEnv.confidence === 'medium' ? 'bg-blue-950/60 text-blue-300 border-blue-700/60' : 'bg-zinc-800 text-zinc-400 border-zinc-700')"
              >
                {{ detectedEnv.confidence }} confidence
              </span>
            </div>
            <div class="text-[11.5px] text-zinc-300 leading-relaxed">
              Detected server architecture as <strong class="text-white font-semibold">{{ detectedEnv.familyName }}</strong>
              <template v-if="detectedEnv.version">
                for Minecraft <strong class="text-amber-300 font-mono font-semibold">{{ detectedEnv.version }}</strong>
              </template>.
            </div>
            <div v-if="detectedEnv.reasons.length > 0" class="text-[10px] text-zinc-400 space-y-0.5 pt-1 border-t border-blue-900/30">
              <div v-for="(reason, idx) in detectedEnv.reasons" :key="idx" class="flex items-center gap-1.5">
                <span class="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0"></span>
                <span class="truncate">{{ reason }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="isDetectingCore" class="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
            <RotateCw class="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Analyzing server directory structure and configurations...</span>
          </div>

          <!-- Loading Frameworks Spinner -->
          <div v-if="isLoadingJarTypes" class="py-8 text-center text-zinc-500">
            <RotateCw class="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
            <span>Loading available server software frameworks...</span>
          </div>

          <div v-else class="space-y-3.5">
            <!-- Core Software Framework Picker -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="font-medium text-zinc-300 block text-xs">1. Select Server Software Framework</label>
                <span v-if="detectedEnv && selectedCoreType === detectedEnv.family" class="text-[10px] text-blue-400 flex items-center gap-1">
                  <Sparkles class="w-3 h-3" />
                  <span>Auto-detected</span>
                </span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="item in jarTypesList"
                  :key="item.type"
                  type="button"
                  @click="selectedCoreType = item.type; handleCoreTypeChange()"
                  :class="[
                    'p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 cursor-pointer',
                    selectedCoreType === item.type 
                      ? 'bg-amber-950/40 border-amber-500/70 text-amber-200 shadow-sm' 
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  ]"
                >
                  <img v-if="item.icon" :src="item.icon" class="w-5 h-5 object-contain rounded flex-shrink-0" alt="" />
                  <Box v-else class="w-4 h-4 flex-shrink-0" />
                  <div class="truncate">
                    <div class="font-semibold text-xs truncate">{{ item.name }}</div>
                    <div class="text-[9.5px] text-zinc-500 capitalize">{{ item.category || 'server' }}</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Version Selector -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="font-medium text-zinc-300 text-xs">2. Select Minecraft Version</label>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none hover:text-zinc-200">
                    <input 
                      v-model="showSnapshots" 
                      type="checkbox" 
                      class="rounded bg-zinc-800 border-zinc-700 accent-amber-500 w-3.5 h-3.5 cursor-pointer" 
                    />
                    <span>Show snapshots</span>
                  </label>
                  <span v-if="isLoadingJarVersions" class="text-[10px] text-amber-400 animate-pulse">Loading versions...</span>
                </div>
              </div>
              <div class="relative">
                <select
                  v-model="selectedCoreVersion"
                  :disabled="isLoadingJarVersions || displayedCoreVersions.length === 0"
                  class="w-full h-10 px-3.5 pr-9 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-amber-500 appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option 
                    v-for="v in displayedCoreVersions" 
                    :key="v.version" 
                    :value="v.version"
                  >
                    Minecraft {{ v.version }} {{ v.build ? `(Build #${v.build})` : '' }} {{ v.experimental ? '[Experimental]' : '' }}
                  </option>
                </select>
                <ChevronDown class="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div v-if="detectedEnv?.version && selectedCoreVersion === detectedEnv.version" class="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <Check class="w-3 h-3" />
                <span>Matched auto-detected version ({{ detectedEnv.version }})</span>
              </div>
            </div>
          </div>

          <!-- Success Alert -->
          <div v-if="reinstallSuccess" class="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <Check class="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Server core installed successfully as "{{ currentServerJar || 'server.jar' }}". You can now start the server.</span>
          </div>

          <!-- Error Alert -->
          <div v-if="reinstallError" class="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{{ reinstallError }}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-zinc-800 bg-[#1a1a1e] flex items-center justify-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            @click="isReinstallModalOpen = false"
            class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="submitReinstallCore"
            :disabled="isInstallingJar || !selectedCoreType || !selectedCoreVersion"
            class="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 text-xs font-bold shadow transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCw class="w-3.5 h-3.5 animate-spin" v-if="isInstallingJar" />
            <Download class="w-3.5 h-3.5" v-else />
            <span>{{ isInstallingJar ? 'Installing Server Core...' : 'Install Server Core' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { 
  streamServerLogs, 
  sendCommand, 
  startServer, 
  stopServer, 
  restartServer, 
  deleteServer, 
  updateServer, 
  getServer, 
  getServerFiles,
  getJarTypes,
  getJarVersions,
  installJar,
  getServerStats,
  JAVA_IMAGE_OPTIONS,
  type JarType,
  type JarVersion,
  type ServerStats,
  type ServerAutoRestartState
} from '../api/servers'
import { 
  Box, 
  Layers, 
  Play, 
  CircleStop, 
  RotateCw, 
  XCircle, 
  Trash2, 
  ChevronsDown, 
  ArrowDownToLine, 
  Maximize2, 
  Minimize2, 
  Send, 
  Terminal, 
  Settings,
  Settings2,
  AlertTriangle, 
  AlertCircle, 
  X,
  Cpu,
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  Sliders,
  Archive,
  PackageOpen,
  Download,
  HardDrive,
  Sparkles,
  ScrollText
} from 'lucide-vue-next'
import { detectServerCore, type ServerDetectionResult } from '@/utils/serverDetector'

// --- Props & Emits ---
export interface ConsoleTerminalProps {
  instanceId: string
  instanceName?: string
  instanceStatus?: 'running' | 'stopped' | 'starting' | 'stopping' | 'restarting' | 'error'
  dockerImage?: string
  nodeId?: string | number
  apiEndpoint?: string
  autoRestart?: ServerAutoRestartState
}

const props = withDefaults(defineProps<ConsoleTerminalProps>(), {
  instanceName: 'My Minecraft 01',
  instanceStatus: 'running',
  dockerImage: 'eclipse-temurin:21-jre-alpine',
  nodeId: '1',
  apiEndpoint: '/api/v1/servers'
})

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'stop'): void
  (e: 'restart'): void
  (e: 'terminate'): void
  (e: 'command', cmd: string): void
  (e: 'status-change', status: string): void
}>()

const router = useRouter()

// --- Settings & Danger Zone State ---
const isSettingsModalOpen = ref(false)
const deleteFilesOnDisk = ref(false) // Default false (do not delete data)
const isDeletingInstance = ref(false)
const deleteError = ref('')

// Java Runtime Configuration State
const selectedDockerImage = ref(props.dockerImage || 'eclipse-temurin:21-jre-alpine')
const activeDockerImage = ref(props.dockerImage || 'eclipse-temurin:21-jre-alpine')

// Entry JAR and Memory Configuration State
const currentServerJar = ref('server.jar')
const selectedServerJar = ref('server.jar')
const activeMinMemory = ref(1024)
const selectedMinMemory = ref(1024)
const activeMaxMemory = ref(2048)
const selectedMaxMemory = ref(2048)
const activeStopTimeout = ref(60)
const selectedStopTimeout = ref(60)

const isSavingSettings = ref(false)
const settingsSaveSuccess = ref(false)
const settingsSaveError = ref('')

const hasUnsavedSettings = computed(() => {
  return (
    selectedDockerImage.value !== activeDockerImage.value ||
    selectedServerJar.value.trim() !== currentServerJar.value ||
    Number(selectedMinMemory.value) !== Number(activeMinMemory.value) ||
    Number(selectedMaxMemory.value) !== Number(activeMaxMemory.value) ||
    Number(selectedStopTimeout.value) !== Number(activeStopTimeout.value)
  )
})

// Missing Entry Jar Detection State
const isServerJarMissing = ref(false)
const isCheckingJar = ref(false)

async function checkServerJarExistence() {
  isCheckingJar.value = true
  try {
    const [serverDetails, rootFiles] = await Promise.all([
      getServer(props.instanceId),
      getServerFiles(props.instanceId, '')
    ])
    if (serverDetails) {
      if (serverDetails.serverJar) {
        currentServerJar.value = serverDetails.serverJar
        selectedServerJar.value = serverDetails.serverJar
      }
      if (serverDetails.minMemoryMb) {
        activeMinMemory.value = serverDetails.minMemoryMb
        selectedMinMemory.value = serverDetails.minMemoryMb
      }
      if (serverDetails.maxMemoryMb) {
        activeMaxMemory.value = serverDetails.maxMemoryMb
        selectedMaxMemory.value = serverDetails.maxMemoryMb
      }
      if (serverDetails.dockerImage) {
        activeDockerImage.value = serverDetails.dockerImage
        selectedDockerImage.value = serverDetails.dockerImage
      }
      if (serverDetails.stopTimeoutSeconds !== undefined) {
        activeStopTimeout.value = serverDetails.stopTimeoutSeconds
        selectedStopTimeout.value = serverDetails.stopTimeoutSeconds
      }
    }
    const targetJar = (currentServerJar.value || 'server.jar').toLowerCase().trim()
    const found = rootFiles.some(f => !f.isDirectory && f.name.toLowerCase().trim() === targetJar)
    isServerJarMissing.value = !found
  } catch (err) {
    console.warn('Failed to check server entry jar:', err)
  } finally {
    isCheckingJar.value = false
  }
}

// Reinstall Core Modal State
const isReinstallModalOpen = ref(false)
const isInstallingJar = ref(false)
const reinstallError = ref('')
const reinstallSuccess = ref(false)

const jarTypesList = ref<JarType[]>([])
const isLoadingJarTypes = ref(false)
const selectedCoreType = ref('paper')

const jarVersionsList = ref<JarVersion[]>([])
const isLoadingJarVersions = ref(false)
const selectedCoreVersion = ref('')
const showSnapshots = ref(false)

// Smart Auto-Detection State
const isDetectingCore = ref(false)
const detectedEnv = ref<ServerDetectionResult | null>(null)

const isSnapshotVersion = (v: string) => {
  return /^\d{2}w\d+[a-z]/i.test(v) || /-pre|-rc|-snapshot/i.test(v)
}

const displayedCoreVersions = computed(() => {
  if (showSnapshots.value) {
    return jarVersionsList.value
  }
  const releases = jarVersionsList.value.filter(v => !v.experimental && !isSnapshotVersion(v.version))
  return releases.length > 0 ? releases : jarVersionsList.value
})

watch(displayedCoreVersions, (newVersions) => {
  if (newVersions.length > 0 && !newVersions.some(v => v.version === selectedCoreVersion.value)) {
    selectedCoreVersion.value = newVersions[0].version
  }
})

async function openReinstallModal() {
  reinstallError.value = ''
  reinstallSuccess.value = false
  isReinstallModalOpen.value = true
  showSnapshots.value = false

  // 1. Run smart auto-detection
  isDetectingCore.value = true
  let detected: ServerDetectionResult | null = null
  try {
    detected = await detectServerCore(props.instanceId, activeDockerImage.value)
    detectedEnv.value = detected
  } catch (err) {
    console.warn('Auto-detection error:', err)
  } finally {
    isDetectingCore.value = false
  }

  // 2. Fetch server software frameworks and apply detected recommendation
  await fetchJarTypes(detected)
}

async function fetchJarTypes(detected?: ServerDetectionResult | null) {
  isLoadingJarTypes.value = true
  try {
    if (jarTypesList.value.length === 0) {
      const types = await getJarTypes()
      jarTypesList.value = types.filter(t => t.type !== 'empty')
    }

    // Determine target framework: use detected if available in catalog
    let targetType = 'paper'
    if (detected && detected.family && jarTypesList.value.some(t => t.type === detected.family)) {
      targetType = detected.family
    } else {
      const defaultType = jarTypesList.value.find(t => t.type === 'paper') || jarTypesList.value[0]
      if (defaultType) targetType = defaultType.type
    }

    selectedCoreType.value = targetType
    await fetchJarVersionsForType(targetType, detected?.version)
  } catch (err: any) {
    reinstallError.value = err?.message || 'Failed to load core server frameworks'
  } finally {
    isLoadingJarTypes.value = false
  }
}

async function fetchJarVersionsForType(type: string, preferredVersion?: string) {
  isLoadingJarVersions.value = true
  jarVersionsList.value = []
  selectedCoreVersion.value = ''
  try {
    const versions = await getJarVersions(type)
    jarVersionsList.value = versions

    if (preferredVersion) {
      // 1. Exact match
      const exact = versions.find(v => v.version.toLowerCase() === preferredVersion.toLowerCase())
      if (exact) {
        if (exact.experimental || isSnapshotVersion(exact.version)) {
          showSnapshots.value = true
        }
        selectedCoreVersion.value = exact.version
        return
      }

      // 2. Partial match
      const partial = versions.find(v => v.version.startsWith(preferredVersion) || preferredVersion.startsWith(v.version))
      if (partial) {
        if (partial.experimental || isSnapshotVersion(partial.version)) {
          showSnapshots.value = true
        }
        selectedCoreVersion.value = partial.version
        return
      }
    }

    // Fallback to first stable release
    const stable = versions.find(v => !v.experimental && !isSnapshotVersion(v.version)) || versions[0]
    if (stable) {
      selectedCoreVersion.value = stable.version
    }
  } catch (err: any) {
    reinstallError.value = err?.message || 'Failed to load versions for selected core'
  } finally {
    isLoadingJarVersions.value = false
  }
}

async function handleCoreTypeChange() {
  if (selectedCoreType.value) {
    await fetchJarVersionsForType(selectedCoreType.value)
  }
}

async function submitReinstallCore() {
  if (!selectedCoreType.value || !selectedCoreVersion.value) return
  isInstallingJar.value = true
  reinstallError.value = ''
  reinstallSuccess.value = false
  try {
    const target = currentServerJar.value || 'server.jar'
    await installJar(props.instanceId, {
      type: selectedCoreType.value,
      version: selectedCoreVersion.value,
      targetFileName: target,
      updateServerJar: true
    })
    reinstallSuccess.value = true
    await checkServerJarExistence()
    setTimeout(() => {
      isReinstallModalOpen.value = false
    }, 1200)
  } catch (err: any) {
    reinstallError.value = err?.message || 'Failed to install server core'
  } finally {
    isInstallingJar.value = false
  }
}

watch(() => props.dockerImage, (newVal) => {
  if (newVal) {
    activeDockerImage.value = newVal
    selectedDockerImage.value = newVal
  }
})

// When settings modal opens, load latest server details from backend
watch(isSettingsModalOpen, async (isOpen) => {
  if (isOpen) {
    settingsSaveSuccess.value = false
    settingsSaveError.value = ''
    deleteError.value = ''
    try {
      const s = await getServer(props.instanceId)
      if (s) {
        if (s.dockerImage) {
          activeDockerImage.value = s.dockerImage
          selectedDockerImage.value = s.dockerImage
        }
        if (s.serverJar) {
          currentServerJar.value = s.serverJar
          selectedServerJar.value = s.serverJar
        }
        if (s.minMemoryMb) {
          activeMinMemory.value = s.minMemoryMb
          selectedMinMemory.value = s.minMemoryMb
        }
        if (s.maxMemoryMb) {
          activeMaxMemory.value = s.maxMemoryMb
          selectedMaxMemory.value = s.maxMemoryMb
        }
        if (s.stopTimeoutSeconds !== undefined) {
          activeStopTimeout.value = s.stopTimeoutSeconds
          selectedStopTimeout.value = s.stopTimeoutSeconds
        }
      }
    } catch {}
  }
})

async function handleSaveSettings() {
  if (Number(selectedMinMemory.value) > Number(selectedMaxMemory.value)) {
    settingsSaveError.value = 'Minimum memory cannot exceed maximum memory.'
    return
  }
  if (!selectedServerJar.value.trim()) {
    settingsSaveError.value = 'Server Entry JAR cannot be empty.'
    return
  }
  if (Number(selectedStopTimeout.value) < 5 || Number(selectedStopTimeout.value) > 300) {
    settingsSaveError.value = 'Graceful stop timeout must be between 5 and 300 seconds.'
    return
  }

  isSavingSettings.value = true
  settingsSaveError.value = ''
  settingsSaveSuccess.value = false
  try {
    const updated = await updateServer(props.instanceId, {
      dockerImage: selectedDockerImage.value,
      serverJar: selectedServerJar.value.trim(),
      minMemoryMb: Number(selectedMinMemory.value),
      maxMemoryMb: Number(selectedMaxMemory.value),
      stopTimeoutSeconds: Number(selectedStopTimeout.value)
    })
    if (updated) {
      activeDockerImage.value = updated.dockerImage || selectedDockerImage.value
      currentServerJar.value = updated.serverJar || selectedServerJar.value.trim()
      activeMinMemory.value = updated.minMemoryMb || selectedMinMemory.value
      activeMaxMemory.value = updated.maxMemoryMb || selectedMaxMemory.value
      if (updated.stopTimeoutSeconds !== undefined) {
        activeStopTimeout.value = updated.stopTimeoutSeconds
        selectedStopTimeout.value = updated.stopTimeoutSeconds
      }
    }
    settingsSaveSuccess.value = true
    await checkServerJarExistence()
  } catch (err: any) {
    settingsSaveError.value = err?.message || 'Failed to update instance settings'
  } finally {
    isSavingSettings.value = false
  }
}

async function handleDeleteInstance() {
  if (!confirm(`Are you sure you want to permanently delete instance "${props.instanceName}"?`)) {
    return
  }
  isDeletingInstance.value = true
  deleteError.value = ''
  try {
    await deleteServer(props.instanceId, deleteFilesOnDisk.value)
    isSettingsModalOpen.value = false
    router.push('/instances')
  } catch (err: any) {
    deleteError.value = err?.message || 'Failed to delete instance'
  } finally {
    isDeletingInstance.value = false
  }
}

// --- Template Refs ---
const wrapperRef = ref<HTMLElement | null>(null)
const terminalRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// --- State Variables ---
const isFullscreen = ref(false)
const autoScroll = ref(true)
const isActionLoading = ref(false)
const isRestarting = ref(false)
const isSending = ref(false)
const commandInput = ref('')
const lastCommandStatus = ref<{ success: boolean; text: string } | null>(null)

// Internal status synchronized with props
const internalStatus = ref(props.instanceStatus || 'stopped')

// Real-time Container Telemetry State
const serverStats = ref<ServerStats | null>(null)
let statsTimer: ReturnType<typeof setInterval> | null = null

function formatMetricBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return '0 MB'
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

// % of JVM -Xmx used (activeMaxMemory is in MB)
const jvmMemPercent = computed(() => {
  const usedBytes = serverStats.value?.memoryBytes || serverStats.value?.memoryUsageBytes || 0
  const limitBytes = activeMaxMemory.value * 1024 * 1024
  if (!limitBytes) return '0'
  return Math.min(100, (usedBytes / limitBytes) * 100).toFixed(0)
})

async function fetchServerStats() {
  if (internalStatus.value !== 'running') {
    serverStats.value = null
    return
  }
  try {
    const stats = await getServerStats(props.instanceId)
    if (stats && typeof stats === 'object') {
      serverStats.value = stats
    }
  } catch {
    // transient polling error, silently ignore
  }
}

function startStatsPolling() {
  stopStatsPolling()
  fetchServerStats()
  statsTimer = setInterval(fetchServerStats, 3000)
}

function stopStatsPolling() {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
}

watch(() => props.instanceStatus, (newVal) => {
  if (newVal) {
    internalStatus.value = newVal
  }
}, { immediate: true })

watch(internalStatus, (newStatus) => {
  if (newStatus === 'running') {
    startStatsPolling()
  } else {
    stopStatsPolling()
    serverStats.value = null
  }
}, { immediate: true })

// Connection State
type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected'
const connectionStatus = ref<ConnectionStatus>('connecting')
const reconnectAttempts = ref(0)
const isConnecting = computed(() => connectionStatus.value === 'connecting' || connectionStatus.value === 'reconnecting')
const hasReceivedFirstMessage = ref(false)

// History Navigation
const HISTORY_STORAGE_PREFIX = 'mc_cmd_hist_'
const history = ref<string[]>([])
const historyIndex = ref<number>(-1)
const tempInput = ref('')

// Terminal & SSE instances
let term: XTerm | null = null
let fitAddon: FitAddon | null = null
let streamAbortFn: (() => void) | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null

// --- Status Badge Classes ---
const statusText = computed(() => {
  switch (internalStatus.value) {
    case 'running': return 'Running'
    case 'starting': return 'Starting'
    case 'restarting': return 'Restarting'
    case 'stopping': return 'Stopping'
    case 'stopped': return 'Stopped'
    case 'error': return 'Error'
    default: return 'Running'
  }
})

const statusBadgeClasses = computed(() => {
  switch (internalStatus.value) {
    case 'running':
      return 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
    case 'starting':
    case 'restarting':
      return 'bg-blue-950/40 border-blue-800/60 text-blue-400'
    case 'stopping':
    case 'stopped':
      return 'bg-zinc-800 border-zinc-700 text-zinc-400'
    case 'error':
      return 'bg-red-950/40 border-red-800/60 text-red-400'
    default:
      return 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
  }
})

const statusDotClasses = computed(() => {
  switch (internalStatus.value) {
    case 'running':
      return 'bg-emerald-400 animate-pulse'
    case 'starting':
    case 'restarting':
      return 'bg-blue-400 animate-pulse'
    case 'stopping':
    case 'stopped':
      return 'bg-zinc-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-emerald-400'
  }
})

// Connection Status Classes & Text
const connectionStatusClasses = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
    case 'connecting':
    case 'reconnecting':
      return 'bg-amber-500 animate-ping'
    case 'disconnected':
      return 'bg-red-500'
  }
})

const connectionText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'Log Stream: Connected'
    case 'connecting':
      return 'Connecting log stream...'
    case 'reconnecting':
      return `Reconnecting log stream (${reconnectAttempts.value})...`
    case 'disconnected':
      return 'Log Stream: Disconnected'
  }
})

// --- Terminal Initialization ---
function initTerminal() {
  if (!terminalRef.value) return

  term = new XTerm({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: 13,
    lineHeight: 1.35,
    fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
    theme: {
      background: '#121212',
      foreground: '#e4e4e7',
      cursor: '#10b981',
      cursorAccent: '#121212',
      selectionBackground: 'rgba(16, 185, 129, 0.25)',
      black: '#18181b',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#f4f4f5',
      brightBlack: '#71717a',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#fde047',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff'
    },
    convertEol: true,
    scrollback: 5000,
    disableStdin: true, // Prevent direct terminal keyboard capture, deferring input to bottom bar
    allowTransparency: true
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(terminalRef.value)

  // Fit initial layout
  nextTick(() => {
    fitTerminal()
  })

  // Resize handling
  resizeObserver = new ResizeObserver(() => {
    fitTerminal()
  })
  resizeObserver.observe(terminalRef.value)
  window.addEventListener('resize', fitTerminal)
}

function fitTerminal() {
  if (!fitAddon || !term || !terminalRef.value) return
  try {
    fitAddon.fit()
  } catch (err) {
    // Ignore fit errors if container is temporarily invisible or transitioning
  }
}

// --- SSE / Real-time Log Stream ---
function connectSSE() {
  cleanupSSE()
  connectionStatus.value = reconnectAttempts.value > 0 ? 'reconnecting' : 'connecting'

  try {
    streamAbortFn = streamServerLogs(
      props.instanceId,
      (line: string) => {
        connectionStatus.value = 'connected'
        reconnectAttempts.value = 0
        hasReceivedFirstMessage.value = true
        writeLog(line)
      },
      (_err: any) => {
        handleDisconnect()
      }
    )
  } catch (e) {
    handleDisconnect()
  }
}

function handleDisconnect() {
  cleanupSSE()
  connectionStatus.value = 'disconnected'

  if (term) {
    term.write('\r\n\x1b[31;1m[Disconnected from server]\x1b[0m\r\n')
  }

  // Schedule auto-reconnect every 3s
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(() => {
      reconnectAttempts.value += 1
      reconnectTimer = null
      connectSSE()
    }, 3000)
  }
}

function cleanupSSE() {
  if (streamAbortFn) {
    streamAbortFn()
    streamAbortFn = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function writeLog(text: string) {
  if (!term) return
  term.writeln(text)
  if (autoScroll.value) {
    term.scrollToBottom()
  }
}

// --- Toolbar Actions ---
function clearTerminal() {
  if (term) {
    term.clear()
  }
}

function scrollToBottom() {
  if (term) {
    term.scrollToBottom()
  }
}

function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value) {
    scrollToBottom()
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  nextTick(() => {
    fitTerminal()
    if (autoScroll.value) {
      scrollToBottom()
    }
  })
}

function focusInput() {
  inputRef.value?.focus()
}

// --- History Storage & Navigation ---
function loadHistory() {
  try {
    const raw = localStorage.getItem(`${HISTORY_STORAGE_PREFIX}${props.instanceId}`)
    if (raw) {
      history.value = JSON.parse(raw)
    }
  } catch (e) {
    history.value = []
  }
}

function saveHistory(cmd: string) {
  if (!cmd.trim()) return
  const filtered = history.value.filter(c => c !== cmd)
  filtered.push(cmd)
  if (filtered.length > 100) {
    filtered.shift()
  }
  history.value = filtered
  historyIndex.value = -1

  try {
    localStorage.setItem(
      `${HISTORY_STORAGE_PREFIX}${props.instanceId}`,
      JSON.stringify(filtered)
    )
  } catch (e) {}
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (history.value.length === 0) return

    if (historyIndex.value === -1) {
      tempInput.value = commandInput.value
      historyIndex.value = history.value.length - 1
    } else if (historyIndex.value > 0) {
      historyIndex.value--
    }

    commandInput.value = history.value[historyIndex.value] || ''
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (historyIndex.value === -1) return

    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      commandInput.value = history.value[historyIndex.value] || ''
    } else {
      historyIndex.value = -1
      commandInput.value = tempInput.value
    }
  }
}

// --- Command Dispatch via API ---
async function submitCommand() {
  const cmd = commandInput.value.trim()
  if (!cmd || isSending.value) return

  if (internalStatus.value === 'stopped') {
    writeLog(`\x1b[33m[Warning] Server is stopped. Please start the server first before sending commands.\x1b[0m`)
    lastCommandStatus.value = { success: false, text: 'Server is stopped' }
    setTimeout(() => {
      if (lastCommandStatus.value?.text === 'Server is stopped') {
        lastCommandStatus.value = null
      }
    }, 2500)
    return
  }

  isSending.value = true
  saveHistory(cmd)
  emit('command', cmd)

  if (term) {
    term.writeln(`\r\n\x1b[36m> ${cmd}\x1b[0m`)
    if (autoScroll.value) term.scrollToBottom()
  }

  try {
    await sendCommand(props.instanceId, cmd)
    lastCommandStatus.value = { success: true, text: 'Command sent' }
    setTimeout(() => {
      if (lastCommandStatus.value?.text === 'Command sent') {
        lastCommandStatus.value = null
      }
    }, 2500)
  } catch (err: any) {
    lastCommandStatus.value = { success: false, text: err?.message || 'Send Failed' }
    if (term) {
      term.writeln(`\x1b[31;1m[Command Error]: ${err?.message || 'Failed to send'}\x1b[0m`)
      if (autoScroll.value) term.scrollToBottom()
    }
  } finally {
    isSending.value = false
    commandInput.value = ''
    historyIndex.value = -1
    focusInput()
  }
}

// --- Instance Lifecycle Actions ---
async function handleStart() {
  isActionLoading.value = true
  internalStatus.value = 'starting'
  emit('status-change', 'starting')
  writeLog(`\x1b[32m[Client] Sending START signal to instance ${props.instanceId}...\x1b[0m`)
  try {
    await startServer(props.instanceId)
    internalStatus.value = 'running'
    emit('status-change', 'running')
    emit('start')
    writeLog(`\x1b[32m[Client] Server container started successfully.\x1b[0m`)
  } catch (err: any) {
    internalStatus.value = 'stopped'
    emit('status-change', 'stopped')
    writeLog(`\x1b[31;1m[Start Error]: ${err?.message || 'Failed to start server'}\x1b[0m`)
  } finally {
    isActionLoading.value = false
  }
}

async function handleStop() {
  isActionLoading.value = true
  internalStatus.value = 'stopping'
  emit('status-change', 'stopping')
  writeLog(`\x1b[33m[Client] Sending STOP signal to instance ${props.instanceId}...\x1b[0m`)
  try {
    await stopServer(props.instanceId, false)
    internalStatus.value = 'stopped'
    emit('status-change', 'stopped')
    emit('stop')
    writeLog(`\x1b[33m[Client] Server container stopped gracefully.\x1b[0m`)
  } catch (err: any) {
    internalStatus.value = 'running'
    emit('status-change', 'running')
    writeLog(`\x1b[31;1m[Stop Error]: ${err?.message || 'Failed to stop server'}\x1b[0m`)
  } finally {
    isActionLoading.value = false
  }
}

async function handleRestart() {
  isRestarting.value = true
  internalStatus.value = 'restarting'
  emit('status-change', 'restarting')
  writeLog(`\x1b[36m[Client] Sending RESTART signal to instance ${props.instanceId}...\x1b[0m`)
  try {
    await restartServer(props.instanceId)
    emit('restart')
    writeLog(`\x1b[36m[Client] Server container restart initiated.\x1b[0m`)
    internalStatus.value = 'running'
    emit('status-change', 'running')
  } catch (err: any) {
    internalStatus.value = 'running'
    emit('status-change', 'running')
    writeLog(`\x1b[31;1m[Restart Error]: ${err?.message || 'Failed to restart server'}\x1b[0m`)
  } finally {
    setTimeout(() => {
      isRestarting.value = false
    }, 1200)
  }
}

async function handleTerminate() {
  isActionLoading.value = true
  internalStatus.value = 'stopping'
  emit('status-change', 'stopping')
  writeLog(`\x1b[31;1m[Client] Sending FORCE TERMINATE signal to instance ${props.instanceId}!\x1b[0m`)
  try {
    await stopServer(props.instanceId, true)
    internalStatus.value = 'stopped'
    emit('status-change', 'stopped')
    emit('terminate')
    writeLog(`\x1b[31m[Client] Server container terminated.\x1b[0m`)
  } catch (err: any) {
    internalStatus.value = 'running'
    emit('status-change', 'running')
    writeLog(`\x1b[31;1m[Terminate Error]: ${err?.message || 'Failed to terminate server'}\x1b[0m`)
  } finally {
    isActionLoading.value = false
  }
}

// --- Watchdog Countdown & Auto-Restart Controls ---
const remainingSeconds = ref(props.autoRestart?.nextRetryInSeconds || 0)
let localCountdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdownTicker() {
  stopCountdownTicker()
  localCountdownTimer = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      stopCountdownTicker()
    }
  }, 1000)
}

function stopCountdownTicker() {
  if (localCountdownTimer) {
    clearInterval(localCountdownTimer)
    localCountdownTimer = null
  }
}

watch(() => props.autoRestart?.nextRetryInSeconds, (newVal) => {
  if (newVal !== undefined && newVal !== null) {
    remainingSeconds.value = newVal
    if (props.autoRestart?.isWaitingRestart && newVal > 0) {
      startCountdownTicker()
    } else {
      stopCountdownTicker()
    }
  }
}, { immediate: true })

watch(() => props.autoRestart?.isWaitingRestart, (waiting) => {
  if (waiting && remainingSeconds.value > 0) {
    startCountdownTicker()
  } else {
    stopCountdownTicker()
  }
})

async function handleCancelAutoRestart() {
  isActionLoading.value = true
  writeLog(`\x1b[33m[Watchdog] Cancelling pending crash auto-recovery timer...\x1b[0m`)
  try {
    await stopServer(props.instanceId, false)
    stopCountdownTicker()
    remainingSeconds.value = 0
    if (props.autoRestart) {
      props.autoRestart.isWaitingRestart = false
    }
    writeLog(`\x1b[32m[Watchdog] Auto-recovery timer cancelled. Server remains stopped.\x1b[0m`)
  } catch (err: any) {
    writeLog(`\x1b[31;1m[Watchdog Error]: ${err?.message || 'Failed to cancel auto-restart'}\x1b[0m`)
  } finally {
    isActionLoading.value = false
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  loadHistory()
  initTerminal()
  connectSSE()
  checkServerJarExistence()
})

onUnmounted(() => {
  // 1. Cleanup SSE & retry timers
  cleanupSSE()
  stopCountdownTicker()

  // 2. Remove window & observer listeners
  window.removeEventListener('resize', fitTerminal)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  // 4. Dispose xterm instance and addons
  if (fitAddon) {
    fitAddon.dispose()
    fitAddon = null
  }
  if (term) {
    term.dispose()
    term = null
  }

  // 5. Cleanup stats polling
  stopStatsPolling()
})

// Watch instanceId changes to re-connect and switch history
watch(() => props.instanceId, () => {
  loadHistory()
  clearTerminal()
  connectSSE()
  if (internalStatus.value === 'running') {
    startStatsPolling()
  }
})
</script>

<style scoped>
/* Scrollbar styling specifically for terminal component */
:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}
:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: #121212;
}
:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: #27272a;
  border-radius: 4px;
}
:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: #3f3f46;
}
</style>
