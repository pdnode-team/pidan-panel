<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-8 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-8 scale-95"
  >
    <div 
      v-if="show" 
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 pointer-events-none"
    >
      <div 
        class="pointer-events-auto p-4 rounded-2xl bg-[#202024]/95 backdrop-blur-md border shadow-2xl shadow-black/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        :class="themeClasses.container"
      >
        <!-- Left info -->
        <div class="flex items-center gap-3">
          <div 
            class="w-3 h-3 rounded-full animate-pulse flex-shrink-0"
            :class="themeClasses.dot"
          ></div>
          <div>
            <p class="text-xs font-bold text-zinc-100">{{ title }}</p>
            <p class="text-[11px] text-zinc-400 mt-0.5">{{ message }}</p>
          </div>
        </div>

        <!-- Right actions -->
        <div class="flex items-center gap-2.5 flex-shrink-0">
          <button
            v-if="canDiscard"
            type="button"
            @click="emit('discard')"
            :disabled="isSaving"
            class="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {{ discardLabel }}
          </button>
          <button
            type="button"
            @click="emit('save')"
            :disabled="isSaving"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            :class="themeClasses.button"
          >
            <RotateCw class="w-3.5 h-3.5 animate-spin" v-if="isSaving" />
            <Save class="w-3.5 h-3.5" v-else />
            <span>{{ isSaving ? savingLabel : saveLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Save, RotateCw } from 'lucide-vue-next'

export interface UnsavedChangesBarProps {
  show: boolean
  isSaving?: boolean
  title?: string
  message?: string
  saveLabel?: string
  savingLabel?: string
  discardLabel?: string
  canDiscard?: boolean
  theme?: 'blue' | 'emerald' | 'amber' | 'purple'
}

const props = withDefaults(defineProps<UnsavedChangesBarProps>(), {
  isSaving: false,
  title: 'Unsaved Changes Detected',
  message: 'You have unsaved changes in your settings.',
  saveLabel: 'Save Changes',
  savingLabel: 'Saving...',
  discardLabel: 'Discard Changes',
  canDiscard: true,
  theme: 'blue'
})

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'discard'): void
}>()

const themeClasses = computed(() => {
  switch (props.theme) {
    case 'emerald':
      return {
        container: 'border-emerald-500/50 shadow-emerald-950/20',
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
        button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
      }
    case 'amber':
      return {
        container: 'border-amber-500/50 shadow-amber-950/20',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
      }
    case 'purple':
      return {
        container: 'border-purple-500/50 shadow-purple-950/20',
        dot: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]',
        button: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
      }
    case 'blue':
    default:
      return {
        container: 'border-blue-500/50 shadow-blue-950/20',
        dot: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]',
        button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
      }
  }
})
</script>
