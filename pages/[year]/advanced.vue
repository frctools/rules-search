<template>
  <div>
    <Nav v-model="yearNav" page="Advanced Search" />
    <UContainer class="pt-4 flex flex-col gap-4">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle">Experimental</UBadge>
  
        </div>
        <UButton variant="outline" :to="`/${year}`">Back to Traditional Search</UButton>
      </div>



      <div class="flex flex-col gap-3">
        <UInput
          v-model="query"
          size="lg"
          :placeholder="`Ask a more in depth question (e.g. ${randomExample})`"
        />

        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <USelectMenu
            v-model="selectedSections"
            multiple
            :items="sections"
            :loading="sectionsStatus === 'pending'"
            class="w-full md:max-w-xl"
            placeholder="Limit to sections (optional)"
          />

          <div class="flex w-full gap-2 md:w-auto md:items-center">
            <UButton
              :loading="loading"
              :disabled="!query.trim().length"
              @click="runAdvancedSearch"
            >
            Search
            </UButton>
          </div>
        </div>
      </div>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Advanced search failed"
        :description="errorMessage"
      />

      <div v-if="loading" class="flex justify-center py-10">
        <UIcon name="heroicons:arrow-path-20-solid" class="size-8 animate-spin text-gray-400" />
      </div>


      <div class="flex flex-col gap-4" v-else-if="result?.hits?.length && !loading">
        <UCard v-for="item in result.hits" :key="item.id">
          <template #header>
            <NuxtLink class="font-bold text-xl" :to="`/${year}/rule/${item.name}`">
              {{ upperFirst(item.type) }} {{ item.name }}
            </NuxtLink>
          </template>
          <RenderHtml :html="item.text" :highlights="item.highlights" />
        </UCard>
      </div>
      <UCard v-else>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="heroicons:information-circle" class="size-5 text-havelock-blue-500" />
            <h2 class="font-semibold">Before you search</h2>
          </div>
        </template>

        <div class="flex flex-col gap-2 text-sm">
          <p>
            Advanced Search is best for natural language questions that need context across multiple rules.
          </p>
          <ul class="list-disc pl-5 space-y-1">
            <li>Be specific about your scenario, robot behavior, or match situation.</li>
            <li>Treat results as guidance and ensure to read the entire linked rules to verify exact context.</li>
          </ul>
          <UAlert
            color="primary"
            variant="soft"
            title="Tip"
            description="Try wording your query like a full question, for example: Can our robot contact an opponent while extending an intake?"
          />
        </div>
      </UCard>
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
const query = ref("");
const loading = ref(false);
const result = ref(null);
const errorMessage = ref("");

const yearNav = computed({
  get: () =>
    useYearsNav().find((value) => {
      return value.value === year.value;
    }),
  set: (value) => {
    year.value = value.value;
  },
});

watch(year, async (value) => {
  await navigateTo(`/${value}/advanced`);
});

const { data: sections, status: sectionsStatus } = await useFetch("/api/facets", {
  query: {
    year: year.value,
    facet: "section",
  },
  transform: (hits) =>
    hits.map((section) => {
      return section.value;
    }),
});

const selectedSections = ref([]);

const runAdvancedSearch = async () => {
  errorMessage.value = "";
  result.value = null;
  loading.value = true;

  try {
    result.value = await $fetch("/api/advanced-search", {
      method: "POST",
      body: {
        query: query.value,
        year: year.value,
        sections: selectedSections.value,
      },
    });
    useTrackEvent("advanced_search");
  } catch (error) {
    errorMessage.value = error?.data?.statusMessage || error?.message || "Unknown error";
  } finally {
    loading.value = false;
  }
};

useSeoMeta({
  title: "Advanced Search the manual",
});

const exampleQuestions = [
  "can I use two NEOs on one controller?",
  "what types of lasers can I use on my robot",
  "can I use a weird font on my bumpers",
  "can I use a 15a charger in the pits?",
  "what kind of defense can I play with my intake out?",
  "can I run 8 drive motors?",  
];
const randomExample = ref("");
onMounted(() => {
  randomExample.value = exampleQuestions[Math.floor(Math.random() * exampleQuestions.length)];
});
</script>
