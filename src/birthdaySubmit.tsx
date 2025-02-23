import { useState, useEffect, useRef } from "react";

const CLIENT_ID = "a2e6aeb9971e4287a1985803be608d24";
const REDIRECT_URI = "https://www.ethanbonsall.com/birthdaysubmit";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const PLAYLIST_ID = "6yoTyxeEYmrn0GQ0rpATGv";

export default function BirthdaySubmitPage() {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; artists: { name: string }[]; uri: string }[]
  >([]);
  const [token, setToken] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAccessToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (!code) return;

      try {
        const response = await fetch(`/api/auth-token?code=${code}`);
        const data = await response.json();

        if (response.ok) {
          setToken(data.access_token);
          localStorage.setItem("spotifyToken", data.access_token);

          if (data.expires_in) {
            setTimeout(fetchAccessToken, (data.expires_in - 60) * 1000);
          }

          uploadStoredSongs(data.access_token);
          fetchPlaylistSongs(data.access_token);
        } else {
          console.error("Failed to fetch access token", data);
        }
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };

    fetchAccessToken();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchPlaylistSongs(token);
  }, [token]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleLogin = () => {
    window.location.href = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=playlist-modify-public playlist-modify-private`;
  };

  const handleSearch = async () => {
    if (!token) return;
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();
    setSearchResults(data.tracks.items || []);
  };

  const addSongToPlaylist = async (song: { id: string; uri: string }) => {
    if (!token) return;

    if (playlistSongs.some((s) => s.uri === song.uri)) {
      console.log("Song already in playlist.");
      return;
    }

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uris: [song.uri] }),
      }
    );

    if (response.ok) {
      setPlaylistSongs([...playlistSongs, song]);
    }
  };

  const fetchPlaylistSongs = async (userToken: string) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlaylistSongs(data.items.map((item: any) => item.track));
      }
    } catch (error) {
      console.error("Error fetching playlist songs:", error);
    }
  };

  const uploadStoredSongs = async (userToken: string) => {
    try {
      const response = await fetch("https://www.ethanbonsall.com/api/songs");
      if (!response.ok) return;

      const storedSongs = await response.json();
      const uris = storedSongs.map((song: { uri: string }) => song.uri).filter((uri: any) => uri);

      if (uris.length === 0) return;

      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
          body: JSON.stringify({ uris }),
        }
      );

      if (spotifyResponse.ok) {
        await fetch("https://www.ethanbonsall.com/api/songs/delete", { method: "DELETE" });
        fetchPlaylistSongs(userToken);
      }
    } catch (error) {
      console.error("Error uploading stored songs:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-4">Ethan's Birthday Rager</h1>
      {!token ? (
        <button onClick={handleLogin} className="bg-green-500 text-white px-4 py-2 rounded">
          Login to Spotify
        </button>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search for a song..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2 p-2 border rounded w-full text-black"
          />
          <button onClick={handleSearch} className="w-full bg-blue-500 text-white px-4 py-2 rounded">
            Search
          </button>

          <div className="relative w-full max-w-md">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-gray-800 text-white p-2 rounded mt-2 w-full text-left"
            >
              Show Playlist Songs
            </button>
            {dropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute bg-gray-700 p-2 rounded mt-1 w-full max-h-60 overflow-y-auto z-10 shadow-lg"
              >
                {playlistSongs.length === 0 ? (
                  <p className="text-gray-300">No songs in the playlist.</p>
                ) : (
                  playlistSongs.map((song) => (
                    <div key={song.id} className="p-2 border-b last:border-b-0">
                      {song.name} - {song.artists[0].name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="w-full max-w-md mt-4">
            {searchResults.map((song) => (
              <div
                key={song.id}
                className="p-2 border rounded bg-gray-800 flex justify-between items-center"
              >
                <span>{song.name} - {song.artists[0].name}</span>
                {!playlistSongs.some((s) => s.uri === song.uri) && (
                  <button
                    onClick={() => addSongToPlaylist(song)}
                    className="bg-green-500 px-2 py-1 rounded"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
