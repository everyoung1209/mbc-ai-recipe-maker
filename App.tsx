
import React, { useState, useCallback, useEffect } from 'react';
import { MealTime, Recipe } from './types';
import IngredientInput from './components/IngredientInput';
import MealTimeSelector from './components/MealTimeSelector';
import RecipeCard from './components/RecipeCard';
import { fetchRecipes, generateRecipeImage, testConnection } from './services/geminiService';

// AI Studio 환경에서 API 키 선택 창을 열기 위한 타입 정의
// 컴파일러가 인식하는 AIStudio 인터페이스를 사용하여 윈도우 객체를 확장합니다.
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [mealTime, setMealTime] = useState<MealTime>(MealTime.BREAKFAST);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // API 키 관련 상태
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null: 확인 중, false: 없음, true: 있음
  const [showSettings, setShowSettings] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  // 앱 시작 시 API 키 여부 확인
  useEffect(() => {
    const checkInitialKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        // process.env.API_KEY가 이미 주입되어 있는 경우도 고려
        setHasApiKey(hasKey || !!process.env.API_KEY);
      } else {
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkInitialKey();
  }, []);

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // 규정에 따라 선택 시도 후 즉시 성공으로 간주하고 진행 (레이스 컨디션 방지)
        setHasApiKey(true);
        setError(null);
        // 백그라운드에서 조용히 연결 테스트 시도
        const success = await testConnection();
        setTestResult(success ? 'success' : 'fail');
      } catch (err) {
        console.error("Key selection failed", err);
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    const success = await testConnection();
    setTestResult(success ? 'success' : 'fail');
    setIsTestingKey(false);
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
      // "Requested entity was not found" 에러 발생 시 키 재설정 유도
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API key")) {
        setHasApiKey(false);
        setError("유효하지 않은 API 키입니다. 다시 설정해주세요.");
      } else {
        setError("레시피를 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // API 키 설정 모달 (시작 시 또는 키가 없을 때 표시)
  if (hasApiKey === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
              <i className="fas fa-key text-3xl text-orange-500"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">API 키 설정이 필요합니다</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              냉장고 셰프의 AI 기능을 사용하기 위해서는 본인의 Gemini API 키가 필요합니다. 
              유료 결제가 활성화된 GCP 프로젝트의 키를 선택해주세요.
            </p>
            
            <button
              onClick={handleOpenKeySelection}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg transition-all mb-4"
            >
              API 키 선택하기
            </button>
            
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-orange-500 underline underline-offset-4"
            >
              결제 및 요금 안내 확인하기 <i className="fas fa-external-link-alt ml-1 text-[10px]"></i>
            </a>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Settings Bar */}
      {showSettings && (
        <div className="bg-orange-50 border-b border-orange-100 animate-in slide-in-from-top duration-300">
          <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase">API 상태:</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                <i className="fas fa-circle text-[8px]"></i> 연결 준비됨
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenKeySelection}
                className="text-xs font-bold px-3 py-1.5 bg-white border border-orange-200 rounded-lg hover:bg-orange-100 transition-all"
              >
                키 변경
              </button>
              <button
                onClick={handleTestConnection}
                disabled={isTestingKey}
                className="text-xs font-bold px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {isTestingKey ? '테스트 중...' : '연결 테스트'}
              </button>
            </div>
            {testResult && (
              <div className={`w-full text-center text-[10px] font-bold py-1 rounded ${testResult === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {testResult === 'success' ? '✅ 연결 성공!' : '❌ 연결 실패 (키 확인 필요)'}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {hasApiKey === null ? (
          <div className="flex flex-col items-center justify-center h-64 animate-pulse">
            <i className="fas fa-circle-notch fa-spin text-3xl text-orange-300 mb-4"></i>
            <p className="text-gray-400">환경 설정 확인 중...</p>
          </div>
        ) : (
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
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
