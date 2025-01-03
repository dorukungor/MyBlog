'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';

export default function Home() {
  const [username, setUsername] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const generateLobbyId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleLobbyIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (/^[A-Z0-9]*$/.test(value) && value.length <= 6) {
      setLobbyId(value);
    }
  };

  const createLobby = async () => {
    if (!username) {
      setErrorMessage('Lütfen bir kullanıcı adı girin');
      return;
    }

    const newLobbyId = generateLobbyId();
    try {
      await set(ref(database, `lobbies/${newLobbyId}`), {
        id: newLobbyId,
        owner: username,
        participants: { [username]: true },
        status: 'waiting',
        currentChocolate: 0
      });

      router.push(`/lobby/${newLobbyId}?username=${encodeURIComponent(username)}`);
    } catch (err) {
      setErrorMessage('Lobi oluşturulurken bir hata oluştu');
    }
  };

  const joinLobby = async () => {
    if (!username) {
      setErrorMessage('Lütfen bir kullanıcı adı girin');
      return;
    }

    if (!lobbyId) {
      setErrorMessage('Lütfen bir lobi ID girin');
      return;
    }

    try {
      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      const snapshot = await get(lobbyRef);

      if (!snapshot.exists()) {
        setErrorMessage('Lobi bulunamadı');
        return;
      }

      const lobby = snapshot.val();
      if (lobby.status !== 'waiting') {
        setErrorMessage('Bu lobiye artık katılamazsınız');
        return;
      }

      await set(ref(database, `lobbies/${lobbyId}/participants/${username}`), true);
      router.push(`/lobby/${lobbyId}?username=${encodeURIComponent(username)}`);
    } catch (err) {
      setErrorMessage('Lobiye katılırken bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5e6d3] py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-center text-[#4a332f] mb-8">
          Çikolata Değerlendirme
        </h1>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-lg">
            {errorMessage}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-lg font-medium text-[#4a332f] mb-2"
            >
              Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8b5e3c] focus:border-transparent transition-colors"
              placeholder="Kullanıcı adınızı girin"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">VEYA</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="lobbyId"
              className="block text-lg font-medium text-[#4a332f] mb-2"
            >
              Lobi ID
            </label>
            <input
              type="text"
              id="lobbyId"
              value={lobbyId}
              onChange={handleLobbyIdChange}
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#8b5e3c] focus:border-transparent transition-colors"
              placeholder="6 karakterli kod"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={createLobby}
              className="w-full py-4 px-4 bg-[#8b5e3c] hover:bg-[#6d4a2f] text-white rounded-lg transition-colors font-medium text-lg shadow-md"
            >
              Lobi Oluştur
            </button>
            <button
              onClick={joinLobby}
              className="w-full py-4 px-4 bg-[#8b5e3c] hover:bg-[#6d4a2f] text-white rounded-lg transition-colors font-medium text-lg shadow-md"
            >
              Lobiye Katıl
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 