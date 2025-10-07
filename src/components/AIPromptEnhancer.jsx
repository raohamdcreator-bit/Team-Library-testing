// src/components/AIPromptEnhancer.jsx - Client-side AI Enhancement Component now
import { useState } from 'react';

export default function AIPromptEnhancer({ prompt, onApply, onSaveAsNew, onClose }) {
  const [enhancementType, setEnhancementType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
// Add this temporarily to your AIPromptEnhancer.jsx in handleEnhance function
console.log('🔍 Attempting to call:', '/api/enhance-prompt');
console.log('🔍 Request body:', { prompt: prompt.text, enhancementType });
  const enhancementTypes = [
    {
      id: 'general',
      name: 'General Enhancement',
      icon: '✨',
      description: 'Improve clarity, structure, and effectiveness'
    },
    {
      id: 'technical',
      name: 'Technical Optimization',
      icon: '⚙️',
      description: 'Add technical specs, constraints, and precision'
    },
    {
      id: 'creative',
      name: 'Creative Expansion',
      icon: '🎨',
      description: 'Enhance creativity, style, and descriptive elements'
    },
    {
      id: 'analytical',
      name: 'Analytical Depth',
      icon: '🔍',
      description: 'Add reasoning, analysis, and structured thinking'
    },
    {
      id: 'concise',
      name: 'Concise Version',
      icon: '📝',
      description: 'Simplify while maintaining clarity'
    },
    {
      id: 'detailed',
      name: 'Detailed Expansion',
      icon: '📚',
      description: 'Add comprehensive details and examples'
    }
  ];

  async function handleEnhance() {
    if (!prompt?.text) {
      setError('No prompt text to enhance');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.text,
          enhancementType,
          context: {
            title: prompt.title,
            tags: prompt.tags
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Enhancement failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Enhancement failed');
      }

      setResult(data);
      
      // Show success notification
      showNotification('✨ Prompt enhanced successfully!', 'success');

    } catch (err) {
      console.error('Enhancement error:', err);
      setError(err.message || 'Failed to enhance prompt');
      showNotification(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.innerHTML = `<div>${message}</div>`;
    notification.className = `fixed top-4 right-4 glass-card px-4 py-3 rounded-lg z-50 text-sm transition-opacity duration-300`;
    notification.style.cssText = `
      background-color: var(--card);
      color: var(--foreground);
      border: 1px solid var(--${type === 'error' ? 'destructive' : 'primary'});
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  function handleApply() {
    if (result?.enhanced) {
      onApply({ ...prompt, text: result.enhanced });
      showNotification('✅ Enhanced prompt applied!', 'success');
      if (onClose) onClose();
    }
  }

  function handleSaveAsNew() {
    if (result?.enhanced) {
      onSaveAsNew({
        ...prompt,
        text: result.enhanced,
        title: `${prompt.title} (AI Enhanced)`
      });
      showNotification('✅ Saved as new prompt!', 'success');
      if (onClose) onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="glass-card rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">AI Prompt Enhancement</h2>
                <p className="text-sm text-slate-400">Powered by Open Source AI Models</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Enhancement Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-3">
              Select Enhancement Type:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {enhancementTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setEnhancementType(type.id)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    enhancementType === type.id
                      ? 'border-cyan-400 bg-cyan-500/20'
                      : 'border-white/10 hover:border-cyan-400/50 bg-white/5'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-semibold text-slate-100 text-sm mb-1">
                    {type.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Original Prompt */}
          <div className="glass-card p-4 rounded-xl border border-white/10">
            <h3 className="font-semibold text-slate-100 mb-2">Original Prompt:</h3>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <pre className="whitespace-pre-wrap text-sm text-slate-200">
                {prompt?.text || 'No prompt text'}
              </pre>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {prompt?.text?.length || 0} characters
            </div>
          </div>

          {/* Enhance Button */}
          {!result && (
            <button
              onClick={handleEnhance}
              disabled={loading || !prompt?.text}
              className="w-full neo-btn btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="neo-spinner w-5 h-5"></div>
                  <span>Enhancing with AI...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Enhance Prompt</span>
                </>
              )}
            </button>
          )}

          {/* Error Display */}
          {error && (
            <div className="glass-card p-4 rounded-xl border-2 border-red-500/50 bg-red-500/10">
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div>
                  <h4 className="font-semibold text-red-300 mb-1">Enhancement Failed</h4>
                  <p className="text-sm text-red-200">{error}</p>
                  <button
                    onClick={handleEnhance}
                    className="mt-3 text-sm text-red-300 hover:text-red-100 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <>
              {/* Enhanced Prompt */}
              <div className="glass-card p-4 rounded-xl border-2 border-green-500/50 bg-green-500/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-green-300 flex items-center gap-2">
                    <span>✨</span>
                    <span>Enhanced Prompt:</span>
                  </h3>
                  <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">
                    {result.provider.toUpperCase()}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-green-700/30">
                  <pre className="whitespace-pre-wrap text-sm text-slate-200">
                    {result.enhanced}
                  </pre>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{result.enhanced.length} characters</span>
                  <span className="text-green-400">
                    +{result.enhanced.length - prompt.text.length} chars
                  </span>
                </div>
              </div>

              {/* Improvements List */}
              {result.improvements && result.improvements.length > 0 && (
                <div className="glass-card p-4 rounded-xl border border-white/10">
                  <h3 className="font-semibold text-slate-100 mb-3">
                    🎯 Applied Improvements:
                  </h3>
                  <ul className="space-y-2">
                    {result.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span className="text-slate-300">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleApply}
                  className="flex-1 neo-btn btn-primary py-3 text-sm font-semibold"
                >
                  Apply Enhanced Prompt
                </button>
                <button
                  onClick={handleSaveAsNew}
                  className="flex-1 neo-btn btn-secondary py-3 text-sm font-semibold"
                >
                  Save as New Prompt
                </button>
                <button
                  onClick={handleEnhance}
                  className="px-6 py-3 text-sm font-semibold rounded-lg border transition-colors"
                  style={{
                    backgroundColor: 'var(--secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                >
                  Regenerate
                </button>
              </div>
            </>
          )}

          {/* Metadata Display */}
          {result?.metadata && (
            <div className="text-xs text-slate-500 space-y-1">
              <div>Provider: {result.provider} • Model: {result.model}</div>
              <div>Enhancement Type: {result.metadata.enhancementType}</div>
              <div>Processing Time: {new Date(result.metadata.timestamp).toLocaleTimeString()}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <div>💡 Tip: Try different enhancement types for varied results</div>
            <button onClick={onClose} className="neo-btn btn-secondary px-4 py-2">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
