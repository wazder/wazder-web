export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type Currency = 'TRY' | 'USD' | 'EUR';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type Payment = {
  date: string;
  amount: number;
  currency: Currency;
  note?: string;
};

export type TimeEntry = {
  date: string;
  hours: number;
  description: string;
};

export type Task = {
  title: string;
  status: TaskStatus;
  date?: string;
  description?: string;
};

export type Link = {
  label: string;
  url: string;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  category?: string;
  description: string;
  folderPath: string;
  techStack: string[];
  startDate: string;
  endDate?: string;
  payments: Payment[];
  timeEntries: TimeEntry[];
  tasks: Task[];
  links?: Link[];
  notes?: string;
};
