<template>
  <AppLayout :breadcrumbs="[{ label: 'Users' }]">
    <div class="space-y-6">
      <!-- Error & Success Banners -->
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

      <!-- Top Action & Filter Toolbar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Title & Count -->
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-800/50 flex items-center justify-center text-blue-400">
            <UserIcon class="w-4 h-4" />
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <span>Users</span>
              <span class="text-xs font-normal text-zinc-400">({{ meta.total }} total)</span>
            </h1>
            <p class="text-xs text-zinc-500">Manage user credentials and instance access permissions</p>
          </div>
        </div>

        <!-- Right Toolbar Controls -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Role Filter Dropdown -->
          <div class="relative">
            <select
              v-model="roleFilter"
              @change="handleFilterChange"
              class="appearance-none bg-[#202024] border border-zinc-700/70 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="user">Users Only</option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <!-- Search Input -->
          <div class="relative flex items-center min-w-[200px] sm:min-w-[240px]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search email or name..."
              @keydown.enter="handleSearch"
              class="w-full bg-[#202024] border border-zinc-700/70 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 transition-all"
            />
            <Search 
              class="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 cursor-pointer hover:text-zinc-200" 
              @click="handleSearch"
            />
          </div>

          <!-- Refresh Button -->
          <button
            type="button"
            @click="fetchUsers"
            :disabled="isLoading"
            class="px-3 py-1.5 rounded-lg bg-[#202024] border border-zinc-700/70 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
            <span>Refresh</span>
          </button>

          <!-- Add User Button -->
          <button
            type="button"
            @click="openAddModal"
            class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      <!-- Users Table Card -->
      <div class="rounded-xl bg-[#202024] border border-zinc-800/90 shadow-sm overflow-hidden text-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-semibold select-none">
                <th class="py-3.5 px-4 font-medium w-16">ID</th>
                <th class="py-3.5 px-4 font-medium">User / Name</th>
                <th class="py-3.5 px-4 font-medium">Email</th>
                <th class="py-3.5 px-4 font-medium">Role</th>
                <th class="py-3.5 px-4 font-medium">Authorized Instances</th>
                <th class="py-3.5 px-4 font-medium">Created At</th>
                <th class="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
              <!-- Loading State -->
              <tr v-if="isLoading && users.length === 0">
                <td colspan="7" class="py-12 text-center text-zinc-500">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <RotateCw class="w-5 h-5 animate-spin text-blue-500" />
                    <span>Loading users from server...</span>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-else-if="users.length === 0">
                <td colspan="7" class="py-12 text-center text-zinc-500">
                  No users found matching your search or filters.
                </td>
              </tr>

              <!-- User Rows -->
              <tr 
                v-for="u in filteredUsers" 
                :key="u.id"
                class="hover:bg-zinc-800/30 transition-colors"
              >
                <!-- ID -->
                <td class="py-3.5 px-4 font-mono text-zinc-500 text-[11px]">
                  #{{ u.id }}
                </td>

                <!-- User Info -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-[11px] font-bold text-zinc-300 select-none">
                      {{ u.initials || 'U' }}
                    </div>
                    <div>
                      <div class="font-medium text-zinc-100 flex items-center gap-1.5">
                        <span>{{ u.fullName || '—' }}</span>
                        <span 
                          v-if="isCurrentUser(u)" 
                          class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/60 border border-blue-800/70 text-blue-400"
                        >
                          You
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Email -->
                <td class="py-3.5 px-4 font-mono text-zinc-300">
                  {{ u.email }}
                </td>

                <!-- Role Badge -->
                <td class="py-3.5 px-4">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border capitalize"
                    :class="u.role === 'admin' 
                      ? 'bg-purple-950/50 border-purple-800/60 text-purple-300' 
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'"
                  >
                    <Shield class="w-3 h-3 text-purple-400" v-if="u.role === 'admin'" />
                    <UserIcon class="w-3 h-3 text-zinc-400" v-else />
                    <span>{{ u.role }}</span>
                  </span>
                </td>

                <!-- Authorized Instances (Multi-instance delegation) -->
                <td class="py-3.5 px-4">
                  <div v-if="u.role === 'admin'" class="flex items-center gap-1.5 text-zinc-400">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[11px]">
                      <Check class="w-3 h-3" />
                      <span>All Instances (Global)</span>
                    </span>
                  </div>
                  <div v-else-if="!u.serverIds || u.serverIds.length === 0" class="text-zinc-500 italic text-[11px]">
                    None assigned
                  </div>
                  <div v-else class="flex flex-wrap items-center gap-1.5">
                    <span 
                      v-for="sid in u.serverIds.slice(0, 3)" 
                      :key="sid"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 text-[11px] text-zinc-300 font-mono"
                    >
                      <Server class="w-3 h-3 text-amber-400" />
                      <span>{{ getServerLabel(sid) }}</span>
                    </span>
                    <span 
                      v-if="u.serverIds.length > 3" 
                      class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono"
                      :title="u.serverIds.map(getServerLabel).join(', ')"
                    >
                      +{{ u.serverIds.length - 3 }} more
                    </span>
                  </div>
                </td>

                <!-- Created At -->
                <td class="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                  {{ formatDate(u.createdAt) }}
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      @click="openEditModal(u)"
                      class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      title="Edit User & Permissions"
                    >
                      <Edit3 class="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      @click="handleDeleteUser(u)"
                      :disabled="isCurrentUser(u)"
                      class="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-red-950/60 hover:text-red-300 border border-zinc-700/60 hover:border-red-800/60 text-zinc-400 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      :title="isCurrentUser(u) ? 'Cannot delete yourself' : 'Delete user'"
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
        <div class="px-5 py-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 select-none">
          <div>
            Showing <strong class="text-zinc-200">{{ users.length }}</strong> of <strong class="text-zinc-200">{{ meta.total }}</strong> users
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1">
              <button 
                type="button"
                @click="changePage(meta.currentPage - 1)"
                :disabled="meta.currentPage <= 1 || isLoading"
                class="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <span class="px-2.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/40 text-blue-400 font-mono text-xs">
                {{ meta.currentPage }} / {{ meta.lastPage || 1 }}
              </span>
              <button 
                type="button"
                @click="changePage(meta.currentPage + 1)"
                :disabled="meta.currentPage >= meta.lastPage || isLoading"
                class="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 transition-colors"
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

    <!-- 1. Create New User Modal Dialog -->
    <div 
      v-if="isAddModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-zinc-800 bg-[#1e1e22]">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <Plus class="w-4 h-4" />
            </div>
            <h3 class="text-sm font-bold text-zinc-100">Create New User</h3>
          </div>
          <button type="button" @click="isAddModalOpen = false" class="text-zinc-400 hover:text-zinc-200">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="submitAddUser" class="p-5 space-y-4 overflow-y-auto text-xs">
          <!-- Email -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Email Address <span class="text-red-400">*</span></label>
            <input
              v-model="addForm.email"
              type="email"
              required
              placeholder="e.g. player@example.com"
              class="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-blue-500"
            />
          </div>

          <!-- Password with Toggle -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Password <span class="text-red-400">*</span></label>
            <div class="relative">
              <input
                v-model="addForm.password"
                :type="showAddPassword ? 'text' : 'password'"
                required
                minlength="6"
                placeholder="At least 6 characters"
                class="w-full h-9 pl-3 pr-9 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono outline-none focus:border-blue-500"
              />
              <button 
                type="button" 
                @click="showAddPassword = !showAddPassword" 
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <EyeOff v-if="showAddPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Full Name -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Full Name / Display Nickname</label>
            <input
              v-model="addForm.fullName"
              type="text"
              placeholder="e.g. Alex"
              class="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-blue-500"
            />
          </div>

          <!-- Role -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Role & Authority</label>
            <select
              v-model="addForm.role"
              class="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="user">User (Standard Server Operator)</option>
              <option value="admin">Administrator (Full Global Access)</option>
            </select>
          </div>

          <!-- Instance Multi-Selection Delegation (Only for User role) -->
          <div v-if="addForm.role === 'user'" class="space-y-2 pt-2 border-t border-zinc-800/80">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-zinc-200">Instance Access Delegation</label>
                <p class="text-[11px] text-zinc-400">Select instances this user can manage via console and files</p>
              </div>
              <div class="flex items-center gap-2 text-[11px]">
                <button type="button" @click="selectAllAddServers" class="text-blue-400 hover:underline">Select All</button>
                <span class="text-zinc-600">|</span>
                <button type="button" @click="addForm.serverIds = []" class="text-zinc-400 hover:underline">Clear</button>
              </div>
            </div>

            <div v-if="availableServers.length === 0" class="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-500 text-center text-xs">
              No server instances found. You can assign instances later.
            </div>

            <div v-else class="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-zinc-900/90 rounded-lg border border-zinc-800/90 scrollbar-thin">
              <label 
                v-for="srv in availableServers" 
                :key="srv.id" 
                class="flex items-center justify-between p-2 rounded hover:bg-zinc-800/70 cursor-pointer text-xs"
              >
                <div class="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    :value="srv.id" 
                    v-model="addForm.serverIds" 
                    class="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span class="font-medium text-zinc-200">{{ srv.name || `Server #${srv.id}` }}</span>
                </div>
                <span class="font-mono text-[11px] text-zinc-500">{{ srv.identifier }}</span>
              </label>
            </div>
          </div>

          <!-- Modal Action Buttons -->
          <div class="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-800">
            <button
              type="button"
              @click="isAddModalOpen = false"
              class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw class="w-3.5 h-3.5 animate-spin" v-if="isSubmitting" />
              <span>Create User</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. Edit User Modal Dialog -->
    <div 
      v-if="isEditModalOpen && editingUser" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-[#202024] text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-zinc-800 bg-[#1e1e22]">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <Edit3 class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-100">Edit User Profile & Permissions</h3>
              <p class="text-[11px] text-zinc-500 font-mono">User ID: #{{ editingUser.id }}</p>
            </div>
          </div>
          <button type="button" @click="isEditModalOpen = false" class="text-zinc-400 hover:text-zinc-200">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="submitEditUser" class="p-5 space-y-4 overflow-y-auto text-xs">
          <!-- Full Name -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Full Name / Display Name</label>
            <input
              v-model="editForm.fullName"
              type="text"
              placeholder="e.g. Alex"
              class="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-blue-500"
            />
          </div>

          <!-- Email -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Email Address</label>
            <input
              v-model="editForm.email"
              type="email"
              required
              class="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-blue-500"
            />
          </div>

          <!-- Reset Password (Optional) -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="font-medium text-zinc-300">Reset Password</label>
              <span class="text-[11px] text-zinc-500">Leave empty to keep current password</span>
            </div>
            <div class="relative">
              <input
                v-model="editForm.password"
                :type="showEditPassword ? 'text' : 'password'"
                minlength="6"
                placeholder="Enter new password (optional)"
                class="w-full h-9 pl-3 pr-9 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono outline-none focus:border-blue-500"
              />
              <button 
                type="button" 
                @click="showEditPassword = !showEditPassword" 
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <EyeOff v-if="showEditPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Role -->
          <div class="space-y-1">
            <label class="font-medium text-zinc-300">Role & Authority</label>
            <select
              v-model="editForm.role"
              class="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="user">User (Standard Server Operator)</option>
              <option value="admin">Administrator (Full Global Access)</option>
            </select>
          </div>

          <!-- Instance Multi-Selection Delegation (Only for User role) -->
          <div v-if="editForm.role === 'user'" class="space-y-2 pt-2 border-t border-zinc-800/80">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-zinc-200">Instance Access Delegation</label>
                <p class="text-[11px] text-zinc-400">Assigned instances can be accessed and controlled by this user</p>
              </div>
              <div class="flex items-center gap-2 text-[11px]">
                <button type="button" @click="selectAllEditServers" class="text-blue-400 hover:underline">Select All</button>
                <span class="text-zinc-600">|</span>
                <button type="button" @click="editForm.serverIds = []" class="text-zinc-400 hover:underline">Clear</button>
              </div>
            </div>

            <div v-if="availableServers.length === 0" class="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-500 text-center text-xs">
              No server instances available.
            </div>

            <div v-else class="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-zinc-900/90 rounded-lg border border-zinc-800/90 scrollbar-thin">
              <label 
                v-for="srv in availableServers" 
                :key="srv.id" 
                class="flex items-center justify-between p-2 rounded hover:bg-zinc-800/70 cursor-pointer text-xs"
              >
                <div class="flex items-center gap-2.5">
                  <input 
                    type="checkbox" 
                    :value="srv.id" 
                    v-model="editForm.serverIds" 
                    class="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span class="font-medium text-zinc-200">{{ srv.name || `Server #${srv.id}` }}</span>
                </div>
                <span class="font-mono text-[11px] text-zinc-500">{{ srv.identifier }}</span>
              </label>
            </div>
          </div>

          <!-- Modal Action Buttons -->
          <div class="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-800">
            <button
              type="button"
              @click="isEditModalOpen = false"
              class="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw class="w-3.5 h-3.5 animate-spin" v-if="isSubmitting" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import { useAuthStore } from '../stores/auth'
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  type UserRecord, 
  type UsersMeta 
} from '../api/users'
import { getServers, type ServerInstance } from '../api/servers'
import { 
  User as UserIcon, 
  Search, 
  RotateCw, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Plus,
  Shield,
  Check,
  Edit3,
  Trash2,
  Server,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-vue-next'

const authStore = useAuthStore()

// State
const users = ref<UserRecord[]>([])
const availableServers = ref<ServerInstance[]>([])
const serversMap = reactive<Record<number, string>>({})

const meta = reactive<UsersMeta>({
  total: 0,
  perPage: 20,
  currentPage: 1,
  lastPage: 1
})

const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const searchQuery = ref('')
const roleFilter = ref<'all' | 'admin' | 'user'>('all')

// Modals State
const isAddModalOpen = ref(false)
const showAddPassword = ref(false)
const addForm = reactive({
  email: '',
  password: '',
  fullName: '',
  role: 'user' as 'admin' | 'user',
  serverIds: [] as number[]
})

const isEditModalOpen = ref(false)
const showEditPassword = ref(false)
const editingUser = ref<UserRecord | null>(null)
const editForm = reactive({
  email: '',
  password: '',
  fullName: '',
  role: 'user' as 'admin' | 'user',
  serverIds: [] as number[]
})

// Helper check
function isCurrentUser(u: UserRecord): boolean {
  if (!authStore.user.value) return false
  return authStore.user.value.id === u.id || authStore.user.value.email === u.email
}

function formatDate(isoString?: string): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return d.toLocaleString()
  } catch {
    return isoString
  }
}

function getServerLabel(sid: number): string {
  return serversMap[sid] || `Server #${sid}`
}

const filteredUsers = computed(() => {
  if (roleFilter.value === 'all') return users.value
  return users.value.filter(u => u.role === roleFilter.value)
})

onMounted(async () => {
  await Promise.all([fetchServers(), fetchUsers()])
})

async function fetchServers() {
  try {
    const res = await getServers(1, 100)
    if (res && Array.isArray(res.data)) {
      availableServers.value = res.data
      for (const s of res.data) {
        serversMap[s.id] = s.name || s.identifier || `Server #${s.id}`
      }
    }
  } catch (err) {
    console.error('Failed to load server instances list:', err)
  }
}

async function fetchUsers() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getUsers({
      page: meta.currentPage,
      perPage: meta.perPage,
      search: searchQuery.value.trim() || undefined
    })

    if (res) {
      users.value = res.data || []
      if (res.meta) {
        meta.total = res.meta.total ?? users.value.length
        meta.perPage = res.meta.perPage ?? 20
        meta.currentPage = res.meta.currentPage ?? 1
        meta.lastPage = res.meta.lastPage ?? 1
      }
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to fetch users list'
  } finally {
    isLoading.value = false
  }
}

function handleSearch() {
  meta.currentPage = 1
  fetchUsers()
}

function handleFilterChange() {
  // Client-side filter on role is immediate
}

function changePage(page: number) {
  if (page < 1 || page > meta.lastPage) return
  meta.currentPage = page
  fetchUsers()
}

// 1. Add User
function openAddModal() {
  addForm.email = ''
  addForm.password = ''
  addForm.fullName = ''
  addForm.role = 'user'
  addForm.serverIds = []
  showAddPassword.value = false
  isAddModalOpen.value = true
}

function selectAllAddServers() {
  addForm.serverIds = availableServers.value.map(s => s.id)
}

async function submitAddUser() {
  if (!addForm.email || !addForm.password) return
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await createUser({
      email: addForm.email.trim(),
      password: addForm.password,
      fullName: addForm.fullName.trim() || undefined,
      role: addForm.role,
      serverIds: addForm.role === 'user' ? addForm.serverIds : []
    })

    successMessage.value = `User "${addForm.email}" created successfully!`
    isAddModalOpen.value = false
    await fetchUsers()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to create user'
  } finally {
    isSubmitting.value = false
  }
}

// 2. Edit User
function openEditModal(u: UserRecord) {
  editingUser.value = u
  editForm.email = u.email
  editForm.password = ''
  editForm.fullName = u.fullName || ''
  editForm.role = u.role
  editForm.serverIds = Array.isArray(u.serverIds) ? [...u.serverIds] : []
  showEditPassword.value = false
  isEditModalOpen.value = true
}

function selectAllEditServers() {
  editForm.serverIds = availableServers.value.map(s => s.id)
}

async function submitEditUser() {
  if (!editingUser.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload: any = {
      email: editForm.email.trim(),
      fullName: editForm.fullName.trim() || undefined,
      role: editForm.role,
      serverIds: editForm.role === 'user' ? editForm.serverIds : []
    }
    if (editForm.password.trim()) {
      payload.password = editForm.password.trim()
    }

    await updateUser(editingUser.value.id, payload)
    successMessage.value = `Updated profile for "${editForm.email}"!`
    isEditModalOpen.value = false
    await fetchUsers()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to update user'
  } finally {
    isSubmitting.value = false
  }
}

// 3. Delete User
async function handleDeleteUser(u: UserRecord) {
  if (isCurrentUser(u)) {
    errorMessage.value = 'Self-deletion is prevented for safety.'
    return
  }

  const confirmMsg = `Are you sure you want to delete user "${u.email}"? This action cannot be undone.`
  if (!window.confirm(confirmMsg)) return

  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deleteUser(u.id)
    successMessage.value = `User "${u.email}" deleted successfully.`
    await fetchUsers()
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to delete user'
  }
}
</script>
