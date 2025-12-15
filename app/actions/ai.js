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
export async function generatePromptsAction({ model, topic, count, difficulty, targetGroup, apiKey }) {
  if (!topic) throw new Error("주제(Topic)를 입력해주세요.");

  const promptCount = count || 3;
  const currentDifficulty = difficulty || 'beginner';
  
  const systemPrompt = `
    You are an expert prompt engineer for an AI education platform in Korea.
    Target Audience: ${targetGroup} (Korean context)
    Difficulty Level: ${currentDifficulty}
    Topic: ${topic}
    
    Generate ${promptCount} educational prompts in KOREAN.
    
    Return ONLY a valid JSON array of objects with the following structure:
    [
      {
        "title": "Short descriptive title",
        "content": "The actual prompt text that the user will paste into an AI. It should be suitable for the difficulty level.",
        "expected_answer": "A brief example of what the AI might respond.",
        "difficulty": "${currentDifficulty}"
      }
    ]
    
    Ensure the JSON is valid. Do not include markdown formatting like \`\`\`json.
  `;

  try {
    let resultText = "";

    if (model === 'gpt') {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OpenAI API Key provided via input or environment variables.");

      const client = new OpenAI({ apiKey: key });
      const response = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: "You are a helpful assistant that outputs only JSON." },
            { role: "user", content: systemPrompt }
        ],
        temperature: 0.7,
      });
      resultText = response.choices[0].message.content;

    } else if (model === 'gemini') {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) throw new Error("Gemini API Key not provided via input or environment variables.");

      const genAI = new GoogleGenerativeAI(key);
      const modelInstance = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const result = await modelInstance.generateContent(systemPrompt);
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
        if (!Array.isArray(parsed)) throw new Error("AI가 배열 형식이 아닌 데이터를 반환했습니다.");
        return parsed;
    } catch (e) {
        console.error("JSON Parse Error:", resultText);
        throw new Error("AI 응답을 JSON으로 변환하는데 실패했습니다. 다시 시도해주세요.");
    }

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error(error.message || "프롬프트 생성 중 오류가 발생했습니다.");
  }
}
