'use server';
import { genkit } from 'genkit';
import { groq, llama4MScout17b } from 'genkitx-groq';

export const ai = genkit({
  plugins: [
    groq({ apiKey: process.env.GROQ_API_KEY }),
  ],
  model: llama4MScout17b,
});
