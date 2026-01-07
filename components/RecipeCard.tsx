
import React from 'react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-orange-50 transition-transform hover:scale-[1.01]">
      <div className="relative h-64 w-full">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-orange-50 flex items-center justify-center">
            <i className="fas fa-utensils text-4xl text-orange-200 animate-pulse"></i>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            AI 추천
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{recipe.title}</h3>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">{recipe.description}</p>

        <div className="mb-6">
          <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i className="fas fa-shopping-basket"></i> 필요한 재료
          </h4>
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients.map((ing, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                {ing}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i className="fas fa-list-ol"></i> 조리 순서
          </h4>
          <ol className="space-y-3">
            {recipe.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-gray-700 leading-snug">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
