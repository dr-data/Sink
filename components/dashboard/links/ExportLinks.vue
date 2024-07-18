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
    toast('请先选择要导出的链接')
    return
  }

  const csvContent = ['原始链接,短链接,QR码图片']

  for (const link of selectedLinks.value) {
    const shortLink = `${window.location.origin}/${link.slug}`
    const qrCodeUrl = await generateQRCode(shortLink)
    csvContent.push(`${link.url},${shortLink},${qrCodeUrl}`)
  }

  const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'exported_links.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  toast('导出成功')
}

async function generateQRCode(url) {
  // 这里使用了之前定义的 QRCode 组件的逻辑
  const qrCode = new QRCodeStyling({
    width: 256,
    height: 256,
    data: url,
    // ... 其他 QR 码配置
  })

  return new Promise((resolve) => {
    qrCode.getRawData('png').then((blob) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  })
}
</script>

<template>
  <div>
    <Button @click="exportCSV" class="mb-4">
      <Download class="w-4 h-4 mr-2" />
      导出选中链接
    </Button>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="link in props.links" :key="link.id" class="relative">
        <div class="absolute top-2 right-2">
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
