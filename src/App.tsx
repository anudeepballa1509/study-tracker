import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  BarChart3, 
  Clock, 
  BrainCircuit, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Layers,
  User,
  Settings,
  Camera,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Course, StudySession, TestResult, AISuggestion, Flashcard, SubTopic, UserProfile } from './types';
import { getStudySuggestions, generateRoadmap, analyzeMistakes, generateFlashcards } from './services/aiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, AISuggestion[]>>({});
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isAnalyzingMistakes, setIsAnalyzingMistakes] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'sessions' | 'tests' | 'analytics' | 'coach' | 'profile'>('dashboard');

  const [profile, setProfile] = useState<UserProfile>({
    name: 'Student',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
    dailyGoalMinutes: 60,
    weeklyGoalMinutes: 300,
    learningStyle: 'Mixed',
    major: 'Computer Science',
    bio: 'Passionate about learning and mastering new skills.'
  });

  // Modals
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [showStopwatch, setShowStopwatch] = useState(false);

  // Stopwatch State
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchCourseId, setStopwatchCourseId] = useState('');
  const [stopwatchTopic, setStopwatchTopic] = useState('');

  // Form States
  const [newCourse, setNewCourse] = useState({ name: '', description: '', generateRoadmap: true });
  const [newSession, setNewSession] = useState({ courseId: '', subTopicId: '', topic: '', duration: 30, notes: '', difficulty: 3, struggleDetails: '' });
  const [newTest, setNewTest] = useState({ courseId: '', topic: '', score: 0, maxScore: 100, difficulty: 3 });

  // Load data
  useEffect(() => {
    const savedCourses = localStorage.getItem('sw_courses');
    const savedSessions = localStorage.getItem('sw_sessions');
    const savedResults = localStorage.getItem('sw_results');
    const savedFlashcards = localStorage.getItem('sw_flashcards');
    const savedProfile = localStorage.getItem('sw_profile');
    
    if (savedCourses) setCourses(JSON.parse(savedCourses));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedResults) setResults(JSON.parse(savedResults));
    if (savedFlashcards) setFlashcards(JSON.parse(savedFlashcards));
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('sw_courses', JSON.stringify(courses));
    localStorage.setItem('sw_sessions', JSON.stringify(sessions));
    localStorage.setItem('sw_results', JSON.stringify(results));
    localStorage.setItem('sw_flashcards', JSON.stringify(flashcards));
    localStorage.setItem('sw_profile', JSON.stringify(profile));
  }, [courses, sessions, results, flashcards, profile]);

  // Stopwatch Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  const formatStopwatchTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveStopwatch = () => {
    if (!stopwatchCourseId || !stopwatchTopic) return;
    const durationMinutes = Math.max(1, Math.round(stopwatchTime / 60));
    const session: StudySession = {
      id: crypto.randomUUID(),
      courseId: stopwatchCourseId,
      topic: stopwatchTopic,
      durationMinutes,
      date: Date.now(),
      notes: `Stopwatch session: ${formatStopwatchTime(stopwatchTime)}`,
      difficultyRating: 3 // Default for stopwatch sessions
    };
    setSessions([session, ...sessions]);
    setStopwatchTime(0);
    setIsStopwatchRunning(false);
    setShowStopwatch(false);
    setStopwatchTopic('');
  };

  const handleAddCourse = async () => {
    if (!newCourse.name) return;
    
    let subTopics: SubTopic[] = [];
    if (newCourse.generateRoadmap) {
      setIsGeneratingRoadmap(true);
      subTopics = await generateRoadmap(newCourse.name, newCourse.description);
      setIsGeneratingRoadmap(false);
    }

    const course: Course = {
      id: crypto.randomUUID(),
      name: newCourse.name,
      description: newCourse.description,
      color: COLORS[courses.length % COLORS.length],
      createdAt: Date.now(),
      subTopics,
      roadmapGenerated: newCourse.generateRoadmap
    };
    setCourses([...courses, course]);
    setNewCourse({ name: '', description: '', generateRoadmap: true });
    setShowAddCourse(false);
  };

  const handleAddSession = () => {
    if (!newSession.courseId || !newSession.topic) return;
    const session: StudySession = {
      id: crypto.randomUUID(),
      courseId: newSession.courseId,
      subTopicId: newSession.subTopicId,
      topic: newSession.topic,
      durationMinutes: Number(newSession.duration),
      date: Date.now(),
      notes: newSession.notes,
      difficultyRating: Number(newSession.difficulty),
      struggleDetails: newSession.struggleDetails
    };
    setSessions([session, ...sessions]);
    setNewSession({ courseId: '', subTopicId: '', topic: '', duration: 30, notes: '', difficulty: 3, struggleDetails: '' });
    setShowAddSession(false);
  };

  const handleAddTest = () => {
    if (!newTest.courseId || !newTest.topic) return;
    const result: TestResult = {
      id: crypto.randomUUID(),
      courseId: newTest.courseId,
      topic: newTest.topic,
      score: Number(newTest.score),
      maxScore: Number(newTest.maxScore),
      difficultyRating: Number(newTest.difficulty),
      date: Date.now()
    };
    setResults([result, ...results]);
    setNewTest({ courseId: '', topic: '', score: 0, maxScore: 100, difficulty: 3 });
    setShowAddTest(false);
    
    // Trigger AI analysis for this course
    analyzeCourse(newTest.courseId, [...results, result]);
  };

  const updateSubTopicStatus = (courseId: string, subTopicId: string, status: SubTopic['status']) => {
    setCourses(courses.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          subTopics: c.subTopics.map(st => st.id === subTopicId ? { ...st, status } : st)
        };
      }
      return c;
    }));
  };

  const handleGenerateFlashcards = async (courseId: string, topic: string) => {
    const cards = await generateFlashcards(topic, courses.find(c => c.id === courseId)?.name || "");
    const newCards = cards.map(c => ({
      id: crypto.randomUUID(),
      courseId,
      front: c.front || "",
      back: c.back || "",
      createdAt: Date.now()
    }));
    setFlashcards([...flashcards, ...newCards]);
  };

  const handleAnalyzeMistakes = async () => {
    setIsAnalyzingMistakes(true);
    const detectedPatterns = await analyzeMistakes(sessions);
    setMistakes(detectedPatterns);
    setIsAnalyzingMistakes(false);
  };

  const analyzeCourse = async (courseId: string, currentResults = results) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    const courseResults = currentResults.filter(r => r.courseId === courseId);
    if (courseResults.length === 0) return;

    setLoadingSuggestions(prev => ({ ...prev, [courseId]: true }));
    const aiSuggestions = await getStudySuggestions(course, courseResults);
    setSuggestions(prev => ({ ...prev, [courseId]: aiSuggestions }));
    setLoadingSuggestions(prev => ({ ...prev, [courseId]: false }));
  };

  const deleteCourse = (id: string) => {
    setCourses(courses.filter(c => c.id !== id));
    setSessions(sessions.filter(s => s.courseId !== id));
    setResults(results.filter(r => r.courseId !== id));
  };

  const stats = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const avgScore = results.length > 0 
      ? (results.reduce((acc, r) => acc + (r.score / r.maxScore), 0) / results.length) * 100 
      : 0;
    
    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      avgScore: avgScore.toFixed(1),
      courseCount: courses.length,
      testCount: results.length
    };
  }, [sessions, results, courses]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'MMM dd');
    });

    return days.map(day => {
      const daySessions = sessions.filter(s => format(new Date(s.date), 'MMM dd') === day);
      const duration = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      return { name: day, duration };
    });
  }, [sessions]);

  const weeklyProgress = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weeklyMinutes = sessions
      .filter(s => s.date >= startOfWeek.getTime())
      .reduce((acc, s) => acc + s.durationMinutes, 0);
      
    return Math.min(100, (weeklyMinutes / profile.weeklyGoalMinutes) * 100);
  }, [sessions, profile.weeklyGoalMinutes]);

  const analyticsData = useMemo(() => {
    if (results.length === 0) return null;

    // 1. Avg Score per Course
    const coursePerformance = courses.map(course => {
      const courseResults = results.filter(r => r.courseId === course.id);
      const avg = courseResults.length > 0
        ? (courseResults.reduce((acc, r) => acc + (r.score / r.maxScore), 0) / courseResults.length) * 100
        : 0;
      return { name: course.name, score: Math.round(avg), color: course.color };
    }).filter(c => c.score > 0);

    // 2. Score vs Difficulty Correlation
    const correlationData = results.map(r => ({
      score: Math.round((r.score / r.maxScore) * 100),
      difficulty: r.difficultyRating,
      topic: r.topic
    }));

    // 3. Score Distribution
    const distribution = [
      { range: '0-60%', count: 0 },
      { range: '60-70%', count: 0 },
      { range: '70-80%', count: 0 },
      { range: '80-90%', count: 0 },
      { range: '90-100%', count: 0 },
    ];

    results.forEach(r => {
      const pct = (r.score / r.maxScore) * 100;
      if (pct < 60) distribution[0].count++;
      else if (pct < 70) distribution[1].count++;
      else if (pct < 80) distribution[2].count++;
      else if (pct < 90) distribution[3].count++;
      else distribution[4].count++;
    });

    // 4. Performance Trend
    const sortedResults = [...results].sort((a, b) => a.date - b.date);
    const trendData = sortedResults.map(r => ({
      date: format(new Date(r.date), 'MMM dd'),
      score: Math.round((r.score / r.maxScore) * 100)
    }));

    return { coursePerformance, correlationData, distribution, trendData };
  }, [results, courses]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 hidden md:flex flex-col gap-8 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StudyWise</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<BarChart3 size={20} />} 
            label="Dashboard" 
          />
          <NavItem 
            active={activeTab === 'courses'} 
            onClick={() => setActiveTab('courses')} 
            icon={<BookOpen size={20} />} 
            label="Courses" 
          />
          <NavItem 
            active={activeTab === 'sessions'} 
            onClick={() => setActiveTab('sessions')} 
            icon={<Clock size={20} />} 
            label="Study Logs" 
          />
          <NavItem 
            active={activeTab === 'tests'} 
            onClick={() => setActiveTab('tests')} 
            icon={<Target size={20} />} 
            label="Test Results" 
          />
          <NavItem 
            active={activeTab === 'coach'} 
            onClick={() => setActiveTab('coach')} 
            icon={<BrainCircuit size={20} />} 
            label="AI Coach" 
          />
          <NavItem 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')} 
            icon={<BarChart3 size={20} />} 
            label="Analytics" 
          />
          <NavItem 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={<User size={20} />} 
            label="Profile" 
          />
        </nav>

        <div className="mt-auto p-4 bg-indigo-50 rounded-2xl">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Weekly Goal</p>
            <span className="text-[10px] font-bold text-indigo-400">{Math.round(weeklyProgress)}%</span>
          </div>
          <div className="h-2 w-full bg-indigo-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          <p className="text-xs text-indigo-700 mt-2 font-medium">
            {weeklyProgress >= 100 ? "Goal achieved! 🏆" : "Keep pushing! 💪"}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-8 max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {activeTab === 'dashboard' && `Welcome back, ${profile.name}`}
              {activeTab === 'courses' && "Your Courses"}
              {activeTab === 'sessions' && "Study Sessions"}
              {activeTab === 'tests' && "Test Performance"}
              {activeTab === 'coach' && "AI Learning Coach"}
              {activeTab === 'analytics' && "Test Analytics"}
              {activeTab === 'profile' && "Your Profile"}
            </h2>
            <p className="text-gray-500 mt-1">
              {activeTab === 'dashboard' && "Track your progress and stay focused."}
              {activeTab === 'courses' && "Manage your academic subjects."}
              {activeTab === 'sessions' && "Log your focused study time."}
              {activeTab === 'tests' && "Identify areas for improvement."}
              {activeTab === 'coach' && "AI-powered insights and adaptive learning."}
              {activeTab === 'analytics' && "Deep dive into your test performance metrics."}
              {activeTab === 'profile' && "Manage your goals and learning preferences."}
            </p>
          </div>
          
          <div className="flex gap-3">
            {activeTab === 'courses' && (
              <button 
                onClick={() => setShowAddCourse(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-medium"
              >
                <Plus size={18} /> Add Course
              </button>
            )}
            {activeTab === 'sessions' && (
              <button 
                onClick={() => setShowAddSession(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-medium"
              >
                <Plus size={18} /> Log Session
              </button>
            )}
            {activeTab === 'tests' && (
              <button 
                onClick={() => setShowAddTest(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-medium"
              >
                <Plus size={18} /> Add Result
              </button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                label="Study Hours" 
                value={stats.totalHours} 
                icon={<Clock className="text-blue-600" />} 
                onClick={() => setShowStopwatch(true)}
                clickable
              />
              <StatCard label="Avg. Score" value={`${stats.avgScore}%`} icon={<CheckCircle2 className="text-green-600" />} />
              <StatCard label="Courses" value={stats.courseCount} icon={<BookOpen className="text-indigo-600" />} />
              <StatCard label="Tests Taken" value={stats.testCount} icon={<BarChart3 className="text-orange-600" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-600" />
                  Study Activity (Last 7 Days)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        cursor={{fill: '#f3f4f6'}}
                      />
                      <Bar dataKey="duration" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BrainCircuit size={20} className="text-indigo-600" />
                  AI Study Insights
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2">
                  {courses.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic">Add courses to get AI insights.</div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic">Log test results for AI analysis.</div>
                  ) : (
                    courses.map(course => (
                      <div key={course.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold truncate" style={{color: course.color}}>{course.name}</span>
                          <button 
                            onClick={() => analyzeCourse(course.id)}
                            disabled={loadingSuggestions[course.id]}
                            className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                          >
                            {loadingSuggestions[course.id] ? "..." : "Analyze"}
                          </button>
                        </div>
                        
                        {suggestions[course.id] ? (
                          <div className="space-y-2">
                            {suggestions[course.id].slice(0, 2).map((s, idx) => (
                              <div key={idx} className="text-xs">
                                <p className="font-semibold flex items-center gap-1">
                                  {s.priority === 'High' && <AlertCircle size={12} className="text-red-500" />}
                                  {s.topic}
                                </p>
                                <p className="text-gray-500 line-clamp-2">{s.recommendation}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">Analyze results to see focus areas.</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <motion.div 
                layout
                key={course.id}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative"
              >
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white" style={{backgroundColor: course.color}}>
                  <BookOpen size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">{course.name}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{course.description || "No description."}</p>
                
                {course.subTopics.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      <span>Roadmap Progress</span>
                      <span>{Math.round((course.subTopics.filter(st => st.status === 'Completed').length / course.subTopics.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{
                          backgroundColor: course.color, 
                          width: `${(course.subTopics.filter(st => st.status === 'Completed').length / course.subTopics.length) * 100}%`
                        }} 
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                      {course.subTopics.sort((a, b) => a.order - b.order).map(st => (
                        <div key={st.id} className="flex items-center gap-2 group/item">
                          <button 
                            onClick={() => {
                              const nextStatus = st.status === 'Completed' ? 'Not Started' : st.status === 'In Progress' ? 'Completed' : 'In Progress';
                              updateSubTopicStatus(course.id, st.id, nextStatus);
                            }}
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              st.status === 'Completed' ? "bg-green-500 border-green-500 text-white" : 
                              st.status === 'In Progress' ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"
                            )}
                          >
                            {st.status === 'Completed' && <CheckCircle2 size={10} />}
                            {st.status === 'In Progress' && <Clock size={10} />}
                          </button>
                          <span className={cn(
                            "text-xs truncate",
                            st.status === 'Completed' ? "text-gray-400 line-through" : "text-gray-600"
                          )}>
                            {st.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-medium text-gray-400">
                  <span>{sessions.filter(s => s.courseId === course.id).length} sessions</span>
                  <span>{results.filter(r => r.courseId === course.id).length} tests</span>
                </div>

                <button 
                  onClick={() => deleteCourse(course.id)}
                  className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
            {courses.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                <p className="text-gray-400 font-medium">No courses added yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map(session => {
                  const course = courses.find(c => c.id === session.courseId);
                  return (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">{format(new Date(session.date), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100" style={{color: course?.color}}>
                          {course?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{session.topic}</td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-600">{session.durationMinutes}m</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSessions(sessions.filter(s => s.id !== session.id))}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {courses.map(course => {
                const courseResults = results.filter(r => r.courseId === course.id);
                if (courseResults.length === 0) return null;
                
                return (
                  <div key={course.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold" style={{color: course.color}}>{course.name}</h3>
                      <button 
                        onClick={() => analyzeCourse(course.id)}
                        className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {loadingSuggestions[course.id] ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                        AI Analysis
                      </button>
                    </div>

                    <div className="space-y-4">
                      {courseResults.map(result => (
                        <div key={result.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <div>
                            <p className="font-bold">{result.topic}</p>
                            <p className="text-xs text-gray-500">{format(new Date(result.date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-indigo-600">{Math.round((result.score / result.maxScore) * 100)}%</p>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Diff: {result.difficultyRating}/5</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {suggestions[course.id] && (
                      <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">AI Focus Areas</h4>
                        <div className="space-y-3">
                          {suggestions[course.id].map((s, idx) => (
                            <div key={idx} className="flex gap-3">
                              <div className={cn(
                                "w-1 h-auto rounded-full shrink-0",
                                s.priority === 'High' ? 'bg-red-400' : s.priority === 'Medium' ? 'bg-orange-400' : 'bg-blue-400'
                              )} />
                              <div>
                                <p className="text-sm font-bold">{s.topic}</p>
                                <p className="text-xs text-gray-600">{s.recommendation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === 'coach' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Mistake Detection */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <AlertCircle size={20} className="text-red-500" />
                      Mistake Patterns
                    </h3>
                    <button 
                      onClick={handleAnalyzeMistakes}
                      disabled={isAnalyzingMistakes || sessions.length === 0}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isAnalyzingMistakes ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {mistakes.length > 0 ? (
                      mistakes.map((m, idx) => (
                        <div key={idx} className="p-4 bg-red-50 border border-red-100 rounded-xl">
                          <p className="text-sm font-medium text-red-800">{m}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 italic text-sm">
                        {sessions.length === 0 
                          ? "Log study sessions with struggle details to detect patterns." 
                          : "Click the sparkle to analyze your learning gaps."}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Lightbulb size={20} />
                    Study Tip
                  </h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">
                    "The best way to learn is to teach. Try explaining a complex topic to a rubber duck or a friend to identify your own gaps."
                  </p>
                </div>
              </div>

              {/* Flashcards & Adaptive Roadmap */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Layers size={20} className="text-indigo-600" />
                    AI Flashcards
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {flashcards.length > 0 ? (
                      flashcards.slice(0, 6).map(card => (
                        <div key={card.id} className="group perspective h-40">
                          <div className="relative w-full h-full transition-transform duration-500 preserve-3d group-hover:rotate-y-180 cursor-pointer">
                            <div className="absolute inset-0 backface-hidden bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center text-center">
                              <p className="text-sm font-bold text-gray-800">{card.front}</p>
                            </div>
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white border border-indigo-700 rounded-xl p-4 flex items-center justify-center text-center">
                              <p className="text-xs font-medium leading-relaxed">{card.back}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">No flashcards generated yet.</p>
                        <p className="text-[10px] text-gray-400 mt-1">Generate them from your courses or roadmap topics.</p>
                      </div>
                    )}
                  </div>
                  
                  {courses.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Generate New Cards</p>
                      <div className="flex flex-wrap gap-2">
                        {courses.map(c => (
                          <button 
                            key={c.id}
                            onClick={() => handleGenerateFlashcards(c.id, c.name)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            <Plus size={14} /> {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Target size={20} className="text-indigo-600" />
                    Adaptive Learning Path
                  </h3>
                  <div className="space-y-4">
                    {courses.filter(c => c.subTopics.length > 0).map(course => (
                      <div key={course.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-sm" style={{color: course.color}}>{course.name}</h4>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Next Up: {course.subTopics.find(st => st.status !== 'Completed')?.title || 'Completed!'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {course.subTopics.sort((a, b) => a.order - b.order).map(st => (
                            <div 
                              key={st.id} 
                              className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                st.status === 'Completed' ? "bg-green-500" : 
                                st.status === 'In Progress' ? "bg-blue-500" : "bg-gray-200"
                              )}
                              title={st.title}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {courses.filter(c => c.subTopics.length > 0).length === 0 && (
                      <div className="text-center py-8 text-gray-400 italic text-sm">
                        Generate roadmaps for your courses to see your learning path.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {!analyticsData ? (
              <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                <p className="text-gray-400 font-medium">Add test results to see detailed analytics.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Avg Score per Course */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Average Score per Course</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.coursePerformance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fontSize: 12}} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                          {analyticsData.coursePerformance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Score Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Score Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.distribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Performance Trend */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Overall Performance Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Difficulty vs Score Correlation */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Difficulty vs. Score Correlation</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" dataKey="difficulty" name="Difficulty" unit="/5" domain={[0, 5]} axisLine={false} tickLine={false} />
                        <YAxis type="number" dataKey="score" name="Score" unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                        <ZAxis type="number" range={[60, 400]} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Scatter name="Tests" data={analyticsData.correlationData} fill="#f59e0b" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 text-center">
                    Higher difficulty tests usually correlate with lower scores. Outliers may indicate areas for focus.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-32 bg-indigo-600 relative">
                <div className="absolute -bottom-12 left-8">
                  <div className="relative group">
                    <img 
                      src={profile.avatar} 
                      alt={profile.name} 
                      className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-lg shadow-md text-gray-500 hover:text-indigo-600 transition-colors border border-gray-100">
                      <Camera size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-16 pb-8 px-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">{profile.name}</h3>
                    <p className="text-gray-500 font-medium">{profile.major || "Student"}</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold text-gray-600">
                    <Settings size={16} /> Edit Profile
                  </button>
                </div>
                <p className="text-gray-600 max-w-2xl">{profile.bio}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Target size={20} />
                  </div>
                  <h4 className="font-bold">Daily Goal</h4>
                </div>
                <p className="text-3xl font-black">{profile.dailyGoalMinutes}m</p>
                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Study Target</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Award size={20} />
                  </div>
                  <h4 className="font-bold">Learning Style</h4>
                </div>
                <p className="text-3xl font-black">{profile.learningStyle}</p>
                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Preferred Method</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <h4 className="font-bold">Courses</h4>
                </div>
                <p className="text-3xl font-black">{courses.length}</p>
                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Active Subjects</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h4 className="text-lg font-bold mb-6">Profile Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={e => setProfile({...profile, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Major / Field</label>
                    <input 
                      type="text" 
                      value={profile.major}
                      onChange={e => setProfile({...profile, major: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Bio</label>
                    <textarea 
                      value={profile.bio}
                      onChange={e => setProfile({...profile, bio: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Learning Style</label>
                    <select 
                      value={profile.learningStyle}
                      onChange={e => setProfile({...profile, learningStyle: e.target.value as any})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="Visual">Visual</option>
                      <option value="Auditory">Auditory</option>
                      <option value="Reading/Writing">Reading/Writing</option>
                      <option value="Kinesthetic">Kinesthetic</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Daily Study Goal (Minutes)</label>
                    <input 
                      type="number" 
                      value={profile.dailyGoalMinutes}
                      onChange={e => setProfile({...profile, dailyGoalMinutes: Number(e.target.value)})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Weekly Study Goal (Minutes)</label>
                    <input 
                      type="number" 
                      value={profile.weeklyGoalMinutes}
                      onChange={e => setProfile({...profile, weeklyGoalMinutes: Number(e.target.value)})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddCourse && (
          <Modal title="Add New Course" onClose={() => setShowAddCourse(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Course Name</label>
                <input 
                  type="text" 
                  value={newCourse.name}
                  onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                <textarea 
                  value={newCourse.description}
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <input 
                  type="checkbox" 
                  id="generateRoadmap"
                  checked={newCourse.generateRoadmap}
                  onChange={(e) => setNewCourse({ ...newCourse, generateRoadmap: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="generateRoadmap" className="text-sm font-medium text-indigo-700 flex items-center gap-1">
                  Generate AI Learning Roadmap <Sparkles size={14} className="text-indigo-500" />
                </label>
              </div>
              <button 
                onClick={handleAddCourse}
                disabled={isGeneratingRoadmap}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                {isGeneratingRoadmap ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating Roadmap...
                  </>
                ) : (
                  'Create Course'
                )}
              </button>
            </div>
          </Modal>
        )}

        {showAddSession && (
          <Modal title="Log Study Session" onClose={() => setShowAddSession(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Course</label>
                <select 
                  value={newSession.courseId}
                  onChange={e => setNewSession({...newSession, courseId: e.target.value, subTopicId: ''})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {newSession.courseId && courses.find(c => c.id === newSession.courseId)?.subTopics.length! > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Roadmap Topic</label>
                  <select 
                    value={newSession.subTopicId}
                    onChange={e => {
                      const st = courses.find(c => c.id === newSession.courseId)?.subTopics.find(s => s.id === e.target.value);
                      setNewSession({ ...newSession, subTopicId: e.target.value, topic: st?.title || '' });
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select a topic from roadmap</option>
                    {courses.find(c => c.id === newSession.courseId)?.subTopics.map(st => (
                      <option key={st.id} value={st.id}>{st.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Specific Topic</label>
                <input 
                  type="text" 
                  value={newSession.topic}
                  onChange={e => setNewSession({...newSession, topic: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Duration (Min)</label>
                  <input 
                    type="number" 
                    value={newSession.duration}
                    onChange={e => setNewSession({...newSession, duration: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Difficulty (1-5)</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="5"
                    value={newSession.difficulty}
                    onChange={e => setNewSession({...newSession, difficulty: Number(e.target.value)})}
                    className="w-full h-8"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">What did you struggle with?</label>
                <textarea 
                  value={newSession.struggleDetails}
                  onChange={e => setNewSession({...newSession, struggleDetails: e.target.value})}
                  placeholder="Any concepts that were hard to grasp?"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-20 resize-none"
                />
              </div>
              <button 
                onClick={handleAddSession}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Log Session
              </button>
            </div>
          </Modal>
        )}

        {showAddTest && (
          <Modal title="Add Test Result" onClose={() => setShowAddTest(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Course</label>
                <select 
                  value={newTest.courseId}
                  onChange={e => setNewTest({...newTest, courseId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Topic</label>
                <input 
                  type="text" 
                  value={newTest.topic}
                  onChange={e => setNewTest({...newTest, topic: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Score</label>
                  <input 
                    type="number" 
                    value={newTest.score}
                    onChange={e => setNewTest({...newTest, score: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Max</label>
                  <input 
                    type="number" 
                    value={newTest.maxScore}
                    onChange={e => setNewTest({...newTest, maxScore: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Difficulty (1-5)</label>
                <input 
                  type="range" 
                  min="1" 
                  max="5"
                  value={newTest.difficulty}
                  onChange={e => setNewTest({...newTest, difficulty: Number(e.target.value)})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <button 
                onClick={handleAddTest}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Save Result
              </button>
            </div>
          </Modal>
        )}

        {showStopwatch && (
          <Modal title="Study Stopwatch" onClose={() => setShowStopwatch(false)}>
            <div className="space-y-6 text-center">
              <div className="text-6xl font-black font-mono tracking-tighter text-indigo-600">
                {formatStopwatchTime(stopwatchTime)}
              </div>
              
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">What are you studying?</label>
                  <select 
                    value={stopwatchCourseId}
                    onChange={e => setStopwatchCourseId(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select a course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <input 
                    type="text" 
                    value={stopwatchTopic}
                    onChange={e => setStopwatchTopic(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Topic name..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                {!isStopwatchRunning ? (
                  <button 
                    onClick={() => setIsStopwatchRunning(true)}
                    className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
                  >
                    Start Timer
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsStopwatchRunning(false)}
                    className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors shadow-lg"
                  >
                    Pause
                  </button>
                )}
                <button 
                  onClick={() => {
                    setStopwatchTime(0);
                    setIsStopwatchRunning(false);
                  }}
                  className="px-6 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
              </div>

              {stopwatchTime > 0 && (
                <button 
                  onClick={handleSaveStopwatch}
                  disabled={!stopwatchCourseId || !stopwatchTopic}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50"
                >
                  Save Session
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
        active 
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, onClick, clickable }: { label: string, value: string | number, icon: React.ReactNode, onClick?: () => void, clickable?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all",
        clickable && "cursor-pointer hover:shadow-md hover:border-indigo-100 group"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "p-2 bg-gray-50 rounded-lg transition-colors",
          clickable && "group-hover:bg-indigo-50"
        )}>
          {icon}
        </div>
        {clickable && (
          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            Open Timer
          </div>
        )}
      </div>
      <p className="text-3xl font-black tracking-tight">{value}</p>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
