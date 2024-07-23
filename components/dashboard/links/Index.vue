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
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const rows = text.split('\n').map(row => row.split(','));

  // Check if the first row is the header
  if (rows[0][0] !== 'link' || rows[0][1] !== 'slug' || rows[0][2] !== 'comment') {
    toast('Invalid CSV format. Please ensure the first row is the header: link,slug,comment.');
    return;
  }

  const existingLinks = new Set(links.value.map(link => link.slug)); // Collect existing slugs
  let hasDuplicates = false;

  for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header
    const [url, slug, comment] = rows[i];
    if (existingLinks.has(slug)) {
      hasDuplicates = true; // Mark if any slug is a duplicate
      break;
    }
  }

  if (hasDuplicates) {
    toast('Duplicate link or slug found. Import skipped.');
    return;
  }

  for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header
    const [url, slug, comment] = rows[i];
    const linkData = {
      url,
      slug,
      optional: {
        comment,
        createdAt: new Date().toISOString(), // Use current date unless specified
      },
    };

    // Send the link data to the API
    await useAPI('/api/link/create', {
      method: 'POST',
      body: linkData,
    });
  }

  toast('Links imported successfully!');
}
</script>

<template>
  <main class="space-y-6">
    <DashboardNav>
      <DashboardLinksEditor @update:link="updateLinkList" />
      <input type="file" accept=".csv" @change="importCSV" class="mb-4" />
      <Button @click="importCSV" class="mb-4">Import Links</Button>
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