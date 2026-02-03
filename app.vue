<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <div class="flex flex-col " :class="{ 'min-h-screen': !embed }">
      <div class="flex-1">
        <NuxtPage />
      </div>
      <USeparator />

      <UFooter v-if="!embed" >
        <template #left>
          <p class="text-sm text-muted">
            Built by Graham • © {{ new Date().getFullYear() }}
          </p>
        </template>

        <template #right>
          <UButton to="https://www.buymeacoffee.com/grahamsh" target="_blank" icon="i-lucide-heart" aria-label="Donate"
            class="text-pink-500" variant="ghost" label="Support Development" />
          <UButton to="https://github.com/frctools/rules-search" target="_blank" icon="i-simple-icons-github"
            aria-label="GitHub" color="neutral" variant="ghost" />
        </template>
      </UFooter>
  
    </div>
  </UApp>
</template>
<script setup>
const route = useRoute();
onMounted(() => {
  if (
    window &&
    !localStorage.getItem("orders-25-shown") && !route.fullPath.includes("embed")
  ) {
    const toast = useToast().add({
      title: "Introducing FRCTools Orders",
      description: `Plan, purchase, and receive parts with ease.`,
      icon: "i-lucide-package",
      duration: 0,
      actions: [
        {
          icon: "i-lucide-square-arrow-out-up-right",
          label: "Open FRCTools Orders",
          color: "neutral",
          variant: "outline",
          onClick: async (e) => {
            e?.stopPropagation();
            localStorage.setItem("orders-25-shown", true);
            await navigateTo("https://orders.frctools.com", { external: true });
          },
        },
      ],
    });
  }
});
const embed = computed(() => {
  return route.path.includes('embed');
})
useSeoMeta({
  titleTemplate: (x) => (x ? `${x} | FRCTools` : `FRCTools`),
  ogTitle: "FRCTools",
  description: `Search the ${route.path.includes("ftc") ? 'FTC' : 'FRC'} Manual`,
  ogDescription: `Search the ${route.path.includes("ftc") ? 'FTC' : 'FRC'} Manual`,
});
useHead({
  htmlAttrs: {
    lang: "en",
  },
});
</script>
