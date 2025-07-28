return (
  <div className="p-4 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">Track your progress and patterns</p>
    </div>

    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
        <TabsTrigger value="nutrition" className="text-sm font-medium">
          🍎 Nutrition
        </TabsTrigger>
        <TabsTrigger value="exercise" className="text-sm font-medium">
          💪 Exercise
        </TabsTrigger>
      </TabsList>

      {/* nutrition content */}
      <TabsContent value="nutrition" className="space-y-6 mt-6">
        <DailyProgressSection progress={progress} weeklyAverage={weeklyAverage} />
        <DailyAveragesSection weeklyAverage={weeklyAverage} />
        <MealQualityAnalyticsSection />
        <SmartInsightsSection />
        <TagInsightsSection />
        <MacrosHydrationSection macroData={macroData} progress={progress} />
        <ActivityExerciseSection stepsData={stepsData} exerciseCaloriesData={exerciseCaloriesData} weeklyAverage={weeklyAverage} />
        <AchievementsSection />
        <GamificationSection />
        <MonthlySummaryViewer />
        <MoodWellnessTrendChart />
      </TabsContent>

      {/* exercise content (use restored code!) */}
      <TabsContent value="exercise">
        <div className="flex flex-col gap-6 pb-24">
          <WorkoutPlanCard />
          <ExerciseStatsCard />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <WorkoutFrequencyChart />
            <WorkoutDurationTrend />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <MuscleGroupRadarChart />
            <WorkoutConsistencyChart />
          </div>
          <StreakTrackerCard />
          <SmartTrendInsightsCard />
          <MonthlyExerciseReportCard />
          <WorkoutTrophyCard />
          <MotivationCard />
          <CoachSaysCard />
        </div>
      </TabsContent>

    </Tabs>
  </div>
);
