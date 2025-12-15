export enum UserRole {
  STUDENT = 'STUDENT',
  DELEGATE = 'DELEGATE',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  className: string; // e.g., "Licence 2 - Info"
  avatar?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  className: string;
  isImportant?: boolean;
  attachments?: string[];
}

export interface Exam {
  id: string;
  subject: string;
  date: string; // ISO string
  duration: string;
  room: string;
  notes?: string;
  className: string;
}

export interface ScheduleFile {
  id: string;
  version: string;
  uploadDate: string;
  url: string;
  className: string;
}

export interface MeetLink {
  id: string;
  title: string;
  platform: 'Zoom' | 'Teams' | 'Google Meet' | 'Other';
  url: string;
  time: string;
  className: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  className: string;
  isActive: boolean; // New field for Open/Close status
  hasVoted: boolean; 
  userVoteOptionId?: string; // New field to track which option the user picked
  totalVotes: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  email: string;
  studentCount: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string; // ISO string
  isRead: boolean;
  link?: string;
}