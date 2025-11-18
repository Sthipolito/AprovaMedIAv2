import React, { useState } from 'react';
import { ClipboardListIcon, UploadCloudIcon } from './IconComponents';
import { QuizQuestion } from '../types';
import { usePdfParser } from '../hooks/usePdfParser';
import * as geminiService from '../services/geminiService';

interface AnswerKeyProcessorTabProps {
    questions: QuizQuestion[] | null;
    onQuestionsUpdate: (updatedQuestions: QuizQuestion[]) => void;
}

const AnswerKeyProcessorTab: React.FC<AnswerKeyProcessorTabProps> = ({ questions, onQuestionsUpdate }) => {
    const { parsePdf, isLoading: isParsing, error: parseError } = usePdfParser();
    const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [report, setReport] = useState<{ updatedCount: number; message: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAnswerKeyFile(e.target.files[0]);
            setReport(null);
        }
    };

    const handleProcess = async () => {
        if (!answerKeyFile || !questions) return;

        setIsProcessing(true);
        setReport(null);

        const parsedResult = await parsePdf(answerKeyFile);
        if (!parsedResult || !parsedResult.text) {
            setReport({ updatedCount: 0, message: 'Falha ao ler o arquivo PDF do gabarito.' });
            setIsProcessing(false);
            return;
        }

        const answersFromAI = await geminiService.processAnswerKey(parsedResult.text);
        if (!answersFromAI) {
            setReport({ updatedCount: 0, message: 'A IA não conseguiu processar o gabarito. Verifique o formato do arquivo.' });
            setIsProcessing(false);
            return;
        }

        const updatedQuestions = [...questions];
        let updatedCount = 0;
        const letterToIndex: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };

        answersFromAI.forEach(answer => {
            // Try to find the question whose text starts with the identifier
            const questionIndex = updatedQuestions.findIndex(q => 
                q.question.trim().startsWith(answer.identifier)
            );

            if (questionIndex !== -1) {
                const newCorrectIndex = letterToIndex[answer.option];
                if (newCorrectIndex !== undefined && updatedQuestions[questionIndex].options.length > newCorrectIndex) {
                    updatedQuestions[questionIndex].correctAnswerIndex = newCorrectIndex;
                    updatedCount++;
                }
            }
        });

        onQuestionsUpdate(updatedQuestions);
        setReport({ updatedCount, message: `${updatedCount} de ${answersFromAI.length} respostas foram aplicadas com sucesso!` });
        setIsProcessing(false);
    };

    if (!questions) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <ClipboardListIcon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Processador de Gabaritos</h3>
                <p className="text-gray-600 max-w-sm">
                    Por favor, primeiro extraia as questões do material na aba "Questões de Estudo" para poder usar esta funcionalidade.
                </p>
            </div>
        );
    }
    
    const isLoading = isParsing || isProcessing;

    return (
        <div className="flex-grow flex flex-col p-6 text-center bg-gray-50">
            <div className="p-4 bg-primary/10 rounded-full mb-4 self-center">
                <ClipboardListIcon className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Processador de Gabaritos</h3>
            <p className="text-gray-600 max-w-sm mb-6 self-center">
                Envie o PDF do gabarito para atualizar automaticamente as respostas das {questions.length} questões extraídas.
            </p>

            <div className="w-full max-w-md mx-auto">
                <label className="relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100">
                    <UploadCloudIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-primary font-semibold">
                        {answerKeyFile ? answerKeyFile.name : 'Clique para enviar o PDF do gabarito'}
                    </span>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={isLoading} />
                </label>
                 {(parseError) && <p className="mt-2 text-sm text-red-500">{parseError}</p>}
            </div>

            <button
                onClick={handleProcess}
                disabled={!answerKeyFile || isLoading}
                className="mt-4 w-full max-w-md mx-auto px-4 py-3 bg-primary text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processando...</span>
                    </>
                ) : (
                    <span>Processar Gabarito</span>
                )}
            </button>
            
            {report && (
                <div className={`mt-6 p-4 rounded-lg text-center ${report.updatedCount > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    <p className="font-semibold">{report.message}</p>
                    <p className="text-sm">Você pode verificar as atualizações na aba "Questões de Estudo".</p>
                </div>
            )}
        </div>
    );
};

export default AnswerKeyProcessorTab;