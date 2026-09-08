<template>
  <div 
    v-if="isVisible" 
    class="p-4 rounded-xl bg-amber-950/50 border border-amber-800/70 text-amber-300 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <RotateCw class="w-5 h-5 text-amber-400 flex-shrink-0 animate-spin" v-if="isRestarting" />
      <AlertCircle class="w-5 h-5 text-amber-400 flex-shrink-0" v-else />
      <div class="min-w-0">
        <p class="text-xs font-semibold text-amber-200">Restart Required to Apply Changes</p>
        <p class="text-xs text-amber-300/80 leading-relaxed truncate sm:whitespace-normal">
          {{ message || 'Configuration or settings changes have been saved to disk, but the Minecraft server is currently running. Restart the server to activate changes.' }}
        </p>
        <p v-if="errorMessage" class="text-[11px] text-red-400 mt-1 font-mono">
          Error: {{ errorMessage }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 flex-shrink-0">
      <button
        type="button"
        @click="handleRestart"
        :disabled="isRestarting"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
      >
        <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRestarting }" />
        <span>{{ isRestarting ? 'Restarting...' : 'Restart Server Now' }}</span>
      </button>
      <button 
        type="button" 
        @click="handleDismiss" 
        title="Ignore warning"
        class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-300/80 hover:text-amber-100 hover:bg-amber-900/40 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <span>Ignore</span>
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RotateCw, AlertCircle, X } from 'lucide-vue-next'
import { restartServer } from '../api/servers'
import { useInstanceNotice } from '../stores/instanceNotice'

const props = withDefaults(
  defineProps<{
    serverId: number | string
    serverStatus?: string
    message?: string
  }>(),
  {
    serverStatus: 'running'
  }
)

const emit = defineEmits<{
  (e: 'restarted'): void
  (e: 'dismissed'): void
}>()

const { isRestartRequired, clearRestartRequired } = useInstanceNotice()

const isRestarting = ref(false)
const errorMessage = ref('')

const isVisible = computed(() => {
  return isRestartRequired(props.serverId) && props.serverStatus === 'running'
})

// If the server transitions to stopped or restarting, auto-clear the warning
watch(
  () => props.serverStatus,
  (newStatus) => {
    if (newStatus === 'stopped' || newStatus === 'restarting') {
      clearRestartRequired(props.serverId)
    }
  }
)

async function handleRestart() {
  if (isRestarting.value) return
  isRestarting.value = true
  errorMessage.value = ''

  try {
    await restartServer(props.serverId)
    clearRestartRequired(props.serverId)
    emit('restarted')
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to restart server'
  } finally {
    isRestarting.value = false
  }
}

function handleDismiss() {
  clearRestartRequired(props.serverId)
  emit('dismissed')
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
