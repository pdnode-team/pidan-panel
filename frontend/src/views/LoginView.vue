<template>
  <div class="relative min-h-screen w-full flex items-center justify-center bg-[#2b2b2e] overflow-hidden font-sans select-none">
    <!-- Top Dark Banner -->
    <div class="absolute top-0 inset-x-0 h-14 bg-[#121215] border-b border-zinc-800/80 flex items-center justify-between px-6 z-10">
      <div class="font-mono text-sm tracking-wider font-extrabold uppercase px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100">
        PIDAN PANEL
      </div>
      <div class="text-zinc-500">
        <Layers class="w-4 h-4" />
      </div>
    </div>

    <!-- Dark Backdrop Dimmer -->
    <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>

    <!-- Authentication Card (Matching Reference Image 1) -->
    <div class="relative z-20 w-full max-w-[460px] mx-4 bg-white text-zinc-800 rounded-xl shadow-2xl p-8 sm:p-10 border border-zinc-200/50">
      <!-- Title -->
      <h2 class="text-2xl font-bold text-zinc-900 tracking-tight">
        Authentication
      </h2>
      
      <!-- Subtitle -->
      <p class="text-sm text-zinc-500 mt-1 mb-6">
        <template v-if="authStore.needsSetup.value">
          Create Initial Administrator Account
        </template>
        <template v-else>
          Login to Pidan Panel Control Panel
        </template>
      </p>

      <!-- Error Alert Message -->
      <div 
        v-if="errorMessage" 
        class="mb-5 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2"
      >
        <AlertCircle class="w-4 h-4 flex-shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Backend Connection Warning -->
      <div 
        v-if="backendOffline" 
        class="mb-5 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2"
      >
        <AlertTriangle class="w-4 h-4 flex-shrink-0 text-amber-600" />
        <span>无法连接至后端服务 (http://localhost:3333)，请确保后端进程已启动。</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Full Name (Only for initial admin signup) -->
        <div v-if="authStore.needsSetup.value" class="space-y-1">
          <div class="relative flex items-center">
            <input
              v-model="form.fullName"
              type="text"
              placeholder="Administrator Name (optional)"
              class="w-full h-11 px-3.5 pr-10 rounded-lg border border-zinc-300 text-zinc-800 placeholder-zinc-400 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <User class="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        <!-- Email Input (User icon on right) -->
        <div class="space-y-1">
          <div class="relative flex items-center">
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="Email address"
              class="w-full h-11 px-3.5 pr-10 rounded-lg border border-zinc-300 text-zinc-800 placeholder-zinc-400 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <User class="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        <!-- Password Input (Lock icon on right) -->
        <div class="space-y-1">
          <div class="relative flex items-center">
            <input
              v-model="form.password"
              type="password"
              required
              minlength="8"
              maxlength="32"
              placeholder="Password"
              class="w-full h-11 px-3.5 pr-10 rounded-lg border border-zinc-300 text-zinc-800 placeholder-zinc-400 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <Lock class="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        <!-- Password Confirmation (Only for initial admin signup) -->
        <div v-if="authStore.needsSetup.value" class="space-y-1">
          <div class="relative flex items-center">
            <input
              v-model="form.passwordConfirmation"
              type="password"
              required
              minlength="8"
              maxlength="32"
              placeholder="Confirm Password"
              class="w-full h-11 px-3.5 pr-10 rounded-lg border border-zinc-300 text-zinc-800 placeholder-zinc-400 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <CheckCircle2 class="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        <!-- Bottom Row: Powered by & Submit Button -->
        <div class="pt-4 flex items-center justify-between">
          <div class="text-xs text-zinc-400">
            Powered by 
            <span class="text-zinc-600 font-medium">Pidan Panel</span>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-6 py-2.5 rounded-lg bg-[#3b82f6] hover:bg-blue-600 active:scale-95 text-white font-medium text-sm transition-all shadow-md hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>{{ authStore.needsSetup.value ? 'Create Administrator' : 'Login' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { User, Lock, Layers, AlertCircle, AlertTriangle, RotateCw, CheckCircle2 } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isSubmitting = ref(false)
const errorMessage = ref('')
const backendOffline = ref(false)

const form = reactive({
  fullName: '',
  email: '',
  password: '',
  passwordConfirmation: ''
})

onMounted(async () => {
  try {
    await authStore.init()
    backendOffline.value = false
  } catch (err: any) {
    backendOffline.value = true
  }
})

async function handleSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    if (authStore.needsSetup.value) {
      if (form.password !== form.passwordConfirmation) {
        throw new Error('密码与确认密码不一致')
      }
      await authStore.signup({
        fullName: form.fullName || null,
        email: form.email,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation
      })
    } else {
      await authStore.login({
        email: form.email,
        password: form.password
      })
    }

    const redirectUrl = (route.query.redirect as string) || '/overview'
    router.push(redirectUrl)
  } catch (err: any) {
    errorMessage.value = err?.message || '请求失败，请检查网络或确认输入信息正确'
  } finally {
    isSubmitting.value = false
  }
}
</script>
