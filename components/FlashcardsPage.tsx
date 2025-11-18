import React, { useState, useEffect } from 'react';
import { getStructuredQuestionBank } from '../services/questionBankService';
import * as academicService from '../services/academicService';
import * as crmService from '../services/crmService';
import { Course, QuestionSet, Student, Module, Discipline, StudentFlashcardSession } from '../types';
import { BookOpenIcon, UserIcon, ChevronRightIcon, LayersIcon } from './IconComponents';
import FlashcardModal from './FlashcardModal';
import SelectStudentModal from './SelectStudentModal';
import ContentCarousel from './ContentCarousel';
import EditContentModal from './EditContentModal';
import ContentDetailModal from './ContentDetailModal';

type EditingItem = { item: any; type: 'course' | 'module' | 'discipline' };
type DetailsItem = { level: 'course' | 'module' | 'discipline'; contentId: string; contentName: string; };

const FlashcardsPage: React.FC = () => {
    const [structuredBank, setStructuredBank] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [setForStudy, setSetForStudy] = useState<QuestionSet | null>(null);

    // Navigation state
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
    
    // Editing and Details state
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [viewingDetails, setViewingDetails] = useState<DetailsItem | null>(null);
    
    // New states for tabs and ongoing sessions
    const [activeTab, setActiveTab] = useState<'explore' | 'sessions'>('explore');
    const [inProgressSessions, setInProgressSessions] = useState<StudentFlashcardSession[]>([]);


    const loadData = async () => {
        setIsLoading(true);
        const [data, studentsData] = await Promise.all([
            getStructuredQuestionBank(),
            academicService.getAllStudentsWithDetails()
        ]);
        setStructuredBank(data);
        setStudents(studentsData);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);
    
    // Fetch in-progress sessions when a student is selected
    useEffect(() => {
        const fetchSessions = async () => {
            if (selectedStudentId) {
                // setIsLoading(true); // Can cause a flicker, let's manage loading more gracefully if needed
                const allSessions = await crmService.getStudentFlashcardSessions(selectedStudentId);
                const ongoing = allSessions.filter(s => s.status === 'in_progress' && s.question_sets && s.current_question_index < (s.question_sets.questions?.length || 0));
                setInProgressSessions(ongoing);
                if (ongoing.length > 0) {
                    setActiveTab('sessions');
                } else {
                    setActiveTab('explore');
                }
                // setIsLoading(false);
            } else {
                setInProgressSessions([]);
                setActiveTab('explore');
            }
        };
        fetchSessions();
    }, [selectedStudentId]);
    
    // Reset child selections when a parent is deselected
    useEffect(() => { setSelectedModule(null); setSelectedDiscipline(null); }, [selectedCourse]);
    useEffect(() => { setSelectedDiscipline(null); }, [selectedModule]);

    const handleSaveEdit = async (updates: { name: string; image_url: string }) => {
        if (!editingItem) return;
        try {
            const { item, type } = editingItem;
            switch (type) {
                case 'course': await academicService.updateCourse(item.id, updates); break;
                case 'module': await academicService.updateModule(item.id, updates); break;
                case 'discipline': await academicService.updateDiscipline(item.id, updates); break;
            }
            setEditingItem(null);
            loadData();
        } catch (err: any) {
            alert(`Falha ao salvar: ${err.message}`);
        }
    };

    const handleDelete = async (id: string, type: EditingItem['type']) => {
        if (!window.confirm("Tem certeza que deseja excluir este item? Esta ação é irreversível e pode excluir itens associados.")) {
            return;
        }
        try {
            switch (type) {
                case 'course': await academicService.deleteCourse(id); setSelectedCourse(null); break;
                case 'module': await academicService.deleteModule(id); setSelectedModule(null); break;
                case 'discipline': await academicService.deleteDiscipline(id); setSelectedDiscipline(null); break;
            }
            loadData();
        } catch (err: any) {
            alert(`Falha ao excluir: ${err.message}`);
        }
    };

    const handleViewDetails = (item: any, type: 'course' | 'module' | 'discipline') => {
        setViewingDetails({ level: type, contentId: item.id, contentName: item.name });
    };

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    const handleStartStudy = (set: QuestionSet) => {
        if (selectedStudentId) {
            setSetForStudy(set);
        } else {
            setSetForStudy(set); // Store the set and open student selector
            setIsStudentModalOpen(true);
        }
    };
    
    const handleContinueStudy = (session: StudentFlashcardSession) => {
        if (session.question_sets) {
            setSetForStudy({
                id: session.question_sets.id,
                subjectName: session.question_sets.subject_name,
                questions: session.question_sets.questions,
                disciplineId: 'unknown',
                createdAt: session.created_at,
            });
        }
    };
    
    const handleStudentSelected = (studentId: string) => {
        setSelectedStudentId(studentId);
        setIsStudentModalOpen(false);
    };
    
    const handleClearStudent = () => {
        setSelectedStudentId(null);
        setInProgressSessions([]);
        setActiveTab('explore');
    };

    const Breadcrumbs = () => (
        <nav className="flex items-center text-sm text-gray-500 mb-6 flex-wrap">
            <button onClick={() => setSelectedCourse(null)} className="hover:underline">Todos os Cursos</button>
            {selectedCourse && (
                <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <button onClick={() => setSelectedModule(null)} className="hover:underline font-medium text-gray-700 truncate">{selectedCourse.name}</button>
                </>
            )}
            {selectedModule && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <button onClick={() => setSelectedDiscipline(null)} className="hover:underline font-medium text-gray-700 truncate">{selectedModule.name}</button>
                </>
            )}
             {selectedDiscipline && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{selectedDiscipline.name}</span>
                </>
            )}
        </nav>
    );

    const renderExploreTab = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (structuredBank.length === 0) {
            return (
                <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full mb-4 inline-block shadow-md">
                        <BookOpenIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700">Nenhum Conteúdo Acadêmico Encontrado</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Vá para "Gestão Acadêmica" e "Banco de Questões" para criar seus materiais de estudo primeiro.
                    </p>
                </div>
            );
        }

        if (selectedDiscipline) {
            return <ContentCarousel title="Assuntos para Estudar" items={selectedDiscipline.question_sets || []} type="question_set" onSelect={handleStartStudy} />
        }
        if (selectedModule) {
            return <ContentCarousel title="Disciplinas" items={selectedModule.disciplines || []} type="discipline" onSelect={setSelectedDiscipline} onEdit={(item) => setEditingItem({ item, type: 'discipline' })} onDelete={(id) => handleDelete(id, 'discipline')} onDetails={(item) => handleViewDetails(item, 'discipline')} />
        }
        if (selectedCourse) {
            return <ContentCarousel title="Módulos" items={selectedCourse.modules || []} type="module" onSelect={setSelectedModule} onEdit={(item) => setEditingItem({ item, type: 'module' })} onDelete={(id) => handleDelete(id, 'module')} onDetails={(item) => handleViewDetails(item, 'module')} />
        }
        return <ContentCarousel title="Cursos" items={structuredBank} type="course" onSelect={setSelectedCourse} onEdit={(item) => setEditingItem({ item, type: 'course' })} onDelete={(id) => handleDelete(id, 'course')} onDetails={(item) => handleViewDetails(item, 'course')} />;
    };

    const renderSessionsTab = () => {
        if (!selectedStudentId) {
            return (
                <div className="text-center py-20">
                    <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Selecione um Aluno</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Para ver as sessões de estudo em andamento, primeiro escolha um aluno no seletor acima.
                    </p>
                </div>
            );
        }

        if (inProgressSessions.length === 0) {
             return (
                 <div className="text-center py-20">
                    <LayersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Nenhuma Sessão em Andamento</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Este aluno não tem sessões de estudo pendentes.
                    </p>
                </div>
            );
        }
        
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Sessões em Andamento de {selectedStudent?.name}</h2>
                {inProgressSessions.map(session => {
                    if (!session.question_sets) return null;
                    const totalQuestions = session.question_sets.questions.length;
                    const progressPercent = totalQuestions > 0 ? ((session.current_question_index) / totalQuestions) * 100 : 0;

                    return (
                        <div key={session.id} className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-grow">
                                <h3 className="font-bold text-gray-800">{session.question_sets.subject_name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Parou na questão {session.current_question_index + 1} de {totalQuestions}
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleContinueStudy(session)}
                                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors flex-shrink-0 w-full sm:w-auto"
                            >
                                Continuar de onde parei
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Estudar com Flashcards</h1>
                        <p className="text-gray-500 mt-1">Selecione um assunto de qualquer disciplina para iniciar uma sessão de estudo.</p>
                    </div>
                     <div>
                         {selectedStudent ? (
                            <div className="text-right bg-primary/10 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">Estudando como:</p>
                                <p className="font-semibold text-primary flex items-center gap-2">
                                    <UserIcon className="w-4 h-4" />
                                    {selectedStudent.name}
                                </p>
                                <button 
                                    onClick={handleClearStudent} 
                                    className="text-xs text-gray-500 hover:underline mt-1"
                                >
                                    Trocar aluno
                                </button>
                            </div>
                        ) : (
                             <button 
                                onClick={() => setIsStudentModalOpen(true)}
                                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                            >
                                <UserIcon className="w-5 h-5" />
                                Selecionar Aluno
                            </button>
                        )}
                    </div>
                </header>
                
                <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <nav className="flex space-x-2">
                        <button
                            onClick={() => setActiveTab('sessions')}
                            disabled={!selectedStudentId}
                            className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'sessions' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            Sessões em Andamento ({selectedStudentId ? inProgressSessions.length : 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('explore')}
                            className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'explore' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}
                        >
                            Explorar Conteúdo
                        </button>
                    </nav>
                     {!selectedStudentId && activeTab === 'sessions' && (
                        <p className="text-xs text-amber-700 mt-2">Selecione um aluno para ver suas sessões em andamento.</p>
                    )}
                </div>


                <main className="flex-grow p-6">
                    {activeTab === 'explore' && <Breadcrumbs />}
                    {activeTab === 'explore' ? renderExploreTab() : renderSessionsTab()}
                </main>
            </div>
            
             {isStudentModalOpen && (
                <SelectStudentModal 
                    onClose={() => {
                        setIsStudentModalOpen(false);
                        setSetForStudy(null);
                    }}
                    onStudentSelect={handleStudentSelected}
                />
            )}
            
            {setForStudy && selectedStudentId && (
                <FlashcardModal
                    studentId={selectedStudentId}
                    questionSet={setForStudy}
                    onClose={() => setSetForStudy(null)}
                />
            )}
            {editingItem && (
                <EditContentModal
                    item={editingItem.item}
                    type={editingItem.type}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveEdit}
                />
            )}
            {viewingDetails && (
                <ContentDetailModal
                    level={viewingDetails.level}
                    contentId={viewingDetails.contentId}
                    contentName={viewingDetails.contentName}
                    onClose={() => setViewingDetails(null)}
                />
            )}
        </>
    );
};

export default FlashcardsPage;