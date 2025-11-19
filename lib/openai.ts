import OpenAI from 'openai';

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// Initialize OpenAI client
// Note: In a production app, you should proxy requests through your backend
// to avoid exposing your API key in the binary. For this MVP/demo, we use the client directly.
export const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
});

export type PlanType = 'wedding' | 'fitness' | 'home' | 'general';

export interface PlanGenerationParams {
  type: PlanType;
  duration?: string;
  goals?: string[];
  constraints?: string[];
  context?: any; // Additional QA answers
}

export class OpenAIService {
  static async generatePlan(params: PlanGenerationParams) {
    const prompt = this.generatePlanPrompt(params);
    
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are an expert life planner AI. You create detailed, actionable plans for weddings, fitness, household management, and more. Output strictly JSON." },
          { role: "user", content: prompt }
        ],
        model: "gpt-4o",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No content in response");

      return JSON.parse(content);
    } catch (error) {
      console.error("Error generating plan:", error);
      throw error;
    }
  }

  private static generatePlanPrompt(params: PlanGenerationParams): string {
    return `Create a comprehensive ${params.type} plan based on the following context:
    ${JSON.stringify(params, null, 2)}
    
    The output must be a JSON object with the following structure:
    {
      "title": "Plan Title",
      "description": "Brief overview of the plan",
      "type": "${params.type}",
      "tasks": [
        {
          "title": "Task Title",
          "description": "Detailed instructions",
          "category": "Category (e.g., Venue, Workout, Chore)",
          "due_offset_days": 0, // Days from start date
          "priority": "high/medium/low"
        }
      ]
    }
    
    Be specific, culturally aware if context provided, and actionable.`;
  }
}

