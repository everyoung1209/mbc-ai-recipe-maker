
import React from 'react';
import { MealTime } from '../types';

interface MealTimeSelectorProps {
  selected: MealTime;
  onSelect: (time: MealTime) => void;
}

const MealTimeSelector: React.FC<MealTimeSelectorProps> = ({ selected, onSelect }) => {
  const options = [
    { value: MealTime.BREAKFAST, icon: 'fa-sun', label: '아침', color: 'bg-yellow-400' },
    { value: MealTime.LUNCH, icon: 'fa-cloud-sun', label: '점심', color: 'bg-orange-400' },
    { value: MealTime.DINNER, icon: 'fa-moon', label: '저녁', color: 'bg-indigo-400' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all shadow-sm ${
            selected === opt.value
              ? `border-orange-500 ${opt.color} text-white scale-105`
              : 'border-gray-100 bg-white text-gray-500 hover:border-orange-200'
          }`}
        >
          <i className={`fas ${opt.icon} text-xl mb-2`}></i>
          <span className="font-bold">{opt.label}</span>
        </button>
      ))}
    </div>
  );
};

export default MealTimeSelector;
