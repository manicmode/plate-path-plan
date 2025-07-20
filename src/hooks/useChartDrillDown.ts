import { useState } from 'react';

export const useChartDrillDown = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDayDetail, setShowDayDetail] = useState(false);

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload;
      if (clickedData.date) {
        setSelectedDate(clickedData.date);
        setShowDayDetail(true);
      }
    }
  };

  const closeDayDetail = () => {
    setShowDayDetail(false);
    setSelectedDate('');
  };

  const handleEditMeal = (mealId: string) => {
    // Future: Navigate to meal edit page
    console.log('Edit meal:', mealId);
  };

  const handleViewDay = (date: string) => {
    // Future: Navigate to daily summary page
    console.log('View full day:', date);
    closeDayDetail();
  };

  return {
    selectedDate,
    showDayDetail,
    handleChartClick,
    closeDayDetail,
    handleEditMeal,
    handleViewDay
  };
};