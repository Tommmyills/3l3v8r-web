/**
 * AI-powered transcript analysis features
 * Provides summarization, Q&A, chapter detection, and concept extraction
 */

import { getOpenAIClient } from "./openai";
import { TranscriptSegment } from "./youtube-transcript";

export interface TranscriptSummary {
  summary: string;
  keyTopics: string[];
  estimatedReadingTime: string;
}

export interface TranscriptChapter {
  title: string;
  startTime: number;
  endTime: number;
  summary: string;
}

export interface KeyConcepts {
  codeSnippets: string[];
  commands: string[];
  toolsMentioned: string[];
  importantConcepts: string[];
  keyMoments?: KeyMoment[]; // Optional key moments
}

export interface KeyMoment {
  number: number;
  title: string;
  timestamp: number;
  action: string;
}

export interface QAResponse {
  answer: string;
  relevantTimestamps: number[];
  confidence: "high" | "medium" | "low";
}

/**
 * Generate a smart summary of the transcript
 */
export async function summarizeTranscript(
  fullText: string,
  videoTitle?: string
): Promise<TranscriptSummary> {
  try {
    const client = getOpenAIClient();

    const prompt = `You are analyzing a YouTube video transcript${videoTitle ? ` titled "${videoTitle}"` : ""}.

Please provide:
1. A concise 2-3 sentence summary of the main content
2. 3-5 key topics covered (as an array)
3. Estimated reading time for the transcript

Transcript:
${fullText.slice(0, 8000)} ${fullText.length > 8000 ? "...(truncated)" : ""}

Respond in JSON format:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", "..."],
  "estimatedReadingTime": "X minutes"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      summary: result.summary || "No summary available",
      keyTopics: result.keyTopics || [],
      estimatedReadingTime: result.estimatedReadingTime || "Unknown",
    };
  } catch (error) {
    console.error("Error summarizing transcript:", error);
    throw new Error("Failed to generate summary");
  }
}

/**
 * Answer questions about the transcript
 */
export async function askTranscriptQuestion(
  question: string,
  fullText: string,
  segments: TranscriptSegment[]
): Promise<QAResponse> {
  try {
    const client = getOpenAIClient();

    const prompt = `You are analyzing a YouTube video transcript to answer user questions.

Transcript:
${fullText.slice(0, 10000)} ${fullText.length > 10000 ? "...(truncated)" : ""}

User question: ${question}

Please provide:
1. A clear, detailed answer to the question based on the transcript
2. Relevant timestamps (in seconds) where this information appears
3. Your confidence level (high/medium/low) in the answer

Respond in JSON format:
{
  "answer": "detailed answer here",
  "relevantTimestamps": [123, 456],
  "confidence": "high"
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      answer: result.answer || "Could not find an answer in the transcript",
      relevantTimestamps: result.relevantTimestamps || [],
      confidence: result.confidence || "low",
    };
  } catch (error) {
    console.error("Error answering question:", error);
    throw new Error("Failed to answer question");
  }
}

/**
 * Detect chapters/sections in the transcript
 */
export async function detectChapters(
  segments: TranscriptSegment[],
  fullText: string
): Promise<TranscriptChapter[]> {
  try {
    const client = getOpenAIClient();

    // For long transcripts, sample key parts
    const sampleText = fullText.slice(0, 12000);

    const prompt = `Analyze this YouTube video transcript and identify natural chapter breaks or major topic transitions.

Create 3-7 chapters with:
- Clear, descriptive titles
- Start time (in seconds)
- End time (in seconds)
- Brief 1-sentence summary

Transcript:
${sampleText} ${fullText.length > 12000 ? "...(continues)" : ""}

Respond in JSON format:
{
  "chapters": [
    {
      "title": "Introduction",
      "startTime": 0,
      "endTime": 120,
      "summary": "..."
    }
  ]
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return result.chapters || [];
  } catch (error) {
    console.error("Error detecting chapters:", error);
    throw new Error("Failed to detect chapters");
  }
}

/**
 * Extract key concepts, code snippets, commands, and tools mentioned
 */
export async function extractKeyConcepts(
  fullText: string,
  segments?: TranscriptSegment[]
): Promise<KeyConcepts> {
  try {
    const client = getOpenAIClient();

    const prompt = `Analyze this YouTube video transcript and extract:

1. Code snippets (actual code mentioned, max 5 most important)
2. Commands (terminal/shell commands, max 5)
3. Tools mentioned (software, libraries, frameworks, max 5)
4. Important concepts (key ideas, definitions, max 5)
5. Key moments (numbered actionable steps the viewer should execute, max 8)

For key moments, identify specific actions the YouTuber instructs viewers to do. Each moment should have:
- A number (1, 2, 3, etc.)
- A brief title
- A clear action to execute
- Approximate timestamp (if you can infer from context)

Transcript:
${fullText.slice(0, 10000)} ${fullText.length > 10000 ? "...(truncated)" : ""}

Respond in JSON format:
{
  "codeSnippets": ["code1", "code2"],
  "commands": ["cmd1", "cmd2"],
  "toolsMentioned": ["tool1", "tool2"],
  "importantConcepts": ["concept1", "concept2"],
  "keyMoments": [
    {
      "number": 1,
      "title": "Brief title",
      "timestamp": 0,
      "action": "What to do"
    }
  ]
}

Only include items that are explicitly mentioned. If a category has nothing, use empty array.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      codeSnippets: result.codeSnippets || [],
      commands: result.commands || [],
      toolsMentioned: result.toolsMentioned || [],
      importantConcepts: result.importantConcepts || [],
      keyMoments: result.keyMoments || [],
    };
  } catch (error) {
    console.error("Error extracting concepts:", error);
    throw new Error("Failed to extract key concepts");
  }
}

/**
 * Generate organized study notes from transcript
 */
export async function generateStudyNotes(
  fullText: string,
  videoTitle?: string
): Promise<string> {
  try {
    const client = getOpenAIClient();

    const prompt = `Convert this YouTube video transcript${videoTitle ? ` titled "${videoTitle}"` : ""} into organized study notes.

Format as:
# Main Topic

## Key Points
- Point 1
- Point 2

## Important Details
- Detail 1
- Detail 2

## Action Items / Takeaways
- Takeaway 1
- Takeaway 2

Transcript:
${fullText.slice(0, 10000)} ${fullText.length > 10000 ? "...(truncated)" : ""}

Make it concise, well-organized, and easy to review.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Failed to generate notes";
  } catch (error) {
    console.error("Error generating study notes:", error);
    throw new Error("Failed to generate study notes");
  }
}

export interface ActionStep {
  title: string;
  description: string;
}

export interface KeyLesson {
  title: string;
  explanation: string;
}

export interface LessonBreakdown {
  toolsNeeded: string[];
  actionSteps: ActionStep[];
  keyLessons: KeyLesson[];
  tipsAndWarnings: string[];
}

/**
 * Generate lesson breakdown from a video transcript
 * Intelligently detects both procedural steps and key teachings/insights
 */
export async function generateLessonBreakdown(
  fullText: string,
  videoTitle?: string
): Promise<LessonBreakdown> {
  try {
    const client = getOpenAIClient();

    const prompt = `Analyze this video transcript and create a comprehensive lesson breakdown. The video may contain:
1. Step-by-step procedural instructions (how-to tutorials)
2. Conceptual teachings (lessons, insights, wisdom, key ideas)
3. Or both

Extract BOTH types of content when present:

**Action Steps** (for procedural content):
- Ordered, actionable steps to complete a task
- Each step should have a short title and 1-2 sentence description
- Only include if there are clear procedural instructions

**Key Lessons** (for conceptual content):
- Important teachings, insights, wisdom, or key ideas
- Life lessons, spiritual insights, historical points, important quotes
- Each lesson should have a short title/phrase and 1-2 sentence explanation
- Include even if the video is primarily procedural

Transcript:
${fullText.slice(0, 14000)} ${fullText.length > 14000 ? "...(truncated)" : ""}

Respond in JSON format:
{
  "toolsNeeded": ["tool1", "tool2"],
  "actionSteps": [
    {"title": "Step title", "description": "What to do and why"},
    {"title": "Another step", "description": "Next action"}
  ],
  "keyLessons": [
    {"title": "Lesson or insight", "explanation": "What it means and why it matters"},
    {"title": "Another teaching", "explanation": "The key takeaway"}
  ],
  "tipsAndWarnings": ["warning1", "tip2"]
}

Guidelines:
- If no clear procedural steps exist, return empty actionSteps array
- If no conceptual teachings exist, return empty keyLessons array
- Always try to extract both when present
- Keep descriptions concise (1-2 sentences each)
- Use empty arrays for missing sections`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      toolsNeeded: result.toolsNeeded || [],
      actionSteps: result.actionSteps || [],
      keyLessons: result.keyLessons || [],
      tipsAndWarnings: result.tipsAndWarnings || [],
    };
  } catch (error) {
    console.error("Error generating lesson breakdown:", error);
    throw new Error("Failed to generate lesson breakdown");
  }
}

// Legacy function for backward compatibility
export interface ActionSteps {
  toolsNeeded: string[];
  steps: string[];
  tipsAndWarnings: string[];
}

/**
 * @deprecated Use generateLessonBreakdown instead
 */
export async function generateActionSteps(
  fullText: string,
  videoTitle?: string
): Promise<ActionSteps> {
  const breakdown = await generateLessonBreakdown(fullText, videoTitle);
  return {
    toolsNeeded: breakdown.toolsNeeded,
    steps: breakdown.actionSteps.map(s => `${s.title}: ${s.description}`),
    tipsAndWarnings: breakdown.tipsAndWarnings,
  };
}
