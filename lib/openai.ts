import OpenAI from 'openai';

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

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
  context?: any;
}

export interface ChatResponse {
  message: string;
  options?: string[];
  ready_to_plan?: boolean;
}

export class OpenAIService {
  static async chat(history: { role: 'user' | 'assistant', content: string }[], planType: string, userContext?: { name?: string, currentDate?: string }): Promise<ChatResponse> {
     try {
       const contextInfo = userContext 
         ? `\nUser: ${userContext.name || 'User'}. Current Date: ${userContext.currentDate || new Date().toLocaleDateString()}.`
         : '';
       
       const completion = await openai.chat.completions.create({
         messages: [
           { role: "system", content: `You are an expert AI planner consultant for a ${planType} plan.${contextInfo}
             Your goal is to gather requirements to build a perfect plan. 
             Ask ONE clear question at a time. 
             Provide 2-4 short, actionable "options" for the user to choose from to answer your question.
             If you have enough information (at least 3-4 interactions), set "ready_to_plan" to true.
             Output strictly JSON: { "message": "question text", "options": ["opt1", "opt2"], "ready_to_plan": boolean }` 
           },
           ...history
         ],
         model: "gpt-4o",
         response_format: { type: "json_object" },
       });

       const content = completion.choices[0].message.content;
       if (!content) throw new Error("No content");
       return JSON.parse(content);
     } catch (error) {
       console.error("Chat error:", error);
       throw error;
     }
  }

  static async generatePlan(params: PlanGenerationParams) {
    const prompt = this.generatePlanPrompt(params);
    
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are an expert life planner AI. You create detailed, actionable plans. Output strictly JSON." },
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
