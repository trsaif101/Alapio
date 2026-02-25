/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, Message } from './types';
import { useSocket } from './hooks/useSocket';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('alapio_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const { socket, isConnected } = useSocket(currentUser?.id || null);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('alapio_user', JSON.stringify(user));
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('alapio_user');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden font-sans">
      <div className="flex w-full max-w-[1600px] mx-auto h-full shadow-2xl bg-white overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/4 min-w-[300px] border-r border-gray-200 flex flex-col">
          <Sidebar 
            currentUser={currentUser} 
            activeUser={activeUser} 
            onSelectUser={setActiveUser}
            onLogout={handleLogout}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative bg-[#efeae2]">
          <AnimatePresence mode="wait">
            {activeUser ? (
              <motion.div
                key={activeUser.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <ChatWindow 
                  currentUser={currentUser} 
                  activeUser={activeUser} 
                  socket={socket}
                />
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                <div className="w-64 h-64 mb-8 opacity-20">
                  <img src="https://picsum.photos/seed/alapio/400/400" alt="Welcome" className="rounded-full" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-3xl font-light mb-2">Alapio</h1>
                <p className="max-w-md">
                  Send and receive messages without keeping your phone online.
                  Use Alapio on up to 4 linked devices and 1 phone at the same time.
                </p>
                <div className="mt-auto py-8 flex items-center gap-2 text-xs opacity-50">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  Connected as {currentUser.username}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
