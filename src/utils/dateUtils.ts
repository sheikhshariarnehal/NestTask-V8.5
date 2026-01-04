export function getDaysInWeek(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  
  return days;
}

export function formatDate(date: Date | string, format?: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (format) {
    if (format.includes('EEE')) options.weekday = 'short';
    if (format.includes('d')) options.day = 'numeric';
    if (format.includes('MMMM')) options.month = 'long';
    if (format.includes('yyyy')) options.year = 'numeric';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

export function isOverdue(dueDate: string, status?: string): boolean {
  if (status === 'completed') return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(dueDate);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

/**
 * Checks if two dates are the same day
 * @param date1 First date to compare
 * @param date2 Second date to compare
 * @returns True if both dates represent the same day, false otherwise
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function formatUpcomingDueDate(dueDate: string | Date): string {
  const taskDueDate = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  taskDueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(taskDueDate, today)) {
    return "Due Today";
  }
  if (isSameDay(taskDueDate, tomorrow)) {
    return "Due Tomorrow";
  }

  const timeDiff = taskDueDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (daysDiff > 1 && daysDiff <= 7) {
    return `Due in ${daysDiff} days`;
  }
  
  // Default format for dates further out or in the past (though upcoming tasks shouldn't be in the past)
  return `Due ${taskDueDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}`;
}