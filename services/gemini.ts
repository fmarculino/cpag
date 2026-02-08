
import { GoogleGenAI } from "@google/genai";
import { Account } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  async getInsights(accounts: Account[]) {
    if (accounts.length === 0) return "Nenhum dado disponível para análise.";

    const summary = accounts.map(a => 
      `Fornecedor: ${a.fornecedor}, Valor: R$${a.valor}, Vencimento: ${a.vencimento}, Status: ${a.status}`
    ).join('\n');

    const prompt = `Analise os seguintes dados financeiros de contas a pagar e forneça 3 insights rápidos e acionáveis em português sobre economia ou fluxo de caixa:\n\n${summary}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Você é um consultor financeiro sênior especializado em PMEs. Seja conciso e direto.",
        }
      });
      return response.text || "Não foi possível gerar insights no momento.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Erro ao conectar com a inteligência artificial.";
    }
  }
};
