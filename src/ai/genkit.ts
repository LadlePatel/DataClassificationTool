'use server';
import { genkit } from 'genkit';
import openAI from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    openAI({
      // optional: you can pass your API key here, or use the environment variable
      // apiKey: process.env.OPENAI_API_KEY,
    }),
  ],
});
