/*
   Make sure newest years are FIRST
   move ftc up on kickoff
*/
export const useYearsNav = () => {
  return [
    {
      label: "2026 - Rebuilt",
      value: "2026",
      emoji: "⚒️",
    },
    {
      label: "2026 - Decode",
      value: "2026-ftc",
      emoji: "🔑",
    },
    {
      label: "2025 - Reefscape",
      value: "2025",
      emoji: "🌊",
    },
    { label: "2025 - INTO THE DEEP", value: "2025-ftc", emoji: "🪸" },

    {
      label: "2024 - Crescendo",
      value: "2024",
      emoji: "🎶",
    },
    {
      label: "2023 - Charged Up",
      value: "2023",
      emoji: "⚡️",
    },
    {
      label: "2022 - Rapid React",
      value: "2022",
      emoji: "✈️",
    },
  ];
};

export const useYears = () => {
  return useYearsNav().map((year) => year.value);
};
