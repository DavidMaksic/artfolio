<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div
    data-slot="alert-dialog-footer"
    :class="
      cn(
        'flex gap-2 sm:flex-row sm:justify-end flex-row items-center justify-end mt-2',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
