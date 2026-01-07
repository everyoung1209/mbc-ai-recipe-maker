
import React, { useState, useCallback } from 'react';
import { MealTime, Recipe } from './types';
import IngredientInput from './components/IngredientInput';
import MealTimeSelector from './components/MealTimeSelector';
import RecipeCard from './components/RecipeCard';
import { fetchRecipes, generateRecipeImage } from './services/geminiService';

const App: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [mealTime, setMealTime] = useState<MealTime>(MealTime.BREAKFAST);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddIngredient = useCallback((item: string) => {
    setIngredients((prev) => [...prev, item]);
  }, []);

  const handleRemoveIngredient = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      setError("최소 한 개의 재료를 입력해주세요!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecipes([]);

    try {
      // 1. Fetch text recipes
      const suggestedRecipes = await fetchRecipes(ingredients, mealTime);
      
      // Initial state with text only
      setRecipes(suggestedRecipes);

      // 2. Generate images for each recipe in parallel
      const recipesWithImages = await Promise.all(
        suggestedRecipes.map(async (recipe) => {
          const imageUrl = await generateRecipeImage(recipe.title);
          return { ...recipe, imageUrl };
        })
      );

      setRecipes(recipesWithImages);
    } catch (err: any) {
      console.error(err);
      setError("레시피를 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
              <i className="fas fa-hat-chef text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">냉장고 셰프</h1>
          </div>
          <div className="text-sm font-medium text-gray-400 hidden sm:block">
            냉장고 파먹기의 끝판왕
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Controls Section */}
          <div className="md:col-span-1 space-y-8">
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-clock text-orange-500"></i> 언제 드실 건가요?
              </h2>
              <MealTimeSelector selected={mealTime} onSelect={setMealTime} />
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-refrigerator text-orange-500"></i> 냉장고 속 재료들
              </h2>
              <IngredientInput 
                ingredients={ingredients} 
                onAdd={handleAddIngredient} 
                onRemove={handleRemoveIngredient} 
              />
            </section>

            <button
              onClick={handleGenerate}
              disabled={isLoading || ingredients.length === 0}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
                isLoading || ingredients.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white hover:-translate-y-1 active:translate-y-0'
              }`}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> 요리 고민 중...
                </>
              ) : (
                <>
                  레시피 제안받기 <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3 animate-bounce">
                <i className="fas fa-exclamation-circle mt-0.5"></i>
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="md:col-span-2">
            {recipes.length > 0 ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    당신을 위한 3가지 <span className="text-orange-500">추천 레시피</span>
                  </h2>
                  <span className="text-sm text-gray-500">{mealTime} 식사</span>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {recipes.map((recipe, index) => (
                    <RecipeCard key={index} recipe={recipe} />
                  ))}
                </div>
              </div>
            ) : !isLoading ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center text-orange-200 mb-6">
                  <i className="fas fa-utensils text-4xl"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">어떤 요리를 만들어볼까요?</h3>
                <p className="text-gray-400 max-w-xs">
                  가지고 계신 재료와 식사 시간을 선택하면 AI가 맛있는 레시피를 추천해드립니다.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 animate-pulse">
                    <div className="h-64 bg-gray-100"></div>
                    <div className="p-6 space-y-4">
                      <div className="h-8 bg-gray-100 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-gray-100 rounded-lg w-full"></div>
                      <div className="h-4 bg-gray-100 rounded-lg w-5/6"></div>
                      <div className="pt-4 flex gap-2">
                        <div className="h-6 bg-gray-100 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="mt-20 text-center text-gray-400 text-sm">
        <p>© 2024 냉장고 셰프 AI. 맛있게 드세요!</p>
      </footer>
    </div>
  );
};

export default App;
