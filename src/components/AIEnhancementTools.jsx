// src/components/AIEnhancementTools.jsx - Complete AI Tools Implementation
import { useState } from "react";

// AI Enhancement Service
class AIEnhancementService {
  // Analyze prompt complexity
  static analyzeComplexity(text) {
    const words = text.trim().split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(Boolean).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
    const hasInstructions = /please|must|should|need to|required|ensure/i.test(text);
    const hasExamples = /example|for instance|such as|like/i.test(text);
    const hasContext = /context|background|about|regarding/i.test(text);
    
    let complexity = 0;
    let level = "Simple";
    let suggestions = [];
    
    // Calculate complexity score
    if (words > 100) complexity += 2;
    else if (words > 50) complexity += 1;
    
    if (avgWordsPerSentence > 20) complexity += 2;
    else if (avgWordsPerSentence > 15) complexity += 1;
    
    if (hasInstructions) complexity += 1;
    if (hasExamples) complexity += 1;
    if (hasContext) complexity += 1;
    
    // Determine level
    if (complexity >= 5) {
      level = "Complex";
      suggestions.push("Consider breaking into multiple prompts");
    } else if (complexity >= 3) {
      level = "Moderate";
      suggestions.push("Well-structured prompt");
    } else {
      level = "Simple";
      suggestions.push("Consider adding more context or examples");
    }
    
    if (!hasInstructions) {
      suggestions.push("Add clear instructions (use 'please', 'should', 'must')");
    }
    if (!hasExamples) {
      suggestions.push("Include examples to clarify expectations");
    }
    if (!hasContext) {
      suggestions.push("Provide background context for better results");
    }
    
    return {
      score: complexity,
      level,
      words,
      sentences,
      avgWordsPerSentence: avgWordsPerSentence.toFixed(1),
      hasInstructions,
      hasExamples,
      hasContext,
      suggestions
    };
  }
  
  // Optimize prompt
  static optimizePrompt(text) {
    let optimized = text.trim();
    const improvements = [];
    
    // Remove extra whitespace
    if (/\s{2,}/.test(optimized)) {
      optimized = optimized.replace(/\s+/g, ' ');
      improvements.push("Removed extra whitespace");
    }
    
    // Add structure if missing
    if (!optimized.includes('\n\n') && optimized.length > 200) {
      const sentences = optimized.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length > 3) {
        optimized = sentences.join('\n\n');
        improvements.push("Added paragraph breaks for better readability");
      }
    }
    
    // Suggest clear instruction format
    if (!/^(please|you are|act as|your task|create|write|generate)/i.test(optimized)) {
      const suggestion = `Your task: ${optimized}`;
      improvements.push("Added clear task prefix");
      optimized = suggestion;
    }
    
    // Add specificity markers
    if (!/(specific|detailed|clear|exact|precise)/i.test(optimized)) {
      improvements.push("Consider adding specificity: 'Be specific about...', 'Provide detailed...'");
    }
    
    return {
      original: text,
      optimized,
      improvements,
      changed: optimized !== text
    };
  }
  
  // Generate variations
  static generateVariations(text) {
    const variations = [];
    
    // Formal variation
    variations.push({
      name: "Formal/Professional",
      text: `Please provide a comprehensive and professional response to the following:\n\n${text}\n\nEnsure the output is well-structured and formally presented.`,
      description: "More formal and structured approach"
    });
    
    // Creative variation
    variations.push({
      name: "Creative/Exploratory",
      text: `Think creatively and explore different angles for:\n\n${text}\n\nFeel free to be innovative and think outside the box.`,
      description: "Encourages creative and diverse responses"
    });
    
    // Step-by-step variation
    variations.push({
      name: "Step-by-Step",
      text: `Break down the following into clear, actionable steps:\n\n${text}\n\nProvide a numbered list with detailed explanations for each step.`,
      description: "Structured, sequential approach"
    });
    
    // Concise variation
    variations.push({
      name: "Concise/Direct",
      text: `Provide a concise, direct answer to:\n\n${text}\n\nBe brief and to the point while maintaining accuracy.`,
      description: "Shorter, more focused response"
    });
    
    // Detailed variation
    variations.push({
      name: "Detailed/Comprehensive",
      text: `Provide an extremely detailed and comprehensive response to:\n\n${text}\n\nInclude examples, explanations, and relevant context. Leave no stone unturned.`,
      description: "Maximum detail and thoroughness"
    });
    
    return variations;
  }
  
  // Suggest improvements
  static suggestImprovements(text) {
    const suggestions = [];
    const analysis = this.analyzeComplexity(text);
    
    // Check for common issues
    if (text.length < 20) {
      suggestions.push({
        type: "Length",
        issue: "Prompt is very short",
        suggestion: "Add more context and specific instructions for better results",
        priority: "high"
      });
    }
    
    if (!/[.!?]$/.test(text.trim())) {
      suggestions.push({
        type: "Formatting",
        issue: "Missing ending punctuation",
        suggestion: "End your prompt with proper punctuation",
        priority: "low"
      });
    }
    
    if (!analysis.hasExamples && text.length > 100) {
      suggestions.push({
        type: "Clarity",
        issue: "No examples provided",
        suggestion: "Include examples to clarify your expectations: 'For example: ...'",
        priority: "medium"
      });
    }
    
    if (!analysis.hasContext && text.length > 100) {
      suggestions.push({
        type: "Context",
        issue: "Limited context",
        suggestion: "Add background information: 'Context: ...' or 'Background: ...'",
        priority: "medium"
      });
    }
    
    if (!/\n/.test(text) && text.length > 200) {
      suggestions.push({
        type: "Readability",
        issue: "No paragraph breaks",
        suggestion: "Break long prompts into paragraphs for better readability",
        priority: "medium"
      });
    }
    
    if (!/\b(format|structure|style)\b/i.test(text)) {
      suggestions.push({
        type: "Output Format",
        issue: "No format specification",
        suggestion: "Specify desired output format: 'Provide as bullet points', 'Use markdown', etc.",
        priority: "low"
      });
    }
    
    return suggestions;
  }
}

// AI Tools Modal Component
export default function AIEnhancementTools({ prompt, onClose, onApply, onSaveAsNew }) {
  const [activeTab, setActiveTab] = useState("analyze");
  const [analysis, setAnalysis] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [variations, setVariations] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState(null);

  // Initialize tools
  useState(() => {
    if (prompt?.text) {
      setAnalysis(AIEnhancementService.analyzeComplexity(prompt.text));
      setOptimization(AIEnhancementService.optimizePrompt(prompt.text));
      setVariations(AIEnhancementService.generateVariations(prompt.text));
      setImprovements(AIEnhancementService.suggestImprovements(prompt.text));
    }
  }, [prompt?.text]);

  const tabs = [
    { id: "analyze", label: "Analyze", icon: "📊" },
    { id: "optimize", label: "Optimize", icon: "⚡" },
    { id: "variations", label: "Variations", icon: "🔄" },
    { id: "improve", label: "Suggestions", icon: "💡" }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "var(--destructive)";
      case "medium": return "var(--accent)";
      case "low": return "var(--muted-foreground)";
      default: return "var(--foreground)";
    }
  };

  const getComplexityColor = (level) => {
    switch (level) {
      case "Complex": return "var(--destructive)";
      case "Moderate": return "var(--accent)";
      case "Simple": return "var(--primary)";
      default: return "var(--foreground)";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <span style={{ color: "var(--primary-foreground)" }}>🤖</span>
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                  AI Enhancement Tools
                </h2>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Analyze and improve your prompt
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id ? "cyber-glow" : ""
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? "var(--primary)" : "var(--secondary)",
                  color: activeTab === tab.id ? "var(--primary-foreground)" : "var(--secondary-foreground)"
                }}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Analyze Tab */}
          {activeTab === "analyze" && analysis && (
            <div className="space-y-6">
              {/* Complexity Score */}
              <div className="glass-card p-6 rounded-xl" style={{ border: "1px solid var(--border)" }}>
                <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                  Complexity Analysis
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <span style={{ color: "var(--muted-foreground)" }}>Complexity Level:</span>
                  <span 
                    className="font-bold text-lg"
                    style={{ color: getComplexityColor(analysis.level) }}
                  >
                    {analysis.level}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: "var(--muted)" }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((analysis.score / 7) * 100, 100)}%`,
                      backgroundColor: getComplexityColor(analysis.level)
                    }}
                  />
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Words", value: analysis.words, icon: "📝" },
                  { label: "Sentences", value: analysis.sentences, icon: "📄" },
                  { label: "Avg Words/Sentence", value: analysis.avgWordsPerSentence, icon: "📊" },
                  { label: "Score", value: `${analysis.score}/7`, icon: "⭐" }
                ].map((stat, i) => (
                  <div 
                    key={i}
                    className="glass-card p-4 rounded-xl text-center"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
                      {stat.value}
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="glass-card p-6 rounded-xl" style={{ border: "1px solid var(--border)" }}>
                <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                  Detected Features
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Clear Instructions", present: analysis.hasInstructions },
                    { label: "Examples Provided", present: analysis.hasExamples },
                    { label: "Context/Background", present: analysis.hasContext }
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span style={{ color: "var(--muted-foreground)" }}>{feature.label}</span>
                      <span style={{ color: feature.present ? "var(--primary)" : "var(--destructive)" }}>
                        {feature.present ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Tips */}
              {analysis.suggestions.length > 0 && (
                <div className="glass-card p-6 rounded-xl" style={{ border: "1px solid var(--border)" }}>
                  <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                    Quick Tips
                  </h3>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span style={{ color: "var(--primary)" }}>•</span>
                        <span style={{ color: "var(--muted-foreground)" }}>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Optimize Tab */}
          {activeTab === "optimize" && optimization && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-xl" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
                    Optimized Version
                  </h3>
                  {optimization.changed && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                      {optimization.improvements.length} improvements
                    </span>
                  )}
                </div>
                
                <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: "var(--muted)" }}>
                  <pre className="whitespace-pre-wrap text-sm" style={{ color: "var(--foreground)" }}>
                    {optimization.optimized}
                  </pre>
                </div>

                {optimization.improvements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                      Applied Improvements:
                    </h4>
                    <ul className="space-y-1">
                      {optimization.improvements.map((improvement, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span style={{ color: "var(--primary)" }}>✓</span>
                          <span style={{ color: "var(--muted-foreground)" }}>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => onApply({ ...prompt, text: optimization.optimized })}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Apply Optimization
                  </button>
                  <button
                    onClick={() => onSaveAsNew({ ...prompt, text: optimization.optimized, title: `${prompt.title} (Optimized)` })}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Save as New
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Variations Tab */}
          {activeTab === "variations" && variations.length > 0 && (
            <div className="space-y-4">
              {variations.map((variation, i) => (
                <div 
                  key={i}
                  className="glass-card p-6 rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/50"
                  style={{ border: selectedVariation === i ? "2px solid var(--primary)" : "1px solid var(--border)" }}
                  onClick={() => setSelectedVariation(i)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                        {variation.name}
                      </h3>
                      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                        {variation.description}
                      </p>
                    </div>
                    {selectedVariation === i && (
                      <span style={{ color: "var(--primary)" }}>✓</span>
                    )}
                  </div>
                  
                  <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--muted)" }}>
                    <pre className="whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                      {variation.text}
                    </pre>
                  </div>

                  {selectedVariation === i && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApply({ ...prompt, text: variation.text });
                        }}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Apply This Variation
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveAsNew({ ...prompt, text: variation.text, title: `${prompt.title} (${variation.name})` });
                        }}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        Save as New
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Improvements Tab */}
          {activeTab === "improve" && improvements.length > 0 && (
            <div className="space-y-4">
              {improvements.map((improvement, i) => (
                <div 
                  key={i}
                  className="glass-card p-6 rounded-xl"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: getPriorityColor(improvement.priority) + "20" }}
                    >
                      <span style={{ color: getPriorityColor(improvement.priority) }}>
                        {improvement.priority === "high" ? "!" : improvement.priority === "medium" ? "•" : "·"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
                          {improvement.type}
                        </h3>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{ 
                            backgroundColor: getPriorityColor(improvement.priority) + "20",
                            color: getPriorityColor(improvement.priority)
                          }}
                        >
                          {improvement.priority}
                        </span>
                      </div>
                      <p className="text-sm mb-2" style={{ color: "var(--muted-foreground)" }}>
                        <strong>Issue:</strong> {improvement.issue}
                      </p>
                      <p className="text-sm" style={{ color: "var(--foreground)" }}>
                        <strong>Suggestion:</strong> {improvement.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-secondary px-6 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
