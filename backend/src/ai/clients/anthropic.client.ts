import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnthropicClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private readonly client: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Chat with Claude for RAG Q&A, savings advice, etc.
   * Ported from NAWWAR's anthropic_client.py chat
   */
  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    maxTokens = 4096,
    model = 'claude-sonnet-4-20250514',
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: systemPrompt,
        messages,
      });

      const result = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.type === 'text' ? block.text : '')
        .join('');

      await this.logUsage({
        modelName: model,
        taskType: 'chat',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - startTime,
        success: true,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Claude chat failed: ${errorMsg}`);
      throw error;
    }
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
    const costUsd = this.estimateCost(data.inputTokens, data.outputTokens);

    await this.prisma.aiLog.create({
      data: {
        modelName: data.modelName,
        provider: 'anthropic',
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

  private estimateCost(inputTokens: number, outputTokens: number): number {
    // Claude Sonnet pricing (approximate)
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
}
