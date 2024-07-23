<script setup>
import { ref } from 'vue'
import { Loader } from 'lucide-vue-next'
import { useInfiniteScroll } from '@vueuse/core'
import ExportLinks from './ExportLinks.vue'
import { toast } from 'vue-sonner'

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
  links.value = links.value.concat(data.links).filter(Boolean)
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
  } else if (type === 'delete') {
    const index = links.value.findIndex(l => l.id === link.id)
    links.value.splice(index, 1)
  } else {
    links.value.unshift(link)
  }
}

async function importCSV(event) {
  const file = event.target.files[0]
  if (!file) return

  const text = await file.text()
  const rows = text.split('\n').map(row => row.split(','))
  
  // Assuming the CSV format is: link,slug,comment
  for (const row of rows) {
    const [url, slug, comment] = row
    const linkData = {
      url,
      slug,
      optional: {
        comment,
        createdAt: new Date().toISOString(), // Use current date unless specified
      },
    }
    
    // Send the link data to the API
    await useAPI('/api/link/create', {
      method: 'POST',
      body: linkData,
    })
  }

  toast('Links imported successfully!')
}
</script>

<template>
  <main class="space-y-6">
    <DashboardNav>
      <DashboardLinksEditor @update:link="updateLinkList" />
      <input type="file" accept=".csv" @change="importCSV" class="mb-4" />
    </DashboardNav>
    <ExportLinks
      :links="links"
      @update:link="updateLinkList"
    />
    <div v-if="isLoading" class="flex items-center justify-center">
      <Loader class="animate-spin" />
    </div>
    <div v-if="!isLoading && listComplete" class="flex items-center justify-center text-sm">
      No more links
    </div>
  </main>
</template>