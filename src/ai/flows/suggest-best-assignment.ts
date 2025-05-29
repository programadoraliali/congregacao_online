'use server';
/**
 * @fileOverview An AI agent that suggests the best member for a task based on availability and past assignments.
 *
 * - suggestBestAssignment - A function that suggests the best member for a given task.
 * - SuggestBestAssignmentInput - The input type for the suggestBestAssignment function.
 * - SuggestBestAssignmentOutput - The return type for the suggestBestAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBestAssignmentInputSchema = z.object({
  taskId: z.string().describe('The ID of the task to be assigned.'),
  taskName: z.string().describe('The name of the task to be assigned.'),
  date: z.string().describe('The date of the task in YYYY-MM-DD format.'),
  availableMemberIds: z.array(z.string()).describe('An array of member IDs who are available for the task.'),
  memberAssignmentHistory: z.record(z.string(), z.record(z.string(), z.string())).describe(
    'A record of member assignment history. The top-level keys are member IDs. The second-level keys are dates (YYYY-MM-DD). The values are task IDs.'
  ),
});
export type SuggestBestAssignmentInput = z.infer<typeof SuggestBestAssignmentInputSchema>;

const SuggestBestAssignmentOutputSchema = z.object({
  suggestedMemberId: z.string().describe('The ID of the suggested member for the task.'),
  reason: z.string().describe('The reasoning behind the suggestion.'),
});
export type SuggestBestAssignmentOutput = z.infer<typeof SuggestBestAssignmentOutputSchema>;

export async function suggestBestAssignment(input: SuggestBestAssignmentInput): Promise<SuggestBestAssignmentOutput> {
  return suggestBestAssignmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBestAssignmentPrompt',
  input: {schema: SuggestBestAssignmentInputSchema},
  output: {schema: SuggestBestAssignmentOutputSchema},
  prompt: `You are an assistant that suggests the best member for a task.

Given the following information, suggest the best member ID for the task and explain your reasoning.

Task ID: {{{taskId}}}
Task Name: {{{taskName}}}
Date: {{{date}}}
Available Member IDs: {{#each availableMemberIds}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Member Assignment History: {{JSON memberAssignmentHistory}}

Consider the availability of members and when they last performed the task.

Output the suggested member ID and the reasoning behind the suggestion.  The output should contain the suggestedMemberId and the reason.  Be concise.
`,
});

const suggestBestAssignmentFlow = ai.defineFlow(
  {
    name: 'suggestBestAssignmentFlow',
    inputSchema: SuggestBestAssignmentInputSchema,
    outputSchema: SuggestBestAssignmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
