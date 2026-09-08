<template>
  <div class="min-h-screen bg-[#18181b] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
    <!-- Top Navigation Header -->
    <header class="h-14 border-b border-zinc-800 bg-[#121215] px-4 md:px-8 flex items-center justify-between select-none sticky top-0 z-40">
      <!-- Left: Logo & Navigation Links -->
      <div class="flex items-center gap-8">
        <!-- Brand Logo -->
        <router-link to="/overview" class="flex items-center gap-2 group">
          <div class="font-mono text-sm tracking-wider font-extrabold uppercase px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 group-hover:border-zinc-600 transition-colors">
            PIDAN PANEL
          </div>
        </router-link>

        <!-- Main Nav Links -->
        <nav class="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-400">
          <router-link
            to="/overview"
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="[
              $route.path === '/overview' 
                ? 'text-white font-semibold bg-zinc-800/80 shadow-sm' 
                : 'hover:text-zinc-200 hover:bg-zinc-800/50'
            ]"
          >
            Overview
          </router-link>

          <router-link
            to="/instances"
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="[
              $route.path.startsWith('/instances') 
                ? 'text-white font-semibold bg-zinc-800/80 shadow-sm' 
                : 'hover:text-zinc-200 hover:bg-zinc-800/50'
            ]"
          >
            Instances
          </router-link>

          <router-link
            to="/users"
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="[
              $route.path === '/users' 
                ? 'text-white font-semibold bg-zinc-800/80 shadow-sm' 
                : 'hover:text-zinc-200 hover:bg-zinc-800/50'
            ]"
          >
            Users
          </router-link>

          <router-link
            to="/audit-logs"
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="[
              $route.path === '/audit-logs' 
                ? 'text-white font-semibold bg-zinc-800/80 shadow-sm' 
                : 'hover:text-zinc-200 hover:bg-zinc-800/50'
            ]"
          >
            Audit Logs
          </router-link>
        </nav>
      </div>

      <!-- Right: User info & Logout (First & Second buttons removed as requested) -->
      <div class="flex items-center gap-3">
        <!-- User Profile Tag / Button -->
        <div class="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-xs font-medium text-zinc-300">
          <div class="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold uppercase">
            {{ userInitial }}
          </div>
          <span class="hidden sm:inline text-zinc-200 max-w-[140px] truncate">
            {{ authStore.user.value?.fullName || authStore.user.value?.email || 'Admin' }}
          </span>
        </div>

        <!-- Power / Logout Button -->
        <button
          type="button"
          @click="handleLogout"
          class="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800/80 transition-colors"
          title="Sign out of Pidan Panel"
        >
          <Power class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Main View Content -->
    <main 
      class="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col transition-all"
      :class="[wide ? 'max-w-[1680px]' : 'max-w-7xl']"
    >
      <!-- Breadcrumb Slot -->
      <nav v-if="breadcrumbs && breadcrumbs.length" class="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-medium">
        <span>Control Panel</span>
        <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
          <span>/</span>
          <router-link v-if="crumb.to" :to="crumb.to" class="hover:text-zinc-300 transition-colors">
            {{ crumb.label }}
          </router-link>
          <span v-else class="text-zinc-300 font-semibold">{{ crumb.label }}</span>
        </template>
      </nav>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { Power } from 'lucide-vue-next'

export interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  breadcrumbs?: BreadcrumbItem[]
  wide?: boolean
}>()

const router = useRouter()
const authStore = useAuthStore()

const userInitial = computed(() => {
  const name = authStore.user.value?.fullName || authStore.user.value?.email || 'A'
  return name.charAt(0).toUpperCase()
})

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
