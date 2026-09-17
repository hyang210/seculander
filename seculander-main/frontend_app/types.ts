export type Category = 'Work' | 'Personal' | 'Family' | 'Study' | 'Other';
export type Priority = 'High' | 'Medium' | 'Low';

export type CalendarEvent = {
  id: string;
  title: string;
  category: Category;
  start: string; // ISO like '2025-11-11T10:00:00'
  end: string;   // ISO
  completed?: boolean;
  priority?: Priority;
};
