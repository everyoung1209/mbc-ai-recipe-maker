
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
        // process.env.API_KEY가 주입되어 있거나 이미 선택된 키가 있는지 확인
        setHasApiKey(hasKey || (!!process.env.API_KEY && process.env.API_KEY !== "undefined"));
      } else {
        setHasApiKey(!!process.env.API_KEY && process.env.API_KEY !== "undefined");
      }
    };
    checkInitialKey();
  }, []);

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // 규정에 따라 선택 시도 후 즉시 성공으로 간주하여 UI 잠금 해제 (레이스 컨디션 방지)
        setHasApiKey(true);
        setError(null);
        
        // 사용자의 요청대로 키 선택 직후 자동으로 연결 테스트 실행
        await handleTestConnection();
      } catch (err) {
        console.error("Key selection failed", err);
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const success = await testConnection();
      setTestResult(success ? 'success' : 'fail');
      if (!success) {
        setError("API 연결에 실패했습니다. 유효한 API 키를 선택했는지 확인해주세요.");
      } else {
        setError(null);
      }
    } catch (err) {
      setTestResult('fail');
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
      // API 키가 없거나 잘못된 경우 (404 등) 다시 키 설정 유도
      if (err.message?.includes("not found") || err.message?.includes("API key")) {
        setHasApiKey(false);
        setError("유효하지 않은 API 키입니다. 다시 설정해주세요.");
      } else {
        setError("레시피를 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // API 키 설정 강제 모달 팝업
  if (hasApiKey === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/90 backdrop-blur-sm p-4">
        <div className="bg-white rounded-[2rem] max-w-md w-full p-10 shadow-2xl animate-in zoom-in duration-300 border border-orange-100">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-orange-200">
              <i className="fas fa-key text-4xl text-white"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">셰프님, 환영합니다!</h2>
            <p className="text-gray-500 mb-10 leading-relaxed">
              냉장고 파먹기를 시작하기 전에 인공지능 요리사에게 필요한 <span className="text-orange-600 font-bold">API 키</span>를 연결해주세요.<br/>
              (본인의 유료 결제가 설정된 API 키가 필요합니다.)
            </p>
            
            <button
              onClick={handleOpenKeySelection}
              className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-xl shadow-xl hover:shadow-orange-200 transition-all active:scale-95 mb-6"
            >
              API 키 연결하기
            </button>
            
            <div className="flex flex-col gap-3">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-orange-500 transition-colors flex items-center justify-center gap-1"
              >
                결제 설정이 필요하신가요? <i className="fas fa-external-link-alt text-[10px]"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm">
              <i className="fas fa-hat-chef text-xl"></i>
            </div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight">냉장고 셰프</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                showSettings ? 'bg-orange-500 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-orange-100 hover:text-orange-600'
              }`}
              title="설정"
            >
              <i className={`fas ${testResult === 'fail' ? 'fa-exclamation-triangle text-red-500' : 'fa-cog'}`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Bar (Slide-down) */}
      {showSettings && (
        <div className="bg-white border-b border-orange-50 animate-in slide-in-from-top duration-300 shadow-sm overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Connection</span>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                  testResult === 'success' ? 'bg-green-100 text-green-700' : 
                  testResult === 'fail' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    testResult === 'success' ? 'bg-green-500 animate-pulse' : 
                    testResult === 'fail' ? 'bg-red-500' : 'bg-stone-400'
                  }`}></span>
                  {testResult === 'success' ? '연결됨' : testResult === 'fail' ? '연결 오류' : '확인 필요'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenKeySelection}
                  className="text-xs font-bold px-4 py-2 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-all"
                >
                  <i className="fas fa-exchange-alt mr-1.5"></i> 키 변경
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingKey}
                  className="text-xs font-bold px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 shadow-sm"
                >
                  {isTestingKey ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-vial mr-1.5"></i>}
                  테스트
                </button>
              </div>
            </div>
            {error && (
              <p className="text-[10px] text-red-500 font-medium bg-red-50 p-2 rounded-lg text-center">
                <i className="fas fa-info-circle mr-1"></i> {error}
              </p>
            )}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {hasApiKey === null ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-stone-400 mt-6 font-medium">셰프를 깨우는 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Input Section */}
            <div className="md:col-span-1 space-y-10">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-3">
                  <span className="bg-yellow-100 w-8 h-8 rounded-lg flex items-center justify-center text-yellow-600">
                    <i className="fas fa-clock text-sm"></i>
                  </span>
                  식사 시간
                </h2>
                <MealTimeSelector selected={mealTime} onSelect={setMealTime} />
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-3">
                  <span className="bg-emerald-100 w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600">
                    <i className="fas fa-refrigerator text-sm"></i>
                  </span>
                  오늘의 재료
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
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed translate-y-0'
                    : 'bg-orange-500 hover:bg-orange-600 text-white hover:-translate-y-1 active:translate-y-0 active:shadow-inner'
                }`}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                  </>
                ) : (
                  <>
                    레시피 3가지 보기 <i className="fas fa-sparkles"></i>
                  </>
                )}
              </button>

              {error && !showSettings && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <i className="fas fa-exclamation-circle mt-0.5"></i>
                  <span className="font-medium">{error}</span>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="md:col-span-2">
              {recipes.length > 0 ? (
                <div className="space-y-10">
                  <div className="flex items-end justify-between px-2">
                    <div>
                      <h2 className="text-3xl font-black text-gray-800 mb-1">
                        오늘의 <span className="text-orange-500">추천 요리</span>
                      </h2>
                      <p className="text-stone-400 text-sm font-medium">AI가 엄선한 {mealTime} 맞춤 식단입니다.</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-2xl border border-stone-100 shadow-sm text-stone-500 text-sm font-bold">
                      {recipes.length} Recipes
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-10">
                    {recipes.map((recipe, index) => (
                      <RecipeCard key={index} recipe={recipe} />
                    ))}
                  </div>
                </div>
              ) : !isLoading ? (
                <div className="h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border-2 border-dashed border-stone-200 shadow-inner">
                  <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center text-stone-200 mb-8 border border-stone-100">
                    <i className="fas fa-utensils text-5xl"></i>
                  </div>
                  <h3 className="text-2xl font-black text-stone-700 mb-3">무엇을 먹어볼까요?</h3>
                  <p className="text-stone-400 max-w-[280px] leading-relaxed font-medium">
                    왼쪽 패널에서 재료를 추가하고 버튼을 누르면 인공지능이 특별한 레시피를 제안해드립니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="h-12 bg-stone-100 rounded-xl w-48 animate-pulse"></div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-stone-100 animate-pulse">
                      <div className="h-72 bg-stone-100"></div>
                      <div className="p-8 space-y-6">
                        <div className="h-10 bg-stone-100 rounded-xl w-3/4"></div>
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
      <footer className="mt-32 py-16 text-center text-stone-300 text-xs border-t border-stone-50 bg-white">
        <p className="font-bold uppercase tracking-[0.2em] mb-3">Refrigerator Chef AI</p>
        <p className="italic">Transforming your ingredients into culinary masterpieces.</p>
      </footer>
    </div>
  );
};

export default App;
