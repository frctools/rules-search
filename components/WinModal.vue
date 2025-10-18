<template>
  <UModal>
    <template #body>
      Congratulations for winning 2025 bingo! Make sure to check out our
      <NuxtLink class="bold text-havelock-blue-400" @click="navigate" to="/"
        >rule search</NuxtLink
      >!
    </template>
    <template #footer>
      <UButton color="neutral" label="Keep playing" @click="modal.close()" />
    </template>
  </UModal>
</template>
<script setup>
const modal = useModal();
const navigate = async () => {
  modal.close();
};
</script>
