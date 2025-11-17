import React, { useState, useEffect, useRef } from 'react';
import { XIcon, SendIcon, BotIcon, UserIcon } from './IconComponents';
import { useUser } from '../contexts/UserContext';
import * as tutorService from '../services/tutorService';
import { ChatMessage } from '../types';

interface TutorChatModalProps {
    onClose: () => void;
}

const LoadingIndicator: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

const TutorChatModal: React.FC<TutorChatModalProps> = ({ onClose }) => {
    const { userRole } = useUser();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchInitialMessage = async () => {
            setIsLoading(true);
            setMessages([]);
            const initialMessage = await tutorService.getInitialTutorMessage(userRole);
            setMessages([{ role: 'system', content: initialMessage }]);
            setIsLoading(false);
        };
        fetchInitialMessage();
    }, [userRole]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [messages]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userInput }];
        setMessages(newMessages);
        const question = userInput;
        setUserInput('');
        setIsLoading(true);

        const response = await tutorService.getTutorResponse(question, userRole);

        setMessages(prev => [...prev, { role: 'model', content: response }]);
        setIsLoading(false);
    };

    const roleName = userRole.role === 'teacher' ? 'Professor' : userRole.studentName;

    return (
        <div className="fixed inset-0 bg-black/30 flex items-end justify-end z-40 p-0 sm:p-6" onClick={onClose}>
            <div 
                className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full h-full sm:w-[440px] sm:max-h-[700px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Tutor IA</h2>
                            <p className="text-xs text-gray-500">Conversando como: <span className="font-semibold text-primary">{roleName}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                            <XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </header>

                {/* Chat Content */}
                <div ref={chatContainerRef} className="flex-grow p-6 space-y-6 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role !== 'user' && (
                                <div className="w-8 h-8 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                                    <BotIcon className="w-5 h-5 text-primary"/>
                                </div>
                            )}
                            <div className={`max-w-md p-4 rounded-xl text-sm ${
                                msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 
                                msg.role === 'model' ? 'bg-gray-100 text-gray-800 rounded-bl-none' : 'bg-teal-100 border border-teal-200 text-teal-800 rounded-bl-none'
                            }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                                    <UserIcon className="w-5 h-5 text-gray-600"/>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                                <BotIcon className="w-5 h-5 text-primary"/>
                            </div>
                            <div className="max-w-md p-4 rounded-xl bg-gray-100 text-gray-800 rounded-bl-none">
                                <LoadingIndicator />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="relative">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Faça uma pergunta..."
                            className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || !userInput.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-full text-white hover:bg-primary-dark transition-colors disabled:bg-gray-300"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorChatModal;