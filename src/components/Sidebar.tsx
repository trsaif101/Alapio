import { useState, useEffect } from 'react';
import { User } from '../types';
import { Search, MoreVertical, MessageSquare, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  currentUser: User;
  activeUser: User | null;
  onSelectUser: (user: User) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentUser, activeUser, onSelectUser, onLogout }: SidebarProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data.filter((u: User) => u.id !== currentUser.id));
      });
  }, [currentUser.id]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src={currentUser.avatar} alt="Me" className="w-10 h-10 rounded-full bg-white" referrerPolicy="no-referrer" />
          <span className="font-medium text-gray-700">{currentUser.username}</span>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <MessageSquare size={20} />
          </button>
          <button 
            onClick={onLogout}
            className="hover:bg-gray-200 p-2 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['CHATS', 'STATUS', 'CALLS'].map((tab) => (
          <button
            key={tab}
            className={cn(
              "flex-1 py-3 text-xs font-bold tracking-wider transition-colors border-b-2",
              tab === 'CHATS' ? "text-[#00a884] border-[#00a884]" : "text-gray-500 border-transparent hover:bg-gray-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 bg-white">
        <div className="relative flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5">
          <Search size={18} className="text-gray-500 mr-3" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="bg-transparent border-none focus:outline-none text-sm w-full py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <div
              key={user.id}
              onClick={() => onSelectUser(user)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100",
                activeUser?.id === user.id ? "bg-[#f0f2f5]" : "hover:bg-gray-50"
              )}
            >
              <div className="relative">
                <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full bg-gray-100" referrerPolicy="no-referrer" />
                {user.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-medium text-gray-900 truncate">{user.username}</h3>
                  <span className="text-xs text-gray-500">12:45 PM</span>
                </div>
                <p className="text-sm text-gray-500 truncate">Hey there! I am using Alapio.</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No contacts found.
          </div>
        )}
      </div>
    </>
  );
}
