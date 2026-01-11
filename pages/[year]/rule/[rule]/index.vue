<template>
  <div>
    <Nav v-model="yearNav" page="Search" />
    <UContainer class="flex flex-col gap-4 mt-4" v-if="!error">
      <UBreadcrumb :items="items" />
      <RenderHtml :html="data.text" />

      <div v-if="similarRules && similarRules.length > 0" class="mt-8">
        <h2 class="text-2xl font-bold mb-4">Similar Rules</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ULink :to="`/${year}/rule/${similarRule.name}`" v-for="similarRule in similarRules" :key="similarRule.id" >
          <UPageCard :title="`${upperFirst(similarRule.type)} ${similarRule.name}`" :description="similarRule.summary" icon="i-lucide-scale" :ui="{
            description: 'line-clamp-4'
          }"></UPageCard>
        </ULink>
        </div>
      </div>
      
      </UContainer
    >
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
const yearNav = computed({
  get: () =>
    useYearsNav().find((val) => {
      return val.value == year.value;
    }),
  set: (value) => {
    year.value = value.value;
  },
});

const rule = ref(route.params.rule);
const { data, status, error, clear } = await useFetch("/api/rule", {
  query: {
    year: year.value,
    query: rule.value,
  },
});

const { data: similarRules } = await useFetch("/api/similar", {
  query: {
    year: year.value,
    id: data.value.id,
  },
});

const items = computed(() => {
  return [
    {
      label: "Home",
      to: "/",
      icon: "i-lucide-house",
    },
    {
      label: year.value,
      to: `/${year.value}`,
      icon: "i-lucide-calendar",
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
         type: "application/activity+json"
      }
   ]
})
</script>

<style></style>
