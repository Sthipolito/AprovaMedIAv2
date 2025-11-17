import React, { useState, useEffect } from 'react';
import * as academicService from '../services/academicService';
import * as questionBankService from '../services/questionBankService';
import * as testService from '../services/testService';
import { Course, Module, Discipline, Class, Student, QuestionSet, QuizQuestion } from '../types';
import { ChevronRightIcon } from './IconComponents';
import ContentCarousel from './ContentCarousel';
import EditContentModal from './EditContentModal';
import ContentDetailModal from './ContentDetailModal';
import StudentProfile from './StudentProfile';
import MoveItemModal from './MoveItemModal';
import { QuestionSetDetailModal } from './QuestionSetDetailModal';

type ActiveTab = 'content' | 'students';
type ContentType = 'course' | 'module' | 'discipline' | 'class' | 'student' | 'question_set';
type EditingItem = { item: any; type: ContentType };

const AcademicManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('content');
    
    const [structuredData, setStructuredData] = useState<Course[]>([]);
    
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);

    const [newItemName, setNewItemName] = useState('');
    const [newItemImageUrl, setNewItemImageUrl] = useState('');
    // FIX: Add states for new student fields to resolve missing arguments error.
    const [newItemEmail, setNewItemEmail] = useState('');
    const [newItemPassword, setNewItemPassword] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [movingItem, setMovingItem] = useState<QuestionSet | null>(null);
    const [viewingDetails, setViewingDetails] = useState<{ level: 'course' | 'module' | 'discipline' | 'class'; contentId: string; contentName: string; } | null>(null);
    const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
    const [viewingSet, setViewingSet] = useState<QuestionSet | null>(null);


    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const data = await academicService.getStructuredDataForManagement();
            setStructuredData(data);
        } catch (err: any) {
            setError("Falha ao carregar dados da gestão acadêmica.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        setSelectedModule(null);
        setSelectedClass(null);
        setSelectedDiscipline(null); // Reset discipline when course changes
    }, [selectedCourse]);

    useEffect(() => {
        setSelectedDiscipline(null);
    }, [selectedModule]);

    const resetForm = () => {
        setNewItemName('');
        setNewItemImageUrl('');
        // FIX: Reset new student fields.
        setNewItemEmail('');
        setNewItemPassword('');
    };

    const handleAdd = async (type: ContentType) => {
        if (!newItemName.trim()) return;
        setError(null);
        try {
            switch (type) {
                case 'course':
                    await academicService.addCourse(newItemName, newItemImageUrl); break;
                case 'module':
                    if (selectedCourse) await academicService.addModule(selectedCourse.id, newItemName, newItemImageUrl); break;
                case 'discipline':
                     if (selectedModule) await academicService.addDiscipline(selectedModule.id, newItemName, newItemImageUrl); break;
                case 'class':
                    if (selectedCourse) await academicService.addClass(selectedCourse.id, newItemName, newItemImageUrl); break;
                // FIX: Update student creation call with all required arguments (email, password).
                case 'student':
                    if (selectedClass) await academicService.addStudent(selectedClass.id, newItemName, newItemEmail, newItemPassword, newItemImageUrl); break;
            }
            resetForm();
            await loadAllData();
        } catch (err: any) {
             setError(`Falha ao adicionar: ${err.message}`);
        }
    };

    const handleDelete = async (id: string, type: ContentType) => {
        if (!window.confirm("Tem certeza que deseja excluir este item? Esta ação é irreversível e excluirá todos os sub-itens associados.")) {
            return;
        }
        setError(null);
        try {
            switch (type) {
                case 'course': await academicService.deleteCourse(id); setSelectedCourse(null); break;
                case 'module': await academicService.deleteModule(id); setSelectedModule(null); break;
                case 'discipline': await academicService.deleteDiscipline(id); setSelectedDiscipline(null); break;
                case 'class': await academicService.deleteClass(id); setSelectedClass(null); break;
                case 'student': await academicService.deleteStudent(id); break;
                case 'question_set': await questionBankService.deleteQuestionSet(id); setViewingSet(null); break;
            }
            alert("Item excluído com sucesso.");
            await loadAllData();
        } catch (err: any) {
             const errorMessage = `Falha ao excluir: ${err.message}`;
             setError(errorMessage);
             alert(errorMessage);
        }
    };

    const handleDeleteStudentFromProfile = async (studentId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este aluno? Esta ação é irreversível e removerá completamente o aluno e sua conta de acesso.")) {
            return;
        }
        setError(null);
        try {
            await academicService.deleteStudent(studentId);
            alert("Aluno excluído com sucesso.");
            setSelectedStudentForProfile(null); // Close the modal
            await loadAllData(); // Refresh the data list
        } catch (err: any) {
             const errorMessage = `Falha ao excluir o aluno: ${err.message}`;
             setError(errorMessage);
             alert(errorMessage);
        }
    };

    const handleSaveEdit = async (updates: { name: string; image_url: string }) => {
        if (!editingItem) return;
        setError(null);
        try {
            const { item, type } = editingItem;
            switch (type) {
                case 'course': await academicService.updateCourse(item.id, updates); break;
                case 'module': await academicService.updateModule(item.id, updates); break;
                case 'discipline': await academicService.updateDiscipline(item.id, updates); break;
                case 'class': await academicService.updateClass(item.id, updates); break;
                // FIX: Construct a complete student update object with required fields (class_id, email) to match service signature.
                case 'student':
                    const studentUpdates = {
                        ...updates,
                        class_id: item.classId,
                        email: item.email,
                    };
                    await academicService.updateStudent(item.id, studentUpdates);
                    break;
                case 'question_set': await questionBankService.updateQuestionSetDetails(item.id, { subjectName: updates.name, imageUrl: updates.image_url }); break;
            }
            setEditingItem(null);
            await loadAllData();
        } catch (err: any) {
            setError(`Falha ao salvar: ${err.message}`);
        }
    };

    const handleConfirmMove = async (itemId: string, newDisciplineId: string) => {
        const success = await questionBankService.moveQuestionSet(itemId, newDisciplineId);
        if (success) {
            alert("Assunto movido com sucesso!");
            setMovingItem(null);
            await loadAllData();
        } else {
            alert("Falha ao mover o assunto.");
        }
    };
    
     const handleViewDetails = (item: any, type: ContentType) => {
        if (type === 'student') {
            setSelectedStudentForProfile(item);
        } else if (['course', 'module', 'discipline', 'class'].includes(type)) {
            setViewingDetails({ level: type as 'course' | 'module' | 'discipline' | 'class', contentId: item.id, contentName: item.name });
        }
    };
    
    const handleUpdateSetQuestions = async (setId: string, questions: QuizQuestion[]): Promise<boolean> => {
        const success = await questionBankService.updateQuestionSetQuestions(setId, questions);
        if (success) {
            await loadAllData(); 
        }
        return success;
    };

    const handleCreateTestFromSet = async (testName: string, questions: QuizQuestion[]): Promise<boolean> => {
        const context = {
            courseId: selectedCourse?.id || null,
            moduleId: selectedModule?.id || null,
            disciplineId: selectedDiscipline?.id || null,
        };
        const newTest = await testService.createTest(testName, questions, 'fixed', context);
        if (newTest) {
            alert(`Teste "${newTest.name}" criado com sucesso!`);
            return true;
        }
        alert("Falha ao criar o teste.");
        return false;
    };
    
    const handleStudyFromSet = () => {
        alert("Para iniciar uma sessão de estudo, por favor, utilize a página de Flashcards ou o Banco de Questões, onde você pode selecionar um aluno.");
    };

    const Breadcrumbs = () => (
        <nav className="flex items-center text-sm text-gray-500 mb-6 flex-wrap">
            <button onClick={() => { setSelectedCourse(null); }} className="hover:underline">Todos os Cursos</button>
            {selectedCourse && (
                <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <button onClick={() => { setSelectedModule(null); setSelectedClass(null); }} className="hover:underline font-medium text-gray-700 truncate">{selectedCourse.name}</button>
                </>
            )}
            {selectedModule && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <button onClick={() => { setSelectedDiscipline(null); }} className="hover:underline font-medium text-gray-700 truncate">{selectedModule.name}</button>
                </>
            )}
            {selectedDiscipline && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{selectedDiscipline.name}</span>
                </>
            )}
             {selectedClass && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{selectedClass.name}</span>
                </>
            )}
        </nav>
    );

    const AddItemForm: React.FC<{ type: ContentType }> = ({ type }) => {
        const placeholders: { [key in ContentType]: string } = {
            course: "Nome do Novo Curso", module: "Nome do Novo Módulo", discipline: "Nome da Nova Disciplina",
            class: "Nome da Nova Turma", student: "Nome do Novo Aluno", question_set: "Nome do Novo Assunto",
        };

        // FIX: Create a specific form for adding students with all required fields.
        if (type === 'student') {
            return (
                 <div className="p-4 bg-white rounded-lg border shadow-sm mt-4">
                    <h3 className="font-semibold mb-2 text-gray-700">Adicionar Novo Aluno</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Nome do Aluno" className="w-full p-2 border rounded-md" required />
                        <input type="email" value={newItemEmail} onChange={(e) => setNewItemEmail(e.target.value)} placeholder="Email do Aluno" className="w-full p-2 border rounded-md" required />
                        <input type="password" value={newItemPassword} onChange={(e) => setNewItemPassword(e.target.value)} placeholder="Senha Provisória" className="w-full p-2 border rounded-md" required />
                        <input type="text" value={newItemImageUrl} onChange={(e) => setNewItemImageUrl(e.target.value)} placeholder="URL da Foto (Opcional)" className="w-full p-2 border rounded-md" />
                    </div>
                    <button onClick={() => handleAdd(type)} className="w-full mt-3 px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark">Adicionar Aluno</button>
                </div>
            )
        }

        return (
            <div className="p-4 bg-white rounded-lg border shadow-sm mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder={placeholders[type]} className="w-full p-2 border rounded-md bg-white text-gray-800 placeholder:text-gray-400 md:col-span-2" />
                    <input type="text" value={newItemImageUrl} onChange={(e) => setNewItemImageUrl(e.target.value)} placeholder="URL da Imagem de Capa (Opcional)" className="w-full p-2 border rounded-md bg-white text-gray-800 placeholder:text-gray-400" />
                    <button onClick={() => handleAdd(type)} className="w-full md:w-auto px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark">Adicionar</button>
                </div>
            </div>
        )
    }
    
    const currentCourse = structuredData.find(c => c.id === selectedCourse?.id);
    const currentModule = currentCourse?.modules?.find(m => m.id === selectedModule?.id);
    const currentDiscipline = currentModule?.disciplines?.find(d => d.id === selectedDiscipline?.id);
    const currentClass = currentCourse?.classes?.find(c => c.id === selectedClass?.id);

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white">
                    <h1 className="text-3xl font-bold text-gray-800">Gestão Acadêmica</h1>
                    <p className="text-gray-500 mt-1">Gerencie a estrutura de conteúdo e as turmas de alunos.</p>
                     <nav className="flex space-x-2 mt-4">
                        <button onClick={() => setActiveTab('content')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'content' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>Estrutura de Conteúdo</button>
                        <button onClick={() => setActiveTab('students')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'students' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>Turmas & Alunos</button>
                    </nav>
                </header>
                
                <main className="flex-grow p-6">
                     {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}
                     <Breadcrumbs />
                     {activeTab === 'content' ? (
                         <>
                            {!selectedCourse && <ContentCarousel title="Cursos" items={structuredData} onSelect={setSelectedCourse} type="course" onEdit={(item) => setEditingItem({ item, type: 'course' })} onDelete={(id) => handleDelete(id, 'course')} onDetails={(item) => handleViewDetails(item, 'course')} />}
                            {!selectedCourse && <AddItemForm type="course" />}
                            
                            {currentCourse && !selectedModule && <ContentCarousel title="Módulos" items={currentCourse.modules || []} onSelect={setSelectedModule} type="module" onEdit={(item) => setEditingItem({ item, type: 'module' })} onDelete={(id) => handleDelete(id, 'module')} onDetails={(item) => handleViewDetails(item, 'module')} />}
                            {currentCourse && !selectedModule && <AddItemForm type="module"/>}

                            {currentModule && !selectedDiscipline && <ContentCarousel title="Disciplinas" items={currentModule.disciplines || []} onSelect={setSelectedDiscipline} type="discipline" onEdit={(item) => setEditingItem({ item, type: 'discipline' })} onDelete={(id) => handleDelete(id, 'discipline')} onDetails={(item) => handleViewDetails(item, 'discipline')} />}
                            {currentModule && !selectedDiscipline && <AddItemForm type="discipline"/>}
                            
                            {currentDiscipline && <ContentCarousel title="Assuntos" items={currentDiscipline.question_sets || []} onSelect={(item) => setViewingSet(item as QuestionSet)} type="question_set" onEdit={(item) => setEditingItem({ item, type: 'question_set' })} onDelete={(id) => handleDelete(id, 'question_set')} onMove={setMovingItem} />}
                            
                         </>
                     ) : (
                         <>
                            {!selectedCourse && <ContentCarousel title="Cursos" items={structuredData} onSelect={setSelectedCourse} type="course" onEdit={(item) => setEditingItem({ item, type: 'course' })} onDelete={(id) => handleDelete(id, 'course')} onDetails={(item) => handleViewDetails(item, 'course')} />}
                            
                            {currentCourse && !selectedClass && <ContentCarousel title="Turmas" items={currentCourse.classes || []} onSelect={setSelectedClass} type="class" onEdit={(item) => setEditingItem({ item, type: 'class' })} onDelete={(id) => handleDelete(id, 'class')} onDetails={(item) => handleViewDetails(item, 'class')} />}
                            {currentCourse && !selectedClass && <AddItemForm type="class"/>}

                            {currentClass && <ContentCarousel title="Alunos" items={currentClass.students || []} onSelect={(student) => setSelectedStudentForProfile(student as Student)} type="student" onEdit={(item) => setEditingItem({ item, type: 'student' })} onDelete={(id) => handleDelete(id, 'student')} />}
                            {currentClass && <AddItemForm type="student"/>}
                         </>
                     )}
                </main>
            </div>
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
            {selectedStudentForProfile && (
                <StudentProfile 
                    student={selectedStudentForProfile} 
                    onClose={() => setSelectedStudentForProfile(null)} 
                    onEditRequest={(student) => setEditingItem({ item: student, type: 'student' })} 
                    onDeleteRequest={handleDeleteStudentFromProfile}
                />
            )}
            {movingItem && (
                <MoveItemModal
                    itemToMove={movingItem}
                    structuredData={structuredData}
                    onClose={() => setMovingItem(null)}
                    onConfirmMove={handleConfirmMove}
                />
            )}
            {viewingSet && (
                <QuestionSetDetailModal 
                    questionSet={viewingSet}
                    onClose={() => setViewingSet(null)}
                    onDelete={(id) => handleDelete(id, 'question_set')}
                    onStudy={handleStudyFromSet}
                    onCreateTest={handleCreateTestFromSet}
                    onUpdate={handleUpdateSetQuestions}
                    onMoveRequest={(item) => setMovingItem(item)}
                />
            )}
        </>
    );
};

export default AcademicManagementPage;