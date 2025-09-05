export function calculateYearsAgo(date) {
  const today = new Date();
  let years = today.getFullYear() - date.getFullYear();
  const beforeAnniversary =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}

export function isSameMonthDayPastYear(date, day, month, currentYear = new Date().getFullYear()) {
  return (
    date.getDate() === day &&
    date.getMonth() + 1 === month &&
    date.getFullYear() < currentYear
  );
}
