import React, { useState, useEffect, useMemo } from 'react';
import { QuestionSet, QuizQuestion } from '../types';
import { XIcon, LayersIcon, ClipboardListIcon, TrashIcon, SaveIcon, EditIcon, MoveIcon } from './IconComponents';
import EditQuestionModal from './EditQuestionModal';
import * as questionBankService from '../services/questionBankService';

interface QuestionSetDetailModalProps {
    questionSet: QuestionSet;
    onClose: () => void;
    onDelete: (setId: string) => void;
    onStudy: (questionSet: QuestionSet, questions: QuizQuestion[]) => void;
    onCreateTest: (name: string, questions: QuizQuestion[]) => Promise<boolean>;
    onUpdate: (setId: string, questions: QuizQuestion[]) => Promise<boolean>;
    onMoveRequest?: (item: QuestionSet) => void; // Added for moving
}

export const QuestionSetDetailModal: React.FC<QuestionSetDetailModalProps> = ({
    questionSet, onClose, onDelete, onStudy, onCreateTest, onUpdate, onMoveRequest
}) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [subjectName, setSubjectName] = useState(questionSet.subjectName);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<{ question: QuizQuestion; index: number } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    useEffect(() => {
        const initialQuestions = JSON.parse(JSON.stringify(questionSet.questions));
        setQuestions(initialQuestions);
        setSubjectName(questionSet.subjectName);
        setHasChanges(false);
        setSelectedIndices(new Set(initialQuestions.map((_: any, i: number) => i)));
    }, [questionSet]);
    
    const selectedQuestions = useMemo(() => {
        return Array.from(selectedIndices).map(index => questions[index]);
    }, [selectedIndices, questions]);

    const handleSelectionChange = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIndices(new Set(questions.map((_, i) => i)));
        } else {
            setSelectedIndices(new Set());
        }
    };
    
    const areAllSelected = questions.length > 0 && selectedIndices.size === questions.length;

    const handleCreateTestClick = () => {
        if (selectedQuestions.length === 0) {
            alert("Por favor, selecione ao menos uma questão para criar um teste.");
            return;
        }
        const testName = prompt(`Qual o nome do teste a ser criado com as ${selectedQuestions.length} questões selecionadas?`, subjectName);
        if (testName && testName.trim()) {
            onCreateTest(testName.trim(), selectedQuestions);
        }
    };
    
    const handleStudyClick = () => {
        if (selectedQuestions.length === 0) {
            alert("Por favor, selecione ao menos uma questão para estudar.");
            return;
        }
        onStudy(questionSet, selectedQuestions);
    };

    const handleSaveQuestion = (updatedQuestion: QuizQuestion) => {
        if (editingQuestion) {
            const newQuestions = [...questions];
            newQuestions[editingQuestion.index] = updatedQuestion;
            setQuestions(newQuestions);
            setHasChanges(true);
        }
    };
    
    const handleSaveChanges = async () => {
        setIsSaving(true);
        const nameChanged = subjectName !== questionSet.subjectName;
        const questionsChanged = JSON.stringify(questions) !== JSON.stringify(questionSet.questions);

        let success = true;
        if (nameChanged) {
            const updatedSet = await questionBankService.updateQuestionSetDetails(questionSet.id, { subjectName });
            success = !!updatedSet;
        }
        if (success && questionsChanged) {
            success = await onUpdate(questionSet.id, questions);
        }

        if (success) {
            setHasChanges(false);
            setIsEditingName(false);
        }
        setIsSaving(false);
    };

    const handleDeleteClick = () => {
        if (window.confirm(`Tem certeza que deseja excluir o conjunto "${subjectName}"?`)) {
            onDelete(questionSet.id);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isEditingName ? (
                                <input
                                    type="text"
                                    value={subjectName}
                                    onChange={(e) => { setSubjectName(e.target.value); setHasChanges(true); }}
                                    className="text-xl font-bold text-gray-800 bg-white border-b-2 border-primary focus:outline-none"
                                />
                            ) : (
                                <h2 className="text-xl font-bold text-gray-800 truncate">{subjectName}</h2>
                            )}
                             <button onClick={() => setIsEditingName(!isEditingName)} className="p-1 rounded-full hover:bg-gray-200">
                                <EditIcon className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex items-center">
                            {onMoveRequest && (
                                <button onClick={() => onMoveRequest(questionSet)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 flex items-center gap-1 text-sm font-semibold">
                                    <MoveIcon className="w-4 h-4" /> Mover
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 ml-2">
                                <XIcon className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                         <button onClick={handleStudyClick} disabled={selectedQuestions.length === 0} className="p-2 bg-amber-400 text-amber-900 rounded-lg font-semibold text-sm hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:text-white">
                            <LayersIcon className="w-5 h-5"/> Estudar ({selectedQuestions.length})
                        </button>
                        <button onClick={handleCreateTestClick} disabled={selectedQuestions.length === 0} className="p-2 bg-primary/20 text-primary rounded-lg font-semibold text-sm hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400">
                            <ClipboardListIcon className="w-5 h-5"/> Criar Teste ({selectedQuestions.length})
                        </button>
                        <button onClick={handleDeleteClick} className="p-2 bg-red-100 text-red-700 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                           <TrashIcon className="w-5 h-5"/> Deletar
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-grow p-6 overflow-y-auto space-y-4">
                     <div className="flex items-center gap-3 p-3 border-b sticky top-0 bg-white z-10 -mx-6 px-6">
                        <input 
                            type="checkbox"
                            id="select-all"
                            checked={areAllSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="select-all" className="font-semibold text-gray-600 cursor-pointer">Selecionar Todas</label>
                    </div>
                    {questions.map((q, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 group">
                            <div className="flex justify-between items-start">
                                 <div className="flex items-start gap-4 flex-grow">
                                    <input 
                                        type="checkbox"
                                        checked={selectedIndices.has(index)}
                                        onChange={() => handleSelectionChange(index)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 flex-shrink-0"
                                    />
                                    <p className="font-semibold mb-3 text-gray-700 flex-grow">{index + 1}. {q.question}</p>
                                </div>
                                <button
                                    onClick={() => setEditingQuestion({ question: q, index })}
                                    className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Editar
                                </button>
                            </div>
                            <ul className="space-y-2 pl-8">
                                {q.options.map((opt, i) => (
                                    <li key={i} className={`text-sm flex items-start gap-3 ${q.correctAnswerIndex === null ? 'text-gray-500' : i === q.correctAnswerIndex ? 'font-bold text-green-800' : 'text-gray-600'}`}>
                                        <span className="mt-0.5">{i === q.correctAnswerIndex ?
                                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                            : <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0"></div>
                                        }
                                        </span>
                                        <span>{opt}</span>
                                    </li>
                                ))}
                                {q.correctAnswerIndex === null && <p className="text-xs italic text-yellow-600 mt-2">Resposta correta não definida.</p>}
                            </ul>
                             {q.mediaUrl && (
                                <div className="mt-3 pl-8">
                                    <img src={q.mediaUrl} alt="Visual" className="w-24 h-16 object-cover rounded-md border" />
                                </div>
                             )}
                             {q.explanation && (
                                <div className="mt-3 pl-8 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">
                                    <strong>Explicação:</strong> {q.explanation}
                                </div>
                             )}
                        </div>
                    ))}
                </main>

                {hasChanges && (
                     <footer className="p-4 bg-yellow-100/50 border-t flex justify-end items-center gap-4">
                        <p className="text-sm font-semibold text-yellow-800">Você tem alterações não salvas.</p>
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:bg-gray-400"
                        >
                            <SaveIcon className="w-5 h-5" />
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </footer>
                )}
            </div>

            {editingQuestion && (
                <EditQuestionModal
                    question={editingQuestion.question}
                    onClose={() => setEditingQuestion(null)}
                    onSave={(updatedQuestion) => {
                        handleSaveQuestion(updatedQuestion);
                        setEditingQuestion(null);
                    }}
                />
            )}
        </>
    );
};