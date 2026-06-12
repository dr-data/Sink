<script setup lang="ts">
import type QRCodeStylingType from 'qr-code-styling'
import { Download } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  data: string
  image?: string
}>(), {
  image: '',
})

const color = ref('#000000')
const qrCodeEl = useTemplateRef<HTMLElement>('qrCodeEl')

let qrCode: QRCodeStylingType | null = null

function updateColor(newColor: string) {
  qrCode?.update({
    dotsOptions: { type: 'dots' as const, color: newColor },
    cornersSquareOptions: { type: 'extra-rounded' as const, color: newColor },
    cornersDotOptions: { type: 'dot' as const, color: newColor },
  })
}

watch(color, (newColor) => {
  updateColor(newColor)
})

function downloadQRCode() {
  const slug = props.data.split('/').pop()
  qrCode?.download({
    extension: 'png',
    name: `qr_${slug}`,
  })
}

onMounted(async () => {
  const { default: QRCodeStyling } = await import('qr-code-styling')

  qrCode = new QRCodeStyling({
    width: 256,
    height: 256,
    data: props.data,
    type: 'svg',
    margin: 10,
    qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'Q' },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 2 },
    dotsOptions: { type: 'dots', color: '#000000' },
    backgroundOptions: { color: '#ffffff' },
    image: props.image,
    cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
    cornersDotOptions: { type: 'dot', color: '#000000' },
  })

  if (qrCodeEl.value) {
    qrCode.append(qrCodeEl.value)
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <div
      ref="qrCodeEl"
      :data-text="data"
      class="rounded-lg bg-white p-1"
    />
    <div class="flex items-center gap-4">
      <div class="relative flex items-center">
        <div
          class="
            h-8 w-8 cursor-pointer overflow-hidden rounded-full border
            border-gray-300
            dark:border-gray-600
          "
          :style="{ backgroundColor: color }"
          :title="$t('links.change_qr_color')"
        >
          <input
            v-model="color"
            type="color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            :title="$t('links.change_qr_color')"
          >
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        @click="downloadQRCode"
      >
        <Download class="mr-2 h-4 w-4" />
        {{ $t('links.download_qr_code') }}
      </Button>
    </div>
  </div>
</template>
