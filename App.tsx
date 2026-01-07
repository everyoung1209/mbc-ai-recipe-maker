
import React, { useState, useCallback, useEffect } from 'react';
import { MealTime, Recipe } from './types';
import IngredientInput from './components/IngredientInput';
import MealTimeSelector from './components/MealTimeSelector';
import RecipeCard from './components/RecipeCard';
import { fetchRecipes, generateRecipeImage, testConnection } from './services/geminiService';

const App: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [mealTime, setMealTime] = useState<MealTime>(MealTime.BREAKFAST);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // API 키 관련 상태: null(확인 중), false(키 없음), true(키 있음/시도됨)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  // 앱 시작 시 API 키 여부 확인
  useEffect(() => {
    const checkInitialKey = async () => {
      // AI Studio 환경인 경우
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // 일반 환경인 경우 process.env.API_KEY 존재 여부 확인
        setHasApiKey(!!process.env.API_KEY && process.env.API_KEY !== "undefined");
      }
    };
    checkInitialKey();
  }, []);

  const handleOpenKeySelection = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // 규정: openSelectKey 호출 후 즉시 성공한 것으로 간주하고 앱으로 진입
        setHasApiKey(true);
        setError(null);
        
        // 백그라운드에서 연결 테스트 수행
        handleTestConnection();
      } catch (err) {
        console.error("API 키 선택 중 오류:", err);
      }
    } else {
      setError("이 환경에서는 API 키 선택기를 지원하지 않습니다.");
    }
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const success = await testConnection();
      setTestResult(success ? 'success' : 'fail');
      if (!success) {
        setError("연결 테스트 실패. 유효한 결제 계정이 연결된 API 키인지 확인해 주세요.");
      } else {
        setError(null);
      }
    } catch (err) {
      setTestResult('fail');
      setError("연결 확인 중 오류가 발생했습니다.");
    } finally {
      setIsTestingKey(false);
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
      setError("최소 한 개의 재료를 입력해 주세요!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecipes([]);

    try {
      const suggestedRecipes = await fetchRecipes(ingredients, mealTime);
      setRecipes(suggestedRecipes);

      // 이미지는 비동기로 로드하여 UI가 먼저 레시피를 보여줄 수 있게 함
      const recipesWithImages = await Promise.all(
        suggestedRecipes.map(async (recipe) => {
          try {
            const imageUrl = await generateRecipeImage(recipe.title);
            return { ...recipe, imageUrl };
          } catch {
            return recipe;
          }
        })
      );

      setRecipes(recipesWithImages);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "";
      if (msg.includes("not found") || msg.includes("API key") || msg.includes("403") || msg.includes("401")) {
        setHasApiKey(false);
        setError("API 키가 만료되었거나 권한이 없습니다. 다시 설정해 주세요.");
      } else {
        setError("레시피 생성 중 오류가 발생했습니다. 재료 구성을 확인해 주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // API 키 선택 강제 팝업 (모달)
  if (hasApiKey === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/95 backdrop-blur-md p-4">
        <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-10 shadow-2xl animate-in zoom-in duration-500 border border-orange-100 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-orange-200">
            <i className="fas fa-hat-chef text-4xl text-white"></i>
          </div>
          <h2 className="text-3xl font-black text-gray-800 mb-4">냉장고 셰프 준비 완료!</h2>
          <p className="text-gray-500 mb-8 leading-relaxed text-lg">
            AI 요리사의 지능을 깨우기 위해<br/>
            사용자의 <span className="text-orange-600 font-bold">API 키</span>를 먼저 연결해야 합니다.
          </p>
          
          <div className="w-full space-y-4">
            <button
              onClick={handleOpenKeySelection}
              className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-xl shadow-xl hover:shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <i className="fas fa-key"></i> API 키 선택/입력하기
            </button>
            
            <p className="text-xs text-gray-400 font-medium">
              * 유료 결제 설정이 완료된 API 키만 사용 가능합니다.
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100 w-full flex flex-col items-center gap-3">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-stone-500 hover:text-orange-600 transition-colors font-bold flex items-center gap-2"
            >
              <i className="fas fa-credit-card"></i> 결제 프로젝트 설정 가이드 <i className="fas fa-external-link-alt text-[10px]"></i>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 selection:bg-orange-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-orange-50 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm">
              <i className="fas fa-hat-chef text-lg"></i>
            </div>
            <h1 className="text-lg font-black text-gray-800 tracking-tight">냉장고 셰프</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                showSettings ? 'bg-orange-500 text-white shadow-md' : 'bg-stone-50 text-stone-500 hover:bg-orange-100 hover:text-orange-600'
              }`}
            >
              <i className={`fas ${testResult === 'fail' ? 'fa-exclamation-circle text-red-500' : 'fa-cog'}`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Bar */}
      {showSettings && (
        <div className="bg-stone-50 border-b border-stone-100 animate-in slide-in-from-top duration-300">
          <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">API Status</span>
                <div className={`w-2 h-2 rounded-full ${testResult === 'success' ? 'bg-green-500' : testResult === 'fail' ? 'bg-red-500' : 'bg-stone-300'}`}></div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenKeySelection}
                  className="text-[11px] font-bold px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-100 transition-all"
                >
                  <i className="fas fa-sync-alt mr-1"></i> 키 다시 선택
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingKey}
                  className="text-[11px] font-bold px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                  {isTestingKey ? <i className="fas fa-spinner fa-spin"></i> : '연결 테스트'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {hasApiKey === null ? (
          <div className="flex flex-col items-center justify-center h-80 space-y-4">
            <div className="w-12 h-12 border-4 border-stone-100 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-stone-400 font-bold text-sm">환경 설정을 불러오고 있습니다...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Input Section */}
            <div className="md:col-span-1 space-y-8">
              <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span className="text-orange-500"><i className="fas fa-clock"></i></span>
                  어떤 끼니인가요?
                </h2>
                <MealTimeSelector selected={mealTime} onSelect={setMealTime} />
              </section>

              <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span className="text-emerald-500"><i className="fas fa-refrigerator"></i></span>
                  사용할 재료들
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
                className={`w-full py-5 rounded-[1.5rem] font-black text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${
                  isLoading || ingredients.length === 0
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white hover:-translate-y-1 active:translate-y-0 active:shadow-inner'
                }`}
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    레시피 3가지 추천 <i className="fas fa-sparkles text-sm"></i>
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                  <i className="fas fa-exclamation-circle mt-0.5"></i>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="md:col-span-2">
              {recipes.length > 0 ? (
                <div className="space-y-8">
                  <div className="flex items-end justify-between px-2">
                    <div>
                      <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                        셰프의 <span className="text-orange-500">제안</span>
                      </h2>
                      <p className="text-stone-400 text-sm font-medium mt-1">
                        입력하신 재료로 만들 수 있는 {mealTime} 맞춤 메뉴입니다.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-8">
                    {recipes.map((recipe, index) => (
                      <RecipeCard key={index} recipe={recipe} />
                    ))}
                  </div>
                </div>
              ) : !isLoading ? (
                <div className="h-[460px] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border-2 border-dashed border-stone-200 shadow-inner">
                  <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center text-stone-200 mb-6 border border-stone-100">
                    <i className="fas fa-utensils text-4xl"></i>
                  </div>
                  <h3 className="text-xl font-black text-stone-700 mb-3">냉장고를 털어볼까요?</h3>
                  <p className="text-stone-400 max-w-[260px] leading-relaxed text-sm font-medium">
                    사용 가능한 재료들을 입력하면 AI 셰프가 맛있는 레시피를 즉석에서 만들어 드립니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 animate-pulse">
                  <div className="h-10 bg-stone-100 rounded-xl w-40"></div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-[2rem] overflow-hidden border border-stone-100 shadow-sm">
                      <div className="h-60 bg-stone-50"></div>
                      <div className="p-8 space-y-6">
                        <div className="h-8 bg-stone-100 rounded-lg w-2/3"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-stone-100 rounded-lg w-full"></div>
                          <div className="h-4 bg-stone-100 rounded-lg w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-32 py-16 text-center text-stone-300 text-[10px] font-bold uppercase tracking-[0.2em] border-t border-stone-50 bg-white">
        <p className="mb-2">Refrigerator Chef AI</p>
        <p className="font-medium lowercase tracking-normal italic opacity-50">Cook smart with Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
