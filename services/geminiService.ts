
import { GoogleGenAI, Type } from "@google/genai";
import { MealTime, Recipe, RecipeGenerationResponse } from "../types";

/**
 * API 키가 정상적으로 설정되어 있고 작동하는지 확인하는 테스트 함수
 */
export const testConnection = async (): Promise<boolean> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return false;

  try {
    // 규정: GoogleGenAI 인스턴스를 호출 직전에 생성하여 최신 process.env.API_KEY를 반영
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "connection test",
      config: { 
        maxOutputTokens: 5,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return !!response.text;
  } catch (error) {
    console.error("연결 테스트 오류:", error);
    return false;
  }
};

/**
 * AI 셰프에게 레시피 3가지를 요청합니다.
 */
export const fetchRecipes = async (ingredients: string[], mealTime: MealTime): Promise<Recipe[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API 키가 설정되지 않았습니다. 앱 설정에서 키를 연결해 주세요.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `냉장고에 있는 재료: ${ingredients.join(', ')}. 식사 시간: ${mealTime}. 
    이 재료들을 주재료로 활용하여 ${mealTime} 식사에 어울리는 실용적이고 맛있는 한국 요리 레시피 3가지를 추천해줘. 
    기본적인 조미료(소금, 간장, 설탕, 기름 등)는 집에 있다고 가정해.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "당신은 냉장고 파먹기의 달인이자 친절한 요리 전문가입니다. 사용자의 상황에 맞는 레시피를 제안하고 한국어로 응답하세요. 출력은 반드시 지정된 JSON 형식을 따라야 합니다.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "요리 제목" },
                  description: { type: Type.STRING, description: "요리에 대한 간략한 소개" },
                  ingredients: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "상세 재료 및 분량"
                  },
                  steps: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "조리 단계별 설명"
                  }
                },
                required: ["title", "description", "ingredients", "steps"]
              }
            }
          },
          required: ["recipes"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");

    const data = JSON.parse(text.trim()) as RecipeGenerationResponse;
    return data.recipes;
  } catch (error: any) {
    console.error("레시피 생성 중 오류:", error);
    throw error;
  }
};

/**
 * 레시피 제목을 바탕으로 AI 이미지를 생성합니다.
 */
export const generateRecipeImage = async (recipeTitle: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return getDefaultImage(recipeTitle);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Professional food photography of ${recipeTitle}, delicious looking, top view or 45 degree angle, soft warm lighting, studio background, 4k resolution.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // 응답 파트에서 이미지 데이터를 추출 (규정 준수)
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    return getDefaultImage(recipeTitle);
  } catch (error: any) {
    console.error("이미지 생성 중 오류:", error);
    return getDefaultImage(recipeTitle);
  }
};

const getDefaultImage = (title: string) => `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600`;
