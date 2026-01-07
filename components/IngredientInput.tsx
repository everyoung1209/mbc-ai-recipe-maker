
import React, { useState } from 'react';

interface IngredientInputProps {
  ingredients: string[];
  onAdd: (ingredient: string) => void;
  onRemove: (index: number) => void;
}

const IngredientInput: React.FC<IngredientInputProps> = ({ ingredients, onAdd, onRemove }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="재료를 입력하세요 (예: 계란, 양파)"
          className="flex-1 px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm transition-all"
        />
        <button
          onClick={handleAdd}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2"
        >
          <i className="fas fa-plus"></i> 추가
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ingredients.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex items-center gap-2 border border-orange-200 animate-in fade-in zoom-in duration-300"
          >
            {item}
            <button
              onClick={() => onRemove(index)}
              className="hover:text-red-500 focus:outline-none transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </span>
        ))}
        {ingredients.length === 0 && (
          <p className="text-gray-400 italic text-sm py-2">재료를 추가해 주세요!</p>
        )}
      </div>
    </div>
  );
};

export default IngredientInput;
