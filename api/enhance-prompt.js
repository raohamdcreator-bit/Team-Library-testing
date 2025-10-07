// api/enhance-prompt.js - Vercel Serverless Function for AI Prompt Enhancement
// Supports multiple AI providers: Groq, Hugging Face, OpenRouter

const PROVIDERS = {
  GROQ: 'groq',
  HUGGINGFACE: 'huggingface',
  OPENROUTER: 'openrouter'
};

// Configuration - Choose your provider
const ACTIVE_PROVIDER = process.env.AI_PROVIDER || PROVIDERS.GROQ;

// Provider-specific configurations
const PROVIDER_CONFIGS = {
  [PROVIDERS.GROQ]: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: process.env.GROQ_API_KEY,
    model: 'mixtral-8x7b-32768', // Free tier: Fast and powerful
    // Alternative models: 'llama3-70b-8192', 'llama3-8b-8192'
  },
  [PROVIDERS.HUGGINGFACE]: {
    endpoint: 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  },
  [PROVIDERS.OPENROUTER]: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
    // Paid alternatives: 'anthropic/claude-3-sonnet', 'openai/gpt-4-turbo'
  }
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, enhancementType = 'general', context = {} } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid prompt',
        message: 'Prompt text is required and must be a non-empty string'
      });
    }

    // Validate provider configuration
    const config = PROVIDER_CONFIGS[ACTIVE_PROVIDER];
    if (!config || !config.apiKey) {
      console.error(`Missing API key for provider: ${ACTIVE_PROVIDER}`);
      return res.status(500).json({ 
        error: 'Service configuration error',
        message: 'AI enhancement service is not properly configured'
      });
    }

    console.log(`🤖 Using provider: ${ACTIVE_PROVIDER}`);
    console.log(`📝 Enhancing prompt: "${prompt.substring(0, 50)}..."`);

    // Generate enhancement prompt based on type
    const systemPrompt = generateSystemPrompt(enhancementType, context);
    const userPrompt = generateUserPrompt(prompt, enhancementType);

    // Call the selected AI provider
    const enhancedPrompt = await callAIProvider(
      config,
      systemPrompt,
      userPrompt
    );

    // Extract and validate the enhanced prompt
    const result = extractEnhancedPrompt(enhancedPrompt);

    console.log(`✅ Enhancement successful (${result.enhanced.length} chars)`);

    return res.status(200).json({
      success: true,
      original: prompt,
      enhanced: result.enhanced,
      improvements: result.improvements,
      provider: ACTIVE_PROVIDER,
      model: config.model,
      metadata: {
        enhancementType,
        timestamp: new Date().toISOString(),
        originalLength: prompt.length,
        enhancedLength: result.enhanced.length,
        improvementCount: result.improvements.length
      }
    });

  } catch (error) {
    console.error('❌ Enhancement error:', error);

    // Provide helpful error messages
    let errorMessage = 'Failed to enhance prompt';
    let statusCode = 500;

    if (error.message?.includes('API key')) {
      errorMessage = 'AI service authentication failed';
      statusCode = 503;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.';
      statusCode = 504;
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error connecting to AI service';
      statusCode = 503;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      provider: ACTIVE_PROVIDER
    });
  }
}

// Generate system prompt based on enhancement type
function generateSystemPrompt(enhancementType, context) {
  const basePrompt = `You are an expert AI prompt engineer. Your task is to enhance and optimize prompts to make them more effective, clear, and comprehensive.`;

  const typeSpecificPrompts = {
    general: `${basePrompt}

Focus on:
- Making instructions clearer and more specific
- Adding relevant context and constraints
- Structuring the prompt for better comprehension
- Including examples where helpful
- Specifying desired output format`,

    technical: `${basePrompt}

Focus on technical accuracy and precision:
- Add technical specifications and constraints
- Include version requirements if applicable
- Specify programming languages, frameworks, or tools
- Define error handling expectations
- Add performance or security considerations`,

    creative: `${basePrompt}

Enhance for creative output:
- Expand on style, tone, and voice requirements
- Add sensory and descriptive details
- Include target audience specification
- Suggest emotional tone or mood
- Add creative constraints that spark innovation`,

    analytical: `${basePrompt}

Optimize for analytical thinking:
- Request step-by-step reasoning
- Ask for evidence and citations
- Include multiple perspectives consideration
- Specify depth and breadth of analysis
- Request structured conclusions`,

    concise: `${basePrompt}

Make the prompt clearer while keeping it brief:
- Remove redundancy
- Use precise language
- Focus on essential elements only
- Maintain clarity without verbosity`,

    detailed: `${basePrompt}

Expand the prompt with comprehensive details:
- Add extensive context and background
- Include multiple examples
- Specify edge cases
- Add quality criteria
- Request thorough explanations`
  };

  return typeSpecificPrompts[enhancementType] || typeSpecificPrompts.general;
}

// Generate user prompt
function generateUserPrompt(originalPrompt, enhancementType) {
  return `Original prompt: "${originalPrompt}"

Please enhance this prompt to make it more effective. Provide:
1. The enhanced version of the prompt
2. A list of specific improvements made

Format your response as:
ENHANCED PROMPT:
[Your enhanced prompt here]

IMPROVEMENTS:
- [Improvement 1]
- [Improvement 2]
- [etc.]`;
}

// Call AI provider based on configuration
async function callAIProvider(config, systemPrompt, userPrompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    let requestBody;
    let headers = {
      'Content-Type': 'application/json',
    };

    // Provider-specific request formatting
    switch (ACTIVE_PROVIDER) {
      case PROVIDERS.GROQ:
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        requestBody = {
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 0.9
        };
        break;

      case PROVIDERS.HUGGINGFACE:
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        requestBody = {
          inputs: `${systemPrompt}\n\n${userPrompt}`,
          parameters: {
            max_new_tokens: 2000,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false
          }
        };
        break;

      case PROVIDERS.OPENROUTER:
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        headers['HTTP-Referer'] = process.env.VERCEL_URL || 'https://prompt-teams.com';
        headers['X-Title'] = 'Prompt Teams';
        requestBody = {
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        };
        break;

      default:
        throw new Error(`Unsupported provider: ${ACTIVE_PROVIDER}`);
    }

    console.log(`📡 Calling ${ACTIVE_PROVIDER} API...`);

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`API Error (${response.status}):`, errorData);
      throw new Error(`AI API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();

    // Extract response based on provider
    let content;
    switch (ACTIVE_PROVIDER) {
      case PROVIDERS.GROQ:
      case PROVIDERS.OPENROUTER:
        content = data.choices?.[0]?.message?.content;
        break;
      case PROVIDERS.HUGGINGFACE:
        content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
        break;
    }

    if (!content) {
      console.error('Invalid API response:', data);
      throw new Error('No content in AI response');
    }

    return content;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: AI service took too long to respond');
    }
    
    throw error;
  }
}

// Extract enhanced prompt and improvements from AI response
function extractEnhancedPrompt(response) {
  // Try to parse structured response
  const enhancedMatch = response.match(/ENHANCED PROMPT:\s*([\s\S]*?)(?=IMPROVEMENTS:|$)/i);
  const improvementsMatch = response.match(/IMPROVEMENTS:\s*([\s\S]*?)$/i);

  let enhanced = '';
  let improvements = [];

  if (enhancedMatch) {
    enhanced = enhancedMatch[1].trim();
  } else {
    // Fallback: Use first substantial paragraph
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 50);
    enhanced = paragraphs[0]?.trim() || response.trim();
  }

  if (improvementsMatch) {
    const improvementsText = improvementsMatch[1].trim();
    improvements = improvementsText
      .split('\n')
      .filter(line => line.trim().match(/^[-•*]\s+/))
      .map(line => line.replace(/^[-•*]\s+/, '').trim())
      .filter(Boolean);
  }

  // If no improvements found, extract from response
  if (improvements.length === 0) {
    improvements = [
      'Enhanced clarity and specificity',
      'Added structured format',
      'Improved instruction quality'
    ];
  }

  return {
    enhanced,
    improvements
  };
}
