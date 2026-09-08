import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      redirect: '/overview'
    },
    {
      path: '/overview',
      name: 'overview',
      component: () => import('../views/OverviewView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances',
      name: 'instances',
      component: () => import('../views/InstancesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/create',
      name: 'create-instance',
      component: () => import('../views/CreateInstanceView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/:id/terminal',
      name: 'terminal',
      component: () => import('../views/TerminalView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/:id/files',
      name: 'instance-files',
      component: () => import('../views/FilesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/:id/configs',
      name: 'instance-configs',
      component: () => import('../views/ConfigEditorView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/:id/settings',
      name: 'instance-settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/:id/backups',
      name: 'instance-backups',
      component: () => import('../views/BackupsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/:id/logs',
      name: 'instance-logs',
      component: () => import('../views/ServerLogsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/audit-logs',
      name: 'audit-logs',
      component: () => import('../views/AuditLogsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/overview'
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  await authStore.init()

  if (to.meta.requiresAuth && !authStore.isLoggedIn.value) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && authStore.isLoggedIn.value) {
    next({ name: 'overview' })
  } else {
    next()
  }
})

export default router
