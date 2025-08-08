function getCurrentWeekDateRange() {
  const today = new Date();
  const currentDay = today.getDay();
  console.log('Today:', today.toISOString().slice(0, 10), 'Day of week:', currentDay);

  // Find start of current week (Monday)
  const startOfCurrentWeek = new Date(today);
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  console.log('Days to Monday:', daysToMonday);
  startOfCurrentWeek.setDate(today.getDate() + daysToMonday);

  // End of current week (Sunday)
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);

  return {
    start: startOfCurrentWeek.toISOString().slice(0, 10),
    end: endOfCurrentWeek.toISOString().slice(0, 10)
  };
}

const range = getCurrentWeekDateRange();
console.log('Current week range:', range);
