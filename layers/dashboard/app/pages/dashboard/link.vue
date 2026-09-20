<script setup lang="ts">
import type { Link } from '@/types'

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const linksStore = useDashboardLinksStore()

const slug = computed(() => String(route.query.slug || ''))
const link = ref<Link | null>(null)
const id = computed(() => link.value?.id)

provide(LINK_ID_KEY, id)

async function getLink() {
  if (!slug.value)
    return

  const data = await useAPI<Link>('/api/link/query', {
    query: { slug: slug.value },
  })
  link.value = data
}

onMounted(() => {
  getLink()
})

watch(slug, (newSlug) => {
  if (newSlug && newSlug !== link.value?.slug)
    getLink()
})

linksStore.onLinkUpdate(({ link: updatedLink, type }) => {
  if (updatedLink.id !== link.value?.id)
    return

  if (type === 'delete') {
    navigateTo('/dashboard/links', { replace: true })
  }
  else if (type === 'edit') {
    const previousSlug = link.value?.slug
    link.value = updatedLink
    if (updatedLink.slug !== previousSlug) {
      navigateTo({
        path: '/dashboard/link',
        query: { slug: updatedLink.slug },
      }, { replace: true })
    }
  }
})
</script>

<template>
  <main class="space-y-6">
    <Teleport to="#dashboard-header-actions" defer>
      <div
        class="
          flex-1
          sm:hidden
        "
      />
      <DashboardDatePicker />
    </Teleport>

    <DashboardLinksLink
      v-if="link?.id"
      :link="link"
      :navigable="false"
    />
    <DashboardAnalysis
      v-if="link?.id"
      :link="link"
    />
  </main>
</template>
