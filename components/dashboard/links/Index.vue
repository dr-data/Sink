<script setup>
import { Loader } from 'lucide-vue-next'
import { useInfiniteScroll } from '@vueuse/core'
import ExportLinks from './ExportLinks.vue'

const links = ref([])
const limit = 24
let cursor = ''
let listComplete = false

async function getLinks() {
  const data = await useAPI('/api/link/list', {
    query: {
      limit,
      cursor,
    },
  })
  console.log('Fetched links:', data.links)
  links.value = links.value.concat(data.links).filter(Boolean) // Sometimes cloudflare will return null, filter out
  cursor = data.cursor
  listComplete = data.list_complete
}

const { isLoading } = useInfiniteScroll(
  document,
  getLinks,
  { distance: 150, interval: 1000, canLoadMore: () => !listComplete },
)

function updateLinkList(link, type) {
  if (type === 'edit') {
    const index = links.value.findIndex(l => l.id === link.id)
    links.value[index] = link
  }
  else if (type === 'delete') {
    const index = links.value.findIndex(l => l.id === link.id)
    links.value.splice(index, 1)
  }
  else {
    links.value.unshift(link)
  }
}
</script>

<template>
  <main class="space-y-6">
    <DashboardNav>
      <DashboardLinksEditor @update:link="updateLinkList" />
    </DashboardNav>
    <ExportLinks
      :links="links"
      @update:link="updateLinkList"
    />
    <div
      v-if="isLoading"
      class="flex items-center justify-center"
    >
      <Loader class="animate-spin" />
    </div>
    <div
      v-if="!isLoading && listComplete"
      class="flex items-center justify-center text-sm"
    >
      没有更多链接了
    </div>
  </main>
</template>