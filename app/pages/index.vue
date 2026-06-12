<script setup lang="ts">
definePageMeta({ layout: false })

const canvas = ref<HTMLCanvasElement>()

onMounted(() => {
  if (!canvas.value)
    return

  const el = canvas.value

  const ctx = el.getContext('2d')!
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=-~'
  const fontSize = 14
  let columns = 0
  let drops: number[] = []

  function resize() {
    el.width = window.innerWidth
    el.height = window.innerHeight
    columns = Math.floor(el.width / fontSize)
    drops = Array.from({ length: columns }, () => Math.random() * -100)
  }

  resize()
  window.addEventListener('resize', resize)

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, el.width, el.height)
    ctx.fillStyle = '#0f0'
    ctx.font = `${fontSize}px monospace`

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)]
      const x = i * fontSize
      const y = drops[i]! * fontSize

      ctx.fillStyle = `hsl(${120 + Math.random() * 40}, 100%, ${50 + Math.random() * 20}%)`
      ctx.fillText(char!, x, y)

      if (y > el.height && Math.random() > 0.975) {
        drops[i] = 0
      }
      drops[i]!++
    }

    requestAnimationFrame(draw)
  }

  draw()
})
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden bg-black">
    <canvas ref="canvas" class="absolute inset-0" />
    <div class="absolute inset-0 flex items-center justify-center">
      <NuxtLink
        to="/dashboard/links"
        class="
          group rounded-full border border-green-800/50 px-6 py-3
          text-green-400/70 backdrop-blur-sm transition-all
          hover:border-green-500 hover:text-green-300
          hover:shadow-[0_0_20px_rgba(0,255,0,0.15)]
        "
      >
        <span class="font-mono text-sm tracking-widest">ENTER</span>
      </NuxtLink>
    </div>
  </div>
</template>
