import "./assets/main.css";

import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createApp } from "vue";

import router from "@/router/routes";
import App from "@/App.vue";

const app = createApp(App);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, { queryClient });

app.mount("#app");
