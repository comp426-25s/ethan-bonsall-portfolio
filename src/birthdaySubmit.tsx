import { useState, useEffect } from "react";

const CLIENT_ID = "a2e6aeb9971e4287a1985803be608d24";
const REDIRECT_URI = "https://ethanbonsall.com/birthdaysubmit";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "token";
const PLAYLIST_ID = "6yoTyxeEYmrn0GQ0rpATGv";

export default function BirthdaySubmitPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; artists: { name: string }[]; uri: string }[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    let storedToken = localStorage.getItem("spotifyToken");

    if (!storedToken && hash) {
      const params = new URLSearchParams(hash.substring(1));
      storedToken = params.get("access_token");
      if (storedToken) {
        localStorage.setItem("spotifyToken", storedToken);
        setToken(storedToken);
        uploadStoredSongs(storedToken);
      }
    } else if (storedToken) {
      setToken(storedToken);
      uploadStoredSongs(storedToken);
    }
  }, []);

  const handleLogin = () => {
    window.location.href = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=playlist-modify-public`;
  };

  const handleSearch = async () => {
    if (!token) return;
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setSearchResults(data.tracks.items || []);
  };

  const addSongToPlaylist = async (song: { id?: string; name?: string; artists?: { name: string; }[]; uri?: any; }) => {
    if (!token) return;
  
    // Fetch current playlist tracks
    const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  
    if (!playlistResponse.ok) {
      console.error("Failed to fetch playlist tracks");
      return;
    }
  
    const playlistData = await playlistResponse.json();
    const existingUris = playlistData.items.map((item: any) => item.track.uri);
  
    // Check if the song is already in the playlist
    if (existingUris.includes(song.uri)) {
      console.log("Song already exists in the playlist.");
      return; // Do not add if already present
    }
  
    // Add song to playlist
    const response = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uris: [song.uri] }),
    });
  
    if (response.ok) {
      setSongs([...songs, song]); // Update state if successfully added
    }
  };

  const uploadStoredSongs = async (userToken: string) => {
    try {
      const response = await fetch("https://ethanbonsall.com/api/songs");
      if (!response.ok) {
        console.error("Failed to fetch stored songs");
        return;
      }

      const storedSongs = await response.json();
      if (storedSongs.length === 0) return;

      const uris = storedSongs.map((song: { uri: string }) => song.uri);

      const spotifyResponse = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ uris }),
      });

      if (spotifyResponse.ok) {
        console.log("Successfully added stored songs to the playlist");
        await fetch("https://ethanbonsall.com/api/songs", {
          method: "DELETE",
        });
      } else {
        console.error("Failed to upload stored songs to Spotify", await spotifyResponse.json());
      }
    } catch (error) {
      console.error("Error uploading stored songs:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-4">Ethan's Birthday Rager</h1>
      {!token ? (
        <button onClick={handleLogin} className="bg-green-500 text-white px-4 py-2 rounded">Login to Spotify</button>
      ) : (
        <>
          <input type="text" placeholder="Search for a song..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mb-2 p-2 border rounded w-full" />
          <button onClick={handleSearch} className="w-full bg-blue-500 text-white px-4 py-2 rounded">Search</button>
          <div className="w-full max-w-md">
          {searchResults.map((song) => (
            <div key={song.id} className="p-2 border rounded bg-gray-800 flex justify-between items-center">
              <span>{song.name} - {song.artists[0].name}</span>
              <button onClick={() => addSongToPlaylist(song)} className="bg-green-500 px-2 py-1 rounded">+</button>
            </div>
            
          ))}
          </div>
        </>
      )}
    </div>
  );
}
