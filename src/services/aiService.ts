import { GoogleGenAI } from "@google/genai";
import { Course, TestResult, AISuggestion, StudySession, SubTopic, Flashcard } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateRoadmap(courseName: string, description: string): Promise<SubTopic[]> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Generate a structured learning roadmap for a course titled "${courseName}".
    Description: ${description}
    
    Break it down into 6-10 logical subtopics that a student should follow in order.
    Return a JSON array of objects, each with:
    - title: The name of the subtopic.
    - order: The sequence number (starting from 1).

    Output ONLY the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      id: crypto.randomUUID(),
      title: item.title,
      status: 'Not Started',
      order: item.order
    }));
  } catch (error) {
    console.error("Error generating roadmap:", error);
    return [];
  }
}

export async function analyzeMistakes(sessions: StudySession[]): Promise<string[]> {
  const struggles = sessions.filter(s => s.struggleDetails).map(s => s.struggleDetails);
  if (struggles.length === 0) return [];

  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze these learning struggles reported by a student:
    ${struggles.join('\n')}

    Identify common patterns or recurring conceptual gaps. 
    Return a JSON array of strings, each being a concise summary of a detected pattern (e.g., "Difficulty with asynchronous logic in JavaScript").
    
    Output ONLY the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error analyzing mistakes:", error);
    return [];
  }
}

export async function generateFlashcards(topic: string, courseName: string): Promise<Partial<Flashcard>[]> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Generate 5 educational flashcards for the topic "${topic}" in the course "${courseName}".
    Return a JSON array of objects, each with:
    - front: A question or concept.
    - back: A concise explanation or answer.

    Output ONLY the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
}

export async function getStudySuggestions(
  course: Course,
  testResults: TestResult[]
): Promise<AISuggestion[]> {
  if (testResults.length === 0) return [];

  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze the following test results for the course "${course.name}" (${course.description || "No description"}).
    Based on the scores (score/maxScore) and the user's difficulty rating (1-5, where 5 is hardest), 
    identify specific topics or areas where the student is struggling.
    
    Test Results:
    ${testResults.map(r => `- Topic: ${r.topic}, Score: ${r.score}/${r.maxScore}, Difficulty: ${r.difficultyRating}/5`).join('\n')}

    Return a JSON array of suggestions. Each suggestion should have:
    - topic: The specific area to focus on.
    - reason: Why this was identified (e.g., low score despite low difficulty, or high difficulty rating).
    - recommendation: A specific study strategy or resource type to use.
    - priority: "High", "Medium", or "Low".

    Output ONLY the JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return [];
  }
}
