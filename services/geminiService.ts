import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, TrueFlashcard } from '../types';

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

export const generateSummary = async (pdfText: string): Promise<string> => {
    try {
        const prompt = `Crie um resumo conciso e informativo do seguinte documento. O resumo deve ser bem estruturado, usando cabeçalhos, listas e negrito para destacar os pontos-chave. O público-alvo são estudantes de medicina, então mantenha a terminologia técnica apropriada. O resumo deve ser útil para uma revisão rápida do material.

        CONTEÚDO DO DOCUMENTO:
        """
        ${pdfText.substring(0, 40000)} 
        """`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error: any) {
        console.error("Erro ao gerar resumo:", error.message || error);
        return "Desculpe, encontrei um erro ao tentar gerar o resumo.";
    }
};

export const generateSummaryFromQuestions = async (context: string): Promise<string> => {
    try {
        const prompt = `Com base no seguinte conjunto de perguntas, opções e explicações de um material de estudo, gere um resumo didático e bem estruturado. O resumo deve conectar os conceitos apresentados nas questões, explicando os tópicos de forma coesa e clara. Use formatação como negrito (**palavra**) e listas com asteriscos (* item) para organizar a informação.

        MATERIAL DE ESTUDO (PERGUNTAS E RESPOSTAS):
        """
        ${context}
        """

        RESUMO GERADO:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error: any) {
        console.error("Erro ao gerar resumo a partir de questões:", error.message || error);
        return "Desculpe, encontrei um erro ao tentar gerar o resumo a partir das questões selecionadas.";
    }
};


const flashcardSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: "A pergunta concisa do flashcard." },
        answer: { type: Type.STRING, description: "A resposta direta e informativa para a pergunta." }
    },
    required: ['question', 'answer']
};


export const extractTrueFlashcards = async (pdfText: string): Promise<TrueFlashcard[]> => {
    try {
        const prompt = `Analise o texto a seguir, que é material de estudo de medicina. Extraia os conceitos, fatos e definições mais importantes e transforme-os em flashcards no formato de pergunta e resposta. As perguntas devem ser claras e as respostas devem ser concisas e diretas. Crie pelo menos 10 flashcards, se o material permitir.

        Exemplos de bons flashcards:
        - Pergunta: "Qual é a tríade de Beck?" Resposta: "Hipotensão, abafamento de bulhas e estase jugular."
        - Pergunta: "Qual é o agente etiológico mais comum da pneumonia adquirida na comunidade (PAC)?" Resposta: "Streptococcus pneumoniae."

        CONTEÚDO DO DOCUMENTO:
        """
        ${pdfText.substring(0, 30000)}
        """`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: flashcardSchema,
                },
            },
        });
        
        const jsonString = response.text;
        if (!jsonString) return [];
        
        return JSON.parse(jsonString) as TrueFlashcard[];

    } catch (error: any) {
        console.error("Erro ao extrair flashcards:", error.message || error);
        return [];
    }
};

const answerKeyUpdateSchema = {
    type: Type.OBJECT,
    properties: {
        questionIdentifier: {
            type: Type.STRING,
            description: "O número ou identificador da questão, exatamente como aparece no gabarito (ex: '22159.', '1')."
        },
        correctOptionLetter: {
            type: Type.STRING,
            description: "A letra da opção correta (ex: 'A', 'B', 'C', 'D', 'E')."
        }
    },
    required: ['questionIdentifier', 'correctOptionLetter']
};

export const processAnswerKey = async (answerKeyText: string): Promise<{ identifier: string; option: string }[] | null> => {
     try {
        const prompt = `Analise o texto do gabarito fornecido. Para cada questão, extraia o número/identificador da questão e a letra da alternativa correta. Ignore qualquer comentário ou explicação.

        Exemplo de Gabarito:
        "GABARITO: 1. A, 2. C, 3. D ... 22159. E"

        Retorne os dados no formato JSON especificado.

        TEXTO DO GABARITO:
        """
        ${answerKeyText}
        """`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: answerKeyUpdateSchema,
                },
            },
        });
        
        const jsonString = response.text;
        if (!jsonString) return null;

        const parsed = JSON.parse(jsonString);
        return parsed.map((item: any) => ({
            identifier: item.questionIdentifier.replace(/\.$/, '').trim(), // Remove trailing dots and trim
            option: item.correctOptionLetter.trim().toUpperCase()
        }));

     } catch (error) {
        console.error("Erro ao processar gabarito:", error);
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