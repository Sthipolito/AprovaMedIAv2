import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardListIcon, PlusCircleIcon } from './IconComponents';
import * as testService from '../services/testService';
import { TestWithAnalytics } from '../services/testService';
import TestCard from './TestCard';
import CreateTestModal from './CreateTestModal';
import TestDetailModal from './TestDetailModal';
import EditTestModal from './EditTestModal';

type ActiveTab = 'fixed' | 'scheduled';

const TestsPage: React.FC = () => {
    const [allTests, setAllTests] = useState<TestWithAnalytics[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('fixed');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewingTest, setViewingTest] = useState<TestWithAnalytics | null>(null);
    const [editingTest, setEditingTest] = useState<TestWithAnalytics | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const testsData = await testService.getTestsWithAnalytics();
            setAllTests(testsData);
        } catch (error) {
            console.error("Failed to fetch tests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteTest = async (testId: string) => {
        if (window.confirm("Tem certeza de que deseja excluir este teste? Esta ação é irreversível.")) {
            try {
                await testService.deleteTest(testId);
                alert("Teste excluído com sucesso.");
                fetchData();
            } catch (err: any) {
                const errorMessage = `Falha ao excluir o teste: ${err.message}`;
                console.error(errorMessage, err);
                alert(errorMessage);
            }
        }
    };

    const { fixedTests, scheduledTests } = useMemo(() => {
        const fixed = allTests.filter(t => t.test_type === 'fixed');
        const scheduled = allTests.filter(t => t.test_type === 'scheduled');
        return { fixedTests: fixed, scheduledTests: scheduled };
    }, [allTests]);

    const testsToDisplay = activeTab === 'fixed' ? fixedTests : scheduledTests;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
                    ))}
                </div>
            );
        }

        if (testsToDisplay.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {testsToDisplay.map(test => (
                        <TestCard 
                            key={test.id} 
                            test={test} 
                            onResultsClick={() => setViewingTest(test)}
                            onEdit={() => setEditingTest(test)}
                            onDelete={() => handleDeleteTest(test.id)}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div className="text-center py-20">
                <div className="p-4 bg-white rounded-full mb-4 inline-block shadow-md">
                    <ClipboardListIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-700">Nenhum Teste Encontrado</h2>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    {activeTab === 'fixed'
                        ? 'Crie um teste fixo para que os alunos possam estudar a qualquer momento.'
                        : 'Agende um novo teste com data e hora para uma avaliação formal.'}
                </p>
            </div>
        );
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Testes na Íntegra</h1>
                        <p className="text-gray-500 mt-1">Crie, agende e gerencie testes e avaliações para seus alunos.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Criar Novo Teste
                    </button>
                </header>

                <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <nav className="flex space-x-2">
                        <button onClick={() => setActiveTab('fixed')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'fixed' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Testes Fixos
                        </button>
                        <button onClick={() => setActiveTab('scheduled')} className={`px-4 py-2 font-semibold text-sm rounded-lg ${activeTab === 'scheduled' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-200'}`}>
                            Testes Agendados
                        </button>
                    </nav>
                </div>

                <main className="flex-grow p-6">
                    {renderContent()}
                </main>
            </div>

            {isCreateModalOpen && (
                <CreateTestModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onTestCreated={() => {
                        setIsCreateModalOpen(false);
                        fetchData();
                    }}
                />
            )}

            {editingTest && (
                <EditTestModal
                    test={editingTest}
                    onClose={() => setEditingTest(null)}
                    onTestUpdated={() => {
                        setEditingTest(null);
                        fetchData();
                    }}
                />
            )}

            {viewingTest && (
                <TestDetailModal
                    test={viewingTest}
                    onClose={() => setViewingTest(null)}
                />
            )}
        </>
    );
};

export default TestsPage;