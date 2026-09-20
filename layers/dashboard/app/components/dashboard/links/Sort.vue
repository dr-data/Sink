<script setup lang="ts">
import type { LinkSortBy } from '@/types'
import { ArrowUpDown } from 'lucide-vue-next'

const linksStore = useDashboardLinksStore()
const sortOptions: LinkSortBy[] = ['newest', 'oldest', 'az', 'za']

function onSortChange(value: unknown) {
  if (value === 'newest' || value === 'oldest' || value === 'az' || value === 'za')
    linksStore.setSortBy(value)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        :title="$t('links.sort.tip')"
      >
        <ArrowUpDown
          class="
            h-4 w-4
            sm:mr-2
          "
        />
        <span
          class="
            hidden
            sm:inline
          "
        >
          {{ $t(`links.sort.${linksStore.sortBy}`) }}
        </span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuRadioGroup
        :model-value="linksStore.sortBy"
        @update:model-value="onSortChange"
      >
        <DropdownMenuRadioItem
          v-for="option in sortOptions"
          :key="option"
          :value="option"
        >
          {{ $t(`links.sort.${option}`) }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
