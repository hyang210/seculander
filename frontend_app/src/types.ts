export type Category = string;
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

export type ProjectInfo = {
  title: string;
  deadline: string; // 마감 기한 (ISO string)
};

export type ProjectTaskDraft = {
  id: string;
  name: string;
  duration: string;
  dependencyId: string | null;
}

export type ProjectDraft = {
  title: string;
  deadline: string;
  tasks: ProjectTaskDraft[];
}