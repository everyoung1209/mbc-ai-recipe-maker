
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
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        // 플랫폼에서 제공하는 process.env.API_KEY가 유효한지 확인
        setHasApiKey(hasKey || (!!process.env.API_KEY && process.env.API_KEY !== "undefined"));
      } else {
        setHasApiKey(!!process.env.API_KEY && process.env.API_KEY !== "undefined");
      }
    };
    checkInitialKey();
  }, []);

  // 연결 테스트 자동 실행 함수
  const runAutoTest = useCallback(async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const success = await testConnection();
      setTestResult(success ? 'success' : 'fail');
      if (!success) {
        setError("API 키 연결은 되었으나 테스트에 실패했습니다. 유효한 키인지 확인해 주세요.");
      } else {
        setError(null);
      }
    } catch (err) {
      setTestResult('fail');
    } finally {
      setIsTestingKey(false);
    }
  }, []);

  const handleOpenKeySelection = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // 규정: 선택 시도 후 즉시 성공으로 간주하고 진행하여 레이스 컨디션 방지
        setHasApiKey(true);
        setError(null);
        // 키 선택 후 자동으로 연결 테스트 트리거
        runAutoTest();
      } catch (err) {
        console.error("API 키 선택 중 오류:", err);
      }
    } else {
      setError("이 환경은 시스템 API 키 선택기를 지원하지 않습니다.");
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

      // 이미지는 백그라운드에서 생성
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
      // 잘못된 엔티티(키 문제) 에러 시 키 재설정 모달로 유도
      if (msg.includes("not found") || msg.includes("API key") || msg.includes("403") || msg.includes("401")) {
        setHasApiKey(false);
        setError("유효하지 않거나 만료된 API 키입니다. 다시 연결해 주세요.");
      } else {
        setError("레시피를 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // API 키 입력/선택 강제 팝업 (Gate)
  if (hasApiKey === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/95 backdrop-blur-md p-4">
        <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-10 shadow-2xl animate-in zoom-in duration-500 border border-orange-100 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-orange-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-orange-200">
            <i className="fas fa-hat-chef text-4xl text-white"></i>
          </div>
          <h2 className="text-3xl font-black text-gray-800 mb-4">서비스 연결 필요</h2>
          <p className="text-gray-500 mb-10 leading-relaxed text-lg">
            다른 사람에게 받은 키나 자신의 <span className="text-orange-600 font-bold">API 키</span>를<br/>
            사용하여 AI 셰프를 활성화해 주세요.
          </p>
          
          <button
            onClick={handleOpenKeySelection}
            className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-xl shadow-xl hover:shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 mb-6"
          >
            <i className="fas fa-key"></i> 다른 API 키 입력/선택하기
          </button>
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-stone-400 hover:text-orange-500 transition-colors flex items-center gap-2"
          >
            결제 계정이 연결된 키여야 합니다 <i className="fas fa-external-link-alt text-[10px]"></i>
          </a>
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
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
              testResult === 'success' ? 'bg-green-100 text-green-700' : 
              testResult === 'fail' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                testResult === 'success' ? 'bg-green-500' : testResult === 'fail' ? 'bg-red-500' : 'bg-stone-300'
              }`}></span>
              {testResult === 'success' ? 'Connected' : testResult === 'fail' ? 'Error' : 'Offline'}
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                showSettings ? 'bg-orange-500 text-white shadow-md' : 'bg-stone-50 text-stone-500 hover:bg-orange-100 hover:text-orange-600'
              }`}
            >
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Bar (Auto-triggered after key change) */}
      {showSettings && (
        <div className="bg-white border-b border-orange-50 animate-in slide-in-from-top duration-300 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">API Configuration</span>
              <p className="text-xs text-stone-600 font-medium">사용자 지정 API 키가 활성화되었습니다.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenKeySelection}
                className="text-xs font-bold px-4 py-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all"
              >
                다른 키로 변경
              </button>
              <button
                onClick={runAutoTest}
                disabled={isTestingKey}
                className="text-xs font-bold px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 shadow-sm"
              >
                {isTestingKey ? <i className="fas fa-spinner fa-spin mr-1.5"></i> : <i className="fas fa-vial mr-1.5"></i>}
                연결 테스트
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {hasApiKey === null ? (
          <div className="flex flex-col items-center justify-center h-80 space-y-4">
            <div className="w-12 h-12 border-4 border-stone-100 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-stone-400 font-bold text-sm">연결 상태를 확인하고 있습니다...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Input Section */}
            <div className="md:col-span-1 space-y-8">
              <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span className="bg-yellow-100 w-8 h-8 rounded-lg flex items-center justify-center text-yellow-600">
                    <i className="fas fa-clock text-xs"></i>
                  </span>
                  식사 시간 선택
                </h2>
                <MealTimeSelector selected={mealTime} onSelect={setMealTime} />
              </section>

              <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span className="bg-emerald-100 w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600">
                    <i className="fas fa-refrigerator text-xs"></i>
                  </span>
                  냉장고 속 재료
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
                    : 'bg-orange-500 hover:bg-orange-600 text-white hover:-translate-y-1 active:translate-y-0'
                }`}
              >
                {isLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    레시피 추천받기 <i className="fas fa-sparkles text-sm"></i>
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <i className="fas fa-exclamation-circle mt-0.5"></i>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="md:col-span-2">
              {recipes.length > 0 ? (
                <div className="space-y-8">
                  <div className="px-2">
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                      오늘의 <span className="text-orange-500">추천 메뉴</span>
                    </h2>
                    <p className="text-stone-400 text-sm font-medium mt-1">
                      {mealTime} 식사를 위한 AI 셰프의 특별 레시피입니다.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-8">
                    {recipes.map((recipe, index) => (
                      <RecipeCard key={index} recipe={recipe} />
                    ))}
                  </div>
                </div>
              ) : !isLoading ? (
                <div className="h-[480px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border-2 border-dashed border-stone-200 shadow-inner">
                  <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center text-stone-200 mb-8 border border-stone-100">
                    <i className="fas fa-utensils text-5xl"></i>
                  </div>
                  <h3 className="text-2xl font-black text-stone-700 mb-3">셰프의 조언을 받아보세요</h3>
                  <p className="text-stone-400 max-w-[280px] leading-relaxed text-sm font-medium">
                    재료를 추가하고 버튼을 누르면 인공지능이 즉석에서 최고의 레시피를 만들어 드립니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 animate-pulse">
                  <div className="h-10 bg-stone-100 rounded-xl w-48"></div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] overflow-hidden border border-stone-50 shadow-sm">
                      <div className="h-64 bg-stone-100"></div>
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

      <footer className="mt-32 py-16 text-center text-stone-300 text-[10px] font-bold uppercase tracking-[0.2em] border-t border-stone-50 bg-white">
        <p className="mb-2 tracking-widest">Refrigerator Chef AI</p>
        <p className="font-medium lowercase italic opacity-50">Powered by Gemini AI Technology</p>
      </footer>
    </div>
  );
};

export default App;
