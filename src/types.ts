export interface SubTopic {
  id: string;
  title: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  order: number;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: number;
  subTopics: SubTopic[];
  roadmapGenerated?: boolean;
}

export interface StudySession {
  id: string;
  courseId: string;
  subTopicId?: string;
  durationMinutes: number;
  topic: string;
  date: number;
  notes?: string;
  difficultyRating: number; // 1-5
  struggleDetails?: string; // What the user didn't understand
}

export interface TestResult {
  id: string;
  courseId: string;
  topic: string;
  score: number;
  maxScore: number;
  date: number;
  difficultyRating: number; // 1-5
  feedback?: string;
}

export interface Flashcard {
  id: string;
  courseId: string;
  front: string;
  back: string;
  createdAt: number;
}

export interface AISuggestion {
  topic: string;
  reason: string;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface UserProfile {
  name: string;
  avatar: string;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  learningStyle: 'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic' | 'Mixed';
  major?: string;
  bio?: string;
}
