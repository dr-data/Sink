<script setup lang="ts">
import type { CounterData, Link, LinkListResponse, LinkUpdateType } from '@/types'
import { sortLinks, sortRequiresFullList } from '#shared/utils/sort-links'
import { useInfiniteScroll } from '@vueuse/core'
import { Loader } from 'lucide-vue-next'

const PAGE_LIMIT = 24
const FULL_LIST_LIMIT = 1024

const linksStore = useDashboardLinksStore()

const links = ref<Link[]>([])
const listComplete = ref(false)
const listError = ref(false)
const isLoadingAll = ref(false)
let cursor = ''
let inFlight: Promise<void> | null = null

const countersMap = ref<Record<string, CounterData>>({})
provide('linksCountersMap', countersMap)

const pendingIds = new Set<string>()
const defaultCounters: CounterData = Object.freeze({ visits: 0, visitors: 0, referers: 0 })

async function fetchCounters(ids: string[]) {
  if (!ids.length)
    return
  ids.forEach(id => pendingIds.add(id))
  try {
    const result = await useAPI<{ data: (CounterData & { id: string })[] }>('/api/stats/counters', {
      query: { id: ids.join(',') },
    })
    for (const item of result.data ?? []) {
      countersMap.value[item.id] = {
        visits: item.visits,
        visitors: item.visitors,
        referers: item.referers,
      }
    }
  }
  catch (error) {
    console.error('Failed to fetch counters:', error)
  }
  finally {
    for (const id of ids) {
      if (!countersMap.value[id])
        countersMap.value[id] = { ...defaultCounters }
      pendingIds.delete(id)
    }
  }
}

const scrollContainer = ref<HTMLElement | Window | null>(null)

onMounted(() => {
  scrollContainer.value = document.querySelector('.overflow-y-auto') as HTMLElement | null
})

const displayedLinks = computed(() => sortLinks(links.value, linksStore.sortBy))

async function getLinks(fetchLimit = PAGE_LIMIT) {
  if (listComplete.value)
    return
  if (inFlight) {
    await inFlight
    return
  }

  inFlight = (async () => {
    try {
      const data = await useAPI<LinkListResponse>('/api/link/list', {
        query: {
          limit: fetchLimit,
          cursor,
        },
      })
      const newLinks = data.links.filter(Boolean)
      links.value = links.value.concat(newLinks)
      cursor = data.cursor
      listComplete.value = data.list_complete
      listError.value = false

      const ids = newLinks.map(l => l.id).filter(id => !countersMap.value[id] && !pendingIds.has(id))
      fetchCounters(ids)
    }
    catch (error) {
      console.error(error)
      listError.value = true
    }
    finally {
      inFlight = null
    }
  })()

  await inFlight
}

async function loadAllLinks() {
  isLoadingAll.value = true
  try {
    while (!listComplete.value && !listError.value)
      await getLinks(FULL_LIST_LIMIT)
  }
  finally {
    isLoadingAll.value = false
  }
}

watch(() => linksStore.sortBy, (sortBy) => {
  if (sortRequiresFullList(sortBy))
    loadAllLinks()
})

const { isLoading } = useInfiniteScroll(
  scrollContainer as unknown as Ref<HTMLElement | null>,
  () => getLinks(),
  {
    distance: 150,
    interval: 1000,
    canLoadMore: () => {
      return !listError.value && !listComplete.value && !isLoadingAll.value
    },
  },
)

function updateLinkList(link: Link, type: LinkUpdateType) {
  if (type === 'edit') {
    const index = links.value.findIndex(l => l.id === link.id)
    if (index !== -1)
      links.value[index] = link
  }
  else if (type === 'delete') {
    const index = links.value.findIndex(l => l.id === link.id)
    if (index !== -1)
      links.value.splice(index, 1)
  }
  else {
    links.value.unshift(link)
    linksStore.setSortBy('newest')
  }
}

linksStore.onLinkUpdate(({ link, type }) => {
  updateLinkList(link, type)
})
</script>

<template>
  <section
    class="
      grid grid-cols-1 gap-4
      md:grid-cols-2
      lg:grid-cols-3
    "
  >
    <DashboardLinksLink
      v-for="link in displayedLinks"
      :key="link.id"
      :link="link"
    />
  </section>
  <div
    v-if="isLoading || isLoadingAll"
    class="flex items-center justify-center"
  >
    <Loader class="animate-spin" />
  </div>
  <div
    v-if="!isLoading && !isLoadingAll && listComplete"
    class="flex items-center justify-center text-sm"
  >
    {{ $t('links.no_more') }}
  </div>
  <div
    v-if="listError"
    class="flex items-center justify-center text-sm"
  >
    {{ $t('links.load_failed') }}
    <Button variant="link" @click="getLinks()">
      {{ $t('common.try_again') }}
    </Button>
  </div>
</template>
