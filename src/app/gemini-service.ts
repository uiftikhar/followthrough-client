import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Gemini from 'gemini';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly gemini: Gemini;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Please set GEMINI_API_KEY environment variable.',
      );
    }

    this.gemini = new Gemini({
      apiKey,
    });

    this.logger.log('Gemini service initialized');
  }

  async generateChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'json' | 'text';
    } = {},
  ): Promise<string> {
    const {
      model = this.configService.get<string>('gemini.model', 'gpt-4'),
      temperature = this.configService.get<number>('gemini.temperature', 0.2),
      maxTokens = 1000,
      responseFormat = 'text',
    } = options;

    try {
      const completion = await this.gemini.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(responseFormat === 'json' && {
          response_format: { type: 'json_object' },
        }),
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in Gemini response');
      }

      return content;
    } catch (error) {
      this.logger.error(`Gemini API error: ${error.message}`, error.stack);
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }

  async classifyEmail(
    emailContent: string,
    context?: string,
  ): Promise<{
    category: string;
    priority: string;
    confidence: number;
    reasoning: string;
    requiresReply: boolean;
    isAutomated: boolean;
    businessContext: string;
  }> {
    const systemPrompt = `You are an AI assistant specialized in email classification. Analyze emails and classify them accurately based on content, sender, and context.

Categories: customer_inquiry, internal, marketing, support, urgent, spam, newsletter, other
Priorities: urgent, high, normal, low
Business Context: sales, support, hr, engineering, marketing, general

Always respond in valid JSON format.`;

    const contextPrompt = context
      ? `\n\nRELEVANT CONTEXT FROM SIMILAR EMAILS:\n${context}\n\nUse this context to inform your classification.`
      : '';

    const userPrompt = `${contextPrompt}

Classify this email:
${emailContent}

Respond in JSON format:
{
  "category": "category_name",
  "priority": "priority_level",
  "confidence": 0.85,
  "reasoning": "explanation of classification",
  "requiresReply": true,
  "isAutomated": false,
  "businessContext": "context_area"
}`;

    const response = await this.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        responseFormat: 'json',
        maxTokens: 500,
      },
    );

    try {
      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Failed to parse classification JSON: ${error.message}`);
      throw new Error('Invalid classification response format');
    }
  }

  async summarizeEmail(
    emailContent: string,
    context?: string,
  ): Promise<{
    problem: string;
    context: string;
    ask: string;
    summary: string;
    keyEntities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  }> {
    const systemPrompt = `You are an AI assistant specialized in email summarization. Extract key information and provide structured summaries.

Focus on:
1. The main problem or issue
2. Background context
3. Specific requests or asks
4. Key entities (people, companies, products, dates, amounts)

Always respond in valid JSON format.`;

    const contextPrompt = context
      ? `\n\nRELEVANT CONTEXT FROM SIMILAR EMAILS:\n${context}\n\nUse this context to enhance your summary.`
      : '';

    const userPrompt = `${contextPrompt}

Summarize this email:
${emailContent}

Respond in JSON format:
{
  "problem": "main issue or topic",
  "context": "background information",
  "ask": "what they want or need",
  "summary": "one-sentence overall summary",
  "keyEntities": [
    {
      "type": "person|company|product|date|amount",
      "value": "entity value",
      "confidence": 0.9
    }
  ]
}`;

    const response = await this.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        responseFormat: 'json',
        maxTokens: 600,
      },
    );

    try {
      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Failed to parse summary JSON: ${error.message}`);
      throw new Error('Invalid summary response format');
    }
  }

  async generateReplyDraft(
    emailContent: string,
    classification: any,
    context?: string,
  ): Promise<{
    content: string;
    tone: string;
    suggestedResponseTime: string;
    confidence: number;
  }> {
    const systemPrompt = `You are an AI assistant specialized in generating professional email reply drafts. Create helpful, contextually appropriate responses.

Match the tone and urgency of the original email while maintaining professionalism.`;

    const contextPrompt = context
      ? `\n\nRELEVANT CONTEXT FROM SIMILAR EMAILS:\n${context}\n\nUse this context to inform your reply style.`
      : '';

    const userPrompt = `${contextPrompt}

Generate a reply draft for this email:
${emailContent}

Classification: ${JSON.stringify(classification)}

Respond in JSON format:
{
  "content": "professional reply draft",
  "tone": "formal|casual|urgent|friendly|concerned",
  "suggestedResponseTime": "immediate|within_hour|within_day|within_week",
  "confidence": 0.8
}`;

    const response = await this.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        responseFormat: 'json',
        maxTokens: 800,
      },
    );

    try {
      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Failed to parse reply draft JSON: ${error.message}`);
      throw new Error('Invalid reply draft response format');
    }
  }
}
