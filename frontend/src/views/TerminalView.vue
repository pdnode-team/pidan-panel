<template>
  <AppLayout 
    :breadcrumbs="[
      { label: 'Instances', to: '/instances' },
      { label: 'Terminal' }
    ]"
  >
    <div class="w-full space-y-4">
      <!-- Restart Server Required Alert Banner -->
      <InstanceRestartAlert
        :server-id="serverId"
        :server-status="instance.runtime?.status"
      />

      <ConsoleTerminal
        :instance-id="String(instance.id)"
        :instance-name="instance.name"
        :instance-status="instance.runtime?.status || 'stopped'"
        :docker-image="instance.dockerImage"
        :node-id="1"
        :api-endpoint="'/api/v1/servers'"
        :auto-restart="instance.runtime?.autoRestart"
        @status-change="handleStatusChange"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import ConsoleTerminal from '../components/ConsoleTerminal.vue'
import InstanceRestartAlert from '../components/InstanceRestartAlert.vue'
import { getServer, getPowerState, type ServerInstance } from '../api/servers'

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

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await Promise.all([fetchServerDetails(), syncPowerState()])

  // Poll power state every 2s to stay 100% in sync with real Docker container
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

async function fetchServerDetails() {
  try {
    const data = await getServer(serverId)
    if (data) {
      const prevStatus = instance.value.runtime?.status
      instance.value = {
        ...data,
        runtime: prevStatus ? { ...instance.value.runtime, status: prevStatus } : (data.runtime || { status: 'stopped' })
      }
    }
  } catch (err) {
    console.error('Failed to load server details:', err)
  }
}

async function syncPowerState() {
  try {
    const power = await getPowerState(serverId)
    if (power && power.status) {
      if (!instance.value.runtime) {
        instance.value.runtime = { 
          status: power.status,
          containerId: power.containerId,
          memoryLimitMb: power.memoryLimitMb,
          serverPort: power.serverPort,
          autoRestart: power.autoRestart
        }
      } else {
        instance.value.runtime.status = power.status
        instance.value.runtime.containerId = power.containerId
        instance.value.runtime.memoryLimitMb = power.memoryLimitMb
        instance.value.runtime.serverPort = power.serverPort
        instance.value.runtime.autoRestart = power.autoRestart
      }
    }
  } catch (err) {
    // If server is not responding, keep current status
  }
}

function handleStatusChange(status: any) {
  if (!instance.value.runtime) {
    instance.value.runtime = { status }
  } else {
    instance.value.runtime.status = status
  }
  // Delay sync slightly to allow docker to transition
  setTimeout(() => {
    syncPowerState()
  }, 800)
}
</script>
