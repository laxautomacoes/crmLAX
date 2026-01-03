'use client';

import { Bell, Sun, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { AvatarDropdown } from './AvatarDropdown';
import { Modal } from '@/components/shared/Modal';
import { NotificationsList, Notification } from '@/components/dashboard/NotificationsList';
import { useState } from 'react';

interface HeaderProps {
    onMenuClick: () => void;
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
}

export function Header({ onMenuClick, isSidebarCollapsed, toggleSidebar }: HeaderProps) {
    // Simple date format: "Hoje é 02 de Janeiro de 2026"
    const today = new Date();
    const dateString = today.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    // Capitalize month if needed, though default is lowercase in pt-BR. User example showed "Janeira" (typo?) "Janeiro".
    const formattedDate = `Hoje é ${dateString}`;

    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Lifted state for notifications
    const [notifications, setNotifications] = useState<Notification[]>([
        { id: 1, title: 'Nova venda realizada', message: 'Você realizou uma nova venda no valor de R$ 1.500,00', date: 'Há 5 min', read: false },
        { id: 2, title: 'Lead qualificado', message: 'Um novo lead foi marcado como qualificado.', date: 'Há 1 hora', read: false },
        { id: 3, title: 'Meta atingida!', message: 'Parabéns! Você atingiu sua meta mensal de vendas.', date: 'Ontem', read: true },
        { id: 4, title: 'Atualização do sistema', message: 'O sistema passará por manutenção programada às 22h.', date: 'Ontem', read: true },
    ]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-none sticky top-0 z-40">
                <div className="flex items-center gap-4 flex-1">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={onMenuClick}
                        className="md:hidden text-gray-500 hover:text-gray-700 absolute left-4"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Desktop Collapse Button */}
                    <button
                        onClick={toggleSidebar}
                        className="hidden md:block text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>

                    {/* Desktop Welcome & Date */}
                    <div className="hidden md:flex flex-col ml-4">
                        <h2 className="text-lg font-semibold text-[#404F4F]">Bem-vindo, Léo Acosta</h2>
                        <span className="text-xs text-gray-500">{formattedDate}</span>
                    </div>

                    {/* Mobile Centered Logo */}
                    <div className="md:hidden flex-1 flex justify-center">
                        <span className="text-xl font-bold text-[#FFE600] text-shadow-sm ml-6">CRM LAX</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-4">
                        <button className="text-gray-500 hover:text-gray-700">
                            <Sun size={20} />
                        </button>
                        <button
                            onClick={() => setIsNotificationsOpen(true)}
                            className="text-gray-500 hover:text-gray-700 relative"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>
                        <div className="relative">
                            <AvatarDropdown />
                        </div>
                    </div>

                    {/* Mobile Avatar Dropdown */}
                    <div className="md:hidden">
                        <AvatarDropdown />
                    </div>
                </div>
            </header>

            <Modal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                title="Notificações"
            >
                <div className="h-[400px]">
                    <NotificationsList
                        notifications={notifications}
                        setNotifications={setNotifications}
                    />
                </div>
            </Modal>
        </>
    );
}
