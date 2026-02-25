import { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { Socket } from 'socket.io-client';
import { MoreVertical, Search, Paperclip, Send, Smile, Image as ImageIcon, File, Mic, Video, X } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatWindowProps {
  currentUser: User;
  activeUser: User;
  socket: Socket | null;
}

export default function ChatWindow({ currentUser, activeUser, socket }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch chat history
    fetch(`/api/messages/${currentUser.id}/${activeUser.id}`)
      .then(res => res.json())
      .then(setMessages);

    if (socket) {
      const handleReceiveMessage = (msg: Message) => {
        if (msg.sender_id === activeUser.id || msg.receiver_id === activeUser.id) {
          setMessages(prev => [...prev, msg]);
        }
      };

      const handleUserTyping = (data: { sender_id: string }) => {
        if (data.sender_id === activeUser.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      };

      socket.on('receive_message', handleReceiveMessage);
      socket.on('user_typing', handleUserTyping);

      return () => {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('user_typing', handleUserTyping);
      };
    }
  }, [currentUser.id, activeUser.id, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !fileInputRef.current?.files?.length) return;

    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender_id: currentUser.id,
      receiver_id: activeUser.id,
      content: newMessage,
      type: 'text',
      timestamp: new Date().toISOString(),
    };

    if (socket) {
      socket.emit('send_message', msg);
    }
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      let type: Message['type'] = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const msg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        sender_id: currentUser.id,
        receiver_id: activeUser.id,
        content: '',
        type,
        file_url: base64,
        file_name: file.name,
        timestamp: new Date().toISOString(),
      };

      if (socket) {
        socket.emit('send_message', msg);
      }
      setMessages(prev => [...prev, msg]);
      setShowAttachments(false);
    };
    reader.readAsDataURL(file);
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { sender_id: currentUser.id, receiver_id: activeUser.id });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-gray-200 z-10">
        <div className="flex items-center gap-3">
          <img src={activeUser.avatar} alt={activeUser.username} className="w-10 h-10 rounded-full bg-gray-200" referrerPolicy="no-referrer" />
          <div className="flex flex-col">
            <span className="font-medium text-gray-800">{activeUser.username}</span>
            <span className="text-xs text-gray-500">
              {isTyping ? 'typing...' : 'online'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <Mic size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <Search size={20} />
          </button>
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]"></div>
        
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser.id;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-full mb-1",
                isMe ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] px-3 py-1.5 rounded-lg shadow-sm relative group",
                  isMe ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"
                )}
              >
                {msg.type === 'text' && (
                  <p className="text-sm text-gray-800 break-words pr-12">{msg.content}</p>
                )}
                
                {msg.type === 'image' && (
                  <div className="mb-1">
                    <img src={msg.file_url} alt="Sent" className="max-w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                  </div>
                )}

                {msg.type === 'video' && (
                  <div className="mb-1">
                    <video src={msg.file_url} controls className="max-w-full rounded-md" />
                  </div>
                )}

                {msg.type === 'audio' && (
                  <div className="mb-1 py-1">
                    <audio src={msg.file_url} controls className="max-w-full h-8" />
                  </div>
                )}

                {msg.type === 'document' && (
                  <div className="flex items-center gap-3 p-2 bg-black/5 rounded-md mb-1">
                    <File size={24} className="text-blue-500" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate">{msg.file_name}</span>
                      <span className="text-[10px] opacity-60 uppercase">Document</span>
                    </div>
                  </div>
                )}

                <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                  {format(new Date(msg.timestamp), 'h:mm a')}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-2 flex flex-col relative">
        <AnimatePresence>
          {showAttachments && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-xl p-4 flex flex-col gap-4 z-20"
            >
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-lg transition-colors text-purple-600"
              >
                <div className="bg-purple-100 p-2 rounded-full"><File size={20} /></div>
                <span className="text-sm font-medium">Document</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-lg transition-colors text-blue-600"
              >
                <div className="bg-blue-100 p-2 rounded-full"><ImageIcon size={20} /></div>
                <span className="text-sm font-medium">Photos & Videos</span>
              </button>
              <button className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-lg transition-colors text-red-500">
                <div className="bg-red-100 p-2 rounded-full"><Mic size={20} /></div>
                <span className="text-sm font-medium">Camera</span>
              </button>
              <button 
                onClick={() => setShowAttachments(false)}
                className="absolute -top-2 -right-2 bg-white rounded-full shadow-md p-1 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button 
            type="button"
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
          >
            <Smile size={24} />
          </button>
          <button 
            type="button"
            onClick={() => setShowAttachments(!showAttachments)}
            className={cn(
              "p-2 rounded-full transition-colors",
              showAttachments ? "bg-gray-300 text-gray-700" : "text-gray-500 hover:bg-gray-200"
            )}
          >
            <Paperclip size={24} className={cn(showAttachments && "rotate-45 transition-transform")} />
          </button>
          
          <input
            type="text"
            placeholder="Type a message"
            className="flex-1 bg-white rounded-lg px-4 py-2.5 text-sm focus:outline-none shadow-sm"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
          />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />

          {newMessage.trim() ? (
            <button 
              type="submit"
              className="p-2.5 bg-[#00a884] text-white rounded-full hover:bg-[#008f70] transition-colors shadow-md"
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              type="button"
              className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Mic size={24} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
