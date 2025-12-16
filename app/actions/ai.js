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

  const systemPrompt = `
    You are a ${targetInfo.role} and an expert AI Prompt Engineer in Korea.
    
    [Goal]
    Generate ${promptCount} highly practical "Educational AI Prompts" for users in ${targetInfo.context}.
    The goal is to TEACH users how to write good prompts to automate their work.
    
    [User Input Topic]
    ${topic}
    
    [Target Audience & Tone]
    - Audience: Koreans working/studying in ${targetInfo.context}.
    - Tone: ${targetInfo.tone}.
    - Language: Korean (Must be natural and professional).
    
    [Difficulty: ${currentDifficulty}]
    ${currentDifficulty === 'beginner' ? '- Focus on simple, direct instructions.' : ''}
    ${currentDifficulty === 'intermediate' ? '- Focus on assigning Roles (Persona) and Context.' : ''}
    ${currentDifficulty === 'advanced' ? '- Focus on complex constraints, output formats, and few-shot examples.' : ''}
    
    [Output Structure]
    Return ONLY a valid JSON array of objects.
    Each object must be a "Learning Scenario" with:
    1. "title": A clear, rapid-summary title of the work task (e.g., "악성 민원 정중한 거절 거절문 작성").
    2. "content": The ACTUAL PROMPT input that the user should copy and paste into ChatGPT/Gemini. 
       - This must be a "Best Practice" prompt.
       - It should likely start with "Act as a..." or specific instructions suitable for the difficulty.
    3. "expected_answer": A concrete example of what the AI would generate from that prompt. Show the user the potential result.
    4. "difficulty": "${currentDifficulty}"
    
    [Example Item for 'public' (Intermediate)]
    {
      "title": "공문서 초안 자동 작성",
      "content": "역할: 10년 차 행정 전문관\n상황: 다음 달 '디지털 역량 강화 교육'을 엽니다.\n요청: 산하 기관에 보낼 협조 공문의 초안을 작성해주세요. 날짜는 미정이며, 필요성은 강조하되 정중한 어조를 사용하세요.",
      "expected_answer": "1. 제목: 디지털 역량 강화 교육 개최 협조 요청\n2. 귀 기관의 무궁한 발전을 기원합니다...\n(공문 양식 예시 output)",
      "difficulty": "intermediate"
    }
    
    Now generate ${promptCount} items for the topic: "${topic}".
    Ensure the JSON is valid.
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
          { role: "system", content: "You are a helpful assistant that outputs only valid JSON strings." },
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
      if (!Array.isArray(parsed)) return { error: "AI가 배열 형식이 아닌 데이터를 반환했습니다." };
      return parsed; // Return array directly on success
    } catch (e) {
      console.error("JSON Parse Error:", resultText);
      return { error: "AI 응답을 분석할 수 없습니다. 다시 시도해주세요." };
    }

  } catch (error) {
    console.error("AI Generation Error:", error);
    // Return the specific error message to the client
    return { error: error.message || "알 수 없는 오류가 발생했습니다." };
  }
}
