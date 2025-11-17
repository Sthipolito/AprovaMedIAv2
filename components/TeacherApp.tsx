import React, { useState, useCallback, useEffect } from 'react';
import LandingPage from './LandingPage';
import ChatView from './ChatView';
import Sidebar from './Sidebar';
import AcademicManagementPage from './AcademicManagementPage';
import TestsPage from './TestsPage';
import CrmPage from './CrmPage';
import FlashcardsPage from './FlashcardsPage';
import QuestionBankManagementPage from './QuestionBankManagementPage';
import DashboardPage from './DashboardPage';
import { usePdfParser } from '../hooks/usePdfParser';
import { UserProvider } from '../contexts/UserContext';
import FloatingChatButton from './FloatingChatButton';
import TutorChatModal from './TutorChatModal';


export type View = 'landing' | 'chat' | 'academicManagement' | 'questionBankManagement' | 'tests' | 'crm' | 'flashcards' | 'dashboard';

const TeacherApp: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfText, setPdfText] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const { parsePdf, isLoading, error } = usePdfParser();
    const [currentView, setCurrentView] = useState<View>('dashboard'); // Default to dashboard
    const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);

    const handlePdfUpload = useCallback(async (file: File) => {
        const result = await parsePdf(file);
        if (result && result.text) {
            setPdfText(result.text);
            setFileName(file.name);
            setPdfFile(file);
            setCurrentView('chat'); // Switch to chat view on successful upload
        }
    }, [parsePdf]);

    const handleStartNewSession = () => {
        setPdfFile(null);
        setPdfText(null);
        setFileName('');
        setCurrentView('landing');
    };

    useEffect(() => {
        if (currentView === 'chat' && (!pdfFile || !pdfText)) {
            setCurrentView('landing');
        }
    }, [currentView, pdfFile, pdfText]);

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardPage />;
            case 'chat':
                if (pdfFile && pdfText) {
                    return <ChatView pdfFile={pdfFile} pdfText={pdfText} fileName={fileName} onStartNewSession={handleStartNewSession} />;
                }
                return null;
            case 'academicManagement':
                return <AcademicManagementPage />;
            case 'questionBankManagement':
                return <QuestionBankManagementPage />;
            case 'tests':
                return <TestsPage />;
            case 'crm':
                return <CrmPage />;
            case 'flashcards':
                return <FlashcardsPage />;
            case 'landing':
            default:
                return <LandingPage onPdfUpload={handlePdfUpload} isLoading={isLoading} error={error} />;
        }
    };

    return (
        <UserProvider>
            <div className="flex h-screen w-screen bg-gray-100">
                <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    {renderView()}
                </div>
                <FloatingChatButton onClick={() => setIsTutorModalOpen(true)} />
                {isTutorModalOpen && <TutorChatModal onClose={() => setIsTutorModalOpen(false)} />}
            </div>
        </UserProvider>
    );
};

export default TeacherApp;