// Gemeinsame Daten-Logik für alle Seiten von „Via Tim ad Romam“
window.ViaTim = (() => {
  // Lektionsdateien – für eine neue Lektion hier eine Zeile ergänzen
  const FILES = [
    'words_8.json',
    'words_9.json',
  ];
  const SELECTION_KEY = 'via-tim-auswahl';
  const ALL = 'all';

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const arr = v => (Array.isArray(v) ? v : []);

  const shuffle = list => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const loadFile = file => fetch(file).then(r => {
    if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
    return r.json().catch(() => { throw new Error(`${file}: kein gültiges JSON`); });
  });

  // Lädt alle Lektionen → { lessons: [{nr, titel, vokabeln, dativ_*}], failed: [Fehlertexte] }
  async function loadLessons() {
    const results = await Promise.allSettled(FILES.map(loadFile));
    const lessons = [];
    const failed = [];
    results.forEach((res, i) => {
      if (res.status === 'rejected') return failed.push(res.reason.message);
      const d = res.value;
      if (!d || !Array.isArray(d.vokabeln)) return failed.push(`${FILES[i]}: unerwartetes Format`);
      const nr = String(d.lektion ?? FILES[i]);
      lessons.push({
        nr,
        titel: d.titel || `Lektion ${nr}`,
        vokabeln: d.vokabeln.filter(w => w && w.latin && w.german),
        dativ_substantive: arr(d.dativ_substantive),
        dativ_pronomen: arr(d.dativ_pronomen),
        dativ_verben: arr(d.dativ_verben),
        adjektive: arr(d.adjektive),
        dativ_exercises: d.dativ_exercises || {},
      });
    });
    lessons.sort((a, b) => a.nr.localeCompare(b.nr, 'de', { numeric: true }));
    if (!lessons.length) throw new Error(failed.join(' · ') || 'Keine Lektionen gefunden');
    return { lessons, failed };
  }

  // ---------- Lektionsauswahl: 'all' oder eine Lektionsnummer ----------
  function getSelection() {
    const fromUrl = new URLSearchParams(location.search).get('l');
    if (fromUrl) return fromUrl;
    try { return localStorage.getItem(SELECTION_KEY) || ALL; } catch (e) { return ALL; }
  }

  function setSelection(sel) {
    try { localStorage.setItem(SELECTION_KEY, sel); } catch (e) {}
  }

  // Liefert die gewählten Lektionen; unbekannte Auswahl → alle
  function selected(lessons, sel) {
    const hit = lessons.filter(l => l.nr === sel);
    return sel !== ALL && hit.length ? hit : lessons;
  }

  function selectionLabel(lessons, sel) {
    const list = selected(lessons, sel);
    if (list.length === 1) return list[0].titel;
    return lessons.length === 2 ? `${lessons[0].titel} + ${lessons[1].nr}` : 'Alle Lektionen';
  }

  function showLoadError(box, err) {
    box.classList.remove('hidden');
    box.innerHTML = '<strong>Die Lektionsdateien konnten nicht geladen werden.</strong><br>' +
      'Bitte die App über einen lokalen Server starten, z. B. <code>npx serve</code> oder ' +
      '<code>python3 -m http.server</code>, und dann <code>http://localhost:…</code> öffnen.<br>' +
      '<span class="text-xs opacity-70">Details: ' + esc(err.message) + '</span>';
  }

  function showPartialError(box, failed) {
    if (!failed.length) return;
    box.classList.remove('hidden');
    box.innerHTML = '<strong>Einige Dateien konnten nicht geladen werden:</strong> ' + esc(failed.join(' · '));
  }

  return { ALL, esc, shuffle, loadLessons, getSelection, setSelection, selected, selectionLabel, showLoadError, showPartialError };
})();
