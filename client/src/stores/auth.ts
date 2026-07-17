import { ref, computed } from "vue";
import { defineStore } from "pinia";

interface User {
  id: string;
  email: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("access_token"));

  const isAuthenticated = computed(() => !!token.value);

  function setAuth(newUser: User, accessToken: string) {
    user.value = newUser;
    token.value = accessToken;
    localStorage.setItem("access_token", accessToken);
  }

  function clearAuth() {
    user.value = null;
    token.value = null;
    localStorage.removeItem("access_token");
  }

  return { user, token, isAuthenticated, setAuth, clearAuth };
});
