<script setup>
import { ref } from 'vue'
import { Check, Download } from 'lucide-vue-next'
import { useClipboard } from '@vueuse/core'
import { toast } from 'vue-sonner'

const props = defineProps({
  links: {
    type: Array,
    required: true,
  },
})

const selectedLinks = ref([])

function toggleLinkSelection(link) {
  const index = selectedLinks.value.findIndex(l => l.id === link.id)
  if (index > -1) {
    selectedLinks.value.splice(index, 1)
  } else {
    selectedLinks.value.push(link)
  }
}

async function exportCSV() {
  if (selectedLinks.value.length === 0) {
    toast('Please select the links to export')
    return
  }

  const csvContent = ['Link,Slug,QRCode']

  for (const link of selectedLinks.value) {
    const shortLink = `${window.location.origin}/${link.slug}`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shortLink)}`
    csvContent.push(`${link.url},${shortLink},${qrCodeUrl}`)
  }

  const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = url
  downloadLink.setAttribute('download', 'exported_links.csv')
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)

  toast('Successfully exported the links')
}
</script>

<template>
  <div>
    <Button @click="exportCSV" class="mb-4">
      <Download class="w-4 h-4 mr-2" />
      Export the selected links
    </Button>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="link in props.links" :key="link.id" class="relative">
        <div class="absolute top-2 left-2">
          <Button
            variant="outline"
            size="icon"
            @click="toggleLinkSelection(link)"
          >
            <Check v-if="selectedLinks.includes(link)" class="w-4 h-4" />
            <span v-else class="w-4 h-4 border-2 rounded-sm"></span>
          </Button>
        </div>
        <DashboardLinksLink
          :link="link"
          @update:link="$emit('update:link', $event)"
        />
      </Card>
    </div>
  </div>
</template>