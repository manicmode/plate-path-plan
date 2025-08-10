module.exports = {
  overrides: [
    {
      files: [
        "pages/Home.tsx",
        "pages/Coach.tsx",
        "pages/AIFitnessCoach.tsx",
        "components/coach/recovery/RecoveryAIChat.tsx",
        "components/FoodConfirmationCard.tsx",
        "components/HomeCtaTicker.tsx",
        "components/profile/**/*"
      ],
      rules: {
        "no-console": ["error", { allow: ["warn", "error"] }]
      }
    }
  ]
};
