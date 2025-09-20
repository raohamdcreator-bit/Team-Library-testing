// src/components/AIModelTools.jsx
import { useState, useEffect, useMemo } from "react";

// AI Model configurations
export const AI_MODELS = {
  "gpt-4": {
    name: "GPT-4",
    provider: "OpenAI",
    maxTokens: 8192,
    costPer1kTokens: 0.03,
    strengths: ["Reasoning", "Code", "Analysis"],
    color: "green",
  },
  "gpt-4-turbo": {
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    maxTokens: 128000,
    costPer1kTokens: 0.01,
    strengths: ["Long context", "Speed", "Efficiency"],
    color: "blue",
  },
  "gpt-3.5-turbo": {
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    maxTokens: 4096,
    costPer1kTokens: 0.002,
    strengths: ["Speed", "Cost-effective", "General use"],
    color: "cyan",
  },
  "claude-3-opus": {
    name: "Claude 3 Opus",
    provider: "Anthropic",
    maxTokens: 200000,
    costPer1kTokens: 0.015,
    strengths: ["Long context", "Analysis", "Writing"],
    color: "orange",
  },
  "claude-3-sonnet": {
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    strengths: ["Balanced", "Reasoning", "Code"],
    color: "purple",
  },
  "claude-3-haiku": {
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
    strengths: ["Speed", "Cost-effective", "Simple tasks"],
    color: "teal",
  },
  "gemini-pro": {
    name: "Gemini Pro",
    provider: "Google",
    maxTokens: 32768,
    costPer1kTokens: 0.0005,
    strengths: ["Multimodal", "Fast", "Cost-effective"],
    color: "red",
  },
};

// Token estimation utility
export class TokenEstimator {
  // Rough estimation: ~4 characters per token for English text
  static estimateTokens(text, model = "gpt-4") {
    if (!text) return 0;

    // Different models have different tokenization
    const charPerTokenRatio = {
      "gpt-4": 4,
      "gpt-4-turbo": 4,
      "gpt-3.5-turbo": 4,
      "claude-3-opus": 3.8,
      "claude-3-sonnet": 3.8,
      "claude-3-haiku": 3.8,
      "gemini-pro": 4.2,
    };

    const ratio = charPerTokenRatio[model] || 4;
    return Math.ceil(text.length / ratio);
  }

  // Estimate cost
  static estimateCost(text, model = "gpt-4") {
    const tokens = this.estimateTokens(text, model);
    const modelConfig = AI_MODELS[model];
    if (!modelConfig) return 0;

    return (tokens / 1000) * modelConfig.costPer1kTokens;
  }

  // Check if prompt fits in model context
  static fitsInContext(text, model = "gpt-4") {
    const tokens = this.estimateTokens(text, model);
    const modelConfig = AI_MODELS[model];
    if (!modelConfig) return false;

    return tokens <= modelConfig.maxTokens;
  }

  // Get model recommendations
  static getRecommendations(text) {
    const tokens = this.estimateTokens(text);

    const recommendations = [];

    // Cost-effective options
    if (tokens <= 4096) {
      recommendations.push({
        model: "gpt-3.5-turbo",
        reason: "Most cost-effective for short prompts",
        priority: 1,
      });
      recommendations.push({
        model: "claude-3-haiku",
        reason: "Fastest and cheapest Anthropic model",
        priority: 2,
      });
    }

    // Balanced options
    if (tokens <= 32768) {
      recommendations.push({
        model: "gemini-pro",
        reason: "Good balance of capabilities and cost",
        priority: 3,
      });
      recommendations.push({
        model: "claude-3-sonnet",
        reason: "Excellent reasoning at moderate cost",
        priority: 4,
      });
    }

    // Long context options
    if (tokens > 32768) {
      recommendations.push({
        model: "claude-3-opus",
        reason: "Best for complex, long-context tasks",
        priority: 1,
      });
      recommendations.push({
        model: "gpt-4-turbo",
        reason: "OpenAI's longest context model",
        priority: 2,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }
}

// Token counter component
export function TokenCounter({
  text,
  selectedModels = ["gpt-4", "claude-3-sonnet"],
  className = "",
}) {
  const stats = useMemo(() => {
    return selectedModels.map((model) => {
      const modelConfig = AI_MODELS[model];
      const tokens = TokenEstimator.estimateTokens(text, model);
      const cost = TokenEstimator.estimateCost(text, model);
      const fits = TokenEstimator.fitsInContext(text, model);

      return {
        model,
        name: modelConfig?.name || model,
        provider: modelConfig?.provider || "Unknown",
        tokens,
        cost,
        fits,
        maxTokens: modelConfig?.maxTokens || 0,
        color: modelConfig?.color || "gray",
      };
    });
  }, [text, selectedModels]);

  const getColorClass = (color) => {
    const colors = {
      green: "text-green-600 bg-green-50",
      blue: "text-blue-600 bg-blue-50",
      cyan: "text-cyan-600 bg-cyan-50",
      orange: "text-orange-600 bg-orange-50",
      purple: "text-purple-600 bg-purple-50",
      teal: "text-teal-600 bg-teal-50",
      red: "text-red-600 bg-red-50",
      gray: "text-gray-600 bg-gray-50",
    };
    return colors[color] || colors.gray;
  };

  if (!text || text.trim().length === 0) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        No text to analyze
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs font-medium text-gray-700 mb-2">
        Token Analysis:
      </div>
      <div className="grid grid-cols-1 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.model}
            className={`px-2 py-1 rounded text-xs ${getColorClass(stat.color)}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{stat.name}</div>
              <div className="flex items-center gap-2">
                <span>{stat.tokens.toLocaleString()} tokens</span>
                {!stat.fits && <span className="text-red-500">⚠️</span>}
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs opacity-75">
              <span>${stat.cost.toFixed(4)}</span>
              <span>
                {((stat.tokens / stat.maxTokens) * 100).toFixed(1)}% of context
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Model compatibility component
export function ModelCompatibility({ text, className = "" }) {
  const compatibility = useMemo(() => {
    const results = Object.entries(AI_MODELS).map(([modelId, config]) => {
      const tokens = TokenEstimator.estimateTokens(text, modelId);
      const cost = TokenEstimator.estimateCost(text, modelId);
      const fits = TokenEstimator.fitsInContext(text, modelId);
      const usage = (tokens / config.maxTokens) * 100;

      return {
        modelId,
        config,
        tokens,
        cost,
        fits,
        usage,
        score: fits ? 100 - usage + (cost < 0.01 ? 20 : 0) : 0,
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }, [text]);

  const recommendations = useMemo(() => {
    return TokenEstimator.getRecommendations(text);
  }, [text]);

  if (!text || text.trim().length === 0) {
    return null;
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <h4 className="font-medium text-gray-800 mb-3">AI Model Compatibility</h4>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {compatibility.map(({ modelId, config, tokens, cost, fits, usage }) => (
          <div
            key={modelId}
            className={`p-3 rounded-lg border-2 transition-colors ${
              fits ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-gray-800">{config.name}</div>
              <div
                className={`px-2 py-1 rounded text-xs ${
                  fits ? "bg-green-600 text-white" : "bg-red-600 text-white"
                }`}
              >
                {fits ? "Compatible" : "Too Large"}
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Tokens:</span>
                <span>
                  {tokens.toLocaleString()} /{" "}
                  {config.maxTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cost:</span>
                <span>${cost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Provider:</span>
                <span>{config.provider}</span>
              </div>
            </div>

            {/* Usage bar */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Context Usage</span>
                <span>{usage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage > 90
                      ? "bg-red-500"
                      : usage > 70
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(usage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Model strengths */}
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {config.strengths.map((strength) => (
                  <span
                    key={strength}
                    className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h5 className="font-medium text-gray-700 mb-2">Recommendations</h5>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div
                key={rec.model}
                className="flex items-center gap-3 p-2 bg-blue-50 rounded"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index === 0
                      ? "bg-blue-600 text-white"
                      : index === 1
                      ? "bg-blue-500 text-white"
                      : "bg-blue-400 text-white"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-blue-800">
                    {AI_MODELS[rec.model]?.name || rec.model}
                  </div>
                  <div className="text-sm text-blue-600">{rec.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Model selector with stats
export function ModelSelector({
  selectedModels,
  onSelectionChange,
  text,
  className = "",
}) {
  const handleModelToggle = (modelId) => {
    const newSelection = selectedModels.includes(modelId)
      ? selectedModels.filter((id) => id !== modelId)
      : [...selectedModels, modelId];

    onSelectionChange(newSelection);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="font-medium text-gray-800">
        Select Models for Comparison
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(AI_MODELS).map(([modelId, config]) => {
          const isSelected = selectedModels.includes(modelId);
          const tokens = text
            ? TokenEstimator.estimateTokens(text, modelId)
            : 0;
          const fits = text
            ? TokenEstimator.fitsInContext(text, modelId)
            : true;

          return (
            <label
              key={modelId}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleModelToggle(modelId)}
                className="mr-3"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800">{config.name}</div>
                  {text && !fits && (
                    <span className="text-red-500 text-xs">⚠️ Too large</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {config.provider} • ${config.costPer1kTokens}/1K tokens
                </div>
                {text && (
                  <div className="text-xs text-gray-500 mt-1">
                    ~{tokens.toLocaleString()} tokens
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// Compact AI tools component for prompt cards
export function CompactAITools({ text, className = "" }) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedModels, setSelectedModels] = useState([
    "gpt-4",
    "claude-3-sonnet",
  ]);

  const stats = useMemo(() => {
    if (!text) return null;

    const tokens = TokenEstimator.estimateTokens(text, "gpt-4");
    const cost = TokenEstimator.estimateCost(text, "gpt-4");
    const recommendations = TokenEstimator.getRecommendations(text);

    return {
      tokens,
      cost,
      bestModel: recommendations[0]?.model || "gpt-4",
      compatibleModels: Object.keys(AI_MODELS).filter((model) =>
        TokenEstimator.fitsInContext(text, model)
      ).length,
    };
  }, [text]);

  if (!text || !stats) {
    return (
      <div className={className}>
        <div className="text-xs text-gray-500">No text to analyze</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-800 flex items-center gap-2">
            <span>🤖</span>
            <span>AI Model Analysis</span>
          </h4>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
          <div>
            <span className="text-gray-600">Tokens (GPT-4):</span>
            <span className="ml-2 font-medium">
              {stats.tokens.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Est. Cost:</span>
            <span className="ml-2 font-medium">${stats.cost.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-gray-600">Compatible Models:</span>
            <span className="ml-2 font-medium">{stats.compatibleModels}/7</span>
          </div>
          <div>
            <span className="text-gray-600">Recommended:</span>
            <span className="ml-2 font-medium">
              {AI_MODELS[stats.bestModel]?.name || "GPT-4"}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <TokenCounter text={text} selectedModels={selectedModels} />

            <div className="border-t border-gray-200 pt-3">
              <ModelSelector
                selectedModels={selectedModels}
                onSelectionChange={setSelectedModels}
                text={text}
              />
            </div>

            <div className="border-t border-gray-200 pt-3">
              <ModelCompatibility text={text} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
