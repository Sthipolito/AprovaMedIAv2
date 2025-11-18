import React, { useState, useEffect } from 'react';
import * as questionBankService from '../services/questionBankService';
import * as testService from '../services/testService';
import * as academicService from '../services/academicService';
import { Course, Module, Discipline, QuestionSet, QuizQuestion, Student } from '../types';
import { BookOpenIcon, SearchIcon, ChevronRightIcon, UserIcon } from './IconComponents';
import ContentCarousel from './ContentCarousel';
import { QuestionSetDetailModal } from './QuestionSetDetailModal';
import EditContentModal from './EditContentModal';
import ContentDetailModal from './ContentDetailModal';
import FlashcardModal from './FlashcardModal';
import SelectStudentModal from './SelectStudentModal';
import MoveItemModal from './MoveItemModal';

type EditingItem = { item: any; type: 'course' | 'module' | 'discipline' | 'question_set' };
type DetailsItem = { level: 'course' | 'module' | 'discipline'; contentId: string; contentName: string; };

const QuestionBankManagementPage: React.FC = () => {
    const [structuredBank, setStructuredBank] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Navigation state
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);

    // Modal States
    const [viewingSet, setViewingSet] = useState<QuestionSet | null>(null);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [viewingDetails, setViewingDetails] = useState<DetailsItem | null>(null);
    const [movingItem, setMovingItem] = useState<QuestionSet | null>(null);

    // Study Flow States
    const [students, setStudents] = useState<Student[]>([]);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [setForStudy, setSetForStudy] = useState<QuestionSet | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        const [data, studentsData] = await Promise.all([
            questionBankService.getStructuredQuestionBank(),
            academicService.getAllStudentsWithDetails()
        ]);
        setStructuredBank(data);
        setStudents(studentsData);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Reset child selections when a parent is deselected
    useEffect(() => { setSelectedModule(null); setSelectedDiscipline(null); }, [selectedCourse]);
    useEffect(() => { setSelectedDiscipline(null); }, [selectedModule]);

    const handleCreateTest = async (testName: string, questions: QuizQuestion[]) => {
        if (testName && testName.trim() && questions.length > 0) {
            const context = {
                courseId: selectedCourse?.id || null,
                moduleId: selectedModule?.id || null,
                disciplineId: selectedDiscipline?.id || null,
            };
            const newTest = await testService.createTest(testName.trim(), questions, 'fixed', context);
            if (newTest) {
                alert(`Teste "${newTest.name}" criado com sucesso com ${questions.length} questões!`);
                return true;
            }
        }
        alert("Falha ao criar o teste.");
        return false;
    };
    
    const handleSaveEdit = async (updates: { name: string; image_url: string }) => {
        if (!editingItem) return;
        try {
            const { item, type } = editingItem;
            switch (type) {
                case 'course': await academicService.updateCourse(item.id, updates); break;
                case 'module': await academicService.updateModule(item.id, updates); break;
                case 'discipline': await academicService.updateDiscipline(item.id, updates); break;
                case 'question_set': await questionBankService.updateQuestionSetDetails(item.id, { subjectName: updates.name, imageUrl: updates.image_url }); break;
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
                case 'question_set': await questionBankService.deleteQuestionSet(id); break;
            }
            alert("Item excluído com sucesso.");
            setViewingSet(null); // Close modal if the item was deleted
            loadData();
        } catch (err: any) {
            const errorMessage = `Falha ao excluir: ${err.message}`;
            console.error(errorMessage, err);
            alert(errorMessage);
        }
    };
    
    const handleConfirmMove = async (itemId: string, newDisciplineId: string) => {
        const success = await questionBankService.moveQuestionSet(itemId, newDisciplineId);
        if (success) {
            alert("Assunto movido com sucesso!");
            setMovingItem(null);
            await loadData();
        } else {
            alert("Falha ao mover o assunto.");
        }
    };
    
    const handleViewDetails = (item: any, type: 'course' | 'module' | 'discipline') => {
        setViewingDetails({ level: type, contentId: item.id, contentName: item.name });
    };

    const handleUpdateSetQuestions = async (setId: string, questions: QuizQuestion[]): Promise<boolean> => {
        const success = await questionBankService.updateQuestionSetQuestions(setId, questions);
        if (success) {
            loadData();
        }
        return success;
    };
    
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    const handleStartStudy = (originalSet: QuestionSet, selectedQs: QuizQuestion[]) => {
        const studySet: QuestionSet = { ...originalSet, questions: selectedQs };
        if (selectedStudentId) {
            setSetForStudy(studySet);
        } else {
            setSetForStudy(studySet);
            setIsStudentModalOpen(true);
        }
    };
    
    const handleStudentSelected = (studentId: string) => {
        setSelectedStudentId(studentId);
        setIsStudentModalOpen(false);
    };

    const Breadcrumbs = () => (
        <nav className="flex items-center text-sm text-gray-500 mb-4 flex-wrap">
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

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
        }

        if (structuredBank.length === 0) {
             return (
                 <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full mb-4 inline-block shadow-md"><BookOpenIcon className="w-12 h-12 text-gray-400" /></div>
                    <h2 className="text-xl font-semibold text-gray-700">Seu Banco de Questões está vazio</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">Inicie uma "Nova Sessão de Estudo", envie um PDF e extraia questões para começar a montar seu banco.</p>
                </div>
            );
        }

        const lowercasedFilter = searchTerm.toLowerCase();

        if (selectedDiscipline) {
            const sets = (selectedDiscipline.question_sets || []).filter(set => set.subjectName.toLowerCase().includes(lowercasedFilter));
            return <ContentCarousel title="Assuntos" items={sets} type="question_set" onSelect={setViewingSet} onEdit={(item) => setEditingItem({item, type: 'question_set'})} onDelete={(id) => handleDelete(id, 'question_set')} onMove={setMovingItem} />;
        }
        if (selectedModule) {
            const disciplines = (selectedModule.disciplines || []).filter(d => d.name.toLowerCase().includes(lowercasedFilter));
            return <ContentCarousel title="Disciplinas" items={disciplines} type="discipline" onSelect={setSelectedDiscipline} onEdit={(item) => setEditingItem({item, type: 'discipline'})} onDelete={(id) => handleDelete(id, 'discipline')} onDetails={(item) => handleViewDetails(item, 'discipline')} />;
        }
        if (selectedCourse) {
            const modules = (selectedCourse.modules || []).filter(m => m.name.toLowerCase().includes(lowercasedFilter));
            return <ContentCarousel title="Módulos" items={modules} type="module" onSelect={setSelectedModule} onEdit={(item) => setEditingItem({item, type: 'module'})} onDelete={(id) => handleDelete(id, 'module')} onDetails={(item) => handleViewDetails(item, 'module')} />;
        }
        const courses = structuredBank.filter(c => c.name.toLowerCase().includes(lowercasedFilter));
        return <ContentCarousel title="Cursos" items={courses} type="course" onSelect={setSelectedCourse} onEdit={(item) => setEditingItem({item, type: 'course'})} onDelete={(id) => handleDelete(id, 'course')} onDetails={(item) => handleViewDetails(item, 'course')} />;
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Banco de Questões</h1>
                        <p className="text-gray-500 mt-1">Navegue, gerencie e estude com seus conjuntos de questões salvas.</p>
                    </div>
                    <div>
                        {selectedStudent ? (
                            <div className="text-right bg-primary/10 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">Estudando como:</p>
                                <p className="font-semibold text-primary flex items-center gap-2">
                                    <UserIcon className="w-4 h-4" />
                                    {selectedStudent.name}
                                </p>
                                <button onClick={() => setSelectedStudentId(null)} className="text-xs text-gray-500 hover:underline mt-1">
                                    Trocar aluno
                                </button>
                            </div>
                        ) : (
                             <button onClick={() => setIsStudentModalOpen(true)} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2">
                                <UserIcon className="w-5 h-5" />
                                Selecionar Aluno
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-4 sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 border-b">
                     <div className="relative w-full md:max-w-xs">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white text-gray-800 placeholder:text-gray-400" />
                    </div>
                </div>
                <main className="flex-grow p-6">
                    <Breadcrumbs />
                    {renderContent()}
                </main>
            </div>
            
            {viewingSet && (
                <QuestionSetDetailModal 
                    questionSet={viewingSet}
                    onClose={() => setViewingSet(null)}
                    onDelete={(id) => handleDelete(id, 'question_set')}
                    onStudy={handleStartStudy}
                    onCreateTest={handleCreateTest}
                    onUpdate={handleUpdateSetQuestions}
                    onMoveRequest={(item) => setMovingItem(item)}
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
             {movingItem && (
                <MoveItemModal
                    itemToMove={movingItem}
                    structuredData={structuredBank}
                    onClose={() => setMovingItem(null)}
                    onConfirmMove={handleConfirmMove}
                />
            )}
            {isStudentModalOpen && (
                <SelectStudentModal 
                    onClose={() => {
                        setIsStudentModalOpen(false);
                        setSetForStudy(null); // Clear pending study set if student selection is cancelled
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
        </>
    );
};

export default QuestionBankManagementPage;
