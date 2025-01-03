'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, set, get } from 'firebase/database';

interface Participant {
  [key: string]: boolean;
}

interface Vote {
  [key: string]: number;
}

interface Lobby {
  id: string;
  owner: string;
  participants: Participant;
  status: 'waiting' | 'voting' | 'finished';
  currentChocolate: number;
  votes?: {
    [chocolateIndex: number]: Vote;
  };
}

export default function LobbyPage() {
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lobbyId = params.id as string;
  const username = searchParams.get('username');

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [vote, setVote] = useState<number>(3);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }

    const lobbyRef = ref(database, `lobbies/${lobbyId}`);
    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      if (snapshot.exists()) {
        setLobby(snapshot.val());
      } else {
        setErrorMessage('Lobi bulunamadı');
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [lobbyId, username, router]);

  if (!mounted || !lobby) {
    return (
      <div className="min-h-screen bg-[#f5e6d3] flex items-center justify-center">
        <div className="text-[#4a332f] text-xl">Yükleniyor...</div>
      </div>
    );
  }

  const startVoting = async () => {
    if (lobby?.owner !== username) {
      setErrorMessage('Sadece lobi sahibi oylama başlatabilir');
      return;
    }

    try {
      await set(ref(database, `lobbies/${lobbyId}/status`), 'voting');
    } catch (err) {
      setErrorMessage('Oylama başlatılırken bir hata oluştu');
    }
  };

  const submitVote = async () => {
    if (!lobby || lobby.status !== 'voting') return;

    try {
      await set(
        ref(database, `lobbies/${lobbyId}/votes/${lobby.currentChocolate}/${username}`),
        vote
      );

      const lobbyRef = ref(database, `lobbies/${lobbyId}`);
      const snapshot = await get(lobbyRef);
      const currentLobby = snapshot.val() as Lobby;

      // Tüm oylar verildi mi kontrol et
      const currentVotes = currentLobby.votes?.[currentLobby.currentChocolate] || {};
      const allVoted = Object.keys(currentLobby.participants).every(
        (participant) => currentVotes[participant]
      );

      if (allVoted) {
        // Sonraki çikolataya geç veya oylamayı bitir
        if (currentLobby.currentChocolate >= 4) {
          await set(ref(database, `lobbies/${lobbyId}/status`), 'finished');
        } else {
          await set(
            ref(database, `lobbies/${lobbyId}/currentChocolate`),
            currentLobby.currentChocolate + 1
          );
        }
      }
    } catch (err) {
      setErrorMessage('Oy verilirken bir hata oluştu');
    }
  };

  const hasVoted = () => {
    if (!lobby?.votes?.[lobby.currentChocolate]) return false;
    return !!lobby.votes[lobby.currentChocolate][username!];
  };

  const getResults = () => {
    if (!lobby?.votes) return [];

    const results = [];
    for (let i = 0; i <= lobby.currentChocolate; i++) {
      const votes = lobby.votes[i] || {};
      const total = Object.values(votes).reduce((sum, vote) => sum + vote, 0);
      const average = total / Object.keys(votes).length;
      const voterDetails = Object.entries(votes).map(([voter, vote]) => ({
        voter,
        vote: vote as number
      }));
      results.push({ 
        index: i + 1, 
        average,
        voterDetails: voterDetails.sort((a, b) => b.vote - a.vote)
      });
    }

    return results.sort((a, b) => b.average - a.average);
  };

  return (
    <div className="min-h-screen bg-[#f5e6d3] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center text-[#4a332f]">
            Çikolata Değerlendirme
          </h1>
          <p className="text-center text-[#8b5e3c] mt-2 text-lg font-medium">
            Lobi ID: {lobbyId}
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-lg">
            {errorMessage}
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#4a332f] mb-4">Katılımcılar</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.keys(lobby.participants).map((participant) => (
              <li
                key={participant}
                className="bg-[#8b5e3c] text-white p-4 rounded-lg text-center text-lg font-medium shadow-md"
              >
                {participant} {participant === lobby.owner && '(Lobi Sahibi)'}
              </li>
            ))}
          </ul>
        </div>

        {lobby.status === 'waiting' && lobby.owner === username && (
          <button
            onClick={startVoting}
            className="w-full py-4 px-4 bg-[#8b5e3c] hover:bg-[#6d4a2f] text-white rounded-lg transition-colors font-medium text-lg shadow-md"
          >
            Oylamayı Başlat
          </button>
        )}

        {lobby.status === 'voting' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#4a332f]">
                Çikolata #{lobby.currentChocolate + 1}
              </h2>
              {!hasVoted() ? (
                <div className="mt-6">
                  <label className="block text-lg font-medium text-[#4a332f] mb-4">
                    Puanınız (1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={vote}
                    onChange={(e) => setVote(Number(e.target.value))}
                    className="w-full accent-[#8b5e3c]"
                  />
                  <div className="text-4xl font-bold text-[#8b5e3c] mt-4">{vote}</div>
                  <button
                    onClick={submitVote}
                    className="mt-6 py-4 px-8 bg-[#8b5e3c] hover:bg-[#6d4a2f] text-white rounded-lg transition-colors font-medium text-lg shadow-md"
                  >
                    Oyu Gönder
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-xl font-medium text-green-600">Oyunuzu verdiniz!</p>
              )}
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#4a332f] mb-4">Bekleyen Oylar</h3>
              <ul className="space-y-2">
                {Object.keys(lobby.participants).map((participant) => {
                  const hasVoted = lobby.votes?.[lobby.currentChocolate]?.[participant];
                  return (
                    <li
                      key={participant}
                      className={`text-lg font-medium ${
                        hasVoted ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {participant}: {hasVoted ? 'Oy verdi' : 'Bekliyor'}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {lobby.status === 'finished' && (
          <div>
            <h2 className="text-2xl font-bold text-[#4a332f] mb-6">Sonuçlar</h2>
            <div className="space-y-6">
              {getResults().map((result) => (
                <div
                  key={result.index}
                  className="bg-[#f8f1ea] p-6 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-[#4a332f]">
                      Çikolata #{result.index}
                    </span>
                    <span className="text-2xl font-bold text-[#8b5e3c]">
                      {result.average.toFixed(1)} / 5
                    </span>
                  </div>
                  <div className="space-y-2">
                    {result.voterDetails.map((voter) => (
                      <div
                        key={voter.voter}
                        className="flex justify-between items-center text-lg"
                      >
                        <span className="font-medium text-[#4a332f]">{voter.voter}</span>
                        <span className="font-bold text-[#8b5e3c]">{voter.vote} / 5</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 