import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { normalizeVi } from '../utils/helpers';

// Helper component to highlight matching text
const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <span>{text}</span>;
  
  // We need to find the match case-insensitively and ignore diacritics
  // For a simple MVP, if we want exact visual highlighting over original text while ignoring diacritics
  // it requires complex mapping. We'll do a simple case-insensitive match for now,
  // or just raw match. Advanced diacritic match highlighting is complex without a library.
  // We'll just render text for now and perhaps highlight if there's a simple match.
  
  const normText = normalizeVi(text);
  const normHighlight = normalizeVi(highlight);
  const idx = normText.indexOf(normHighlight);
  
  if (idx === -1) return <span>{text}</span>;

  const originalBefore = text.substring(0, idx);
  const originalHighlight = text.substring(idx, idx + highlight.length);
  const originalAfter = text.substring(idx + highlight.length);

  return (
    <span>
      {originalBefore}
      <mark className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{originalHighlight}</mark>
      {originalAfter}
    </span>
  );
};

export default function ReviewCard({ question, highlightString }) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start gap-4 mb-4">
        <h4 className="font-semibold text-slate-800 text-base leading-relaxed flex-1">
          <HighlightText text={question.content} highlight={highlightString} />
        </h4>
        <button 
          onClick={() => setShowAnswer(!showAnswer)}
          className="text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 p-2 rounded-lg transition-colors shrink-0"
          title={showAnswer ? "Ẩn đáp án" : "Hiện đáp án"}
        >
          {showAnswer ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      <div className="space-y-2.5">
        {Object.entries(question.options).map(([key, value]) => {
          const isCorrect = key === question.correctAnswer;
          const showAsCorrect = showAnswer && isCorrect;
          
          return (
            <div 
              key={key} 
              className={`flex items-start gap-3 p-3 text-sm rounded-lg border transition-colors ${
                showAsCorrect 
                  ? 'bg-success/10 border-success/30 text-success-800 font-medium' 
                  : 'bg-white border-slate-100 text-slate-600'
              }`}
              style={showAsCorrect ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' } : {}}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-semibold ${
                showAsCorrect ? 'bg-green-200 text-green-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {key}
              </div>
              <div className="pt-0.5 flex-1">
                <HighlightText text={value} highlight={highlightString} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
