import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StudentAvailableTest, QuizQuestion, StudentTestAttempt } from '../types';
import * as testService from '../services/testService';
import { XIcon, ClockIcon, ArrowLeftIcon, ChevronRightIcon, SendIcon, CheckCircleIcon, XCircleIcon } from './IconComponents';

interface TestSessionModalProps {
    studentId: string;
    test: StudentAvailableTest;
    onClose: () => void;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const TestSessionModal: React.FC<TestSessionModalProps> = ({ studentId, test, onClose }) => {
    const [currentAttempt, setCurrentAttempt] = useState<StudentTestAttempt | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: number]: number }>({});
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [view, setView] = useState<'loading' | 'taking_test' | 'submitting' | 'results'>('loading');

    // Timer setup
    useEffect(() => {
        let duration = test.duration_minutes ? test.duration_minutes * 60 : 3600; // Default to 1 hour
        if (test.test_type === 'scheduled' && test.assignments && test.assignments.length > 0) {
            const endTime = new Date(test.assignments[0].end_time).getTime();
            const now = new Date().getTime();
            duration = Math.max(0, Math.floor((endTime - now) / 1000));
        }
        setTimeRemaining(duration);
    }, [test]);
    
    // Start attempt on mount
    useEffect(() => {
        const startAttempt = async () => {
            const assignmentId = test.assignments?.[0]?.id;
            const attempt = await testService.startTestAttempt(studentId, test.id, assignmentId);
            if (attempt) {
                setCurrentAttempt(attempt);
                setView('taking_test');
            } else {
                alert("Não foi possível iniciar a tentativa de teste. Tente novamente.");
                onClose();
            }
        };
        startAttempt();
    }, [studentId, test.id, test.assignments, onClose]);

    // Countdown timer effect
    useEffect(() => {
        if (view === 'taking_test' && timeRemaining > 0) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (view === 'taking_test' && timeRemaining <= 0) {
            handleSubmit();
        }
    }, [view, timeRemaining]);

    const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Você tem certeza que quer sair? Seu progresso será perdido e a tentativa será marcada como abandonada.';
    }, []);

    // Handle leaving the page
    useEffect(() => {
        if (view === 'taking_test') {
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [view, handleBeforeUnload]);

    const handleCloseAttempt = async (isAbandoning = false) => {
        if (isAbandoning && currentAttempt) {
            await testService.abandonTestAttempt(currentAttempt.id);
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
        onClose();
    };

    const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
    };

    const handleSubmit = async () => {
        if (!currentAttempt) return;
        setView('submitting');
        const submittedAttempt = await testService.submitTestAttempt(currentAttempt.id, test.questions, answers);
        if (submittedAttempt) {
            setCurrentAttempt(submittedAttempt);
            setView('results');
        } else {
            alert("Falha ao enviar o teste.");
            setView('taking_test');
        }
    };
    
    if (view === 'loading') {
        return <div className="fixed inset-0 bg-white z-[90] flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-gray-600">Iniciando teste...</p></div>;
    }

    if (view === 'submitting') {
        return <div className="fixed inset-0 bg-white z-[90] flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-gray-600">Enviando e calculando nota...</p></div>;
    }
    
    const currentQuestion = test.questions[currentQuestionIndex];

    return (
        <div className="fixed inset-0 bg-white z-[90] flex flex-col">
             {/* Header */}
            <header className="p-3 border-b flex-shrink-0 flex justify-between items-center bg-gray-50">
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-gray-800 truncate">{test.name}</h1>
                    <p className="text-sm text-gray-500">{test.questions.length} questões</p>
                </div>
                <div className="flex items-center gap-4 mx-4">
                    <ClockIcon className="w-6 h-6 text-primary" />
                    <span className="text-xl font-bold font-mono text-primary">{formatTime(timeRemaining)}</span>
                </div>
                <div className="flex-1 flex justify-end">
                     <button onClick={() => {
                        if (view === 'taking_test') {
                            if (window.confirm("Tem certeza que quer sair? Sua tentativa será marcada como abandonada.")) {
                                handleCloseAttempt(true);
                            }
                        } else if (view === 'results') {
                            handleCloseAttempt(false);
                        }
                     }} className="p-2 rounded-full hover:bg-gray-200">
                        <XIcon className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
            </header>

            {view === 'taking_test' && (
                <div className="flex flex-grow overflow-hidden">
                    {/* Question Navigator */}
                    <nav className="w-48 border-r bg-gray-50 p-4 overflow-y-auto">
                        <h2 className="text-sm font-semibold mb-3">Questões</h2>
                        <div className="grid grid-cols-4 gap-2">
                            {test.questions.map((_, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => setCurrentQuestionIndex(index)}
                                    className={`w-10 h-10 rounded-lg font-semibold flex items-center justify-center border-2 transition-colors
                                        ${index === currentQuestionIndex ? 'bg-primary text-white border-primary-dark' : 
                                        (answers[index] !== undefined ? 'bg-blue-200 border-blue-400 text-blue-800' : 'bg-white hover:bg-gray-200 border-gray-300')}
                                    `}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col p-6 overflow-y-auto">
                        <div className="flex-grow">
                             <p className="text-sm font-semibold text-gray-500 mb-2">Questão {currentQuestionIndex + 1} de {test.questions.length}</p>
                             <p className="text-lg font-semibold text-gray-800 mb-6">{currentQuestion.question}</p>
                             <div className="space-y-3">
                                {currentQuestion.options.map((option, index) => (
                                    <label key={index} className={`w-full text-left p-4 border rounded-lg transition-all flex items-center gap-4 cursor-pointer ${answers[currentQuestionIndex] === index ? 'bg-primary/20 border-primary shadow' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                        <input type="radio" name={`q_${currentQuestionIndex}`} checked={answers[currentQuestionIndex] === index} onChange={() => handleAnswerSelect(currentQuestionIndex, index)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300"/>
                                        <span className="text-gray-700">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Footer Navigation */}
                        <footer className="mt-6 pt-4 border-t flex-shrink-0 flex justify-between items-center">
                            <button onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0} className="px-4 py-2 flex items-center gap-2 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50">
                                <ArrowLeftIcon className="w-5 h-5"/> Anterior
                            </button>
                             {currentQuestionIndex === test.questions.length - 1 ? (
                                <button onClick={handleSubmit} className="px-6 py-2 flex items-center gap-2 font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600">
                                    Finalizar e Enviar <SendIcon className="w-5 h-5"/>
                                </button>
                            ) : (
                                <button onClick={() => setCurrentQuestionIndex(p => Math.min(test.questions.length - 1, p + 1))} className="px-4 py-2 flex items-center gap-2 font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark">
                                    Próxima <ChevronRightIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </footer>
                    </main>
                </div>
            )}
            
            {view === 'results' && currentAttempt && (
                <main className="flex-1 p-6 overflow-y-auto bg-gray-100">
                    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border">
                        <h2 className="text-3xl font-bold text-center mb-2">Resultados do Teste</h2>
                        <p className="text-center text-5xl font-bold mb-6" style={{ color: currentAttempt.score >= 70 ? '#16A34A' : '#DC2626' }}>{currentAttempt.score}%</p>
                        
                        <h3 className="text-xl font-bold mt-8 mb-4 border-t pt-6">Revisão das Questões</h3>
                        <div className="space-y-6">
                            {test.questions.map((q, index) => {
                                const studentAnswerIndex = (currentAttempt.answers as any)?.[index];
                                const isCorrect = studentAnswerIndex === q.correctAnswerIndex;
                                return (
                                    <div key={index} className="border-b pb-4">
                                        <div className="flex items-start gap-3">
                                            {isCorrect ? <CheckCircleIcon className="w-5 h-5 text-green-500 mt-1 flex-shrink-0"/> : <XCircleIcon className="w-5 h-5 text-red-500 mt-1 flex-shrink-0"/>}
                                            <p className="font-semibold text-gray-800">{index + 1}. {q.question}</p>
                                        </div>
                                        <div className="pl-8 mt-3 space-y-2 text-sm">
                                            <p>Sua resposta: <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{q.options[studentAnswerIndex] ?? 'Não respondida'}</span></p>
                                            {!isCorrect && <p>Resposta correta: <span className="font-semibold text-green-700">{q.options[q.correctAnswerIndex!]}</span></p>}
                                            {q.explanation && <p className="mt-2 pt-2 border-t text-xs text-gray-500 italic">Explicação: {q.explanation}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default TestSessionModal;