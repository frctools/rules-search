<template>
  <div>
    <Nav hide-year page="Bingo" />
    <div class="fixed pointer-events-none w-screen h-screen">
      <div
        v-if="hasWon"
        class=""
        v-confetti="{ particleCount: 400, force: 0.7 }"
      ></div>
    </div>

    <UContainer class="mt-4">
      <div class="flex flex-wrap gap-2 overflow-x-auto p-2">
        <div
          v-for="(row, i) in rows"
          :key="i + 'row'"
          class="flex flex-row gap-2"
        >
          <UCard
            class="card size-48 flex justify-center items-center cursor-pointer rounded-md"
            v-for="card of row"
            :key="card"
            @click="toggle(card)"
            :class="
              isSelected(card) ? 'border-green-400 border bg-green-100' : ''
            "
          >
            <span>{{ card }}</span>
          </UCard>
        </div>
      </div>
      <div class="italic flex w-full justify-center">
        a frctools project - check out our rules search at
        <NuxtLink to="/" class="bold text-havelock-blue-500 ml-1">
          https://frctools.com</NuxtLink
        >
      </div>
    </UContainer>
  </div>
</template>

<script setup>
import WinModal from "~/components/WinModal.vue";
import { vConfetti } from "@neoconfetti/vue";
import { useWindowSize } from "@vueuse/core";



const BINGO_CARDS = [
  "Dean Kamen goes on a random STEM tangent",
  "Water Game Teased",
  "Dean Kamen repeatedly hits table with hand",
  "We’re about to reveal it but first",
  "Dozer in the game animation",
  "Space Force commercial",
  "Graphics that have nothing to do with the theme of the game",
  "Some pun on the name Reefscape is made",
  "Technical difficulties",
  "HAAS advertisement",
  'Dean Kamen is "excited to see" something happen this year',
  "will.i.am shows up",
  "Game has seemingly no connection to the name Reefscape",
  "Game Animation shows illegal robots",
  "Spot light on a FIRST employee",
  "Shout out to FLL and FTC",
  "Shooting game",
  "Pick and place game",
  "Game has no endgame",
  "Game has crowd interaction",
  "Game is great for swerve",
  "The game is played with balls",
  "PVC pipe is a game piece",
  'Main game is on a "Reef"',
  "FIRST opportunity for everyone",
  "Game code leaked early",
  "Hardest fun you can have",
  "We are so excited",
  "Student interviews",
  "Woodie flowers tribute",
  "Random sponsor commercial",
  "Game reveal video features dozer abuse",
  "Robots building children",
  "It's a terrain game",
  "Yellow game piece",
  "Game piece is called seaweed"
];
const { data: pickedCards } = await useAsyncData("pickedCards", () => {
  const pickedCards = [];
  for (let i = 0; i < 25; i++) {
    let card = BINGO_CARDS[Math.floor(Math.random() * BINGO_CARDS.length)];
    while (pickedCards.includes(card)) {
      card = BINGO_CARDS[Math.floor(Math.random() * BINGO_CARDS.length)];
    }
    pickedCards.push(card);
  }
  // stick free space in the center
  pickedCards[12] = "FREE SPACE";
  return pickedCards;
});

const selectedCards = ref([]);
const toggle = (card) => {
  if (!selectedCards.value.includes(card)) {
    selectedCards.value.push(card);
  } else {
    selectedCards.value = selectedCards.value.filter((c) => c !== card);
  }
};
const isSelected = (card) => {
  return selectedCards.value.includes(card) || card == "FREE SPACE";
};
const rows = computed(() => {
  // make rows from pickedCards
  return pickedCards.value.reduce((rows, card, index) => {
    if (index % 5 === 0) {
      rows.push([card]);
    } else {
      rows[rows.length - 1].push(card);
    }
    return rows;
  }, []);
});

const hasWon = computed(() => {
  /* if (i == 0) {
      for (const item of row) {
        // traverse through column
        for (let j = 0; j < rows.value.length; j++) {
          if (!rows.value[j].includes(item)) {
            break;
          }
        }
        return true;
      }
    }*/
  const rowWins = rows.value.map((row) => {
    return !row.some((x) => !isSelected(x));
  });
  let columnWins = [0, 1, 2, 3, 4].map((column) => {
    return rows.value.every((row) => isSelected(row[column]));
  });

  const leftDiagonalWin = (() => {
    for (let i = 0; i < rows.value.length; i++) {
      if (!isSelected(rows.value[i][i])) {
        return false;
      }
    }
    return true;
  })();
  const rightDiagonalWin = (() => {
    for (let i = 0; i < rows.value.length; i++) {
      if (!isSelected(rows.value[i][rows.value.length - 1 - i])) {
        return false;
      }
    }
    return true;
  })();
  return (
    rowWins.some((x) => x) ||
    columnWins.some((x) => x) ||
    leftDiagonalWin ||
    rightDiagonalWin
  );
});
watch(hasWon, () => {
  const modal = useModal();
  if (hasWon.value) {
    modal.open(WinModal, { title: "You win!" });
  }
});
useSeoMeta({
  title: `Bingo`,
  description: `Play kickoff BINGO`,
  ogDescription: `Play kickoff BINGO`,
});
</script>
