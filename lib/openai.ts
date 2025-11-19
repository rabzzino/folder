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
  location?: string;
  currentDate?: string;
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
    const schedulingGuidelines = this.getSchedulingGuidelines(params.type);
    const location = params.location || 'the user\'s area';
    const currentDate = params.currentDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    return `Create a comprehensive ${params.type} plan based on the following context:
    ${JSON.stringify(params, null, 2)}
    
    Current Date: ${currentDate}
    User Location: ${location}
    
    ${schedulingGuidelines}
    
    The output must be a JSON object with the following structure:
    {
      "title": "Plan Title",
      "description": "Brief overview of the plan",
      "type": "${params.type}",
      "tasks": [
        {
          "title": "Task Title",
          "description": "Concise, actionable description. Format:\n\nLOCAL (${location}):\n• Vendor 1 - Contact - Price\n• Vendor 2 - Contact - Price\n\nTEMPLATE:\n[One-line message with [PLACEHOLDERS]]\n\nSTEPS:\n1. Action\n2. Action\n3. Action",
          "category": "Category (e.g., Venue, Workout, Chore)",
          "due_offset_days": 0, // REQUIRED: Days from today (${currentDate})
          "priority": "high/medium/low"
        }
      ]
    }
    
    CRITICAL REQUIREMENTS:
    1. Every task MUST have due_offset_days - never leave it null or undefined
    2. Keep descriptions SHORT and PRECISE - maximum 10-12 lines total
    3. Provide 2-3 local options MAX (not more)
    4. ONE-LINE template message (not paragraphs)
    5. Maximum 3 action steps (not 4+)
    6. NO emojis except location marker if needed
    7. NO tips section unless absolutely critical
    8. Make every word count - be concise and actionable
    
    Format strictly as shown. Be brief, specific, and helpful.`;
  }

  private static getSchedulingGuidelines(planType: PlanType): string {
    const guidelines = {
      wedding: `WEDDING PLAN SCHEDULING:
- Spread tasks over 180-365 days
- Early tasks (0-30 days): Venue, save-the-dates, key vendors
- Mid timeline (60-120 days): Invitations, dress, catering details
- Late timeline (150-180 days): Final confirmations, rehearsal
- Last week (185+ days): Day-of logistics
Example offsets: [0, 7, 14, 30, 60, 90, 120, 150, 180]`,
      
      fitness: `FITNESS PLAN SCHEDULING:
- Distribute over 8-12 weeks (56-84 days)
- Weekly progression: 0, 7, 14, 21, 28, 35, 42, 49, 56
- Start with setup tasks (gym, equipment) at 0-1 days
- Regular workout milestones weekly
- Progress checks every 2 weeks
Example offsets: [0, 1, 7, 14, 21, 28, 35, 42, 49, 56]`,
      
      home: `HOME/CHORE PLAN SCHEDULING:
- Daily to weekly tasks: 0, 1, 2, 7, 14
- Setup/one-time tasks early (0-3 days)
- Recurring tasks spread across weeks
- Urgent repairs: 0-1 days
- Routine maintenance: 7, 14, 21 days
Example offsets: [0, 1, 3, 7, 10, 14, 21]`,
      
      general: `GENERAL PLAN SCHEDULING:
- Spread based on urgency and dependencies
- Urgent: 0-3 days
- Important: 7-14 days
- Can wait: 21-30 days
- Long-term: 60+ days
Example offsets: [0, 3, 7, 14, 21, 30]`
    };
    
    return guidelines[planType] || guidelines.general;
  }
}
