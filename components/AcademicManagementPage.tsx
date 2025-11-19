
import React, { useState, useEffect } from 'react';
import * as academicService from '../services/academicService';
import { Course, Module, Discipline, Class, Student } from '../types';
import EditContentModal from './EditContentModal';
import ContentDetailModal from './ContentDetailModal';
import StudentProfile from './StudentProfile';
import ColumnNavigation, { ColumnDefinition, ColumnItem } from './ColumnNavigation';
import { UserIcon } from './IconComponents';

type ActiveTab = 'content' | 'students';
type ContentType = 'course' | 'module' | 'discipline' | 'class' | 'student';
type EditingItem = { item: any; type: ContentType };

// Helper for inline creation in columns (replaces AddItemForm)
const createItem = async (type: ContentType, parentId: string | null, refresh: () => void) => {
    const name = prompt(`Nome do novo ${type === 'class' ? 'Turma' : type}:`);
    if (!name) return;
    
    try {
        switch (type) {
            case 'course': await academicService.addCourse(name); break;
            case 'module': if(parentId) await academicService.addModule(parentId, name); break;
            case 'discipline': if(parentId) await academicService.addDiscipline(parentId, name); break;
            case 'class': if(parentId) await academicService.addClass(parentId, name); break;
            // Student creation is more complex, handled separately
        }
        refresh();
    } catch (e) {
        alert("Erro ao criar item: " + (e as Error).message);
    }
};

const AcademicManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('content');
    const [structuredData, setStructuredData] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selection State
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    
    // Modal State
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [viewingDetails, setViewingDetails] = useState<{ level: 'course' | 'module' | 'discipline' | 'class'; contentId: string; contentName: string } | null>(null);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    
    const loadData = async () => {
        setIsLoading(true);
        const data = await academicService.getStructuredDataForManagement();
        setStructuredData(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Computed Data based on selections
    const selectedCourse = structuredData.find(c => c.id === selectedCourseId);
    const modules = selectedCourse?.modules || [];
    const classes = selectedCourse?.classes || [];
    const selectedModule = modules.find(m => m.id === selectedModuleId);
    const disciplines = selectedModule?.disciplines || [];
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const students = selectedClass?.students || [];

    // --- Handlers ---

    const handleSaveEdit = async (updates: { name: string; image_url: string; email?: string, class_id?: string }) => {
        if (!editingItem) return;
        try {
            const { item, type } = editingItem;
            const commonPayload = { name: updates.name, image_url: updates.image_url };

            switch (type) {
                case 'course': await academicService.updateCourse(item.id, commonPayload); break;
                case 'module': await academicService.updateModule(item.id, commonPayload); break;
                case 'discipline': await academicService.updateDiscipline(item.id, commonPayload); break;
                case 'class': await academicService.updateClass(item.id, commonPayload); break;
                case 'student':
                    if (updates.class_id && updates.email) {
                        await academicService.updateStudent(item, { ...commonPayload, class_id: updates.class_id, email: updates.email });
                    }
                    break;
            }
            setEditingItem(null);
            loadData();
        } catch (err: any) {
            alert(`Falha ao salvar: ${err.message}`);
        }
    };
    
    const handleDelete = async (id: string, type: ContentType) => {
        if (!window.confirm("Tem certeza que deseja excluir este item? Esta ação é irreversível.")) return;
        try {
            switch (type) {
                case 'course': await academicService.deleteCourse(id); setSelectedCourseId(null); break;
                case 'module': await academicService.deleteModule(id); setSelectedModuleId(null); break;
                case 'discipline': await academicService.deleteDiscipline(id); setSelectedDisciplineId(null); break;
                case 'class': await academicService.deleteClass(id); setSelectedClassId(null); break;
                case 'student': await academicService.deleteStudent(id); setViewingStudent(null); break;
            }
            loadData();
        } catch (err: any) {
             alert(`Falha ao excluir: ${err.message}`);
        }
    };

    const handleAddStudent = async () => {
        if (!selectedClassId) return;
        const name = prompt("Nome do Aluno:");
        if (!name) return;
        const email = prompt("Email do Aluno:");
        if (!email) return;
        const password = prompt("Senha Provisória:");
        if (!password) return;

        try {
            await academicService.addStudent(selectedClassId, name, email, password);
            loadData();
        } catch (e) {
            alert("Erro ao adicionar aluno: " + (e as Error).message);
        }
    };

    // --- Column Definitions ---

    const courseColumn: ColumnDefinition = {
        id: 'courses',
        title: 'Cursos',
        items: structuredData.map(c => ({ id: c.id, name: c.name, subTitle: `${c.modules?.length || 0} módulos`, imageUrl: c.image_url, data: c })),
        selectedId: selectedCourseId,
        onSelect: (item) => { setSelectedCourseId(item.id); setSelectedModuleId(null); setSelectedDisciplineId(null); setSelectedClassId(null); },
        onAdd: () => createItem('course', null, loadData),
        onEdit: (item) => setEditingItem({ item: item.data, type: 'course' }),
        onDelete: (id) => handleDelete(id, 'course'),
        emptyMessage: "Nenhum curso cadastrado."
    };

    const columns: ColumnDefinition[] = [courseColumn];

    if (activeTab === 'content') {
        if (selectedCourseId) {
            columns.push({
                id: 'modules',
                title: 'Módulos',
                items: modules.map(m => ({ id: m.id, name: m.name, subTitle: `${m.disciplines?.length || 0} disciplinas`, imageUrl: m.image_url, data: m })),
                selectedId: selectedModuleId,
                onSelect: (item) => { setSelectedModuleId(item.id); setSelectedDisciplineId(null); },
                onAdd: () => createItem('module', selectedCourseId, loadData),
                onEdit: (item) => setEditingItem({ item: item.data, type: 'module' }),
                onDelete: (id) => handleDelete(id, 'module'),
                emptyMessage: "Selecione um curso para ver os módulos."
            });
        }
        if (selectedModuleId) {
            columns.push({
                id: 'disciplines',
                title: 'Disciplinas',
                items: disciplines.map(d => ({ id: d.id, name: d.name, subTitle: `${d.question_sets?.length || 0} assuntos`, imageUrl: d.image_url, data: d })),
                selectedId: selectedDisciplineId,
                onSelect: (item) => setSelectedDisciplineId(item.id),
                onAdd: () => createItem('discipline', selectedModuleId, loadData),
                onEdit: (item) => setEditingItem({ item: item.data, type: 'discipline' }),
                onDelete: (id) => handleDelete(id, 'discipline'),
                emptyMessage: "Nenhuma disciplina cadastrada."
            });
        }
    } else {
        if (selectedCourseId) {
             columns.push({
                id: 'classes',
                title: 'Turmas',
                items: classes.map(c => ({ id: c.id, name: c.name, subTitle: `${c.students?.length || 0} alunos`, imageUrl: c.image_url, data: c })),
                selectedId: selectedClassId,
                onSelect: (item) => setSelectedClassId(item.id),
                onAdd: () => createItem('class', selectedCourseId, loadData),
                onEdit: (item) => setEditingItem({ item: item.data, type: 'class' }),
                onDelete: (id) => handleDelete(id, 'class'),
                emptyMessage: "Nenhuma turma cadastrada."
            });
        }
        if (selectedClassId) {
             columns.push({
                id: 'students',
                title: 'Alunos',
                items: students.map(s => ({ id: s.id, name: s.name, subTitle: s.email, imageUrl: s.image_url, data: s })),
                selectedId: viewingStudent?.id || null,
                onSelect: (item) => setViewingStudent(item.data),
                onAdd: handleAddStudent,
                onEdit: (item) => setEditingItem({ item: item.data, type: 'student' }),
                onDelete: (id) => handleDelete(id, 'student'),
                renderCustomItem: (item) => (
                     <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs border border-gray-300 flex-shrink-0 overflow-hidden">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4"/>}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                             <p className="font-medium truncate text-sm text-gray-800">{item.name}</p>
                             <p className="text-xs text-gray-500 truncate">{item.subTitle}</p>
                        </div>
                     </div>
                ),
                emptyMessage: "Nenhum aluno nesta turma."
            });
        }
    }

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
                <header className="px-8 py-6 border-b border-gray-200 bg-white flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-800">Gestão Acadêmica</h1>
                    <p className="text-gray-500 mt-1 text-sm">Gerencie a estrutura do curso, turmas e alunos em um só lugar.</p>
                </header>

                <div className="px-8 py-4 border-b border-gray-200 bg-white flex-shrink-0">
                    <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button onClick={() => { setActiveTab('content'); setSelectedClassId(null); }} className={`px-4 py-2 font-medium text-sm rounded-md transition-all ${activeTab === 'content' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Estrutura de Conteúdo
                        </button>
                        <button onClick={() => { setActiveTab('students'); setSelectedModuleId(null); setSelectedDisciplineId(null); }} className={`px-4 py-2 font-medium text-sm rounded-md transition-all ${activeTab === 'students' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Turmas & Alunos
                        </button>
                    </nav>
                </div>

                <main className="flex-grow p-6 overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : (
                        <ColumnNavigation columns={columns} />
                    )}
                </main>
            </div>

            {editingItem && (
                <EditContentModal
                    item={editingItem.item}
                    type={editingItem.type}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveEdit as any}
                />
            )}
             {viewingStudent && (
                <StudentProfile
                    student={viewingStudent}
                    onClose={() => setViewingStudent(null)}
                    onEditRequest={(student) => { setViewingStudent(null); setEditingItem({ item: student, type: 'student' }); }}
                    onDeleteRequest={id => handleDelete(id, 'student')}
                />
            )}
        </>
    );
};

export default AcademicManagementPage;
