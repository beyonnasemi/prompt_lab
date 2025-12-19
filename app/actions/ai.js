'use server';

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generates educational prompts using AI models.
 * @param {Object} params
 * @param {string} params.model - 'gpt' | 'gemini'
 * @param {string} params.topic - User provided topic
 * @param {number} params.count - Number of prompts to generate
 * @param {string} params.difficulty - 'beginner' | 'intermediate' | 'advanced'
 * @param {string} params.targetGroup - e.g. 'business', 'univ'
 * @param {string} [params.apiKey] - Optional API key if not in env
 */
export async function generatePromptsAction({ model, topic, count, difficulty, targetGroup, apiKey, image }) {
  if (!topic) throw new Error("주제(Topic)를 입력해주세요.");

  const promptCount = count || 3;
  const currentDifficulty = difficulty || 'beginner';

  // Define personas and contexts based on target group
  const contextMap = {
    'business': {
      role: "Corporate Productivity Expert",
      context: "Corporate environments (Startups, MNCs)",
      topics: "Email writing, Data analysis, Marketing copy, Meeting minutes, Strategic planning",
      tone: "Professional, Efficient, Result-oriented"
    },
    'public': {
      role: "Public Administration Specialist",
      context: "Government agencies & Public institutions",
      topics: "Civil complaints (Minwon), Official documents (Gongmun), Press releases, Policy summary, Regulation checks",
      tone: "Formal, Neutral, Compliant with regulations, Polite"
    },
    'univ': {
      role: "Academic Research & Education Assistant",
      context: "Universities (Professors, Students, Researchers)",
      topics: "Thesis writing, Research proposals, Syllabus design, Literature review, Lab reports",
      tone: "Academic, Logical, Structured, Scholarly"
    },
    'elem': {
      role: "Elementary Education Helper",
      context: "Elementary Schools (Teachers)",
      topics: "Classroom management, Worksheet creation, Parent communication, creative play ideas",
      tone: "Friendly, Encouraging, Creative, Simple"
    },
    'middle': {
      role: "Middle School Education Helper",
      context: "Middle Schools",
      topics: "Subject teaching plans, Student counseling, Exam question generation",
      tone: "Supportive, Educational, Balanced"
    },
    'high': {
      role: "High School Education Helper",
      context: "High Schools (College prep focus)",
      topics: "Advanced subject materials, College admission counseling, Study records",
      tone: "Detailed, Academic, Mentor-like"
    },
    'adult': {
      role: "Lifelong Learning Coach",
      context: "Adult Education / Digital Literacy",
      topics: "Basic digital skills, Hobby exploration, Life management",
      tone: "Patient, Easy to understand, Practical"
    }
  };

  const targetInfo = contextMap[targetGroup] || contextMap['business'];

  // Enhanced System Prompt for Vision
  const systemPrompt = `
    You are a ${targetInfo.role} and an expert AI Prompt Engineer in Korea.
    
    [Goal]
    Generate ${promptCount} highly practical "Educational AI Prompts" for users in ${targetInfo.context}.
    The goal is to TEACH users how to write good prompts to automate their work.
    ${image ? 'IMPORTANT: The user has provided an image. Use the image as context to generate relevant prompts (e.g. "Draft an email based on this image", "Summarize this document").' : ''}
    
    [User Input Topic]
    ${topic}
    
    [Target Audience & Tone]
    - Audience: Koreans working/studying in ${targetInfo.context}.
    - Tone: ${targetInfo.tone}.
    - Language: Korean (Must be natural and professional).
    - CRITICAL: ALL CONTENT (Title, Prompt, Expected Answer) MUST BE IN KOREAN. Do not use English unless it's a specific technical term that is better in English.
    
    [Difficulty: ${currentDifficulty}]
    ${currentDifficulty === 'beginner' ? '- Focus on simple, direct instructions.' : ''}
    ${currentDifficulty === 'intermediate' ? '- Focus on assigning Roles (Persona) and Context.' : ''}
    ${currentDifficulty === 'advanced' ? '- CRITICAL for Advanced: Generate LONG, DETAILED prompts (10-15+ lines). You MUST include [Context], [Role], [Detailed Constraints], [Output Format], and [Few-Shot Example]. Make it complex.' : ''}
    
    [Output Structure]
    Return ONLY a valid JSON array of objects.
    Each object must be a "Learning Scenario" with:
    1. "title": A clear, rapid-summary title of the work task (e.g., "악성 민원 정중한 거절 거절문 작성").
    2. "content": The ACTUAL PROMPT input that the user should copy and paste into ChatGPT/Gemini. 
       - This must be a "Best Practice" prompt.
       - It should likely start with "Act as a..." or specific instructions suitable for the difficulty.
       - IMPORTANT: The 'content' must be written in KOREAN.
    3. "expected_answer": A concrete example of what the AI would generate from that prompt. Show the user the potential result.
    4. "difficulty": "${currentDifficulty}"
    
    Now generate ${promptCount} items for the topic: "${topic}".
    Ensure the JSON is valid. Do not use markdown code blocks.
  `;

  try {
    let resultText = "";

    if (model === 'gpt') {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OpenAI API Key provided via input or environment variables.");

      const client = new OpenAI({ apiKey: key });

      const messages = [
        { role: "system", content: "You are a helpful assistant that outputs only valid JSON strings. Do not use markdown." }
      ];

      if (image) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        });
      } else {
        messages.push({ role: "user", content: systemPrompt });
      }

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
      });
      resultText = response.choices[0].message.content;

    } else if (model === 'gemini') {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) throw new Error("Gemini API Key not provided via input or environment variables.");

      const genAI = new GoogleGenerativeAI(key);
      // Use 1.5-flash for better multimodal performance/cost
      const modelName = "gemini-1.5-flash";
      console.log("Using Gemini Model:", modelName);
      const modelInstance = genAI.getGenerativeModel({ model: modelName });

      let parts = [systemPrompt];
      if (image) {
        // image is "data:image/png;base64,..."
        const mimeType = image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1];
        const base64Data = image.split(',')[1];

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const result = await modelInstance.generateContent(parts);
      const response = await result.response;
      resultText = response.text();

    } else {
      throw new Error("지원하지 않는 모델입니다.");
    }

    // Clean up potential markdown code blocks
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

    // Validate JSON
    try {
      const parsed = JSON.parse(resultText);
      if (!Array.isArray(parsed)) return { success: false, error: "AI가 배열 형식이 아닌 데이터를 반환했습니다." };
      return { success: true, data: parsed };
    } catch (e) {
      console.error("JSON Parse Error:", resultText);
      return { success: false, error: "AI 응답을 분석할 수 없습니다. 다시 시도해주세요." };
    }

  } catch (error) {
    console.error("AI Generation Error:", error);
    // Explicitly check for timeouts or common Google errors
    if (error.message && error.message.includes('504')) {
      return { success: false, error: "AI 모델 응답 시간이 초과되었습니다. 생성 개수를 줄이거나 잠시 후 다시 시도해주세요." };
    }
    return { success: false, error: error.message || "알 수 없는 오류가 발생했습니다. (잠시 후 다시 시도해주세요)" };
  }
}
