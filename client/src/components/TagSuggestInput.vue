<script setup lang="ts">
import { useQuery, keepPreviousData } from "@tanstack/vue-query";
import { normalizeTag, MAX_TAGS } from "@artfolio/shared";
import { computed, ref, watch } from "vue";
import { refDebounced } from "@vueuse/core";
import { trpc } from "@/lib/trpc";

import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxPortal,
  ComboboxContent,
  ComboboxItem,
} from "reka-ui";

import {
  TagsInput,
  TagsInputItem,
  TagsInputInput,
  TagsInputItemText,
  TagsInputItemDelete,
} from "@/components/ui/tags-input";

const props = withDefaults(defineProps<{ disabled?: boolean; max?: number }>(), {
  disabled: false,
  max: MAX_TAGS,
});

const tags = defineModel<string[]>({ default: () => [] });

// Keep tags normalized, unique and within the limit, whatever the source
watch(
  tags,
  (val) => {
    const normalized = [...new Set(val.map(normalizeTag))].filter(Boolean).slice(0, props.max);
    if (normalized.length !== val.length || normalized.some((t, i) => t !== val[i])) {
      tags.value = normalized;
    }
  },
  { deep: true },
);

const atLimit = computed(() => tags.value.length >= props.max);

// ── Suggestions ──────────────
const tagSearch = ref("");
const tagMenuOpen = ref(false);
const debouncedTagSearch = refDebounced(tagSearch, 200);

const { data: tagResults } = useQuery({
  queryKey: ["tag-suggestions", debouncedTagSearch],
  queryFn: () => trpc.tag.search.query({ query: debouncedTagSearch.value.trim() }),
  enabled: computed(() => debouncedTagSearch.value.trim().length > 0 && !atLimit.value),
  staleTime: 1000 * 60,
  placeholderData: keepPreviousData,
});

const suggestions = computed(() => {
  const q = normalizeTag(tagSearch.value);
  if (!q) return [];

  return (tagResults.value?.tags ?? []).filter((t) => {
    const name = normalizeTag(t.name);
    return name.startsWith(q) && !tags.value.includes(name);
  });
});

function addSuggested(name: string) {
  const normalized = normalizeTag(name);
  if (!atLimit.value && !tags.value.includes(normalized)) {
    tags.value = [...tags.value, normalized];
  }
  tagSearch.value = "";
  tagMenuOpen.value = false;
}
</script>

<template>
  <div class="space-y-1.5">
    <ComboboxRoot
      v-model:open="tagMenuOpen"
      :model-value="tags"
      :ignore-filter="true"
      :disabled="disabled"
    >
      <ComboboxAnchor as-child>
        <TagsInput v-model="tags" :disabled="disabled">
          <TagsInputItem v-for="tag in tags" :key="tag" :value="tag">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>

          <ComboboxInput v-model="tagSearch" as-child>
            <TagsInputInput
              :placeholder="atLimit ? '' : 'Add a tag...'"
              class="min-w-20 flex-1 basis-24"
              @focus="tagMenuOpen = true"
              @keydown="
                (e: KeyboardEvent) => {
                  if (atLimit && e.key !== 'Backspace') e.preventDefault();
                }
              "
            />
          </ComboboxInput>
        </TagsInput>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          v-if="suggestions.length > 0 && !atLimit"
          class="z-50 mt-1 w-(--reka-popper-anchor-width) overflow-hidden rounded-md border bg-popover shadow-md"
          position="popper"
          @open-auto-focus.prevent
        >
          <ComboboxItem
            v-for="s in suggestions"
            :key="s.id"
            :value="s.name"
            class="flex flex-col items-start px-3 py-2 text-sm data-highlighted:bg-neutral-100/50 not-last:border-b not-last:border-b-neutral-200/50"
            @select.prevent="addSuggested(s.name)"
          >
            <span>{{ s.name }}</span>
            <span class="text-xs text-muted-foreground">{{ s.count }} posts</span>
          </ComboboxItem>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <p class="text-xs text-muted-foreground">
      <template v-if="atLimit">{{ tags.length }}/{{ max }} · Remove a tag to add another</template>
      <template v-else>Press Enter or comma to add · {{ tags.length }}/{{ max }}</template>
    </p>
  </div>
</template>
