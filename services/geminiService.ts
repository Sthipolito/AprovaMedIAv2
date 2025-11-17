import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const quizQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: "A pergunta." },
        options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Uma lista de opções de resposta."
        },
        correctAnswerIndex: { 
            type: Type.INTEGER, 
            description: "O índice baseado em 0 da resposta correta. OMITA este campo se a resposta correta não for explicitamente fornecida no texto." 
        },
        explanation: {
            type: Type.STRING,
            description: "Uma breve explicação para a resposta correta. Opcional."
        },
        mediaUrl: {
            type: Type.STRING,
            description: "Uma URL para uma imagem ou vídeo de acompanhamento, se disponível. Opcional."
        }
    },
    required: ['question', 'options']
};


export const answerQuestion = async (pdfText: string, userQuestion: string): Promise<string> => {
    try {
        const prompt = `Com base estritamente no conteúdo do documento a seguir, responda à pergunta do usuário. Se a informação não estiver no documento, afirme que não consegue encontrar a resposta no texto fornecido.
        
        CONTEÚDO DO DOCUMENTO:
        """
        ${pdfText}
        """

        PERGUNTA DO USUÁRIO: "${userQuestion}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error: any) {
        console.error("Erro ao responder pergunta:", error.message || error);
        return "Desculpe, encontrei um erro ao processar sua solicitação.";
    }
};

// Helper function to process a single chunk
const extractQuestionsFromChunk = async (chunkText: string): Promise<QuizQuestion[] | null> => {
    let jsonString = '';
    try {
        const prompt = `Analise o documento abaixo. Identifique e extraia todas as questões de múltipla escolha que encontrar. Para cada questão, extraia o texto da pergunta e todas as suas opções.
        - Se a resposta correta for claramente indicada no texto ou gabarito, inclua o campo 'correctAnswerIndex' com o índice da resposta correta (começando em 0).
        - Se a resposta correta NÃO for encontrada, OMITA o campo 'correctAnswerIndex' do objeto da questão.
        - Se nenhuma questão for encontrada, retorne um array vazio.

        CONTEÚDO DO DOCUMENTO:
        """
        ${chunkText}
        """`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: quizQuestionSchema,
                },
            },
        });

        jsonString = response.text;
        if (!jsonString) {
             console.error("Erro ao extrair questões de um chunk: A IA retornou uma resposta vazia.");
             return [];
        }

        const parsed = JSON.parse(jsonString);
        
        // Post-process to ensure correctAnswerIndex is number or null, and other fields exist
        const processedQuestions: QuizQuestion[] = parsed.map((q: any) => ({
            question: q.question || '',
            options: q.options || [],
            correctAnswerIndex: q.correctAnswerIndex === undefined ? null : q.correctAnswerIndex,
            explanation: q.explanation || '',
            mediaUrl: q.mediaUrl || undefined,
        }));

        return processedQuestions;

    } catch (error: any) {
        console.error("Erro ao extrair questões de um chunk:", error.message || error);
        if(jsonString) {
            const errorMsg = (error as Error).message;
            console.error(`Falha ao analisar o seguinte texto da IA do chunk: ${errorMsg}`);
            console.error("Texto da IA (primeiros 500 caracteres):", jsonString.substring(0, 500));
        }
        // Instead of returning null and failing the whole process, we return an empty array for the failed chunk
        // This makes the process more resilient.
        return [];
    }
};

export const extractQuestionsFromPdf = async (pdfText: string): Promise<QuizQuestion[] | null> => {
    // Large PDFs can cause the model's output to be truncated.
    // We process the text in chunks to avoid this.
    const CHUNK_SIZE = 20000;
    const CHUNK_OVERLAP = 1500;

    const chunks: string[] = [];
    if (pdfText.length < CHUNK_SIZE) {
        chunks.push(pdfText);
    } else {
        for (let i = 0; i < pdfText.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
            chunks.push(pdfText.substring(i, i + CHUNK_SIZE));
        }
    }
    
    if (chunks.length > 1) {
        alert(`Este é um documento grande. A extração de questões será feita em ${chunks.length} partes e pode levar alguns momentos. Por favor, aguarde.`);
    }

    try {
        const allQuestions: QuizQuestion[] = [];
        // Process chunks sequentially to avoid rate limits and for easier debugging.
        for (const chunk of chunks) {
            const result = await extractQuestionsFromChunk(chunk);
            if (result) {
                allQuestions.push(...result);
            } else {
                 // If a chunk fails, we log it but continue with the others.
                 console.error("Um chunk do documento não pôde ser processado. O resultado pode estar incompleto.");
            }
        }
        
        // Remove duplicate questions that might have been extracted from overlapping chunks
        const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.question, q])).values());
        
        return uniqueQuestions;

    } catch (error: any) {
        console.error("Erro ao processar chunks de PDF:", error.message || error);
        return null;
    }
};


export const generateQuiz = async (pdfText: string): Promise<QuizQuestion[] | null> => {
    let jsonString = '';
    try {
        const prompt = `Analise o documento abaixo e gere um quiz de múltipla escolha com 5 questões. Cada questão deve ter 4 opções de resposta.

        CONTEÚDO DO DOCUMENTO:
        """
        ${pdfText}
        """`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: quizQuestionSchema,
                },
            },
        });

        jsonString = response.text;
        if (!jsonString) {
             console.error("Erro ao gerar quiz: A IA retornou uma resposta vazia.");
             return null;
        }
        
        const parsed = JSON.parse(jsonString);
        return parsed as QuizQuestion[];

    } catch (error: any) {
        console.error("Erro ao gerar quiz:", error.message || error);
        if(jsonString) {
            console.error("Falha ao analisar o seguinte texto da IA:", jsonString);
        }
        return null;
    }
};

export const getAIHint = async (question: string, options: string[]): Promise<string> => {
    try {
        const prompt = `Para a seguinte questão de múltipla escolha, forneça uma dica sutil que guie o aluno para a resposta correta sem revelá-la diretamente. A dica deve ser concisa e focada no conceito chave.

        Questão: "${question}"
        Opções:
        ${options.map((opt, i) => `- ${String.fromCharCode(65 + i)}: ${opt}`).join('\n')}
        
        Dica:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error: any) {
        console.error("Erro ao gerar dica da IA:", error.message || error);
        return "Não foi possível gerar uma dica neste momento.";
    }
};