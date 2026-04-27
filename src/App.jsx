import { useState, useEffect } from "react";

const MOODS = ["✨ Euforico","🌙 Malinconico","🔥 Rabbioso","💭 Nostalgico","❤️ Romantico","🌊 Sognante","⚡ Energico","🌧️ Triste","🎭 Ironico","🕊️ Sereno"];
const LANGUAGES = ["Italiano","English","Português","Español","Deutsch","Français","Napoletano"];
const GENRES = ["Pop","Rock","Hip-Hop","R&B","Elettronica","Folk","Jazz","Metal","Reggae","Classica","Indie","Blues","Country","Trap","Bossa Nova","Flamenco"];

const NOTES_KEY = "sb_notes_v3";
const SONGS_KEY = "sb_songs_v3";

function dbGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function dbSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const C = {
  bg: "#0e0b07", card: "rgba(255,255,255,0.03)", border: "#2a1f0f",
  gold: "#c8993a", goldBg: "rgba(200,153,58,0.15)", goldBorder: "rgba(200,153,58,0.5)",
  text: "#e8d5b0", muted: "#7a6045", dim: "#4a3a28",
  green: "#6a9a5a", blue: "#5a8aaa",
};

const chip = (active) => ({
  borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer",
  fontFamily: "inherit", border: "1px solid", transition: "all 0.15s",
  background: active ? C.goldBg : C.card,
  borderColor: active ? C.gold : C.border,
  color: active ? C.gold : C.muted,
});
const ta = {
  width: "100%", background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15,
  lineHeight: 1.6, resize: "none", fontFamily: "inherit", boxSizing: "border-box", outline: "none",
};
const lbl = { display: "block", fontSize: 11, color: C.muted, letterSpacing: "1.5px", marginBottom: 8, textTransform: "uppercase" };
const section = { marginBottom: 20 };
const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 };
const cardHead = (color) => ({
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
  background: color === C.gold ? "rgba(200,153,58,0.08)" : color === C.green ? "rgba(106,154,90,0.08)" : "rgba(90,138,170,0.08)"
});

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  function copy() { navigator.clipboard.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 2000); }
  return (
    <button onClick={copy} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 14px", color: ok ? C.gold : C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
      {ok ? "✓ Copiato!" : "Copia"}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState("notebook");
  const [notes, setNotes] = useState([]);
  const [songs, setSongs] = useState([]);
  const [booting, setBooting] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [noteMood, setNoteMood] = useState("");
  const [noteUrl, setNoteUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [studioMode, setStudioMode] = useState("free");
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [freeIdea, setFreeIdea] = useState("");
  const [language, setLanguage] = useState("Italiano");
  const [genre, setGenre] = useState("");
  const [studioMood, setStudioMood] = useState("");
  const [extra, setExtra] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [viewSong, setViewSong] = useState(null);

  useEffect(() => {
    setNotes(dbGet(NOTES_KEY));
    setSongs(dbGet(SONGS_KEY));
    setBooting(false);
  }, []);

  useEffect(() => { if (!booting) dbSet(NOTES_KEY, notes); }, [notes, booting]);
  useEffect(() => { if (!booting) dbSet(SONGS_KEY, songs); }, [songs, booting]);

  function addNote() {
    if (!noteText.trim() && !noteUrl.trim()) return;
    setNotes(prev => [{ id: Date.now(), text: noteText.trim(), mood: noteMood, photo: noteUrl.trim(), date: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) }, ...prev]);
    setNoteText(""); setNoteMood(""); setNoteUrl(""); setShowUrlInput(false);
  }

  async function generate() {
    setGenerating(true); setResult(null); setErr("");
    let context = "";
    if (studioMode === "fromnote" && selectedNoteId) {
      const n = notes.find(x => x.id === selectedNoteId);
      if (n) context = `"${n.text}"${n.mood ? ` | Mood: ${n.mood}` : ""}`;
    } else context = freeIdea;

    const prompt = `Sei un co-autore musicale esperto. Crea una canzone completa con questi parametri:
IDEA: ${context}${extra ? `\nAGGIUNTE: ${extra}` : ""}
LINGUA: ${language} | GENERE: ${genre || "libero"} | MOOD: ${studioMood || "libero"}

Rispondi ESATTAMENTE in questo formato:

===TITOLO===
[titolo originale ed evocativo]

===STYLE===
[prompt Suno in inglese, una riga di descrittori separati da virgole: genere, mood, strumenti, voce, BPM, era. NON citare artisti]

===LYRICS===
[testi in ${language} con metatag Suno: [Intro] [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Chorus] [Outro]. Ad-libs tra parentesi tonde]`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error?.message || `HTTP ${res.status}`);
      const data = await res.json();
      const full = data.content?.map(b => b.text || "").join("\n") || "";
      const title = full.match(/===TITOLO===([\s\S]*?)(?:===STYLE===|$)/)?.[1]?.trim() || "Nuova canzone";
      const style = full.match(/===STYLE===([\s\S]*?)(?:===LYRICS===|$)/)?.[1]?.trim() || "";
      const lyrics = full.match(/===LYRICS===([\s\S]*)$/)?.[1]?.trim() || full;
      const song = { id: Date.now(), title, style, lyrics, genre: genre || "Libero", mood: studioMood, language, date: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) };
      setSongs(prev => [song, ...prev]);
      setResult(song);
    } catch (e) { setErr(`Errore: ${e.message}`); }
    setGenerating(false);
  }

  const selectedNote = notes.find(n => n.id === selectedNoteId);
  const canGen = !generating && (studioMode === "free" ? freeIdea.trim().length > 0 : !!selectedNoteId);

  if (booting) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.gold, fontSize: 32 }}>♪</div></div>;

  if (viewSong) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 0 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 0" }}>
          <button onClick={() => setViewSong(null)} style={{ background: "none", border: "none", color: C.gold, fontSize: 22, cursor: "pointer", padding: 0 }}>←</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: "normal", color: C.text, flex: 1 }}>{viewSong.title}</h2>
        </div>
        <div style={{ padding: "8px 16px 0", fontSize: 12, color: C.dim }}>{viewSong.date} · {viewSong.language} · {viewSong.genre}</div>
        <div style={{ padding: "20px 16px 0" }}>
          <div style={card}><div style={cardHead(C.gold)}><span style={{ fontSize: 12, color: C.gold, letterSpacing: "1px" }}>🎵 TITOLO</span><CopyBtn text={viewSong.title} /></div><div style={{ padding: "14px 16px", fontSize: 20, color: C.gold, fontStyle: "italic" }}>{viewSong.title}</div></div>
          <div style={card}><div style={cardHead(C.blue)}><span style={{ fontSize: 12, color: C.blue, letterSpacing: "1px" }}>🎛️ STYLE PROMPT</span><CopyBtn text={viewSong.style} /></div><div style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "#8aaa7a", fontStyle: "italic" }}>{viewSong.style}</div></div>
          <div style={card}><div style={cardHead(C.green)}><span style={{ fontSize: 12, color: C.green, letterSpacing: "1px" }}>📝 LYRICS</span><CopyBtn text={viewSong.lyrics} /></div><pre style={{ margin: 0, padding: "14px 16px", fontSize: 13, lineHeight: 1.9, color: C.text, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", maxHeight: 420, overflowY: "auto" }}>{viewSong.lyrics}</pre></div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ padding: "24px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <span style={{ fontSize: 24, color: C.gold }}>♪</span>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: "normal", letterSpacing: "3px" }}>SONGBOOK</h1>
          </div>
          <p style={{ margin: "0 0 20px 34px", fontSize: 12, color: C.muted, letterSpacing: "1px" }}>taccuino creativo & studio</p>
        </div>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20, position: "sticky", top: 0, background: C.bg, zIndex: 10 }}>
          {[["notebook","📒 Taccuino"],["studio","🎛️ Studio"],["songs","🎵 Canzoni"]].map(([key, l]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "12px 4px", fontSize: 13, color: tab === key ? C.gold : C.muted, borderBottom: tab === key ? `2px solid ${C.gold}` : "2px solid transparent", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>
        <div style={{ padding: "0 16px 100px" }}>

          {tab === "notebook" && (
            <div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <label style={lbl}>La tua idea</label>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Un'emozione, una scena, una frase..." rows={4} style={{ ...ta, marginBottom: 14 }} />
                <label style={lbl}>Mood</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {MOODS.map(m => <button key={m} onClick={() => setNoteMood(noteMood === m ? "" : m)} style={chip(noteMood === m)}>{m}</button>)}
                </div>
                <button onClick={() => setShowUrlInput(!showUrlInput)} style={{ background: "none", border: `1px dashed ${C.border}`, borderRadius: 8, padding: "8px 14px", color: showUrlInput ? C.gold : C.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", marginBottom: showUrlInput ? 10 : 0, width: "100%" }}>
                  🖼️ {showUrlInput ? "Nascondi URL foto" : "Aggiungi foto (URL)"}
                </button>
                {showUrlInput && <input value={noteUrl} onChange={e => setNoteUrl(e.target.value)} placeholder="Incolla l'URL di un'immagine..." style={{ ...ta, fontSize: 13, padding: "10px 12px" }} />}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button onClick={addNote} disabled={!noteText.trim() && !noteUrl.trim()} style={{ background: C.goldBg, border: `1px solid ${C.gold}`, borderRadius: 10, padding: "10px 24px", color: C.gold, cursor: "pointer", fontSize: 14, fontFamily: "inherit", opacity: (!noteText.trim() && !noteUrl.trim()) ? 0.4 : 1 }}>Salva appunto</button>
                </div>
              </div>
              {notes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: C.dim }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div><p style={{ fontSize: 14 }}>Nessun appunto ancora.<br />Cattura la tua prima ispirazione.</p></div>
              ) : notes.map(note => (
                <div key={note.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: C.dim }}>{note.date}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setTab("studio"); setStudioMode("fromnote"); setSelectedNoteId(note.id); }} style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 6, padding: "3px 10px", color: C.gold, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>→ Studio</button>
                      <button onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 16 }}>✕</button>
                    </div>
                  </div>
                  {note.photo && <img src={note.photo} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, marginBottom: 8, display: "block" }} onError={e => e.target.style.display = "none"} />}
                  {note.mood && <span style={{ fontSize: 12, color: C.gold, background: C.goldBg, padding: "2px 10px", borderRadius: 10, display: "inline-block", marginBottom: 6 }}>{note.mood}</span>}
                  {note.text && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#c8aa80" }}>{note.text}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === "studio" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[["free","✏️ Idea libera"],["fromnote",`📒 Da appunto${notes.length > 0 ? ` (${notes.length})` : ""}`]].map(([key, l]) => (
                  <button key={key} onClick={() => setStudioMode(key)} style={{ flex: 1, ...chip(studioMode === key), borderRadius: 10, padding: "11px 8px", fontSize: 13 }}>{l}</button>
                ))}
              </div>
              {studioMode === "free" ? (
                <div style={section}>
                  <label style={lbl}>La tua idea</label>
                  <textarea value={freeIdea} onChange={e => setFreeIdea(e.target.value)} placeholder="Descrivi la canzone che vuoi creare..." rows={4} style={ta} />
                </div>
              ) : (
                <div style={section}>
                  <label style={lbl}>Scegli un appunto</label>
                  {notes.length === 0 ? (
                    <div style={{ padding: 16, border: `1px dashed ${C.border}`, borderRadius: 10, color: C.dim, fontSize: 13, textAlign: "center" }}>Nessun appunto. Vai nel Taccuino!</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
                      {notes.map(n => (
                        <button key={n.id} onClick={() => setSelectedNoteId(n.id)} style={{ background: selectedNoteId === n.id ? C.goldBg : C.card, border: selectedNoteId === n.id ? `1px solid ${C.gold}` : `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", textAlign: "left", color: selectedNoteId === n.id ? C.text : C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start" }}>
                          {n.photo && <img src={n.photo} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
                          <div><span style={{ color: C.dim, fontSize: 11 }}>{n.date}{n.mood ? ` · ${n.mood}` : ""}</span><br />{n.text?.slice(0, 70)}{n.text?.length > 70 ? "..." : ""}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedNote && (<><label style={lbl}>Aggiunte / variazioni</label><textarea value={extra} onChange={e => setExtra(e.target.value)} placeholder="Vuoi aggiungere qualcosa?" rows={2} style={ta} /></>)}
                </div>
              )}
              <div style={section}>
                <label style={lbl}>Lingua</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{LANGUAGES.map(l => <button key={l} onClick={() => setLanguage(l)} style={chip(language === l)}>{l}</button>)}</div>
              </div>
              <div style={section}>
                <label style={lbl}>Genere (opzionale)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{GENRES.map(g => <button key={g} onClick={() => setGenre(genre === g ? "" : g)} style={chip(genre === g)}>{g}</button>)}</div>
              </div>
              <div style={section}>
                <label style={lbl}>Mood (opzionale)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{MOODS.map(m => <button key={m} onClick={() => setStudioMood(studioMood === m ? "" : m)} style={chip(studioMood === m)}>{m}</button>)}</div>
              </div>
              <button onClick={generate} disabled={!canGen} style={{ width: "100%", padding: "16px", fontSize: 15, letterSpacing: "2px", background: canGen ? C.goldBg : "rgba(200,153,58,0.04)", border: `1px solid ${canGen ? C.gold : C.border}`, borderRadius: 12, color: canGen ? C.gold : C.dim, cursor: canGen ? "pointer" : "not-allowed", fontFamily: "inherit", marginBottom: 20 }}>
                {generating ? "⏳  Composizione in corso..." : "✨  GENERA CANZONE"}
              </button>
              {err && <div style={{ background: "rgba(200,60,60,0.1)", border: "1px solid rgba(200,60,60,0.3)", borderRadius: 10, padding: "12px 16px", color: "#e08080", fontSize: 13, marginBottom: 16 }}>{err}</div>}
              {result && (
                <div>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 22, color: C.gold, fontStyle: "italic", marginBottom: 4 }}>"{result.title}"</div>
                    <div style={{ fontSize: 12, color: C.dim }}>Salvata nello storico Canzoni</div>
                  </div>
                  <div style={card}><div style={cardHead(C.gold)}><span style={{ fontSize: 12, color: C.gold, letterSpacing: "1px" }}>🎵 TITOLO</span><CopyBtn text={result.title} /></div><div style={{ padding: "14px 16px", fontSize: 18, color: C.gold, fontStyle: "italic" }}>{result.title}</div></div>
                  <div style={card}><div style={cardHead(C.blue)}><span style={{ fontSize: 12, color: C.blue, letterSpacing: "1px" }}>🎛️ STYLE PROMPT</span><CopyBtn text={result.style} /></div><div style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "#8aaa7a", fontStyle: "italic" }}>{result.style}</div></div>
                  <div style={card}><div style={cardHead(C.green)}><span style={{ fontSize: 12, color: C.green, letterSpacing: "1px" }}>📝 LYRICS</span><CopyBtn text={result.lyrics} /></div><pre style={{ margin: 0, padding: "14px 16px", fontSize: 13, lineHeight: 1.9, color: C.text, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", maxHeight: 400, overflowY: "auto" }}>{result.lyrics}</pre></div>
                </div>
              )}
            </div>
          )}

          {tab === "songs" && (
            <div>
              {songs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: C.dim }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎶</div><p style={{ fontSize: 14 }}>Nessuna canzone generata ancora.<br />Vai nello Studio e crea!</p></div>
              ) : songs.map(song => (
                <button key={song.id} onClick={() => setViewSong(song)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 12, padding: "16px", marginBottom: 12, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text }}>
                  <div style={{ fontSize: 17, color: C.gold, fontStyle: "italic", marginBottom: 6 }}>"{song.title}"</div>
                  <div style={{ fontSize: 12, color: C.dim }}>{song.date} · {song.language}{song.genre && song.genre !== "Libero" ? ` · ${song.genre}` : ""}{song.mood ? ` · ${song.mood}` : ""}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>{song.lyrics?.slice(0, 80)}...</div>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
