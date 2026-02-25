export interface User {
  id: string;
  username: string;
  avatar: string;
  last_seen?: string;
  status?: 'online' | 'offline';
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  file_url?: string;
  file_name?: string;
  timestamp: string;
}
