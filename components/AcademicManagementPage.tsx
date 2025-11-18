import React, { useState, useEffect } from 'react';
import * as academicService from '../services/academicService';
import { Course, Module, Discipline, Class, Student } from '../types';
import { ChevronRightIcon } from './IconComponents';
import ContentCarousel from './ContentCarousel';
import EditContentModal from './EditContentModal';
import ContentDetailModal from './ContentDetailModal';
import StudentProfile from './StudentProfile';

type ActiveTab = 'content' | 'students';
type ContentType = 'course' | 'module' | 'discipline' | 'class' | 'student';
type EditingItem = { item: any; type: ContentType };

// --- Extracted Components for stability and performance ---

interface BreadcrumbsProps {
    selectedCourse: Course | null;
    setSelectedCourse: (course: Course | null) => void;
    selectedModule: Module | null;
    setSelectedModule: (module: Module | null) => void;
    selectedDiscipline: Discipline | null;
    setSelectedDiscipline: (discipline: Discipline | null) => void;
    selectedClass: Class | null;
    setSelectedClass: (cls: Class | null) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
    selectedCourse, setSelectedCourse,
    selectedModule, setSelectedModule,
    selectedClass, setSelectedClass,
}) => (
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
                <span className="font-medium text-gray-900 truncate">{selectedModule.name}</span>
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

interface AddItemFormProps {
    type: 'course' | 'module' | 'discipline' | 'class' | 'student';
    parentId: string | null;
    onAdd: () => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ type, parentId, onAdd }) => {
    const [name, setName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    // For student
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAdd = async () => {
        if (!name || !parentId) return;
        try {
            switch (type) {
                case 'course':
                    await academicService.addCourse(name, imageUrl);
                    break;
                case 'module':
                    await academicService.addModule(parentId, name, imageUrl);
                    break;
                case 'discipline':
                    await academicService.addDiscipline(parentId, name, imageUrl);
                    break;
                case 'class':
                    await academicService.addClass(parentId, name, imageUrl);
                    break;
                case 'student':
                     if (!email || !password) return;
                     await academicService.addStudent(parentId, name, email, password, imageUrl);
                     setEmail('');
                     setPassword('');
                    break;
            }
            setName('');
            setImageUrl('');
            onAdd();
        } catch (err) {
            alert(`Falha ao adicionar: ${(err as Error).message}`);
        }
    };
    
    const placeholder = `Nome do Novo ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    if (type === 'student') {
        return (
            <div className="bg-white p-4 rounded-lg shadow-sm border mt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Adicionar Novo Aluno</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nome do Aluno" value={name} onChange={e => setName(e.target.value)} className="p-2 border rounded-md" />
                    <input type="email" placeholder="Email do Aluno" value={email} onChange={e => setEmail(e.target.value)} className="p-2 border rounded-md" />
                    <input type="password" placeholder="Senha Provisória" value={password} onChange={e => setPassword(e.target.value)} className="p-2 border rounded-md" />
                    <input type="text" placeholder="URL da Foto (Opcional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="p-2 border rounded-md" />
                </div>
                <button onClick={handleAdd} className="mt-4 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark w-full">Adicionar Aluno</button>
            </div>
        );
    }

    return (
        <div className="mt-8 flex items-end gap-2 flex-wrap">
            <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={placeholder}
                className="p-3 border border-gray-300 rounded-lg flex-grow min-w-[200px] bg-white text-gray-800"
            />
            {type !== 'course' && (
                <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="URL da Imagem de Capa (Opcional)"
                    className="p-3 border border-gray-300 rounded-lg flex-grow min-w-[200px] bg-white text-gray-800"
                />
            )}
            <button onClick={handleAdd} className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark">Adicionar</button>
        </div>
    );
};

// --- Main Component ---

const AcademicManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('content');
    const [structuredData, setStructuredData] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Navigation State
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    
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
    
    // Reset selections on tab change or data reload
    useEffect(() => {
        setSelectedCourse(null);
    }, [activeTab, structuredData]);

    // Reset child selections when a parent is deselected
    useEffect(() => {
        setSelectedModule(null);
        setSelectedDiscipline(null);
        setSelectedClass(null);
    }, [selectedCourse]);

    useEffect(() => {
        setSelectedDiscipline(null);
    }, [selectedModule]);


    const handleSaveEdit = async (updates: { name: string; image_url: string; email?: string, class_id?: string }) => {
        if (!editingItem) return;
        try {
            const { item, type } = editingItem;
            const commonPayload = { name: updates.name, image_url: updates.image_url };

            switch (type) {
                case 'course':
                    await academicService.updateCourse(item.id, commonPayload);
                    break;
                case 'module':
                    await academicService.updateModule(item.id, commonPayload);
                    break;
                case 'discipline':
                    await academicService.updateDiscipline(item.id, commonPayload);
                    break;
                case 'class':
                    await academicService.updateClass(item.id, commonPayload);
                    break;
                case 'student':
                    if (updates.class_id && updates.email) {
                        await academicService.updateStudent(item, { ...commonPayload, class_id: updates.class_id, email: updates.email });
                    } else {
                        throw new Error("Dados do aluno incompletos para atualização.");
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
        if (!window.confirm("Tem certeza que deseja excluir este item? Esta ação é irreversível e excluirá todo o conteúdo associado.")) {
            return;
        }
        try {
            switch (type) {
                case 'course': await academicService.deleteCourse(id); setSelectedCourse(null); break;
                case 'module': await academicService.deleteModule(id); setSelectedModule(null); break;
                case 'discipline': await academicService.deleteDiscipline(id); setSelectedDiscipline(null); break;
                case 'class': await academicService.deleteClass(id); setSelectedClass(null); break;
                case 'student': await academicService.deleteStudent(id); setViewingStudent(null); break;
            }
            loadData();
        } catch (err: any) {
             alert(`Falha ao excluir: ${err.message}`);
        }
    };
    
    const renderContentTab = () => {
        if (selectedDiscipline) {
            return <p className="text-gray-500 italic mt-4">A gestão de 'Assuntos' (conjuntos de questões) é feita na página "Banco de Questões".</p>;
        }
        if (selectedModule) {
            return (
                <>
                    <ContentCarousel title="Disciplinas" items={selectedModule.disciplines || []} type="discipline" onSelect={setSelectedDiscipline} onEdit={item => setEditingItem({ item, type: 'discipline' })} onDelete={id => handleDelete(id, 'discipline')} onDetails={item => setViewingDetails({ level: 'discipline', contentId: item.id, contentName: item.name })} />
                    <AddItemForm type="discipline" parentId={selectedModule.id} onAdd={loadData} />
                </>
            );
        }
        if (selectedCourse) {
            return (
                <>
                    <ContentCarousel title="Módulos" items={selectedCourse.modules || []} type="module" onSelect={setSelectedModule} onEdit={item => setEditingItem({ item, type: 'module' })} onDelete={id => handleDelete(id, 'module')} onDetails={item => setViewingDetails({ level: 'module', contentId: item.id, contentName: item.name })} />
                    <AddItemForm type="module" parentId={selectedCourse.id} onAdd={loadData} />
                </>
            );
        }
        return (
            <>
                <ContentCarousel title="Cursos" items={structuredData} type="course" onSelect={setSelectedCourse} onEdit={item => setEditingItem({ item, type: 'course' })} onDelete={id => handleDelete(id, 'course')} onDetails={item => setViewingDetails({ level: 'course', contentId: item.id, contentName: item.name })}/>
                <AddItemForm type="course" parentId="root" onAdd={loadData} />
            </>
        );
    };
    
    const renderStudentsTab = () => {
         if (selectedClass) {
            return (
                 <>
                    <ContentCarousel title="Alunos" items={selectedClass.students || []} type="student" onSelect={setViewingStudent} onEdit={item => setEditingItem({ item, type: 'student' })} onDelete={id => handleDelete(id, 'student')} />
                    <AddItemForm type="student" parentId={selectedClass.id} onAdd={loadData} />
                </>
            );
        }
        if (selectedCourse) {
            return (
                 <>
                    <ContentCarousel title="Turmas" items={selectedCourse.classes || []} type="class" onSelect={setSelectedClass} onEdit={item => setEditingItem({ item, type: 'class' })} onDelete={id => handleDelete(id, 'class')} />
                    <AddItemForm type="class" parentId={selectedCourse.id} onAdd={loadData} />
                </>
            );
        }
        return (
             <ContentCarousel title="Cursos" items={structuredData} type="course" onSelect={setSelectedCourse} onEdit={item => setEditingItem({ item, type: 'course' })} onDelete={id => handleDelete(id, 'course')} />
        );
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white">
                    <h1 className="text-3xl font-bold text-gray-800">Gestão Acadêmica</h1>
                    <p className="text-gray-500 mt-1">Gerencie a estrutura de conteúdo e as turmas de alunos.</p>
                </header>

                <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <nav className="flex space-x-2">
                        <button onClick={() => setActiveTab('content')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'content' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Estrutura de Conteúdo
                        </button>
                        <button onClick={() => setActiveTab('students')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'students' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Turmas & Alunos
                        </button>
                    </nav>
                </div>

                <main className="flex-grow p-6">
                    <Breadcrumbs 
                        selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse}
                        selectedModule={selectedModule} setSelectedModule={setSelectedModule}
                        selectedDiscipline={selectedDiscipline} setSelectedDiscipline={setSelectedDiscipline}
                        selectedClass={selectedClass} setSelectedClass={setSelectedClass}
                    />
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : (
                        activeTab === 'content' ? renderContentTab() : renderStudentsTab()
                    )}
                </main>
            </div>

            {editingItem && (
                <EditContentModal
                    item={editingItem.item}
                    type={editingItem.type}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveEdit as any} // Cast to handle different save signatures
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