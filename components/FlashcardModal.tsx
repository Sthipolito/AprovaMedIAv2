import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QuizQuestion, FlashcardSession, QuestionDifficulty } from '../types';
import { XIcon, LightbulbIcon, InfoIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon, ArrowLeftIcon } from './IconComponents';
import * as flashcardService from '../services/flashcardService';
import * as crmService from '../services/crmService';
import * as geminiService from '../services/geminiService';

const StatPill: React.FC<{ icon: React.ElementType, value: number, label: string, color: string }> = ({ icon: Icon, value, label, color }) => (
    <div className={`flex items-center gap-2 p-2 rounded-full text-sm font-semibold ${color}`}>
        <Icon className="w-5 h-5" />
        <span>{value}</span>
        <span className="hidden sm:inline">{label}</span>
    </div>
);

const ActionButtonSpinner: React.FC = () => (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
);

interface FlashcardModalProps {
    studentId: string;
    questionSet: { id: string; subjectName: string; questions: QuizQuestion[] };
    onClose: () => void;
}

const FlashcardModal: React.FC<FlashcardModalProps> = ({ studentId, questionSet, onClose }) => {
    const [session, setSession] = useState<FlashcardSession | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewState, setViewState] = useState<'question' | 'result'>('question');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [hint, setHint] = useState({ text: '', isLoading: false, used: false });
    const [stats, setStats] = useState({ correct: 0, incorrect: 0, hints: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [difficultyRating, setDifficultyRating] = useState<QuestionDifficulty | null>(null);
    const [isRatingPopoverOpen, setIsRatingPopoverOpen] = useState(false);
    const [awaitingRatingForHint, setAwaitingRatingForHint] = useState(false);
    
    const isPersistent = useMemo(() => questionSet.id !== 'chat-session-set', [questionSet.id]);

    const questions = useMemo(() =>
        (questionSet.questions || []).filter(q => q && q.question && q.options?.length > 0)
    , [questionSet.questions]);
    
    const currentQuestion = questions[currentIndex];

    const isLastQuestion = currentIndex === questions.length - 1;
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

    useEffect(() => {
        if (questions.length === 0) {
            setError("Este conjunto de estudos não contém questões válidas.");
            setIsLoading(false);
            return;
        }

        if (!isPersistent) {
            setSession({
                id: 'transient-session',
                student_id: studentId,
                question_set_id: questionSet.id,
                current_question_index: 0,
                status: 'in_progress',
                correct_answers: 0,
                incorrect_answers: 0,
                hints_used: 0,
                created_at: new Date().toISOString(),
                completed_at: null,
            });
            setIsLoading(false);
            return;
        }

        const startSession = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const sessionData = await flashcardService.getOrCreateSession(studentId, questionSet.id);
                if (sessionData) {
                    if (sessionData.current_question_index === 0 && sessionData.correct_answers === 0 && sessionData.incorrect_answers === 0 && sessionData.hints_used === 0) {
                        crmService.logStudentActivity(studentId, 'flashcard_session_started', `Iniciou a sessão de flashcards: "${questionSet.subjectName}".`);
                    }

                    let newIndex = sessionData.current_question_index;
                    if (newIndex >= questions.length) {
                        newIndex = 0; 
                        await flashcardService.updateSessionProgress(sessionData.id, 0);
                    }
                    
                    const initialRating = await flashcardService.getQuestionDifficulty(studentId, questionSet.id, questions[newIndex].question);
                    setDifficultyRating(initialRating);

                    setSession(sessionData);
                    setCurrentIndex(newIndex);
                    setStats({
                        correct: sessionData.correct_answers || 0,
                        incorrect: sessionData.incorrect_answers || 0,
                        hints: sessionData.hints_used || 0,
                    });
                } else {
                    setError("Não foi possível iniciar a sessão de estudo.");
                }
            } catch (e: any) {
                setError(`Erro ao iniciar sessão: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        startSession();
    }, [studentId, questionSet.id, questionSet.subjectName, questions, isPersistent]);


    const handleSelectOption = (index: number) => {
        if (viewState === 'question') {
            setSelectedOption(index);
        }
    };
    
    const handleConfirm = async () => {
        if (viewState === 'result' || isSaving || !currentQuestion) return;
        const isReview = currentQuestion.correctAnswerIndex === null;
        if (!isReview && selectedOption === null) return;
        
        setIsSaving(true);
        if (session) {
             if (!isReview) {
                const wasCorrect = selectedOption === currentQuestion.correctAnswerIndex;
                const statToUpdate = wasCorrect ? 'correct' : 'incorrect';
    
                setStats(prev => ({ ...prev, [statToUpdate]: prev[statToUpdate] + 1 }));
                
                if (isPersistent) {
                    await flashcardService.incrementSessionStat(session.id, statToUpdate);
                    await crmService.logStudentActivity(
                        studentId,
                        wasCorrect ? 'flashcard_correct_answer' : 'flashcard_incorrect_answer',
                        `Respondeu à questão ${currentIndex + 1} (${wasCorrect ? 'correto' : 'incorreto'}) em "${questionSet.subjectName}".`
                    );
                    await flashcardService.saveFlashcardResponse({
                        session_id: session.id,
                        question_index: currentIndex,
                        was_correct: wasCorrect,
                        used_ai_hint: hint.used,
                    });
                }
            }
        }
        setViewState('result');
        setIsSaving(false);
    };

    const resetCardState = async (newIndex: number) => {
        const nextQuestion = questions[newIndex];
        if (isPersistent) {
            const nextRating = await flashcardService.getQuestionDifficulty(studentId, questionSet.id, nextQuestion.question);
            setDifficultyRating(nextRating);
        } else {
            setDifficultyRating(null);
        }
        
        setCurrentIndex(newIndex);
        setViewState('question');
        setSelectedOption(null);
        setHint({ text: '', isLoading: false, used: false });
        setIsRatingPopoverOpen(false);
        setAwaitingRatingForHint(false);
        setIsSaving(false);
    };

    const handleNext = async () => {
        if (!session || isSaving) return;

        setIsSaving(true);
        if (isLastQuestion) {
            if (isPersistent) {
                await flashcardService.completeSession(session.id);
                await crmService.logStudentActivity(studentId, 'flashcard_session_completed', `Concluiu a sessão de flashcards: "${questionSet.subjectName}".`);
            }
            setIsSaving(false);
            onClose();
        } else {
            const newIndex = currentIndex + 1;
            if (isPersistent) {
                await flashcardService.updateSessionProgress(session.id, newIndex);
            }
            await resetCardState(newIndex);
        }
    };

    const handleBack = async () => {
        if (!session || currentIndex <= 0 || isSaving) return;
        setIsSaving(true);
        const newIndex = currentIndex - 1;
        if (isPersistent) {
            await flashcardService.updateSessionProgress(session.id, newIndex);
        }
        await resetCardState(newIndex);
    };

    const handleRestart = async () => {
        if (!session || isSaving) return;
        
        if (isPersistent) {
            if (!window.confirm("Tem certeza que deseja reiniciar esta sessão? Todo o progresso será perdido.")) return;
            setIsSaving(true);
            try {
                const success = await flashcardService.restartSession(session.id);
                if (success) {
                    await crmService.logStudentActivity(studentId, 'flashcard_session_restarted', `Reiniciou a sessão de flashcards: "${questionSet.subjectName}".`);
                    setStats({ correct: 0, incorrect: 0, hints: 0 });
                    await resetCardState(0);
                } else {
                    alert("Falha ao reiniciar a sessão.");
                    setIsSaving(false);
                }
            } catch (e) {
                alert("Ocorreu um erro ao reiniciar a sessão.");
                setIsSaving(false);
            }
        } else {
            setStats({ correct: 0, incorrect: 0, hints: 0 });
            await resetCardState(0);
        }
    };

    const fetchHint = async () => {
        if (!currentQuestion || hint.isLoading || hint.used || viewState === 'result' || !session) return;
        setHint(prev => ({ ...prev, isLoading: true }));
        try {
            const hintText = await geminiService.getAIHint(currentQuestion.question, currentQuestion.options);
            setHint({ text: hintText, isLoading: false, used: true });
            
            if (!hint.used) {
                setStats(prev => ({ ...prev, hints: prev.hints + 1 }));
                if (isPersistent) {
                    await flashcardService.incrementSessionStat(session.id, 'hint');
                    await crmService.logStudentActivity(studentId, 'flashcard_hint_used', `Usou uma dica para a questão ${currentIndex + 1} em "${questionSet.subjectName}".`);
                }
            }
        } catch (e) {
            setHint({ text: "Não foi possível obter a dica.", isLoading: false, used: true });
        }
    };

    const handleGetHint = async () => {
        if (!isPersistent) {
            await fetchHint();
            return;
        }
        if (difficultyRating) {
            await fetchHint();
        } else {
            setAwaitingRatingForHint(true);
            setIsRatingPopoverOpen(true);
        }
    };
    
    const handleRateDifficulty = async (difficulty: QuestionDifficulty) => {
        if (!currentQuestion || !isPersistent) return;
        
        setIsRatingPopoverOpen(false);
        setDifficultyRating(difficulty);

        await flashcardService.saveQuestionDifficulty(
            studentId,
            questionSet.id,
            currentQuestion.question,
            difficulty
        );
        
        const difficultyMap = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
        await crmService.logStudentActivity(
            studentId,
            'flashcard_question_rated',
            `avaliou a dificuldade da questão em "${questionSet.subjectName}" como "${difficultyMap[difficulty]}".`,
            { questionText: currentQuestion.question, rating: difficulty }
        );

        if (awaitingRatingForHint) {
            setAwaitingRatingForHint(false);
            await fetchHint(); 
        }
    };


    const handleCloseModal = useCallback(() => {
        if (isSaving) return;
        onClose();
    }, [onClose, isSaving]);


    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    
    if (error || !currentQuestion) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-3">Ocorreu um Erro</h2>
                    <p className="text-gray-600 mb-6">{error || "A questão atual não pôde ser carregada."}</p>
                    <button onClick={handleCloseModal} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    const isReview = currentQuestion.correctAnswerIndex === null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[90vh] flex flex-col">
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-gray-800 truncate pr-4">{questionSet.subjectName}</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRestart}
                                disabled={isSaving}
                                className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors bg-white border"
                                aria-label="Reiniciar Sessão"
                            >
                                <RefreshCwIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-gray-200">
                                <XIcon className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow p-6 overflow-y-auto flex flex-col" style={{ perspective: '1000px' }}>
                     <div className={`relative w-full flex-grow transition-transform duration-700`} style={{ transformStyle: 'preserve-3d', transform: viewState === 'result' ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                        {/* Front of Card */}
                        <div className="absolute w-full h-full bg-white rounded-lg p-6 flex flex-col" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                            <p className="text-sm font-semibold text-gray-500 mb-2">Questão {currentIndex + 1} de {questions.length}</p>
                            <p className="text-lg font-semibold text-gray-800 mb-4 flex-shrink-0">{currentQuestion.question}</p>
                            
                            {currentQuestion.mediaUrl && (
                                <div className="my-4 flex justify-center">
                                    <img 
                                        src={currentQuestion.mediaUrl} 
                                        alt="Mídia da questão" 
                                        className="rounded-lg max-h-48 w-auto object-contain shadow-md"
                                    />
                                </div>
                            )}

                            <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                                {currentQuestion.options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelectOption(index)}
                                        className={`w-full text-left p-4 border rounded-lg transition-all text-gray-700 ${selectedOption === index ? 'bg-primary/20 border-primary shadow' : 'bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Back of Card */}
                        <div className="absolute w-full h-full bg-white rounded-lg p-6 flex flex-col overflow-y-auto" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                           {isReview ? (
                                <>
                                    <div className="p-3 mb-4 rounded-lg bg-blue-100 text-blue-800 font-semibold flex items-center gap-2">
                                        <InfoIcon className="w-5 h-5" /> Questão para Revisão
                                    </div>
                                </>
                           ) : (
                                selectedOption === currentQuestion.correctAnswerIndex ? (
                                    <div className="p-3 mb-4 rounded-lg bg-green-100 text-green-800 font-semibold flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5" /> Correto!
                                    </div>
                                ) : (
                                    <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-800">
                                        <p className="font-semibold flex items-center gap-2"><XCircleIcon className="w-5 h-5" /> Incorreto</p>
                                        <p className="text-sm mt-1">Sua resposta: "{currentQuestion.options[selectedOption ?? -1]}"</p>
                                    </div>
                                )
                           )}
                           <p className="font-bold text-gray-800 mb-2">Resposta Correta:</p>
                           <div className="p-3 mb-4 rounded-lg bg-green-100 border border-green-200 text-green-900">
                                {isReview ? "A resposta correta não foi fornecida." : currentQuestion.options[currentQuestion.correctAnswerIndex ?? -1]}
                           </div>
                           {currentQuestion.explanation && (
                                <>
                                    <p className="font-bold text-gray-800 mb-2">Explicação:</p>
                                    <p className="text-gray-600 whitespace-pre-wrap">{currentQuestion.explanation}</p>
                                </>
                           )}
                        </div>
                    </div>
                </main>

                {/* AI Hint */}
                {hint.used && (
                    <div className="p-4 mx-6 mb-2 border-t border-b bg-yellow-50 rounded-lg">
                        <p className="font-semibold text-yellow-800 flex items-center gap-2"><LightbulbIcon className="w-5 h-5" /> Dica da IA</p>
                        <p className="text-sm text-yellow-700 mt-1">{hint.text}</p>
                    </div>
                )}

                {/* Footer */}
                <footer className="p-4 bg-gray-50 rounded-b-2xl flex-shrink-0">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <StatPill icon={CheckCircleIcon} value={stats.correct} label="Acertos" color="bg-green-100 text-green-800" />
                            <StatPill icon={XCircleIcon} value={stats.incorrect} label="Erros" color="bg-red-100 text-red-800" />
                            <StatPill icon={LightbulbIcon} value={stats.hints} label="Dicas" color="bg-yellow-100 text-yellow-800" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBack}
                                disabled={currentIndex <= 0 || isSaving}
                                className="p-3 rounded-lg font-semibold transition-colors flex items-center gap-2 bg-white border shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Questão Anterior"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            
                            {isPersistent && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsRatingPopoverOpen(prev => !prev)}
                                        disabled={viewState === 'result'}
                                        className="px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 bg-white border shadow-sm hover:bg-gray-100 disabled:opacity-50 text-sm text-gray-700"
                                    >
                                        <span>
                                            {difficultyRating === 'easy' ? 'Avaliado: Fácil' :
                                            difficultyRating === 'medium' ? 'Avaliado: Médio' :
                                            difficultyRating === 'hard' ? 'Avaliado: Difícil' :
                                            'Avaliar Dificuldade'}
                                        </span>
                                    </button>
                                    {isRatingPopoverOpen && (
                                        <div className="absolute bottom-full mb-2 w-56 bg-white border rounded-lg shadow-lg p-2 space-y-2 z-10">
                                            {awaitingRatingForHint && <p className="text-xs text-center font-semibold text-gray-700 px-1 py-2">Avalie para ver a dica!</p>}
                                            <button onClick={() => handleRateDifficulty('hard')} className="w-full text-center p-2 rounded-md bg-red-500 text-white font-bold hover:bg-red-600">Difícil</button>
                                            <button onClick={() => handleRateDifficulty('medium')} className="w-full text-center p-2 rounded-md bg-orange-500 text-white font-bold hover:bg-orange-600">Médio</button>
                                            <button onClick={() => handleRateDifficulty('easy')} className="w-full text-center p-2 rounded-md bg-green-500 text-white font-bold hover:bg-green-600">Fácil</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleGetHint}
                                disabled={hint.isLoading || hint.used || viewState === 'result'}
                                className="p-3 rounded-lg font-semibold transition-colors flex items-center gap-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {hint.isLoading ? <ActionButtonSpinner /> : <LightbulbIcon className="w-5 h-5" />}
                                <span className="hidden sm:inline">Dica da IA</span>
                            </button>
                            {viewState === 'question' ? (
                                <button
                                    onClick={handleConfirm}
                                    disabled={isSaving || (!isReview && selectedOption === null)}
                                    className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:bg-gray-400"
                                >
                                    {isSaving ? <ActionButtonSpinner /> : (isReview ? 'Ver Resposta' : 'Confirmar')}
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2"
                                >
                                    {isSaving ? <ActionButtonSpinner /> : (isLastQuestion ? 'Finalizar Sessão' : 'Próxima Questão')}
                                </button>
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default FlashcardModal;