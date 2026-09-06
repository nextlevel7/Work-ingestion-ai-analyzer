import { Injectable } from '@nestjs/common';
import { AiProvider } from '../ai.provider';
import { AiAnalysisResult } from '../ai.schema';
import { AiAnalysisInput } from '../ai.types';

@Injectable()
export class MockAiProvider implements AiProvider {
  async analyse(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const text = `${input.title} ${input.description}`.toLowerCase();
    const priority = this.getPriority(text);

    if (this.matches(text, ['urgent', 'escalate', 'complaint'])) {
      return {
        category: 'ESCALATION',
        priority: 'HIGH',
        summary: this.summarise(input.description),
        recommendedAction: 'Escalate the work item to a senior team member.',
      };
    }

    if (this.matches(text, ['compliance', 'fraud', 'risk', 'policy'])) {
      return {
        category: 'COMPLIANCE_REVIEW',
        priority: 'HIGH',
        summary: this.summarise(input.description),
        recommendedAction: 'Send the work item for compliance review.',
      };
    }

    if (this.matches(text, ['document', 'payslip', 'bank statement'])) {
      return {
        category: 'DOCUMENT_REQUEST',
        priority,
        summary: this.summarise(input.description),
        recommendedAction: 'Request the missing or corrected document.',
      };
    }

    if (this.matches(text, ['update', 'change', 'correct', 'address'])) {
      return {
        category: 'INFORMATION_UPDATE',
        priority,
        summary: this.summarise(input.description),
        recommendedAction:
          'Update the record after checking the supplied details.',
      };
    }

    if (this.matches(text, ['application', 'review', 'assess', 'process'])) {
      return {
        category: 'APPLICATION_REVIEW',
        priority,
        summary: this.summarise(input.description),
        recommendedAction: 'Review the application and decide the next action.',
      };
    }

    return {
      category: 'GENERAL_QUERY',
      priority,
      summary: this.summarise(input.description),
      recommendedAction: 'Review the work item and decide the next action.',
    };
  }

  private getPriority(text: string): AiAnalysisResult['priority'] {
    if (
      this.matches(text, [
        'urgent',
        'immediate',
        'settlement',
        'fraud',
        'compliance',
        'risk',
        'escalate',
      ])
    ) {
      return 'HIGH';
    }

    if (
      this.matches(text, ['missing', 'blocked', 'not provided', 'follow up'])
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private matches(text: string, words: string[]): boolean {
    return words.some((word) => text.includes(word));
  }

  private summarise(description: string): string {
    if (description.length <= 180) {
      return description;
    }

    return `${description.slice(0, 177)}...`;
  }
}
