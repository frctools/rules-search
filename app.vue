<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <div class="flex flex-col " :class="{'min-h-screen': !embed}">
      <div class="flex-1">
        <NuxtPage />
      </div>
      <div
        class="w-full flex justify-center gap-4 md:gap-8 items-center p-2 bg-gray-50/50 dark:bg-blue-950/50 md:flex-row flex-col"
        v-if="!embed"
      >
        <span class="font-display italic"
          >built by
          <a
            href="https://grahamsh.com"
            class="underline text-blue-700 font-semibold"
            >grahamsh</a
          ></span
        >
        <BuyMeACoffee />
      </div>
    </div>
  </UApp>
</template>
<script setup>
onMounted(() => {
  if (
    window &&
    !localStorage.getItem("bingo-25-shown") &&
    new Date().getTime() > 1735102800000 &&
    false
  ) {
    // christmas 2024
    const toast = useToast().add({
      title: "Kickoff Bingo",
      description: `Check out kickoff bingo!`,
      icon: "i-lucide-calendar-days",
      duration: 0,
      actions: [
        {
          icon: "i-lucide-square-arrow-out-up-right",
          label: "Go to bingo",
          color: "neutral",
          variant: "outline",
          onClick: async (e) => {
            e?.stopPropagation();
            localStorage.setItem("bingo-25-shown", true);
            await navigateTo("/bingo");
          },
        },
      ],
    });
  }
});
const route = useRoute();
const embed = computed(()=> {
   return route.path.includes('embed');
})
useSeoMeta({
  titleTemplate: (x) => (x ? `${x} | FRCTools` : `FRCTools`),
  ogTitle: "FRCTools",
  description: `Search the ${route.path.includes("ftc")? 'FTC': 'FRC'} Manual`,
  ogDescription: `Search the ${route.path.includes("ftc")? 'FTC': 'FRC'} Manual`,
});
useHead({
  htmlAttrs: {
    lang: "en",
  },
});
</script>
