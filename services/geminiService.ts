
import { GoogleGenAI, Type } from "@google/genai";
import { MealTime, Recipe, RecipeGenerationResponse } from "../types";

/**
 * API 키 유효성을 확인하기 위한 테스트 함수
 */
export const testConnection = async (): Promise<boolean> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return false;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "ping",
      config: { 
        maxOutputTokens: 10,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return !!response.text;
  } catch (error) {
    console.error("연결 테스트 중 오류 발생:", error);
    return false;
  }
};

/**
 * 재료와 식사 시간에 따른 레시피 제안 생성
 */
export const fetchRecipes = async (ingredients: string[], mealTime: MealTime): Promise<Recipe[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API 키가 설정되지 않았습니다. 앱 설정에서 키를 연결해 주세요.");
  }

  try {
    // 매 호출마다 새로운 인스턴스를 생성하여 최신 API 키가 반영되도록 함
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `냉장고에 있는 재료: ${ingredients.join(', ')}. 식사 시간: ${mealTime}. 
    이 재료들을 주재료로 활용하여 ${mealTime} 식사에 어울리는 실용적이고 맛있는 한국 요리 레시피 3가지를 추천해줘. 
    기본 양념(소금, 간장, 식용유 등)은 구비되어 있다고 가정해도 좋아.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "당신은 냉장고 파먹기의 달인인 전문 셰프입니다. 사용자의 재료에 딱 맞는 실용적인 레시피를 제안하세요. 한국어로 답변하고, JSON 형식으로만 응답해야 합니다.",
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
                  description: { type: Type.STRING, description: "요리에 대한 짧은 소개 (1~2문장)" },
                  ingredients: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "해당 요리에 구체적으로 필요한 재료 목록"
                  },
                  steps: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "상세한 조리 단계"
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
    if (!text) throw new Error("AI 응답을 받지 못했습니다.");

    const data = JSON.parse(text.trim()) as RecipeGenerationResponse;
    return data.recipes;
  } catch (error: any) {
    console.error("레시피 생성 오류:", error);
    throw error;
  }
};

/**
 * 레시피 제목을 기반으로 AI 이미지 생성
 */
export const generateRecipeImage = async (recipeTitle: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return getDefaultImage(recipeTitle);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `A delicious professional gourmet photography of ${recipeTitle}, aesthetic plating, high resolution, soft natural lighting.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // 이미지 데이터 파트를 찾아 반환
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    return getDefaultImage(recipeTitle);
  } catch (error: any) {
    console.error("이미지 생성 오류:", error);
    return getDefaultImage(recipeTitle);
  }
};

const getDefaultImage = (title: string) => `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600`;
