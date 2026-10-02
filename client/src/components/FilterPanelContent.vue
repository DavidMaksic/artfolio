<script setup lang="ts">
import {
  Combobox,
  ComboboxItem,
  ComboboxList,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxAnchor,
  ComboboxTrigger,
  ComboboxItemIndicator,
} from "@/components/ui/combobox";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import type { AcceptableValue } from "reka-ui";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";

defineProps<{
  categories: { value: string; label: string }[];
  selectedCategory: { value: string; label: string } | null;
  sort: "new" | "popular";
  trendingTags: { id: string; name: string }[];
  debouncedQuery: string;
}>();

const emit = defineEmits<{
  selectCategory: [cat: { value: string; label: string } | null];
  setSort: [value: AcceptableValue];
  selectTag: [name: string];
}>();
</script>

<template>
  <div class="flex flex-col gap-6 px-6 sm:pb-4 sm:px-0">
    <!-- Trending tags -->
    <div v-if="trendingTags.length" class="flex flex-col gap-2.5">
      <p class="text-sm font-medium">Trending</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in trendingTags"
          :key="tag.id"
          data-testid="tag-button"
          class="text-sm px-4 py-1.5 rounded-full border border-neutral-200 bg-white text-muted-foreground hover:border-neutral-400/80 transition-colors"
          :class="{
            'border-neutral-300 text-foreground bg-neutral-100!': debouncedQuery === tag.name,
          }"
          @click="emit('selectTag', tag.name)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>

    <!-- Category -->
    <div class="flex flex-col gap-2.5">
      <p class="text-sm font-medium">Category</p>
      <Combobox
        data-testid="category-button"
        :model-value="selectedCategory"
        by="value"
        @update:model-value="
          (val) => emit('selectCategory', val as { value: string; label: string } | null)
        "
      >
        <ComboboxAnchor as-child>
          <ComboboxTrigger as-child>
            <Button
              variant="outline"
              class="w-full h-10 pl-4! rounded-lg justify-between font-normal hover:bg-white text-[0.92rem]"
            >
              {{ selectedCategory?.label ?? "All categories" }}
              <Icon icon="ph:caret-up-down" class="opacity-50" />
            </Button>
          </ComboboxTrigger>
        </ComboboxAnchor>
        <ComboboxList class="rounded-lg xl:w-68 sm:w-96.5">
          <ComboboxInput class="text-[0.92rem]" placeholder="Search category..." />
          <ComboboxEmpty class="text-[0.92rem]">No category found</ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxItem
              :value="null"
              class="px-2.5 text-[0.92rem]"
              @select="emit('selectCategory', null)"
            >
              All categories
              <ComboboxItemIndicator><Icon icon="ph:check" /></ComboboxItemIndicator>
            </ComboboxItem>
            <ComboboxItem
              v-for="cat in categories"
              :key="cat.value"
              :value="cat"
              class="px-2.5 text-[0.92rem] rounded-md"
            >
              {{ cat.label }}
              <ComboboxItemIndicator><Icon icon="ph:check" /></ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxList>
      </Combobox>
    </div>

    <!-- Sort -->
    <div class="flex flex-col gap-2.5">
      <p class="text-sm font-medium">Sort by</p>
      <Select :model-value="sort" @update:model-value="emit('setSort', $event)">
        <SelectTrigger class="w-full pl-4! bg-white h-10! rounded-lg text-[0.92rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent class="rounded-lg">
          <SelectItem value="popular" class="text-[0.92rem] rounded-md">Popular</SelectItem>
          <SelectItem value="new" class="text-[0.92rem] rounded-lg">New</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
