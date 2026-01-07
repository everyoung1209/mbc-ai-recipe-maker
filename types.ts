
export enum MealTime {
  BREAKFAST = '아침',
  LUNCH = '점심',
  DINNER = '저녁'
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  imageUrl?: string;
}

export interface RecipeGenerationResponse {
  recipes: Recipe[];
}
