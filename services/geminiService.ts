
import { GoogleGenAI, Type } from "@google/genai";
import { MealTime, Recipe, RecipeGenerationResponse } from "../types";

/**
 * API 키가 정상적으로 작동하는지 확인하기 위한 간단한 테스트 함수
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "connection test",
      config: { maxOutputTokens: 5 }
    });
    return !!response.text;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
};

export const fetchRecipes = async (ingredients: string[], mealTime: MealTime): Promise<Recipe[]> => {
  try {
    // 매번 새로 생성하여 process.env.API_KEY의 최신 값을 반영
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const prompt = `냉장고에 있는 재료: ${ingredients.join(', ')}. 식사 시간: ${mealTime}. 
    이 재료들을 주재료로 활용하여 ${mealTime} 식사에 어울리는 창의적이고 맛있는 요리 레시피 3가지를 추천해줘. 
    사용자가 가진 재료 외에 기본적인 양념(소금, 후추, 기름 등)은 있다고 가정해.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "당신은 냉장고 파먹기의 달인인 전문 셰프입니다. 사용자의 재료에 딱 맞는 실용적인 레시피를 제안하세요. 한국어로 응답하세요.",
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
                  description: { type: Type.STRING, description: "요리에 대한 짧은 소개" },
                  ingredients: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "필요한 상세 재료 목록"
                  },
                  steps: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "조리 순서"
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

    if (!response.text) {
      throw new Error("API로부터 응답 텍스트를 받지 못했습니다.");
    }

    const data = JSON.parse(response.text) as RecipeGenerationResponse;
    return data.recipes;
  } catch (error: any) {
    console.error("Gemini API Error (fetchRecipes):", error);
    throw error;
  }
};

export const generateRecipeImage = async (recipeTitle: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const prompt = `A delicious, professional food photography of ${recipeTitle}, high resolution, appetizing, plated beautifully.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Gemini API Error (generateRecipeImage):", error);
  }
  
  return `https://picsum.photos/seed/${encodeURIComponent(recipeTitle)}/600/600`;
};
