<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxItemIndicator,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";

type Category = { id: string; name: string; slug: string };

const props = defineProps<{
  categories: Category[];
  disabled?: boolean;
  id?: string;
}>();

const categoryId = defineModel<string>({ default: "" });

// Derived from the id, so it also works if the post loads before the categories do
const selected = computed(() => props.categories.find((c) => c.id === categoryId.value) ?? null);

function onSelect(val: unknown) {
  // Category is required: ignore deselect (null/undefined) instead of clearing it
  if (val && typeof val === "object" && "id" in val) {
    categoryId.value = (val as Category).id;
  }
}
</script>

<template>
  <Combobox :model-value="selected" by="id" :disabled="disabled" @update:model-value="onSelect">
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          :disabled="disabled"
          class="w-full h-10 pl-4! rounded-lg justify-between font-normal hover:bg-white text-[0.92rem]"
        >
          <span :class="{ 'text-muted-foreground': !selected }">
            {{ selected?.name ?? "Select a category" }}
          </span>
          <Icon icon="ph:caret-up-down" class="opacity-50" />
        </Button>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxList class="rounded-lg w-(--reka-popper-anchor-width)">
      <ComboboxInput class="text-[0.92rem]" placeholder="Search category..." />
      <ComboboxEmpty class="text-[0.92rem]">No category found</ComboboxEmpty>
      <ComboboxGroup>
        <ComboboxItem
          v-for="cat in categories"
          :key="cat.id"
          :value="cat"
          class="px-2.5 text-[0.92rem] rounded-md"
        >
          {{ cat.name }}
          <ComboboxItemIndicator><Icon icon="ph:check" /></ComboboxItemIndicator>
        </ComboboxItem>
      </ComboboxGroup>
    </ComboboxList>
  </Combobox>
</template>
