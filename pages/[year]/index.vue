<template>
  <div>
    <Nav v-model="yearNav" page="Search" />
    <UContainer class="pt-4 flex flex-col gap-4">
      <ULink to="/" v-if="year != useYearsNav()[0].value && !year.includes('ftc')">
        <UAlert title="Heads up!"
          :description="`You are viewing rules from the ${year} manual. Click here to see the latest version.`" />
      </ULink>

      <div
        class="flex flex-col md:flex-row justify-between gap-2 items-center flex-wrap"
      >
        <UInput
          placeholder="Search..."
          class="flex-1 w-full "
          size="lg"
          v-model="query"
        />
        <div class="flex gap-2 items-center justify-between ">
          <USelectMenu
            v-model="selectedSections"
            multiple
            :items="sections"
            :loading="sectionsStatus == 'pending'"
            class="max-w-44 md:max-w-48"
            default-value="sections"
          />

          <UCheckbox
            v-model="semanticEnabled"
            label="Semantic search"
            size="xl"
          />
        </div>
      </div>
      <div
        v-if="!resultData?.hits.length || loading"
        class="flex justify-center items-center"
      >
        <div
          class="flex flex-col items-center justify-center flex-1 px-6 py-14 sm:px-14"
        >
          <UIcon
            name="heroicons:circle-stack-20-solid"
            class="size-10 mx-auto text-gray-400 dark:text-gray-500 mb-4"
            v-if="!loading"
          ></UIcon>
          <UIcon
            name="heroicons:arrow-path-20-solid"
            class="size-10 mx-auto text-gray-400 dark:text-gray-500 mb-4 animate-spin"
            v-else
          ></UIcon>

          <p class="text-sm text-center text-gray-900 dark:text-white">
            <span v-if="!query.length"
              >Nothing yet.
              <span
                class="bold text-havelock-blue-500 cursor-pointer"
                @click="randomSearch"
                >Search something!</span
              ></span
            >
            <span v-else-if="!loading"
              >No results found for "{{ query }}".</span
            >
            <span v-else>Loading...</span>
          </p>
        </div>
      </div>
      <div class="flex gap-4 flex-col" v-if="!loading">
        <UCard v-for="result of resultData?.hits" :key="result.id">
          <template #header>
            <div class="flex justify-between">
              <NuxtLink
                class="font-bold text-xl"
                :to="`/${year}/rule/${result.name}`"
              >
                {{ upperFirst(result.type) }} {{ result.name }}
              </NuxtLink>
              <UButton
                size="sm"
                variant="outline"
                icon="heroicons-solid:share"
                @click="share(result)"
              ></UButton>
            </div>
          </template>
          <RenderHtml :html="result.text" />
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
import { upperFirst } from "scule";
import { watch } from "vue";
import { useRouteQuery } from "@vueuse/router";
import { watchDebounced } from "@vueuse/core";
const route = useRoute();
const validYears = useYears();
if (!validYears.includes(route.params.year)) {
  await navigateTo(`/${validYears[0]}`);
}
const query = useRouteQuery("query", "");
const semanticEnabled = useRouteQuery("semantic", true);
const year = ref(route.params.year);
const loading = ref(false);

const yearNav = computed({
  get: () =>
    useYearsNav().find((val) => {
      return val.value == year.value;
    }),
  set: (value) => {
    year.value = value.value;
  },
});
const { data: sections, status: sectionsStatus } = await useFetch(
  "/api/facets",
  {
    query: {
      year: year.value,
      facet: "section",
    },
    transform: (hits) =>
      hits.map((section) => {
        return section.value;
      }),
  }
);
const selectedSections = ref([]);
watchEffect(() => (selectedSections.value = sections.value));

const { data, status, error, clear } = await useFetch("/api/search", {
  query: {
    year: year.value,
    query: query.value,
    semantic: semanticEnabled.value,
    sections: selectedSections.value
      .map((section) => `section = '${section}'`)
      .join(" OR "),
  },
  onResponse() {
    loading.value = false;
  },
});
const resultData = ref(data);
resultData.value = data.value;
const refresh = async (value) => {
  loading.value = true;

  resultData.value = await $fetch("/api/search", {
    query: {
      year: year.value,
      query: query.value,
      semantic: semanticEnabled.value,
      sections: selectedSections.value
        .map((section) => `section = '${section}'`)
        .join(" OR "),
    },
    onResponse() {
      useTrackEvent(semanticEnabled.value ? "semantic_search" : "search");
      loading.value = false;
    },
  });
};

const share = async (result) => {
  const shareData = {
    title: `${upperFirst(result.type)} ${result.name}`,
    text: `Learn about rule ${result.name}`,
    url: `https://frctools.com/${year.value}/rule/${result.name}`,
  };
  if (navigator.share && navigator.canShare(shareData)) {
    navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(
      `https://frctools.com/${year.value}/rule/${result.name}`
    );
  }
};
const randomSearches = [
  "batteries",
  "wire gauge",
  "scoring",
  "wiring",
  "event rules",
  "alliance selection",
  "extension limits",
  "game piece",
];
const randomSearch = () => {
  query.value =
    randomSearches[Math.floor(Math.random() * randomSearches.length - 1)];
};
watchDebounced(query, refresh, { debounce: 200 });
watch(semanticEnabled, refresh);
watch(selectedSections, refresh);

useSeoMeta({
  title: `Search the manual`,
});
</script>
<style>
html {
  scrollbar-gutter: stable;
}
.prose > *:is([style*="text-indent:-.25in"]) {
  text-indent: revert !important;
}
</style>
