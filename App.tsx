
import React, { useState, useCallback, useEffect } from 'react';
import { MealTime, Recipe } from './types';
import IngredientInput from './components/IngredientInput';
import MealTimeSelector from './components/MealTimeSelector';
import RecipeCard from './components/RecipeCard';
import { fetchRecipes, generateRecipeImage, testConnection } from './services/geminiService';

// AI Studio 환경에서 API 키 선택 창을 열기 위한 타입 정의
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [mealTime, setMealTime] = useState<MealTime>(MealTime.BREAKFAST);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // API 키 관련 상태
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 앱 시작 시 API 키 여부 확인
  useEffect(() => {
    const checkInitialKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
        if (!hasKey && !process.env.API_KEY) {
          setError("API 키 설정이 필요합니다. 우측 상단 열쇠 아이콘을 클릭해주세요.");
        }
      }
    };
    checkInitialKey();
  }, []);

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // 선택 후 즉시 성공한 것으로 간주하고 상태 업데이트
      setHasApiKey(true);
      setError(null);
      handleTestConnection();
    }
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    const success = await testConnection();
    setTestResult(success ? 'success' : 'fail');
    setIsTestingKey(false);
    if (success) {
      setError(null);
    } else {
      setError("API 연결 테스트에 실패했습니다. 키 설정을 다시 확인해주세요.");
    }
  };

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
      const suggestedRecipes = await fetchRecipes(ingredients, mealTime);
      setRecipes(suggestedRecipes);

      const recipesWithImages = await Promise.all(
        suggestedRecipes.map(async (recipe) => {
          const imageUrl = await generateRecipeImage(recipe.title);
          return { ...recipe, imageUrl };
        })
      );

      setRecipes(recipesWithImages);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("유효하지 않은 API 키입니다. 다시 설정해주세요.");
      } else {
        setError("레시피를 생성하는 중 오류가 발생했습니다. API 키와 설정을 확인해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
              <i className="fas fa-hat-chef text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">냉장고 셰프</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                showSettings ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600'
              }`}
              title="API 설정"
            >
              <i className="fas fa-key"></i>
            </button>
            <div className="text-sm font-medium text-gray-400 hidden sm:block">
              AI 스마트 레시피
            </div>
          </div>
        </div>
      </header>

      {/* API Settings Panel (Popup/Slide-down) */}
      {showSettings && (
        <div className="bg-orange-50 border-b border-orange-100 animate-in slide-in-from-top duration-300">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-sm font-bold text-gray-700">API 설정 상태</p>
                <div className="flex items-center gap-2 text-sm">
                  {hasApiKey ? (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <i className="fas fa-check-circle"></i> 키가 설정되어 있습니다.
                    </span>
                  ) : (
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      <i className="fas fa-exclamation-triangle"></i> 키 설정이 필요합니다.
                    </span>
                  )}
                  {process.env.API_KEY && (
                    <span className="text-gray-400 text-xs">
                      ({process.env.API_KEY.slice(0, 4)}***{process.env.API_KEY.slice(-4)})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleOpenKeySelection}
                  className="px-5 py-2.5 bg-white border border-orange-200 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-100 transition-all shadow-sm"
                >
                  <i className="fas fa-edit mr-2"></i> API 키 변경/입력
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingKey}
                  className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-md disabled:opacity-50"
                >
                  {isTestingKey ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i> 테스트 중...</>
                  ) : (
                    <><i className="fas fa-vial mr-2"></i> 통신 테스트</>
                  )}
                </button>
              </div>
            </div>
            
            {testResult && (
              <div className={`mt-4 p-3 rounded-lg text-center text-xs font-bold animate-in fade-in duration-300 ${
                testResult === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {testResult === 'success' 
                  ? "✅ 연결 성공! AI와 정상적으로 대화할 수 있습니다." 
                  : "❌ 연결 실패! API 키를 확인하거나 결제 설정을 확인해주세요."}
              </div>
            )}
          </div>
        </div>
      )}

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
              disabled={isLoading || ingredients.length === 0 || !hasApiKey}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
                isLoading || ingredients.length === 0 || !hasApiKey
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
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-circle mt-0.5"></i>
                  {error}
                </div>
                {!hasApiKey && (
                  <button 
                    onClick={handleOpenKeySelection}
                    className="ml-7 text-xs font-bold underline text-left hover:text-red-700"
                  >
                    지금 바로 API 키 설정하기
                  </button>
                )}
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
                <p className="text-gray-400 max-w-xs mb-6">
                  가지고 계신 재료와 식사 시간을 선택하면 AI가 맛있는 레시피를 추천해드립니다.
                </p>
                {!hasApiKey && (
                  <button 
                    onClick={handleOpenKeySelection}
                    className="px-6 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-bold hover:bg-orange-200 transition-all"
                  >
                    API 키 먼저 설정하기
                  </button>
                )}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="mt-20 py-10 text-center text-gray-400 text-sm border-t border-gray-100">
        <p>© 2024 냉장고 셰프 AI. 맛있게 드세요!</p>
        <p className="text-xs mt-2 italic">Gemini API로 구동되는 스마트 요리 도우미</p>
      </footer>
    </div>
  );
};

export default App;
