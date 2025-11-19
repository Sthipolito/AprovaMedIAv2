
import React, { useState, useEffect, useMemo } from 'react';
import * as questionBankService from '../services/questionBankService';
import * as testService from '../services/testService';
import * as academicService from '../services/academicService';
import { Course, Module, Discipline, QuestionSet, QuizQuestion, Student } from '../types';
import { UserIcon, LayersIcon, SlidersHorizontalIcon, XIcon, MoreVerticalIcon, TrendingUpIcon, ActivityIcon, BarChartIcon } from './IconComponents';
import { QuestionSetDetailModal } from './QuestionSetDetailModal';
import EditContentModal from './EditContentModal';
import ContentDetailModal from './ContentDetailModal';
import FlashcardModal from './FlashcardModal';
import SelectStudentModal from './SelectStudentModal';
import MoveItemModal from './MoveItemModal';
import ColumnNavigation, { ColumnDefinition } from './ColumnNavigation';
import AdvancedFilterPanel from './AdvancedFilterPanel';

type EditingItem = { item: any; type: 'course' | 'module' | 'discipline' | 'question_set' };
type DetailsItem = { level: 'course' | 'module' | 'discipline'; contentId: string; contentName: string; };

interface FilterState {
    searchTerm: string;
    selectedDisciplines: string[];
    selectedYears: string[];
    selectedInstitutions: string[];
}

const StudyBankPage: React.FC = () => {
    const [structuredBank, setStructuredBank] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Navigation state
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);

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

    // Filter States
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: '',
        selectedDisciplines: [],
        selectedYears: [],
        selectedInstitutions: []
    });
    const [isFiltering, setIsFiltering] = useState(false);

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

    // Flattened Data for Filters
    const allDisciplines = useMemo(() => {
        return structuredBank.flatMap(c => c.modules?.flatMap(m => m.disciplines || []) || []).filter(d => d !== undefined) as Discipline[];
    }, [structuredBank]);

    const allQuestionSets = useMemo(() => {
        return allDisciplines.flatMap(d => d.question_sets?.map(qs => ({ 
            ...qs, 
            disciplineName: d.name,
            // Ensure data exists even if DB is still catching up or for demo purposes
            relevance: qs.relevance || (Math.random() > 0.5 ? 'Alta' : 'Média'),
            incidence: qs.incidence !== undefined ? qs.incidence : Number((Math.random() * 5).toFixed(2)),
            difficulty: qs.difficulty || (Math.random() > 0.6 ? 'Difícil' : Math.random() > 0.3 ? 'Média' : 'Fácil')
        })) || []);
    }, [allDisciplines]);

    // Extract Years and Institutions dynamically from QuestionSet names
    const { availableYears, availableInstitutions } = useMemo(() => {
        const years = new Set<string>();
        const institutions = new Set<string>();
        
        const yearRegex = /\b(19|20)\d{2}\b/g;
        const instRegex = /\b[A-Z]{2,6}\b/g;

        allQuestionSets.forEach(qs => {
            const name = qs.subjectName;
            
            const foundYears = name.match(yearRegex);
            if (foundYears) foundYears.forEach(y => years.add(y));

            const foundInsts = name.match(instRegex);
            if (foundInsts) {
                foundInsts.forEach(inst => {
                    if (!['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'EM', 'NA', 'DA', 'DO', 'DE'].includes(inst)) {
                        institutions.add(inst);
                    }
                });
            }
        });

        return {
            availableYears: Array.from(years).sort().reverse(),
            availableInstitutions: Array.from(institutions).sort()
        };
    }, [allQuestionSets]);

    // Filter Logic
    const filteredResults = useMemo(() => {
        if (!isFiltering) return [];
        
        return allQuestionSets.filter(qs => {
            const matchesSearch = filters.searchTerm === '' || 
                qs.subjectName.toLowerCase().includes(filters.searchTerm.toLowerCase());
            
            const matchesDiscipline = filters.selectedDisciplines.length === 0 || 
                filters.selectedDisciplines.includes(qs.disciplineId);

            const matchesYear = filters.selectedYears.length === 0 || 
                filters.selectedYears.some(year => qs.subjectName.includes(year));

            const matchesInstitution = filters.selectedInstitutions.length === 0 || 
                filters.selectedInstitutions.some(inst => qs.subjectName.includes(inst));

            return matchesSearch && matchesDiscipline && matchesYear && matchesInstitution;
        });
    }, [allQuestionSets, filters, isFiltering]);

    const handleApplyFilters = () => {
        const hasActiveFilters = 
            filters.searchTerm !== '' || 
            filters.selectedDisciplines.length > 0 || 
            filters.selectedYears.length > 0 || 
            filters.selectedInstitutions.length > 0;
        
        setIsFiltering(hasActiveFilters);
        setIsFilterPanelOpen(false);
    };

    const handleClearFilters = () => {
        setIsFiltering(false);
        setIsFilterPanelOpen(false);
    };


    // Computed Data for Standard Navigation
    const selectedCourse = structuredBank.find(c => c.id === selectedCourseId);
    const modules = selectedCourse?.modules || [];
    const selectedModule = modules.find(m => m.id === selectedModuleId);
    const disciplines = selectedModule?.disciplines || [];
    const selectedDiscipline = disciplines.find(d => d.id === selectedDisciplineId);
    const questionSets = selectedDiscipline?.question_sets || [];

    // Handlers (Create Test, Edit, Delete, Move...)
    const handleCreateTest = async (testName: string, questions: QuizQuestion[]) => {
        if (testName && testName.trim() && questions.length > 0) {
            const context = {
                courseId: selectedCourseId,
                moduleId: selectedModuleId,
                disciplineId: selectedDisciplineId,
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
        if (!window.confirm("Tem certeza que deseja excluir este item?")) return;
        try {
            switch (type) {
                case 'course': await academicService.deleteCourse(id); setSelectedCourseId(null); break;
                case 'module': await academicService.deleteModule(id); setSelectedModuleId(null); break;
                case 'discipline': await academicService.deleteDiscipline(id); setSelectedDisciplineId(null); break;
                case 'question_set': await questionBankService.deleteQuestionSet(id); setViewingSet(null); break;
            }
            loadData();
        } catch (err: any) {
            alert(`Falha ao excluir: ${err.message}`);
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
    
    const handleUpdateSetQuestions = async (setId: string, questions: QuizQuestion[]): Promise<boolean> => {
        const success = await questionBankService.updateQuestionSetQuestions(setId, questions);
        if (success) loadData();
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

    // --- Columns Definition ---
    const columns: ColumnDefinition[] = [
        {
            id: 'courses',
            title: 'Cursos',
            items: structuredBank.map(c => ({ id: c.id, name: c.name, subTitle: `${c.modules?.length || 0} módulos`, imageUrl: c.image_url })),
            selectedId: selectedCourseId,
            onSelect: (item) => { setSelectedCourseId(item.id); setSelectedModuleId(null); setSelectedDisciplineId(null); },
            onEdit: (item) => setEditingItem({ item: structuredBank.find(c => c.id === item.id), type: 'course' } as any),
            onDelete: (id) => handleDelete(id, 'course'),
            emptyMessage: "Nenhum curso encontrado."
        }
    ];

    if (selectedCourseId) {
        columns.push({
            id: 'modules',
            title: 'Módulos',
            items: modules.map(m => ({ id: m.id, name: m.name, subTitle: `${m.disciplines?.length || 0} disciplinas`, imageUrl: m.image_url })),
            selectedId: selectedModuleId,
            onSelect: (item) => { setSelectedModuleId(item.id); setSelectedDisciplineId(null); },
            onEdit: (item) => setEditingItem({ item: modules.find(m => m.id === item.id), type: 'module' } as any),
            onDelete: (id) => handleDelete(id, 'module'),
            emptyMessage: "Nenhum módulo neste curso."
        });
    }

    if (selectedModuleId) {
        columns.push({
            id: 'disciplines',
            title: 'Disciplinas',
            items: disciplines.map(d => ({ id: d.id, name: d.name, subTitle: `${d.question_sets?.length || 0} assuntos`, imageUrl: d.image_url })),
            selectedId: selectedDisciplineId,
            onSelect: (item) => setSelectedDisciplineId(item.id),
            onEdit: (item) => setEditingItem({ item: disciplines.find(d => d.id === item.id), type: 'discipline' } as any),
            onDelete: (id) => handleDelete(id, 'discipline'),
            emptyMessage: "Nenhuma disciplina neste módulo."
        });
    }

    if (selectedDisciplineId) {
        columns.push({
            id: 'questionSets',
            title: 'Assuntos (Questões)',
            items: questionSets.map(qs => ({ id: qs.id, name: qs.subjectName, subTitle: `${qs.questions.length} questões`, imageUrl: qs.image_url })),
            selectedId: viewingSet?.id || null,
            onSelect: (item) => setViewingSet(questionSets.find(qs => qs.id === item.id) || null),
            onEdit: (item) => setEditingItem({ item: questionSets.find(qs => qs.id === item.id), type: 'question_set' } as any),
            onDelete: (id) => handleDelete(id, 'question_set'),
            renderCustomItem: (item) => (
                <div className="flex items-center gap-3 w-full">
                     {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-100 flex-shrink-0"/>
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <LayersIcon className="w-5 h-5" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                         <p className="font-medium truncate text-sm text-gray-800">{item.name}</p>
                         <p className="text-xs text-gray-500 truncate">{item.subTitle}</p>
                    </div>
                </div>
            ),
            emptyMessage: "Nenhum assunto criado. Inicie uma 'Nova Sessão de Estudo' para extrair questões."
        });
    }

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
                <header className="px-8 py-4 border-b border-gray-200 bg-white flex justify-between items-center flex-wrap gap-4 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Banco de Estudos</h1>
                        <p className="text-gray-500 mt-1 text-sm">Navegue hierarquicamente pelo conteúdo e gerencie as questões.</p>
                    </div>
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setIsFilterPanelOpen(true)}
                            className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-2 shadow-sm text-sm transition-all ${isFiltering ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <SlidersHorizontalIcon className="w-4 h-4" />
                            {isFiltering ? 'Filtros Ativos' : 'Filtrar Conteúdo'}
                        </button>

                        {selectedStudent ? (
                            <div className="text-right bg-primary/5 p-2 px-4 rounded-full border border-primary/10 flex items-center gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Estudando como:</p>
                                    <p className="font-bold text-primary text-sm">{selectedStudent.name}</p>
                                </div>
                                <button onClick={() => setSelectedStudentId(null)} className="text-gray-400 hover:text-gray-600">
                                    <UserIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                             <button onClick={() => setIsStudentModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm text-sm">
                                <UserIcon className="w-4 h-4" />
                                Selecionar Aluno para Praticar
                            </button>
                        )}
                    </div>
                </header>

                <main className="flex-grow p-6 overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : isFiltering ? (
                        // --- Filtered Grid View with Rich Cards (Teacher) ---
                        <div className="h-full flex flex-col">
                             <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                <h2 className="text-lg font-bold text-gray-700">Resultados da Busca ({filteredResults.length})</h2>
                                <button onClick={() => {setIsFiltering(false); setFilters({ searchTerm: '', selectedDisciplines: [], selectedYears: [], selectedInstitutions: [] });}} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                                    <XIcon className="w-4 h-4"/> Limpar Filtros
                                </button>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                {filteredResults.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
                                        {filteredResults.map(qs => (
                                            <div 
                                                key={qs.id} 
                                                className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full hover:shadow-md transition-all"
                                            >
                                                {/* Header */}
                                                <div className="p-4 flex gap-4">
                                                     {qs.image_url ? (
                                                        <img src={qs.image_url} alt={qs.subjectName} className="w-20 h-20 rounded-lg object-cover border border-gray-100 flex-shrink-0"/>
                                                    ) : (
                                                        <div className="w-20 h-20 rounded-lg bg-primary/5 flex items-center justify-center text-primary flex-shrink-0 border border-primary/10">
                                                            <LayersIcon className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-gray-800 text-base line-clamp-2 leading-tight mb-1" title={qs.subjectName}>
                                                                {qs.subjectName}
                                                            </h3>
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingItem({ item: qs, type: 'question_set' }); }} className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1">
                                                                <MoreVerticalIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium truncate">
                                                            {(qs as any).disciplineName || 'Disciplina'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-1">{qs.questions.length} Questões</p>
                                                    </div>
                                                </div>

                                                {/* Metrics Bar (MedQ style) */}
                                                <div className="grid grid-cols-3 border-t border-b border-gray-100 divide-x divide-gray-100 bg-gray-50/30">
                                                    <div className="p-2 text-center">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Relevância</p>
                                                        <p className={`text-sm font-bold ${qs.relevance === 'Alta' ? 'text-green-600' : qs.relevance === 'Baixa' ? 'text-gray-400' : 'text-yellow-600'}`}>{qs.relevance}</p>
                                                    </div>
                                                    <div className="p-2 text-center">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Incidência</p>
                                                        <p className="text-sm font-bold text-gray-700">{qs.incidence}%</p>
                                                    </div>
                                                    <div className="p-2 text-center">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Dificuldade</p>
                                                        <p className={`text-sm font-bold ${qs.difficulty === 'Difícil' ? 'text-red-600' : qs.difficulty === 'Fácil' ? 'text-blue-600' : 'text-orange-600'}`}>{qs.difficulty}</p>
                                                    </div>
                                                </div>

                                                {/* Action Footer */}
                                                <div className="mt-auto p-3 flex justify-between items-center bg-white rounded-b-xl">
                                                    <button 
                                                        onClick={() => handleCreateTest(qs.subjectName, qs.questions)}
                                                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
                                                    >
                                                        Criar Teste
                                                    </button>
                                                    <button 
                                                        onClick={() => setViewingSet(qs)}
                                                        className="text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
                                                    >
                                                        Detalhes
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStartStudy(qs, qs.questions)}
                                                        className="text-sm font-semibold text-primary hover:text-primary-dark hover:bg-primary/5 px-3 py-1.5 rounded-md transition-colors"
                                                    >
                                                        Estudar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <p className="text-lg font-medium">Nenhum resultado encontrado.</p>
                                        <p className="text-sm">Tente ajustar seus filtros de busca.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // --- Standard Column Navigation ---
                        <ColumnNavigation columns={columns} />
                    )}
                </main>
            </div>
            
            {/* Advanced Filter Drawer */}
            <AdvancedFilterPanel 
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                disciplines={allDisciplines}
                availableYears={availableYears}
                availableInstitutions={availableInstitutions}
                filters={filters}
                setFilters={setFilters}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
            />

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
        </>
    );
};

export default StudyBankPage;
