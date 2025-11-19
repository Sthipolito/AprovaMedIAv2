import React, { useState, useEffect, useMemo, FC } from 'react';
import { Course, Module, Discipline, OfficialSummary, QuestionSet } from '../types';
import * as academicService from '../services/academicService';
import * as geminiService from '../services/geminiService';
import { FileTextIcon, ChevronRightIcon, XIcon, EditIcon, TrashIcon, SaveIcon, BrainCircuitIcon, PlusCircleIcon } from './IconComponents';

// --- Helper Components ---

// Renders a single hidden word for study mode
const HiddenWord: FC<{ word: string }> = ({ word }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    if (isRevealed) {
        return <strong className="text-primary animate-pulse">{word}</strong>;
    }
    return (
        <button
            onClick={() => setIsRevealed(true)}
            className="px-2 py-0.5 bg-gray-300 rounded-md text-gray-300 hover:bg-gray-400 hover:text-gray-400 transition-colors"
            style={{ minWidth: `${word.length * 0.5}rem` }}
        >
            {word}
        </button>
    );
};

// Renders the summary content, parsing markdown for bold and handling study mode
const SummaryContent: FC<{ content: string; isStudyMode: boolean }> = ({ content, isStudyMode }) => {
    const processContent = (text: string) => {
        if (isStudyMode) {
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const word = part.slice(2, -2);
                    return <HiddenWord key={index} word={word} />;
                }
                return <span key={index}>{part}</span>;
            });
        }
        // Simple markdown to HTML for bold and lists
        const htmlContent = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/<\/li>\n<li>/g, '</li><li>') // Join list items
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>'); // Wrap in ul

        return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    };

    return <div className="prose prose-lg max-w-none whitespace-pre-wrap">{processContent(content)}</div>;
};


// The modal for reading, studying, and editing a summary
const SummaryReaderModal: FC<{
    summary: OfficialSummary;
    onClose: () => void;
    onSave: (id: string, updates: { title: string; content: string }) => Promise<void>;
    onDelete: (id: string) => void;
    isEditable: boolean;
}> = ({ summary, onClose, onSave, onDelete, isEditable }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isStudyMode, setIsStudyMode] = useState(false);
    const [title, setTitle] = useState(summary.title);
    const [content, setContent] = useState(summary.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(summary.id, { title, content });
        setIsSaving(false);
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (window.confirm("Tem certeza que deseja excluir este resumo?")) {
            onDelete(summary.id);
            onClose();
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b bg-gray-50 flex-shrink-0 flex justify-between items-center">
                    {isEditing ? (
                        <input value={title} onChange={e => setTitle(e.target.value)} className="text-xl font-bold text-gray-800 bg-white border-b-2 border-primary focus:outline-none w-full mr-4"/>
                    ) : (
                        <h2 className="text-xl font-bold text-gray-800 truncate">{title}</h2>
                    )}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsStudyMode(!isStudyMode)} className={`px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${isStudyMode ? 'bg-primary/20 text-primary' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                           <BrainCircuitIcon className="w-4 h-4" /> Modo Estudo
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><XIcon className="w-5 h-5 text-gray-600" /></button>
                    </div>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                     {isEditing ? (
                        <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full h-full p-2 border rounded-md resize-none"/>
                    ) : (
                        <SummaryContent content={content} isStudyMode={isStudyMode} />
                    )}
                </main>
                 {isEditable && (
                    <footer className="p-3 bg-gray-100 border-t flex-shrink-0 flex justify-end items-center gap-3">
                        {isEditing ? (
                             <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg flex items-center gap-2 disabled:bg-gray-400">
                                <SaveIcon className="w-5 h-5" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        ) : (
                            <>
                                <button onClick={handleDelete} className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg flex items-center gap-2 hover:bg-red-200">
                                    <TrashIcon className="w-5 h-5" /> Excluir
                                </button>
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-300">
                                    <EditIcon className="w-5 h-5" /> Editar
                                </button>
                            </>
                        )}
                    </footer>
                )}
            </div>
        </div>
    );
};

// --- Create Summary Modal ---
interface CreateSummaryModalProps {
    onClose: () => void;
    onSave: (details: { disciplineId: string; title: string; content: string }) => Promise<void>;
    initialDisciplineId?: string | null;
    structure: Course[];
}
const CreateSummaryModal: FC<CreateSummaryModalProps> = ({ onClose, onSave, initialDisciplineId, structure }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const [contentSource, setContentSource] = useState<'manual' | 'ai'>('manual');
    const [selectedQuestionSetIds, setSelectedQuestionSetIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadInitial = async () => {
            const coursesData = await academicService.getCourses();
            setCourses(coursesData);
            if (initialDisciplineId) {
                for (const course of structure) {
                    for (const module of course.modules || []) {
                        if (module.disciplines?.some(d => d.id === initialDisciplineId)) {
                            setSelectedCourseId(course.id);
                            const modulesForCourse = await academicService.getModules(course.id);
                            setModules(modulesForCourse);
                            setSelectedModuleId(module.id);
                            const disciplinesForModule = await academicService.getDisciplines(module.id);
                            setDisciplines(disciplinesForModule);
                            setSelectedDisciplineId(initialDisciplineId);
                            return;
                        }
                    }
                }
            }
        };
        loadInitial();
    }, [initialDisciplineId, structure]);

    useEffect(() => {
        if (selectedCourseId) {
            academicService.getModules(selectedCourseId).then(setModules);
            setSelectedModuleId('');
            setDisciplines([]);
            setSelectedDisciplineId('');
        }
    }, [selectedCourseId]);

    useEffect(() => {
        if (selectedModuleId) {
            academicService.getDisciplines(selectedModuleId).then(setDisciplines);
            setSelectedDisciplineId('');
        }
    }, [selectedModuleId]);

    const questionSetsForDiscipline = useMemo(() => {
        if (!selectedDisciplineId) return [];
        for (const course of structure) {
            for (const module of course.modules || []) {
                const discipline = module.disciplines?.find(d => d.id === selectedDisciplineId);
                if (discipline) {
                    return discipline.question_sets || [];
                }
            }
        }
        return [];
    }, [selectedDisciplineId, structure]);

    const handleToggleQuestionSet = (id: string) => {
        setSelectedQuestionSetIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSaveClick = async () => {
        setError('');
        if (!title.trim() || !selectedDisciplineId) {
            setError('Título e disciplina são obrigatórios.');
            return;
        }

        setIsSaving(true);
        let finalContent = content;

        try {
            if (contentSource === 'ai') {
                if (selectedQuestionSetIds.size === 0) {
                    throw new Error('Por favor, selecione ao menos um assunto para gerar o resumo.');
                }
                
                const selectedSets = questionSetsForDiscipline.filter(qs => selectedQuestionSetIds.has(qs.id));
                const allQuestions = selectedSets.flatMap(qs => qs.questions);

                if (allQuestions.length === 0) {
                    throw new Error('Os assuntos selecionados não contêm questões.');
                }

                const context = allQuestions.map((q, i) =>
                    `Questão ${i + 1}: ${q.question}\n` +
                    q.options.map((opt, oi) => `  Opção ${String.fromCharCode(65 + oi)}: ${opt}`).join('\n') +
                    `\nResposta Correta: ${q.correctAnswerIndex !== null ? q.options[q.correctAnswerIndex] : 'N/A'}` +
                    (q.explanation ? `\nExplicação: ${q.explanation}\n` : '\n')
                ).join('\n---\n');
                
                finalContent = await geminiService.generateSummaryFromQuestions(context);
            
            } else { // manual
                if (!content.trim()) {
                    throw new Error('O conteúdo do resumo não pode estar vazio.');
                }
            }

            await onSave({ disciplineId: selectedDisciplineId, title: title.trim(), content: finalContent });
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const renderSelect = (id: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {id: string, name: string}[], placeholder: string) => (
        <select id={id} value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md bg-white">
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Criar Novo Resumo</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XIcon className="w-5 h-5"/></button>
                </header>
                <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a:</label>
                        <div className="space-y-2 p-2 bg-gray-50 border rounded-md">
                            {renderSelect("course-select", selectedCourseId, e => setSelectedCourseId(e.target.value), courses, "Selecione um curso")}
                            {renderSelect("module-select", selectedModuleId, e => setSelectedModuleId(e.target.value), modules, "Selecione um módulo")}
                            {renderSelect("discipline-select", selectedDisciplineId, e => setSelectedDisciplineId(e.target.value), disciplines, "Selecione uma disciplina")}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Título do Resumo</label>
                        <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fonte do Conteúdo</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="contentSource" value="manual" checked={contentSource === 'manual'} onChange={() => setContentSource('manual')} className="h-4 w-4 text-primary focus:ring-primary"/>
                                Manual
                            </label>
                            <label className={`flex items-center gap-2 ${!selectedDisciplineId ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
                                <input type="radio" name="contentSource" value="ai" checked={contentSource === 'ai'} onChange={() => setContentSource('ai')} disabled={!selectedDisciplineId} className="h-4 w-4 text-primary focus:ring-primary"/>
                                Gerar com IA a partir de Assuntos
                            </label>
                        </div>
                    </div>

                    {contentSource === 'manual' ? (
                        <div>
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={8} className="w-full p-2 border rounded-md"/>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione os Assuntos</label>
                            {questionSetsForDiscipline.length > 0 ? (
                                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-white">
                                    {questionSetsForDiscipline.map(qs => (
                                        <label key={qs.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestionSetIds.has(qs.id)}
                                                onChange={() => handleToggleQuestionSet(qs.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            {qs.subjectName} ({qs.questions.length} questões)
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic p-2">Esta disciplina não possui "Assuntos" (conjuntos de questões) para gerar um resumo.</p>
                            )}
                        </div>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </main>
                <footer className="p-4 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button onClick={handleSaveClick} disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:bg-gray-400 flex items-center gap-2">
                         {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SaveIcon className="w-5 h-5" />}
                        {isSaving ? 'Gerando e Salvando...' : 'Salvar Resumo'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const OfficialSummariesPage: React.FC = () => {
    const [structure, setStructure] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
    const [viewingSummary, setViewingSummary] = useState<OfficialSummary | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const loadData = async () => {
        setIsLoading(true);
        const data = await academicService.getSummariesStructure();
        setStructure(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateSummary = async (details: { disciplineId: string; title: string; content: string }) => {
        try {
            const success = await academicService.saveSummary(details.disciplineId, details.title, details.content);
            if (success) {
                alert('Resumo criado com sucesso!');
                setIsCreateModalOpen(false);
                await loadData();
            } else {
                throw new Error("A operação de salvar o resumo falhou no servidor.");
            }
        } catch (error) {
            alert(`Falha ao criar o resumo: ${(error as Error).message}`);
            console.error(error);
        }
    };

    const handleSave = async (id: string, updates: { title: string, content: string }) => {
        await academicService.updateSummary(id, updates);
        setViewingSummary(prev => prev ? { ...prev, ...updates } : null);
        await loadData();
    };

    const handleDelete = async (id: string) => {
        await academicService.deleteSummary(id);
        await loadData();
    };
    
    const toggleCourse = (id: string) => setExpandedCourses(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    const toggleModule = (id: string) => setExpandedModules(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

    return (
        <>
            <div className="h-full w-full flex bg-gray-50 overflow-hidden">
                {/* Left Navigation Panel */}
                <div className="w-80 h-full bg-white border-r flex flex-col">
                    <header className="p-4 border-b">
                        <h1 className="text-xl font-bold text-gray-800">Resumos Oficiais</h1>
                        <p className="text-sm text-gray-500">Navegue pela estrutura acadêmica.</p>
                    </header>
                    <nav className="flex-grow p-2 overflow-y-auto">
                        {isLoading ? <p className="p-4 text-gray-500">Carregando...</p> : (
                            <ul className="space-y-1">
                                {structure.map(course => (
                                    <li key={course.id}>
                                        <button onClick={() => toggleCourse(course.id)} className="w-full flex justify-between items-center text-left p-2 rounded-md hover:bg-gray-100 font-semibold">
                                            {course.name}
                                            <ChevronRightIcon className={`w-5 h-5 transition-transform ${expandedCourses.has(course.id) ? 'rotate-90' : ''}`} />
                                        </button>
                                        {expandedCourses.has(course.id) && (
                                            <ul className="pl-4 mt-1 space-y-1 border-l-2 ml-2">
                                                {course.modules?.map(module => (
                                                    <li key={module.id}>
                                                        <button onClick={() => toggleModule(module.id)} className="w-full flex justify-between items-center text-left p-2 rounded-md hover:bg-gray-100 font-medium text-sm">
                                                            {module.name}
                                                            <ChevronRightIcon className={`w-4 h-4 transition-transform ${expandedModules.has(module.id) ? 'rotate-90' : ''}`} />
                                                        </button>
                                                        {expandedModules.has(module.id) && (
                                                            <ul className="pl-4 mt-1 space-y-1 border-l-2 ml-2">
                                                                {module.disciplines?.map(discipline => (
                                                                    <li key={discipline.id}>
                                                                        <button onClick={() => setSelectedDiscipline(discipline)} className={`w-full text-left p-2 rounded-md text-sm ${selectedDiscipline?.id === discipline.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-gray-100'}`}>
                                                                            {discipline.name}
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </nav>
                </div>
                
                {/* Right Content Panel */}
                <main className="flex-1 flex flex-col overflow-y-auto">
                     <header className="p-6 bg-white border-b sticky top-0 flex justify-between items-center">
                         <div>
                            <h1 className="text-2xl font-bold text-gray-800">{selectedDiscipline ? selectedDiscipline.name : 'Selecione uma Disciplina'}</h1>
                            <p className="text-gray-500 mt-1">{selectedDiscipline ? 'Veja, edite ou crie novos resumos.' : 'Use o painel à esquerda para navegar.'}</p>
                         </div>
                         <div>
                             <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors">
                                <PlusCircleIcon className="w-5 h-5" />
                                Criar Resumo
                            </button>
                         </div>
                    </header>
                    <div className="p-6">
                        {selectedDiscipline ? (
                            (selectedDiscipline.official_summaries?.length || 0) > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedDiscipline.official_summaries?.map(summary => (
                                        <button key={summary.id} onClick={() => setViewingSummary(summary)} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md hover:border-primary transition-all text-left">
                                            <h3 className="font-bold text-gray-800">{summary.title}</h3>
                                            <p className="text-xs text-gray-500 mt-1">Criado em: {new Date(summary.created_at).toLocaleDateString()}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-500">
                                    <FileTextIcon className="w-12 h-12 mx-auto mb-2" />
                                    <p>Nenhum resumo encontrado para esta disciplina.</p>
                                </div>
                            )
                        ) : (
                             <div className="text-center py-20 text-gray-400">
                                <FileTextIcon className="w-16 h-16 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold">Bem-vindo aos Resumos Oficiais</h2>
                                <p>Selecione uma disciplina no painel à esquerda para começar.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {viewingSummary && (
                <SummaryReaderModal 
                    summary={viewingSummary} 
                    onClose={() => setViewingSummary(null)} 
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isEditable={true}
                />
            )}
            {isCreateModalOpen && (
                <CreateSummaryModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleCreateSummary}
                    initialDisciplineId={selectedDiscipline?.id}
                    structure={structure}
                />
            )}
        </>
    );
};

export default OfficialSummariesPage;