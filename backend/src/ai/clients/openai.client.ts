import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OpenAIClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private readonly client: OpenAI;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.client = new OpenAI({
      apiKey: apiKey || 'sk-placeholder-not-configured',
    });
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — AI features will be unavailable');
    }
  }

  /**
   * Extract bill data from an image using GPT-4o Vision.
   * Ported from NAWWAR's openai_client.py vision_extract
   */
  async visionExtract(
    imageBase64: string,
    prompt: string,
  ): Promise<string> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      });

      const result = response.choices[0]?.message?.content || '';

      await this.logUsage({
        modelName: 'gpt-4o',
        taskType: 'vision',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        latencyMs: Date.now() - startTime,
        success: true,
      });

      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Vision extraction failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Chat completion.
   */
  async chat(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model = 'gpt-4o',
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async logUsage(data: {
    modelName: string;
    taskType: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
  }) {
    const costUsd = this.estimateCost(data.inputTokens, data.outputTokens, data.modelName);

    await this.prisma.aiLog.create({
      data: {
        modelName: data.modelName,
        provider: 'openai',
        taskType: data.taskType,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        costUsd,
        latencyMs: data.latencyMs,
        success: data.success,
        errorMessage: data.errorMessage,
      },
    }).catch((err) => this.logger.warn(`Failed to log AI usage: ${err.message}`));
  }

  private estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    // GPT-4o pricing (approximate)
    if (model === 'gpt-4o') {
      return (inputTokens * 2.5 + outputTokens * 10) / 1_000_000;
    }
    return (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000;
  }
}
