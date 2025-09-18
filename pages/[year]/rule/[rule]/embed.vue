<template>
  <div>
    <UContainer class="flex flex-col gap-4" v-if="!error">

      <div
        ref="container"
        :class="{ 'max-h-[320px] overflow-hidden': !expanded }"
        class="relative"
      >
        <RenderHtml :html="data.text" />
        <div
          v-if="isOverflowing"
          class="bottom-0 w-full absolute bg-white/45 backdrop-blur-md p-2 cursor-pointer font-bold justify-between flex"
          @click="buttonHandler"
        >
        <div class="flex gap-1 justify-center">
          {{ expanded ? `Shrink Rule` : `Expand Rule` }}
          <UIcon
            :name="expanded ? `heroicons:arrow-up` : `heroicons:arrow-down`"
          ></UIcon></div>
         <UButton size="xs" to="/" target="_blank">Search Rules on <span class="font-bold font-display" @click="(e)=>e.stopPropagation()">FRCTools</span></UButton>
        </div>
      </div>
    </UContainer>
    <UContainer class="flex flex-col gap-4 mt-4" v-else>
      <div
        class="flex flex-col items-center justify-center flex-1 px-6 py-14 sm:px-14"
      >
        <UIcon
          name="heroicons:exclamation-circle"
          class="size-10 mx-auto text-gray-400 dark:text-gray-500 mb-4"
        ></UIcon>

        <p class="text-sm text-center text-gray-900 dark:text-white">
          Something went wrong
        </p>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
import { upperFirst } from "scule";
const route = useRoute();
const validYears = useYears();
if (!validYears.includes(route.params.year)) {
  await navigateTo(`/${validYears[0]}`);
}
const year = ref(route.params.year);
const expanded = ref(false);
const el = useTemplateRef("container");
const isOverflowing = ref(false);

const updateMainWindow = () => {
  window.parent.postMessage(`${el.value?.scrollHeight}`, '*');
};

const buttonHandler = () => {
   expanded.value = !expanded.value;
   updateMainWindow();
}
onMounted(() => {
  isOverflowing.value = el.value?.scrollHeight > el.value?.clientHeight;
  updateMainWindow();
});
const rule = ref(route.params.rule);
const { data, status, error, clear } = await useFetch("/api/rule", {
  query: {
    year: year.value,
    query: rule.value,
  },
});
const items = computed(() => {
  return [
    {
      label: "Home",
      to: "/",
      icon: "i-lucide-house",
      target: "_blank",
    },
    {
      label: year.value,
      to: `/${year.value}`,
      icon: "i-lucide-calendar",
      target: "_blank",
    },
    {
      label: `${upperFirst(data.value.type)} ${data.value.name}`,
      to: `/${year.value}/rule/${rule.value}`,
    },
  ];
});
useSeoMeta({
  title: `${upperFirst(data.value.type)} ${data.value.name}`,
  ogTitle: `${upperFirst(data.value.type)} ${data.value.name}`,
  ogImage: data.value.additionalContent.find((x) => x?.type == "image")?.src,
  description: data.value.summary,
  ogDescription: data.value.summary,
});
useHead({
  link: [
    {
      href: `https://frctools.com/api/apub?year=${year.value}&query=${rule.value}`,
      rel: "alternate",
      title: "ActivityPub (JSON)",
      type: "application/activity+json",
    },
  ],
});
</script>

<style></style>
