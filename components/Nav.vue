<template>
  <header
    class="w-full border-b border-b-1 border-havelock-blue-400 bg-havelock-blue-50/50 backdrop-blur dark:bg-gray-950/25"
  >
    <div
      class="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex items-center justify-between gap-3 h-[var(--ui-header-height)]"
    >
      <div class="flex gap-2">
        <NuxtLink
          class="font-bold font-display text-3xl text-havelock-blue-950 dark:text-white flex justify-center items-center gap-2"
          to="/"
          >FRCTools
          <span class="md:inline hidden">{{ props.page }}</span></NuxtLink
        >
        <UButton square variant="outline" to="/bingo" v-if="false"
          ><UIcon name="solar:gamepad-old-bold-duotone" class="size-6 "></UIcon
        ></UButton>
      </div>
      <div v-if="!props.hideYear">
        <USelectMenu :items="validYears" v-model="year">
          <template #leading="{ modelValue, ui }">
            <span v-if="modelValue" class="size-5 text-center">
              {{ modelValue?.emoji }}
            </span>
          </template>
          <template #item-leading="{ item }">
            <span class="size-5 text-center">
              {{ item.emoji }}
            </span>
          </template>
        </USelectMenu>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
const validYears = useYearsNav();
const year = defineModel();
watch(year, async (value) => {
  await navigateTo(`/${value.value}`);
});
const props = defineProps<{
  hideYear?: boolean;
  page?: string;
}>();
</script>
