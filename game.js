(function(){
  "use strict";

  // =====================================================================
  // DADOS DAS SELEÇÕES
  // =====================================================================
  const TEAMS = [
    { name:'Brasil',      code:'BRA', primary:'#ffdf00', secondary:'#009c3b' },
    { name:'Argentina',   code:'ARG', primary:'#75aadb', secondary:'#ffffff' },
    { name:'Uruguai',     code:'URU', primary:'#5cb3e6', secondary:'#0a2a4a' },
    { name:'Itália',      code:'ITA', primary:'#0066cc', secondary:'#ffffff' },
    { name:'Alemanha',    code:'GER', primary:'#f2f2f2', secondary:'#1a1a1a' },
    { name:'Inglaterra',  code:'ENG', primary:'#ffffff', secondary:'#c8102e' },
    { name:'França',      code:'FRA', primary:'#0055a4', secondary:'#ef4135' },
    { name:'Espanha',     code:'ESP', primary:'#c60b1e', secondary:'#ffc400' }
  ];
  const TEAM_NAMES = TEAMS.map(t=>t.name);
  function teamByName(n){ return TEAMS.find(t=>t.name===n); }
  // concordância de gênero das seleções em português: "o Brasil"/"o Uruguai" (masculino),
  // as demais são femininas ("a Argentina", "a Itália" etc.)
  const MASCULINE_TEAMS = ['Brasil','Uruguai'];
  function prepositionFor(teamName){ return MASCULINE_TEAMS.includes(teamName) ? 'pelo' : 'pela'; }

  // Bandeiras simplificadas em SVG (sem depender de arquivos externos)
  function flagSVG(code, w, h){
    w = w||26; h = h||17;
    const bodies = {
      BRA: `<rect width="${w}" height="${h}" fill="#009c3b"/><polygon points="${w*0.5},${h*0.1} ${w*0.93},${h*0.5} ${w*0.5},${h*0.9} ${w*0.07},${h*0.5}" fill="#ffdf00"/><circle cx="${w*0.5}" cy="${h*0.5}" r="${h*0.17}" fill="#002776"/>`,
      ARG: `<rect width="${w}" height="${h*0.34}" y="0" fill="#75aadb"/><rect width="${w}" height="${h*0.34}" y="${h*0.33}" fill="#fff"/><rect width="${w}" height="${h*0.34}" y="${h*0.66}" fill="#75aadb"/><circle cx="${w*0.5}" cy="${h*0.5}" r="${h*0.14}" fill="#f6b40e"/>`,
      URU: `<rect width="${w}" height="${h}" fill="#fff"/><rect width="${w}" height="${h/9}" y="${h/9}" fill="#5cb3e6"/><rect width="${w}" height="${h/9}" y="${h*3/9}" fill="#5cb3e6"/><rect width="${w}" height="${h/9}" y="${h*5/9}" fill="#5cb3e6"/><rect width="${w}" height="${h/9}" y="${h*7/9}" fill="#5cb3e6"/><rect width="${w*0.4}" height="${h*0.4}" fill="#fff" stroke="#5cb3e6" stroke-width="0.5"/><circle cx="${w*0.2}" cy="${h*0.2}" r="${h*0.11}" fill="#f6b40e"/>`,
      ITA: `<rect width="${w/3}" height="${h}" x="0" fill="#009246"/><rect width="${w/3}" height="${h}" x="${w/3}" fill="#fff"/><rect width="${w/3}" height="${h}" x="${w*2/3}" fill="#ce2b37"/>`,
      GER: `<rect width="${w}" height="${h/3}" y="0" fill="#000"/><rect width="${w}" height="${h/3}" y="${h/3}" fill="#dd0000"/><rect width="${w}" height="${h/3}" y="${h*2/3}" fill="#ffce00"/>`,
      ENG: `<rect width="${w}" height="${h}" fill="#fff"/><rect x="${w*0.42}" width="${w*0.16}" height="${h}" fill="#ce1124"/><rect y="${h*0.42}" width="${w}" height="${h*0.16}" fill="#ce1124"/>`,
      FRA: `<rect width="${w/3}" height="${h}" x="0" fill="#0055a4"/><rect width="${w/3}" height="${h}" x="${w/3}" fill="#fff"/><rect width="${w/3}" height="${h}" x="${w*2/3}" fill="#ef4135"/>`,
      ESP: `<rect width="${w}" height="${h}" fill="#c60b1e"/><rect width="${w}" height="${h/2}" y="${h/4}" fill="#ffc400"/>`
    };
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:inline-block;vertical-align:middle;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,0.18);flex-shrink:0;">${bodies[code]||''}</svg>`;
  }
  function flagForTeam(name, w, h){
    const t = teamByName(name);
    return t ? flagSVG(t.code, w, h) : '';
  }

  // =====================================================================
  // LÓGICA PURA: liga (turno e returno) e torneio (mata-mata)
  // =====================================================================
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  function generateDoubleRoundRobin(teamNames){
    const n = teamNames.length;
    const fixed = teamNames[0];
    let rotating = teamNames.slice(1);
    const rounds = [];
    for(let r=0;r<n-1;r++){
      const roundTeams = [fixed, ...rotating];
      const roundMatches = [];
      for(let i=0;i<n/2;i++) roundMatches.push({home: roundTeams[i], away: roundTeams[n-1-i]});
      rounds.push(roundMatches);
      rotating.unshift(rotating.pop());
    }
    const secondLeg = rounds.map(round => round.map(m=>({home:m.away, away:m.home})));
    return rounds.concat(secondLeg);
  }

  function updateStandings(standings, home, away, sh, sa){
    if(!standings[home]) standings[home]={pts:0,w:0,d:0,l:0,gf:0,ga:0};
    if(!standings[away]) standings[away]={pts:0,w:0,d:0,l:0,gf:0,ga:0};
    standings[home].gf+=sh; standings[home].ga+=sa;
    standings[away].gf+=sa; standings[away].ga+=sh;
    if(sh>sa){ standings[home].w++; standings[home].pts+=3; standings[away].l++; }
    else if(sh<sa){ standings[away].w++; standings[away].pts+=3; standings[home].l++; }
    else { standings[home].d++; standings[away].d++; standings[home].pts+=1; standings[away].pts+=1; }
  }

  function simulateKOMatch(teamA, teamB){
    let scoreA = Math.floor(Math.random()*4), scoreB = Math.floor(Math.random()*4);
    if(scoreA===scoreB) scoreA += 1;
    return { scoreA, scoreB, winner: scoreA>scoreB?teamA:teamB };
  }
  function simulateLeagueMatch(teamA, teamB, rivalTeam){
    if(rivalTeam && (teamA===rivalTeam || teamB===rivalTeam)){
      // a seleção perseguidora sempre vence os jogos simulados dela (nunca contra o humano,
      // já que essa partida é sempre jogada de verdade) — mantém a pressão na tabela.
      const rivalIsA = teamA===rivalTeam;
      const winnerScore = 2 + Math.floor(Math.random()*3); // 2 a 4
      const loserScore = Math.floor(Math.random()*winnerScore); // sempre menor que o vencedor
      return rivalIsA ? { scoreA: winnerScore, scoreB: loserScore } : { scoreA: loserScore, scoreB: winnerScore };
    }
    return { scoreA: Math.floor(Math.random()*4), scoreB: Math.floor(Math.random()*4) };
  }

  function startNewTournament(humanTeamName){
    const slots = shuffle(TEAM_NAMES);
    const qf = [
      {home:slots[0],away:slots[1],winner:null,scoreHome:null,scoreAway:null},
      {home:slots[2],away:slots[3],winner:null,scoreHome:null,scoreAway:null},
      {home:slots[4],away:slots[5],winner:null,scoreHome:null,scoreAway:null},
      {home:slots[6],away:slots[7],winner:null,scoreHome:null,scoreAway:null}
    ];
    const tournament = { active:true, humanTeam:humanTeamName, stage:'quarterfinals', quarterfinals:qf, semifinals:null, final:null, champion:null };
    qf.forEach(mm=>{
      if(mm.home!==humanTeamName && mm.away!==humanTeamName){
        const r=simulateKOMatch(mm.home,mm.away); mm.winner=r.winner; mm.scoreHome=r.scoreA; mm.scoreAway=r.scoreB;
      }
    });
    return tournament;
  }

  function autoCompleteTournament(tournament){
    while(true){
      const stageMatches = tournament.stage==='final' ? [tournament.final] : tournament[tournament.stage];
      stageMatches.forEach(mm=>{
        if(mm.winner===null){ const r=simulateKOMatch(mm.home,mm.away); mm.winner=r.winner; mm.scoreHome=r.scoreA; mm.scoreAway=r.scoreB; }
      });
      if(tournament.stage==='final'){ tournament.champion=tournament.final.winner; tournament.active=false; break; }
      const winners = stageMatches.map(m=>m.winner);
      if(tournament.stage==='quarterfinals'){
        tournament.semifinals=[
          {home:winners[0],away:winners[1],winner:null,scoreHome:null,scoreAway:null},
          {home:winners[2],away:winners[3],winner:null,scoreHome:null,scoreAway:null}
        ];
        tournament.stage='semifinals';
      } else if(tournament.stage==='semifinals'){
        tournament.final={home:winners[0],away:winners[1],winner:null,scoreHome:null,scoreAway:null};
        tournament.stage='final';
      }
    }
  }

  function registerHumanMatchResult(tournament, outcome, scoreHuman, scoreAI){
    const humanTeam = tournament.humanTeam;
    const stageMatches = tournament.stage==='final' ? [tournament.final] : tournament[tournament.stage];
    const m = stageMatches.find(x=>x && x.winner===null && (x.home===humanTeam || x.away===humanTeam));
    m.winner = outcome==='win' ? humanTeam : (m.home===humanTeam ? m.away : m.home);
    m.scoreHome = m.home===humanTeam?scoreHuman:scoreAI;
    m.scoreAway = m.away===humanTeam?scoreHuman:scoreAI;
    const humanAlive = outcome==='win';

    if(tournament.stage==='final'){
      tournament.champion = m.winner; tournament.active = false;
      return { done:true, champion:m.winner, titleWon:humanAlive };
    }
    stageMatches.forEach(mm=>{ if(mm.winner===null){ const r=simulateKOMatch(mm.home,mm.away); mm.winner=r.winner; mm.scoreHome=r.scoreA; mm.scoreAway=r.scoreB; } });
    const winners = stageMatches.map(x=>x.winner);
    if(tournament.stage==='quarterfinals'){
      tournament.semifinals=[
        {home:winners[0],away:winners[1],winner:null,scoreHome:null,scoreAway:null},
        {home:winners[2],away:winners[3],winner:null,scoreHome:null,scoreAway:null}
      ];
      tournament.stage='semifinals';
    } else {
      tournament.final={home:winners[0],away:winners[1],winner:null,scoreHome:null,scoreAway:null};
      tournament.stage='final';
    }
    if(!humanAlive){
      autoCompleteTournament(tournament);
      return { done:true, champion:tournament.champion, titleWon:false, eliminated:true };
    }
    const newStageMatches = tournament.stage==='final' ? [tournament.final] : tournament[tournament.stage];
    newStageMatches.forEach(mm=>{
      if(mm.winner===null && mm.home!==humanTeam && mm.away!==humanTeam){
        const r=simulateKOMatch(mm.home,mm.away); mm.winner=r.winner; mm.scoreHome=r.scoreA; mm.scoreAway=r.scoreB;
      }
    });
    return { done:false };
  }

  function startNewLeague(humanTeamName){
    const rounds = generateDoubleRoundRobin(TEAM_NAMES);
    const standings = {};
    TEAM_NAMES.forEach(t=>standings[t]={pts:0,w:0,d:0,l:0,gf:0,ga:0});
    const otherTeams = TEAM_NAMES.filter(t=>t!==humanTeamName);
    const rivalTeam = otherTeams[Math.floor(Math.random()*otherTeams.length)];
    return { active:true, humanTeam:humanTeamName, rivalTeam, rounds, roundIndex:0, standings, season:1, lastRoundResults:null, lastRoundNumber:null };
  }

  function getHumanFixtureForRound(league){
    const round = league.rounds[league.roundIndex];
    return round.find(m=>m.home===league.humanTeam || m.away===league.humanTeam);
  }

  // simula os outros jogos da rodada atual (todos exceto o do humano) e guarda os
  // resultados pra exibir visualmente depois.
  function simulateRestOfRound(league){
    const round = league.rounds[league.roundIndex];
    const results = [];
    round.forEach(m=>{
      if(m.home!==league.humanTeam && m.away!==league.humanTeam){
        const r = simulateLeagueMatch(m.home, m.away, league.rivalTeam);
        updateStandings(league.standings, m.home, m.away, r.scoreA, r.scoreB);
        results.push({ home:m.home, away:m.away, scoreHome:r.scoreA, scoreAway:r.scoreB });
      }
    });
    league.lastRoundResults = results; // a partida do humano é adicionada em concludeLeagueRound
    league.lastRoundNumber = league.roundIndex+1;
  }

  function concludeLeagueRound(league, scoreHuman, scoreAI){
    const fixture = getHumanFixtureForRound(league);
    // o humano nem sempre é o time "mandante" da rodada — mapeia o placar pro lado certo
    const scoreHome = fixture.home===league.humanTeam ? scoreHuman : scoreAI;
    const scoreAway = fixture.away===league.humanTeam ? scoreHuman : scoreAI;
    updateStandings(league.standings, fixture.home, fixture.away, scoreHome, scoreAway);
    if(league.lastRoundResults){
      league.lastRoundResults.push({ home:fixture.home, away:fixture.away, scoreHome, scoreAway, isHumanMatch:true });
    }
    league.roundIndex++;
    const seasonOver = league.roundIndex >= league.rounds.length;
    let champion = null;
    if(seasonOver){
      const ranked = rankStandings(league.standings);
      champion = ranked[0][0];
      league.active = false;
      league.champion = champion;
    }
    return { seasonOver, champion };
  }

  function rankStandings(standings){
    return Object.entries(standings).sort((a,b)=>{
      if(b[1].pts !== a[1].pts) return b[1].pts-a[1].pts;
      const gdA = a[1].gf-a[1].ga, gdB = b[1].gf-b[1].ga;
      if(gdB !== gdA) return gdB-gdA;
      return b[1].gf-a[1].gf;
    });
  }

  // =====================================================================
  // PERSISTÊNCIA (localStorage) — sem senha: o navegador já guarda tudo
  // sozinho, então dá pra continuar depois sem precisar digitar nada.
  // =====================================================================
  const LS_HISTORY = 'airhockey_history_v1';
  const LS_TOURNAMENT = 'airhockey_tournament_v1';
  const LS_LEAGUE = 'airhockey_league_v1';

  function loadJSON(key, fallback){
    try{ const raw = localStorage.getItem(key); if(raw) return JSON.parse(raw); }catch(e){}
    return fallback;
  }
  function saveJSON(key, obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(e){} }

  let history = loadJSON(LS_HISTORY, { tournamentTitles:0, leagueTitles:0, wins:0, draws:0, losses:0 });
  let tournament = loadJSON(LS_TOURNAMENT, null);
  let league = loadJSON(LS_LEAGUE, null);

  function saveHistory(){ saveJSON(LS_HISTORY, history); renderHistory(); }
  function saveTournament(){ saveJSON(LS_TOURNAMENT, tournament); }
  function saveLeague(){ saveJSON(LS_LEAGUE, league); }
  function clearTournament(){ tournament = null; try{ localStorage.removeItem(LS_TOURNAMENT); }catch(e){} }
  function clearLeague(){ league = null; try{ localStorage.removeItem(LS_LEAGUE); }catch(e){} }

  // =====================================================================
  // MÚSICA (Web Audio) — batida dance/techno de fliperama
  // =====================================================================
  const MusicEngine = (function(){
    let ctx=null, masterGain=null, playing=false, step=0, timer=null, noiseBuffer=null;
    const BPM = 128, STEP_DUR = 60/BPM/4; // semicolcheias
    const STEPS_PER_BAR = 16, BARS = 8, TOTAL_STEPS = STEPS_PER_BAR*BARS;
    const TRACKS = [
      { // Trilha 1
        bass: [220.00,220.00,261.63,220.00, 196.00,196.00,220.00,196.00, 174.61,174.61,196.00,174.61, 196.00,196.00,220.00,246.94],
        stabs: [ [220,261.63,329.63], [196,246.94,293.66], [174.61,220,261.63], [196,246.94,349.23] ]
      },
      { // Trilha 2
        bass: [246.94,246.94,293.66,246.94, 220.00,220.00,246.94,220.00, 196.00,196.00,220.00,196.00, 220.00,220.00,246.94,261.63],
        stabs: [ [246.94,293.66,369.99], [220,261.63,329.63], [196,246.94,293.66], [220,277.18,329.63] ]
      },
      { // Trilha 3
        bass: [174.61,174.61,196.00,174.61, 155.56,155.56,174.61,155.56, 146.83,146.83,164.81,146.83, 174.61,174.61,196.00,220.00],
        stabs: [ [174.61,220,261.63], [155.56,196.00,233.08], [146.83,185.00,220.00], [174.61,220,277.18] ]
      }
    ];
    let currentTrackIndex = 0;

    function ensureCtx(){
      if(!ctx){
        ctx = new (window.AudioContext||window.webkitAudioContext)();
        masterGain = ctx.createGain(); masterGain.gain.value = 0.16;
        masterGain.connect(ctx.destination);
        const n = ctx.sampleRate*0.3;
        noiseBuffer = ctx.createBuffer(1, n, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for(let i=0;i<n;i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/n, 2);
      }
    }
    function pluck(freq, dur, type, gainVal, delay){
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      const t0 = ctx.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gainVal, t0+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
      osc.connect(g); g.connect(masterGain);
      osc.start(t0); osc.stop(t0+dur+0.02);
    }
    function kick(delay){
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type='sine';
      const t0 = ctx.currentTime + delay;
      osc.frequency.setValueAtTime(150, t0);
      osc.frequency.exponentialRampToValueAtTime(42, t0+0.09);
      g.gain.setValueAtTime(0.9, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0+0.22);
      osc.connect(g); g.connect(masterGain);
      osc.start(t0); osc.stop(t0+0.25);
    }
    function hihat(delay, gainVal){
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer;
      const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7000;
      const g = ctx.createGain();
      const t0 = ctx.currentTime + delay;
      g.gain.setValueAtTime(gainVal, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0+0.045);
      src.connect(hp); hp.connect(g); g.connect(masterGain);
      src.start(t0); src.stop(t0+0.05);
    }
    function currentStep(s){
      const track = TRACKS[currentTrackIndex];
      const bar = Math.floor(s/STEPS_PER_BAR);
      const inBar = s%STEPS_PER_BAR;
      if(inBar%4===0) kick(0);
      if(inBar%4===2) hihat(0, 0.35);
      if(inBar%2===1) hihat(0, 0.12);
      if(inBar%2===0) pluck(track.bass[inBar], STEP_DUR*1.6, 'sawtooth', 0.22, 0);
      if(inBar===0 && bar%2===0){
        const chord = track.stabs[(bar/2)%track.stabs.length];
        chord.forEach(f=>pluck(f, 0.5, 'square', 0.14, 0));
      }
    }
    function setTrack(index){
      currentTrackIndex = index;
      if(playing && timer){ clearTimeout(timer); step = 0; tick(); }
    }
    function tick(){
      if(!playing) return;
      currentStep(step % TOTAL_STEPS);
      step++;
      timer = setTimeout(tick, STEP_DUR*1000);
    }
    function start(){ ensureCtx(); if(ctx.state==='suspended') ctx.resume(); if(playing) return; playing=true; step=0; tick(); }
    function stop(){ playing=false; if(timer) clearTimeout(timer); }
    function blip(freq, type){ ensureCtx(); if(ctx.state==='suspended') ctx.resume(); pluck(freq, 0.16, type||'square', 0.5, 0); }
    function playJingle(result){
      ensureCtx(); if(ctx.state==='suspended') ctx.resume();
      if(result==='win'){ [523.25,659.25,783.99,1046.50].forEach((f,i)=>pluck(f,0.38,'square',0.55,i*0.1)); }
      else if(result==='draw'){ [440,493.88,440].forEach((f,i)=>pluck(f,0.32,'triangle',0.5,i*0.13)); }
      else if(result==='loss'){ [392,349.23,293.66,246.94].forEach((f,i)=>pluck(f,0.42,'triangle',0.55,i*0.12)); }
    }
    function playVictoryFanfare(){
      ensureCtx(); if(ctx.state==='suspended') ctx.resume();
      const majorScale = [523.25,587.33,659.25,698.46,783.99,880.00,987.77,1046.50]; // C5 a C6
      // cascata ascendente de abertura
      for(let i=0;i<16;i++) pluck(majorScale[i%majorScale.length], 0.35, 'square', 0.28, i*0.07);
      // motivo de fanfarra repetido 3 vezes
      const motif = [523.25, 659.25, 783.99, 1046.50];
      for(let rep=0; rep<3; rep++){
        const startDelay = 1.3 + rep*1.15;
        motif.forEach((f,i)=> pluck(f, 0.5, 'square', 0.34-rep*0.03, startDelay + i*0.14));
      }
      // acorde final grande e sustentado
      const finalChordDelay = 5.1;
      [523.25,659.25,783.99,1046.50,1318.51].forEach((f,i)=> pluck(f, 3.4, i%2===0?'square':'triangle', 0.22, finalChordDelay + i*0.03));
      // brilhos agudos espalhados até o fim, lembrando confete/comemoração
      for(let i=0;i<16;i++){
        const f = 1046.50*Math.pow(2, Math.floor(Math.random()*12)/12);
        pluck(f, 0.4, 'triangle', 0.15, 5.6 + Math.random()*4.2);
      }
    }
    return { start, stop, blip, playJingle, playVictoryFanfare, setTrack, get playing(){ return playing; }, get trackIndex(){ return currentTrackIndex; } };
  })();

  // =====================================================================
  // MÚSICA DE FUNDO DO MENU — soul/polifônica, loop de 20s exatos
  // =====================================================================
  const MenuMusic = (function(){
    let ctx=null, masterGain=null, playing=false, step=0, timer=null, noiseBuffer=null;
    const TOTAL_STEPS = 128, STEPS_PER_CHORD = 32; // 4 acordes, 128 passos * ~0.15625s = 20s
    const STEP_DUR = 20/TOTAL_STEPS;
    // progressão quente estilo soul (ii-V-I-vi em Dó maior): Dm7 - G7 - Cmaj7 - Am7
    const PROGRESSION = [
      { chord:[146.83,174.61,220.00,261.63], bass:146.83 }, // Dm7
      { chord:[196.00,246.94,293.66,349.23], bass:196.00 }, // G7
      { chord:[130.81,164.81,196.00,246.94], bass:130.81 }, // Cmaj7
      { chord:[220.00,261.63,329.63,392.00], bass:220.00 }  // Am7
    ];
    function ensureCtx(){
      if(!ctx){
        ctx = new (window.AudioContext||window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.11;
        masterGain.connect(ctx.destination);
        const n = ctx.sampleRate*0.2;
        noiseBuffer = ctx.createBuffer(1, n, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for(let i=0;i<n;i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/n, 3);
      }
    }
    function pad(freq, dur, gainVal, delay){
      const osc = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      filt.type='lowpass'; filt.frequency.value = 1800;
      const g = ctx.createGain();
      osc.type='sine'; osc.frequency.value = freq;
      const t0 = ctx.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gainVal, t0+dur*0.25);
      g.gain.linearRampToValueAtTime(gainVal*0.7, t0+dur*0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
      osc.connect(filt); filt.connect(g); g.connect(masterGain);
      osc.start(t0); osc.stop(t0+dur+0.05);
    }
    function bassNote(freq, dur, delay){
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type='triangle'; osc.frequency.value = freq/2;
      const t0 = ctx.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.3, t0+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
      osc.connect(g); g.connect(masterGain);
      osc.start(t0); osc.stop(t0+dur+0.05);
    }
    function shaker(delay, gainVal){
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer;
      const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value = 4000;
      const g = ctx.createGain();
      const t0 = ctx.currentTime + delay;
      g.gain.setValueAtTime(gainVal, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0+0.09);
      src.connect(hp); hp.connect(g); g.connect(masterGain);
      src.start(t0); src.stop(t0+0.1);
    }
    function currentStep(s){
      const chordIndex = Math.floor(s/STEPS_PER_CHORD);
      const inChordStep = s%STEPS_PER_CHORD;
      const {chord, bass} = PROGRESSION[chordIndex];
      if(inChordStep===0){
        chord.forEach((f,i)=> pad(f, STEPS_PER_CHORD*STEP_DUR*0.95, 0.11, i*0.02));
        bassNote(bass, STEPS_PER_CHORD*STEP_DUR*0.42, 0);
      }
      if(inChordStep===16) bassNote(bass, STEPS_PER_CHORD*STEP_DUR*0.42, 0);
      if(inChordStep%4===2) shaker(0, 0.05);
    }
    function tick(){
      if(!playing) return;
      currentStep(step);
      step = (step+1)%TOTAL_STEPS;
      timer = setTimeout(tick, STEP_DUR*1000);
    }
    function start(){
      ensureCtx();
      if(ctx.state==='suspended') ctx.resume();
      if(playing) return;
      playing = true; step = 0; tick();
    }
    function stop(){ playing = false; if(timer) clearTimeout(timer); }
    return { start, stop, get playing(){ return playing; } };
  })();

  // =====================================================================
  // FÍSICA
  // =====================================================================
  const FIELD_W = 480, FIELD_H = 760, GOAL_W = 190, PUCK_R = 15, PADDLE_R = 32;
  const GOAL_X0 = (FIELD_W-GOAL_W)/2, GOAL_X1 = (FIELD_W+GOAL_W)/2;
  const MAX_SPEED = 1300;
  const CORNER_MARGIN = 75, STALL_SPEED = 32, STALL_TIME_LIMIT = 1.3;
  const AI_ZONE_STALL_SPEED = 20, AI_ZONE_STALL_TIME_LIMIT = 4.0;

  function makeMatchObjects(){
    return {
      puck: { x: FIELD_W/2, y: FIELD_H/2, vx:0, vy:0 },
      top: { x: FIELD_W/2, y: 90, vx:0, vy:0, lastX:FIELD_W/2, lastY:90, aimTimer:0, aimTargetX:FIELD_W/2, errorTimer:0, errorOffsetX:0, touchesInOwnHalf:0, wasTouching:false },
      bottom: { x: FIELD_W/2, y: FIELD_H-90, vx:0, vy:0, lastX:FIELD_W/2, lastY:FIELD_H-90, aimTimer:0, aimTargetX:FIELD_W/2, errorTimer:0, errorOffsetX:0, touchesInOwnHalf:0, wasTouching:false }
    };
  }

  function stepPuck(objs, dt){
    const puck = objs.puck;
    puck.x += puck.vx*dt; puck.y += puck.vy*dt;
    const damp = Math.pow(0.4, dt);
    puck.vx *= damp; puck.vy *= damp;
    if(puck.x - PUCK_R < 0){ puck.x = PUCK_R; puck.vx = Math.abs(puck.vx); }
    if(puck.x + PUCK_R > FIELD_W){ puck.x = FIELD_W-PUCK_R; puck.vx = -Math.abs(puck.vx); }
    const inGoalRange = puck.x > GOAL_X0 && puck.x < GOAL_X1;
    let goal = null;
    if(!inGoalRange){
      if(puck.y - PUCK_R < 0){ puck.y = PUCK_R; puck.vy = Math.abs(puck.vy); }
      if(puck.y + PUCK_R > FIELD_H){ puck.y = FIELD_H-PUCK_R; puck.vy = -Math.abs(puck.vy); }
    } else {
      if(puck.y < -PUCK_R*2) goal = 'top';    // a bola saiu pelo gol de cima
      if(puck.y > FIELD_H+PUCK_R*2) goal = 'bottom'; // a bola saiu pelo gol de baixo
    }
    return goal;
  }

  function resolveCollision(puck, paddle){
    const dx = puck.x-paddle.x, dy = puck.y-paddle.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    const minDist = PUCK_R+PADDLE_R;
    if(dist < minDist){
      const nx=dx/dist, ny=dy/dist;
      const overlap = minDist-dist;
      puck.x += nx*overlap; puck.y += ny*overlap;
      const rvx = puck.vx-paddle.vx, rvy = puck.vy-paddle.vy;
      const velAlongNormal = rvx*nx+rvy*ny;
      if(velAlongNormal<0){
        const impulse = -2*velAlongNormal;
        puck.vx += impulse*nx; puck.vy += impulse*ny;
      }
      puck.vx += paddle.vx*0.75; puck.vy += paddle.vy*0.75;
      const speed = Math.hypot(puck.vx,puck.vy);
      if(speed>MAX_SPEED){ puck.vx*=MAX_SPEED/speed; puck.vy*=MAX_SPEED/speed; }
      return true;
    }
    return false;
  }

  const AI_PROFILES = {
    easy:   { maxSpeed:260, error:34, aggression:0.35, predictLead:0.05 },
    medium: { maxSpeed:400, error:16, aggression:0.62, predictLead:0.16 },
    hard:   { maxSpeed:560, error:5,  aggression:0.88, predictLead:0.30 }
  };

  function updateAIPaddle(paddle, puck, side, difficulty, dt){
    const prof = AI_PROFILES[difficulty];
    const yMin = side==='top' ? PADDLE_R : FIELD_H/2+PADDLE_R;
    const yMax = side==='top' ? FIELD_H/2-PADDLE_R : FIELD_H-PADDLE_R;
    const ownGoalY = side==='top' ? PADDLE_R+10 : FIELD_H-PADDLE_R-10;
    const puckHeadingToAI = side==='top' ? puck.vy < 0 : puck.vy > 0;

    // troca o ponto de mira dentro da boca do gol adversário de tempos em tempos,
    // pra não devolver sempre reto no mesmo lugar (efeito "ping pong").
    paddle.aimTimer -= dt;
    if(paddle.aimTimer<=0){
      paddle.aimTargetX = GOAL_X0 + 16 + Math.random()*(GOAL_W-32);
      paddle.aimTimer = 0.45 + Math.random()*0.65;
    }

    let targetX, targetY;
    if(puckHeadingToAI || (side==='top'? puck.y < FIELD_H*0.62 : puck.y > FIELD_H*0.38)){
      const predX = puck.x + puck.vx*prof.predictLead;
      const predY = puck.y + puck.vy*prof.predictLead*0.5;
      // quanto mais perto do disco (prestes a tocar nele), mais o paddle se desloca
      // pro lado certo pra mandar o disco em direção ao ponto de mira, em vez de só
      // interceptar reto — é isso que gera o ângulo de saída.
      const distToPuck = Math.hypot(puck.x-paddle.x, puck.y-paddle.y);
      const proximity = Math.max(0, Math.min(1, 1 - (distToPuck-70)/220));
      const aimBlend = proximity * (0.22 + prof.aggression*0.3);
      targetX = predX*(1-aimBlend) + paddle.aimTargetX*aimBlend;
      targetY = Math.max(yMin, Math.min(yMax, predY));
    } else {
      targetX = FIELD_W/2 + (puck.x-FIELD_W/2)*0.3;
      targetY = ownGoalY + (side==='top' ? 40 : -40);
    }
    // o "erro" de mira só é sorteado de novo de tempos em tempos, nunca a cada frame —
    // é isso que evita o paddle tremelicar tentando perseguir um alvo que pula toda hora.
    paddle.errorTimer -= dt;
    if(paddle.errorTimer<=0){
      paddle.errorOffsetX = (Math.random()*2-1)*prof.error*0.5;
      paddle.errorTimer = 0.18 + Math.random()*0.22;
    }
    targetX += paddle.errorOffsetX;
    targetX = Math.max(PADDLE_R, Math.min(FIELD_W-PADDLE_R, targetX));
    targetY = Math.max(yMin, Math.min(yMax, targetY));

    const dx = targetX-paddle.x, dy = targetY-paddle.y;
    const dist = Math.hypot(dx,dy) || 0.0001;
    const step = Math.min(dist, prof.maxSpeed*dt);
    const nx = dx/dist, ny = dy/dist;
    const newX = paddle.x + nx*step, newY = paddle.y + ny*step;
    paddle.vx = (newX-paddle.x)/dt; paddle.vy = (newY-paddle.y)/dt;
    paddle.x = Math.max(PADDLE_R, Math.min(FIELD_W-PADDLE_R, newX));
    paddle.y = Math.max(yMin, Math.min(yMax, newY));
  }

  // =====================================================================
  // ORIENTAÇÃO DA CÂMERA — mapeamento canônico<->tela por transposição
  // =====================================================================
  function toScreen(cx,cy){ return [cx,cy]; }
  function toCanonical(sx,sy){ return [sx,sy]; }
  function canvasSize(){ return [FIELD_W,FIELD_H]; }

  // =====================================================================
  // ESTADO GERAL DA APLICAÇÃO
  // =====================================================================
  let difficulty = 'medium';
  const matchDuration = 120; // segundos — 2 minutos fixos, sem opção de escolha
  let ownGoalRuleEnabled = true; // On: gol contra com 2+ toques do defensor na própria defesa não vale
  let musicEnabled = false;
  let musicTrackRandom = false; // se true, sorteia uma trilha nova a cada partida
  let currentTeamPickFriendly = { human: null, ai: null };
  let currentTeamPickSetup = null; // usado ao criar torneio/liga

  let match = null; // objeto da partida em andamento

  // =====================================================================
  // RENDER: MENU
  // =====================================================================
  const modePanelHost = document.getElementById('modePanelHost');
  const historyGrid = document.getElementById('historyGrid');
  const historyGridResults = document.getElementById('historyGridResults');

  function renderHistory(){
    historyGrid.innerHTML = `
      <div class="history-cell"><b>${history.tournamentTitles}</b>Títulos de Torneio</div>
      <div class="history-cell"><b>${history.leagueTitles}</b>Títulos de Liga</div>
    `;
    historyGridResults.innerHTML = `
      <div class="history-cell"><b>${history.wins}</b>Vitórias</div>
      <div class="history-cell"><b>${history.draws}</b>Empates</div>
      <div class="history-cell"><b>${history.losses}</b>Derrotas</div>
    `;
  }

  function teamGridHTML(selectedName, groupId){
    let html = `<div class="team-grid" data-group="${groupId}">`;
    TEAMS.forEach(t=>{
      html += `<div class="team-btn${t.name===selectedName?' selected':''}" data-team="${t.name}" data-group="${groupId}">
        <span class="chip" style="background:${t.primary};border:2px solid ${t.secondary};"></span>
        ${flagSVG(t.code, 24, 16)}
        <span>${t.code}</span>
      </div>`;
    });
    html += `</div>`;
    return html;
  }

  function currentMode(){
    const active = document.querySelector('#modeControl .seg-btn.active');
    return active ? active.dataset.mode : 'friendly';
  }

  function renderModePanel(){
    const mode = currentMode();
    if(mode==='friendly') renderFriendlyPanel();
    else if(mode==='tournament') renderTournamentPanel();
    else renderLeaguePanel();
  }

  function renderFriendlyPanel(){
    modePanelHost.innerHTML = `
      <div class="panel" style="width:100%;max-width:480px;">
        <h2>Amistoso — escolha os times</h2>
        <p style="font-size:0.78rem;color:var(--text-dim);margin:0;">Seu time</p>
        ${teamGridHTML(currentTeamPickFriendly.human, 'human')}
        <button class="rules-toggle" data-random="human">Aleatório</button>
        <p style="font-size:0.78rem;color:var(--text-dim);margin:10px 0 0;">Adversário (IA)</p>
        ${teamGridHTML(currentTeamPickFriendly.ai, 'ai')}
        <button class="rules-toggle" data-random="ai">Aleatório</button>
        <button class="primary" id="startFriendlyBtn" style="margin-top:14px;">Jogar amistoso</button>
      </div>
    `;
    modePanelHost.querySelectorAll('.team-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const g = btn.dataset.group, name = btn.dataset.team;
        currentTeamPickFriendly[g] = name;
        renderFriendlyPanel();
      });
    });
    modePanelHost.querySelectorAll('[data-random]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        currentTeamPickFriendly[btn.dataset.random] = TEAM_NAMES[Math.floor(Math.random()*TEAM_NAMES.length)];
        renderFriendlyPanel();
      });
    });
    const startBtn = document.getElementById('startFriendlyBtn');
    startBtn.disabled = !currentTeamPickFriendly.human || !currentTeamPickFriendly.ai || currentTeamPickFriendly.human===currentTeamPickFriendly.ai;
    startBtn.addEventListener('click', ()=>{
      launchMatch({
        contextType:'friendly',
        humanTeam: currentTeamPickFriendly.human,
        aiTeam: currentTeamPickFriendly.ai,
        allowDraw: false
      });
    });
  }

  function bracketMatchHTML(m, humanTeam){
    if(!m) return `<div class="bracket-match pending">A definir</div>`;
    const homeLbl = `${flagForTeam(m.home,18,12)} ${m.home}${m.home===humanTeam? ' (você)':''}`;
    const awayLbl = `${flagForTeam(m.away,18,12)} ${m.away}${m.away===humanTeam? ' (você)':''}`;
    if(m.winner===null){
      return `<div class="bracket-match pending"><span>${homeLbl}</span><span>vs</span><span>${awayLbl}</span></div>`;
    }
    const scoreTxt = `${m.scoreHome}-${m.scoreAway}`;
    return `<div class="bracket-match">
      <span class="${m.winner===m.home?'win':''}">${homeLbl}</span>
      <span>${scoreTxt}</span>
      <span class="${m.winner===m.away?'win':''}">${awayLbl}</span>
    </div>`;
  }

  function renderTournamentPanel(){
    if(!tournament){
      modePanelHost.innerHTML = `
        <div class="panel" style="width:100%;max-width:480px;">
          <h2>Torneio</h2>
          <p style="font-size:0.78rem;color:var(--text-dim);margin:0;">Escolha sua seleção para começar (Quartas → Semifinal → Final):</p>
          ${teamGridHTML(currentTeamPickSetup, 'setup')}
          <button class="rules-toggle" id="randomSetupBtn">Aleatório</button>
          <button class="primary" id="startTournamentBtn" style="margin-top:14px;">Iniciar torneio</button>
        </div>
      `;
      modePanelHost.querySelectorAll('.team-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{ currentTeamPickSetup = btn.dataset.team; renderTournamentPanel(); });
      });
      document.getElementById('randomSetupBtn').addEventListener('click', ()=>{
        currentTeamPickSetup = TEAM_NAMES[Math.floor(Math.random()*TEAM_NAMES.length)];
        renderTournamentPanel();
      });
      const startBtn = document.getElementById('startTournamentBtn');
      startBtn.disabled = !currentTeamPickSetup;
      startBtn.addEventListener('click', ()=>{
        tournament = startNewTournament(currentTeamPickSetup);
        saveTournament();
        renderTournamentPanel();
      });
      return;
    }

    const stageLabels = { quarterfinals:'Quartas de final', semifinals:'Semifinal', final:'Final' };
    const finished = !tournament.active;
    let html = `<div class="panel" style="width:100%;max-width:480px;">
      <h2>${finished ? 'Torneio encerrado' : 'Torneio em andamento'}</h2>
      <p style="font-size:0.8rem;color:var(--text-dim);">Sua seleção: <b style="color:var(--cream)">${tournament.humanTeam}</b></p>`;
    if(finished){
      const wonIt = tournament.champion===tournament.humanTeam;
      html += `<p style="font-size:0.85rem;">${wonIt ? '🏆 Você é o campeão do Torneio!' : 'Campeão: <b style="color:var(--yellow)">'+tournament.champion+'</b>'}</p>`;
    }
    html += `<div class="bracket">
        <div class="bracket-stage"><h3>Quartas de final</h3>${tournament.quarterfinals.map(m=>bracketMatchHTML(m,tournament.humanTeam)).join('')}</div>`;
    if(tournament.semifinals){
      html += `<div class="bracket-stage"><h3>Semifinal</h3>${tournament.semifinals.map(m=>bracketMatchHTML(m,tournament.humanTeam)).join('')}</div>`;
    }
    if(tournament.final){
      html += `<div class="bracket-stage"><h3>Final</h3>${bracketMatchHTML(tournament.final,tournament.humanTeam)}</div>`;
    }
    html += `</div>`;
    if(finished){
      html += `<button class="primary" id="newTournamentBtn" style="margin-top:14px;">Novo torneio</button>`;
    } else {
      html += `<button class="primary" id="playTournamentMatchBtn" style="margin-top:14px;">Jogar ${stageLabels[tournament.stage]}</button>
        <button class="rules-toggle" id="abandonTournamentBtn" style="margin-top:10px;">Abandonar torneio</button>`;
    }
    html += `</div>`;
    modePanelHost.innerHTML = html;

    if(finished){
      document.getElementById('newTournamentBtn').addEventListener('click', ()=>{
        clearTournament();
        renderTournamentPanel();
      });
      return;
    }

    document.getElementById('playTournamentMatchBtn').addEventListener('click', ()=>{
      const stageMatches = tournament.stage==='final' ? [tournament.final] : tournament[tournament.stage];
      const m = stageMatches.find(x=>x && x.winner===null && (x.home===tournament.humanTeam||x.away===tournament.humanTeam));
      const opponent = m.home===tournament.humanTeam ? m.away : m.home;
      launchMatch({
        contextType:'tournament',
        humanTeam: tournament.humanTeam,
        aiTeam: opponent,
        allowDraw: false,
        stageLabel: stageLabels[tournament.stage]
      });
    });
    document.getElementById('abandonTournamentBtn').addEventListener('click', ()=>{
      clearTournament();
      renderTournamentPanel();
    });
  }

  function renderLeaguePanel(){
    if(!league){
      modePanelHost.innerHTML = `
        <div class="panel" style="width:100%;max-width:480px;">
          <h2>Liga</h2>
          <p style="font-size:0.78rem;color:var(--text-dim);margin:0;">Escolha sua seleção para disputar turno e returno contra as outras 7:</p>
          ${teamGridHTML(currentTeamPickSetup, 'setup')}
          <button class="rules-toggle" id="randomSetupBtn">Aleatório</button>
          <button class="primary" id="startLeagueBtn" style="margin-top:14px;">Iniciar temporada</button>
        </div>
      `;
      modePanelHost.querySelectorAll('.team-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{ currentTeamPickSetup = btn.dataset.team; renderLeaguePanel(); });
      });
      document.getElementById('randomSetupBtn').addEventListener('click', ()=>{
        currentTeamPickSetup = TEAM_NAMES[Math.floor(Math.random()*TEAM_NAMES.length)];
        renderLeaguePanel();
      });
      const startBtn = document.getElementById('startLeagueBtn');
      startBtn.disabled = !currentTeamPickSetup;
      startBtn.addEventListener('click', ()=>{
        league = startNewLeague(currentTeamPickSetup);
        saveLeague();
        renderLeaguePanel();
      });
      return;
    }

    const ranked = rankStandings(league.standings);
    let rowsHTML = ranked.map(([name,s],i)=>`
      <tr class="${name===league.humanTeam?'me':''}">
        <td>${i+1}. ${flagForTeam(name,16,11)} ${name}</td><td>${s.pts}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${s.gf-s.ga}</td>
      </tr>`).join('');

    if(!league.active){
      const wonIt = league.champion===league.humanTeam;
      modePanelHost.innerHTML = `
        <div class="panel" style="width:100%;max-width:480px;">
          <h2>Temporada encerrada</h2>
          <p style="font-size:0.8rem;color:var(--text-dim);">Sua seleção: <b style="color:var(--cream)">${league.humanTeam}</b></p>
          <p style="font-size:0.85rem;">${wonIt ? '🏆 Você é o campeão da Liga!' : 'Campeã: <b style="color:var(--yellow)">'+league.champion+'</b>'}</p>
          <table class="stats-table">
            <thead><tr><th>Time</th><th>P</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr></thead>
            <tbody>${rowsHTML}</tbody>
          </table>
          <button class="primary" id="newLeagueBtn" style="margin-top:14px;">Nova temporada</button>
        </div>
      `;
      document.getElementById('newLeagueBtn').addEventListener('click', ()=>{
        clearLeague();
        renderLeaguePanel();
      });
      return;
    }

    const fixture = getHumanFixtureForRound(league);
    const opponent = fixture.home===league.humanTeam ? fixture.away : fixture.home;
    const roundNum = league.roundIndex+1;

    let lastRoundHTML = '';
    if(league.lastRoundResults && league.lastRoundResults.length){
      const rows = league.lastRoundResults.map(r=>{
        const label = `${flagForTeam(r.home,16,11)} ${r.home} ${r.scoreHome} x ${r.scoreAway} ${r.away} ${flagForTeam(r.away,16,11)}`;
        return `<div class="bracket-match${r.isHumanMatch?' win':''}" style="justify-content:center;gap:8px;">${label}</div>`;
      }).join('');
      lastRoundHTML = `
        <p style="font-size:0.76rem;color:var(--text-dim);margin:10px 0 4px;">Resultados da rodada ${league.lastRoundNumber}:</p>
        <div class="bracket" style="gap:4px;">${rows}</div>`;
    }

    modePanelHost.innerHTML = `
      <div class="panel" style="width:100%;max-width:480px;">
        <h2>Liga — Rodada ${roundNum}/${league.rounds.length}</h2>
        <p style="font-size:0.8rem;color:var(--text-dim);">Sua seleção: <b style="color:var(--cream)">${league.humanTeam}</b></p>
        <table class="stats-table">
          <thead><tr><th>Time</th><th>P</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
        ${lastRoundHTML}
        <button class="primary" id="playLeagueMatchBtn" style="margin-top:14px;">Jogar vs ${opponent}</button>
        <button class="rules-toggle" id="abandonLeagueBtn" style="margin-top:10px;">Abandonar temporada</button>
      </div>
    `;
    document.getElementById('playLeagueMatchBtn').addEventListener('click', ()=>{
      launchMatch({
        contextType:'league',
        humanTeam: league.humanTeam,
        aiTeam: opponent,
        allowDraw: true,
        stageLabel: 'Rodada '+roundNum
      });
    });
    document.getElementById('abandonLeagueBtn').addEventListener('click', ()=>{
      clearLeague();
      renderLeaguePanel();
    });
  }

  // =====================================================================
  // CONTROLES GERAIS DO MENU
  // =====================================================================
  document.querySelectorAll('#modeControl .seg-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#modeControl .seg-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderModePanel();
    });
  });
  document.querySelectorAll('#diffControl .seg-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#diffControl .seg-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
    });
  });
  document.querySelectorAll('#ownGoalRuleControl .seg-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#ownGoalRuleControl .seg-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      ownGoalRuleEnabled = btn.dataset.owngoal==='on';
    });
  });
  function wireMusicButton(btn){
    btn.addEventListener('click', ()=>{
      musicEnabled = !musicEnabled;
      document.querySelectorAll('#musicToggleBtn, #musicToggleBtn2').forEach(b=>{
        b.textContent = musicEnabled ? '🔊 Música: ligada' : '🔇 Música: desligada';
        b.classList.toggle('on', musicEnabled);
      });
      if(musicEnabled){ if(match && match.running) MusicEngine.start(); }
      else MusicEngine.stop();
    });
  }
  wireMusicButton(document.getElementById('musicToggleBtn'));
  wireMusicButton(document.getElementById('musicToggleBtn2'));
  function wireTrackControl(containerId){
    document.querySelectorAll('#'+containerId+' .seg-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const raw = btn.dataset.track;
        document.querySelectorAll('#trackControl .seg-btn, #trackControl2 .seg-btn').forEach(b=>{
          b.classList.toggle('active', b.dataset.track===raw);
        });
        if(raw==='random'){
          musicTrackRandom = true;
          MusicEngine.setTrack(Math.floor(Math.random()*3)); // já dá um feedback imediato
        } else {
          musicTrackRandom = false;
          MusicEngine.setTrack(parseInt(raw, 10));
        }
      });
    });
  }
  wireTrackControl('trackControl');
  wireTrackControl('trackControl2');
  document.getElementById('resetHistoryBtn').addEventListener('click', ()=>{
    history = { tournamentTitles:0, leagueTitles:0, wins:0, draws:0, losses:0 };
    saveHistory();
  });
  document.getElementById('openManualBtn').addEventListener('click', ()=>{
    document.getElementById('manualOverlay').classList.remove('hidden');
  });
  document.getElementById('manualCloseBtn').addEventListener('click', ()=>{
    document.getElementById('manualOverlay').classList.add('hidden');
  });

  // =====================================================================
  // FLUXO DE PARTIDA: sorteio, escolha de lado, loop de jogo
  // =====================================================================
  const menuScreen = document.getElementById('menuScreen');
  const matchScreen = document.getElementById('matchScreen');
  const canvas = document.getElementById('table');
  const ctx = canvas.getContext('2d');

  function showCoinFlip(callback){
    const overlay = document.getElementById('coinFlipOverlay');
    const coinEl = document.getElementById('coinEl');
    const resultText = document.getElementById('coinResultText');
    overlay.classList.remove('hidden');
    resultText.textContent = 'Cara ou coroa...';
    coinEl.style.transition = 'none';
    coinEl.style.transform = 'rotateY(0deg)';
    void coinEl.offsetWidth;
    const heads = Math.random() < 0.5;
    const finalDeg = 4*360 + (heads?0:180);
    requestAnimationFrame(()=>{
      coinEl.style.transition = 'transform 1.15s cubic-bezier(.2,.8,.2,1)';
      coinEl.style.transform = 'rotateY('+finalDeg+'deg)';
    });
    setTimeout(()=>{
      const starter = heads ? 'human' : 'ai';
      resultText.textContent = heads ? 'Cara! Você começa com a posse.' : 'Coroa! A IA começa com a posse.';
      MusicEngine.blip(heads?720:260,'triangle');
      setTimeout(()=>{ overlay.classList.add('hidden'); callback(starter); }, 5000);
    }, 1200);
  }

  function showSideChoice(loser, callback){
    const overlay = document.getElementById('sideChoiceOverlay');
    const title = document.getElementById('sideChoiceTitle');
    const btnsHost = document.getElementById('sideChoiceButtons');
    title.textContent = loser==='human' ? 'Você perdeu o sorteio' : 'A IA perdeu o sorteio';
    const labels = [['Em cima','top'],['Em baixo','bottom']];
    btnsHost.innerHTML = labels.map(([lbl,side])=>`<button class="side-btn" data-side="${side}">${lbl}</button>`).join('');
    overlay.classList.remove('hidden');
    btnsHost.querySelectorAll('.side-btn').forEach(b=>{
      b.addEventListener('click', ()=>{ overlay.classList.add('hidden'); callback(b.dataset.side); });
    });
  }

  function launchMatch(cfg){
    MenuMusic.stop();
    menuScreen.classList.add('hidden');
    matchScreen.classList.remove('hidden');
    document.getElementById('recenterBtn').classList.remove('hidden');
    document.getElementById('matchStatus').textContent = 'Sorteando quem começa...';
    document.getElementById('matchContextLabel').textContent =
      (cfg.contextType==='friendly'?'Amistoso':cfg.contextType==='tournament'?'Torneio · '+cfg.stageLabel:'Liga · '+cfg.stageLabel);
    // zera placar e mostra o tempo real escolhido (2 ou 3 min) já aqui, antes do sorteio —
    // evita mostrar "5:00" ou o placar da partida anterior por trás do overlay da moeda.
    document.getElementById('scoreHuman').textContent = '0';
    document.getElementById('scoreAI').textContent = '0';
    document.getElementById('otLabel').textContent = '';
    document.getElementById('clockText').textContent = formatClock(matchDuration);
    showCoinFlip((starter)=>{
      const loserOfToss = starter==='human' ? 'ai' : 'human';
      // quem perde o sorteio escolhe o lado do humano (se a IA perder, ela "escolhe" por conta própria)
      if(loserOfToss==='human'){
        showSideChoice('human', (humanSide)=> beginMatch(cfg, starter, humanSide));
      } else {
        const humanSide = Math.random()<0.5 ? 'top':'bottom';
        document.getElementById('matchStatus').textContent = 'A IA perdeu o sorteio e escolheu o lado.';
        beginMatch(cfg, starter, humanSide);
      }
    });
  }

  function beginMatch(cfg, starter, humanSide){
    const [cw,ch] = canvasSize();
    canvas.width = cw; canvas.height = ch;
    const objs = makeMatchObjects();
    match = {
      cfg, objs,
      humanSide, aiSide: humanSide==='top'?'bottom':'top',
      scoreHuman:0, scoreAI:0,
      clockMode:'regulation', secondsLeft:matchDuration, otNumber:0,
      frozenForGoal:false, running:true, lastTs:null,
      pointerActive:false, pointerTargetX:null, pointerTargetY:null,
      puckStallTimer:0, aiZoneStallTimer:0, wallLoopSide:null, wallLoopCount:0, wallLoopY:null
    };
    document.getElementById('scoreNameHuman').textContent = cfg.humanTeam;
    document.getElementById('scoreNameAI').textContent = cfg.aiTeam;
    document.getElementById('scoreFlagHuman').innerHTML = flagForTeam(cfg.humanTeam, 26, 17);
    document.getElementById('scoreFlagAI').innerHTML = flagForTeam(cfg.aiTeam, 26, 17);
    document.getElementById('scoreHuman').textContent = '0';
    document.getElementById('scoreAI').textContent = '0';
    document.getElementById('otLabel').textContent = '';
    updateClockDisplay();
    document.getElementById('matchStatus').textContent = starter==='human' ? 'Você tem a posse inicial!' : 'A IA tem a posse inicial!';
    // disco e paddles começam na posição de pós-gol sofrido, com a posse de quem venceu o sorteio
    const starterSide = starter==='human' ? humanSide : match.aiSide;
    repositionAfterConcede(starterSide);
    document.getElementById('forfeitBtn').disabled = false;
    if(musicTrackRandom) MusicEngine.setTrack(Math.floor(Math.random()*3));
    if(musicEnabled) MusicEngine.start();
    requestAnimationFrame(gameLoop);
    recenterField('auto');
  }

  function isStandaloneApp(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function recenterField(behavior){
    // instalado como app (fullscreen, sem barra do navegador): centraliza incluindo o
    // placar fixo (com bandeiras e tempo) junto do campo inteiro, já que sobra mais espaço.
    if(isStandaloneApp()){
      const col = document.querySelector('#matchScreen .board-column');
      if(col){
        const rect = col.getBoundingClientRect();
        const targetY = window.scrollY + rect.top;
        window.scrollTo({ top: Math.max(0, targetY), behavior: behavior||'smooth' });
        return;
      }
    }
    // navegador comum (com barra de endereço etc.): mantém o ajuste de sempre, focado só no campo.
    const frame = document.querySelector('#matchScreen .board-frame');
    if(!frame) return;
    const NUDGE_UP = 14; // sobe um pouco (sobra no padding do topo em vez de cortar o gol de baixo)
    const rect = frame.getBoundingClientRect();
    const targetY = window.scrollY + rect.top + NUDGE_UP;
    window.scrollTo({ top: Math.max(0, targetY), behavior: behavior||'smooth' });
  }
  document.getElementById('recenterBtn').addEventListener('click', ()=> recenterField('smooth'));

  function formatClock(seconds){
    const m = Math.floor(seconds/60), s = Math.floor(seconds%60);
    return m+':'+String(s).padStart(2,'0');
  }

  function updateClockDisplay(){
    document.getElementById('clockText').textContent = formatClock(match.secondsLeft);
    document.getElementById('otLabel').textContent = match.clockMode==='overtime' ? 'PRORROGAÇÃO '+match.otNumber : '';
  }

  function gameLoop(ts){
    if(!match || !match.running) return;
    if(match.lastTs===null) match.lastTs = ts;
    let dt = (ts-match.lastTs)/1000;
    match.lastTs = ts;
    dt = Math.min(dt, 0.033);

    if(!match.frozenForGoal){
      match.secondsLeft -= dt;
      updateAIPaddle(match.aiSide==='top'?match.objs.top:match.objs.bottom, match.objs.puck, match.aiSide, difficulty, dt);
      const humanPaddle = match.humanSide==='top'?match.objs.top:match.objs.bottom;
      if(match.pointerActive && match.pointerTargetX!==null){
        const yMin = match.humanSide==='top' ? PADDLE_R : FIELD_H/2+PADDLE_R;
        const yMax = match.humanSide==='top' ? FIELD_H/2-PADDLE_R : FIELD_H-PADDLE_R;
        const newX = Math.max(PADDLE_R, Math.min(FIELD_W-PADDLE_R, match.pointerTargetX));
        const newY = Math.max(yMin, Math.min(yMax, match.pointerTargetY));
        if(dt>0){
          let vx = (newX-humanPaddle.x)/dt, vy = (newY-humanPaddle.y)/dt;
          const vSpeed = Math.hypot(vx,vy), vCap = 2600;
          if(vSpeed>vCap){ vx*=vCap/vSpeed; vy*=vCap/vSpeed; }
          humanPaddle.vx = vx; humanPaddle.vy = vy;
        }
        humanPaddle.x = newX; humanPaddle.y = newY;
      } else {
        humanPaddle.vx = 0; humanPaddle.vy = 0;
      }
      const goal = stepPuck(match.objs, dt);
      const hitTop = resolveCollision(match.objs.puck, match.objs.top);
      const hitBottom = resolveCollision(match.objs.puck, match.objs.bottom);
      // conta toques de cada paddle só enquanto o disco está na própria defesa dele
      // (usado pela regra do gol contra); conta só toques NOVOS (borda de subida),
      // não cada quadro de um mesmo contato contínuo. Some o contador quando o disco sai de lá.
      const puckInTopHalf = match.objs.puck.y < FIELD_H/2;
      if(puckInTopHalf){
        if(hitTop && !match.objs.top.wasTouching) match.objs.top.touchesInOwnHalf++;
        match.objs.top.wasTouching = hitTop;
        match.objs.bottom.touchesInOwnHalf = 0;
        match.objs.bottom.wasTouching = false;
      } else {
        if(hitBottom && !match.objs.bottom.wasTouching) match.objs.bottom.touchesInOwnHalf++;
        match.objs.bottom.wasTouching = hitBottom;
        match.objs.top.touchesInOwnHalf = 0;
        match.objs.top.wasTouching = false;
      }
      if(goal) handleGoal(goal);
      if(!goal && !match.frozenForGoal){
        checkPuckStall(dt);
        checkAIZoneStall(dt);
        checkWallLoop();
      }
      if(match.secondsLeft<=0 && !match.frozenForGoal){
        match.secondsLeft = 0;
        handleClockZero();
      }
    }
    updateClockDisplay();
    render();
    if(match.running) requestAnimationFrame(gameLoop);
  }

  // Se o disco fica "preso" num canto (baixa velocidade + perto de dois cantos ao
  // mesmo tempo, onde o paddle redondo fisicamente não consegue encostar), depois
  // de um tempinho ele é reposicionado perto da própria grande área defensiva, sem
  // mexer no formato do canto — só pra garantir que o jogo sempre continua.
  function checkPuckStall(dt){
    const p = match.objs.puck;
    const speed = Math.hypot(p.vx, p.vy);
    const nearCornerX = p.x < CORNER_MARGIN || p.x > FIELD_W-CORNER_MARGIN;
    const nearCornerY = p.y < CORNER_MARGIN || p.y > FIELD_H-CORNER_MARGIN;
    if(nearCornerX && nearCornerY && speed < STALL_SPEED){
      match.puckStallTimer += dt;
    } else {
      match.puckStallTimer = 0;
    }
    if(match.puckStallTimer > STALL_TIME_LIMIT){
      unstickPuck();
      match.puckStallTimer = 0;
    }
  }

  // Anti-travamento automático: só olha para o campo de defesa da IA (o humano tem
  // mobilidade de sobra pra nunca precisar disso). Se o disco fica praticamente parado
  // e intocado do lado da IA por 4 segundos seguidos, reposiciona sozinho — sem precisar
  // que o jogador aperte o botão manual toda vez.
  function checkAIZoneStall(dt){
    const p = match.objs.puck;
    const speed = Math.hypot(p.vx, p.vy);
    const inAIHalf = match.aiSide==='top' ? p.y < FIELD_H/2 : p.y > FIELD_H/2;
    if(inAIHalf && speed < AI_ZONE_STALL_SPEED){
      match.aiZoneStallTimer += dt;
    } else {
      match.aiZoneStallTimer = 0;
    }
    if(match.aiZoneStallTimer > AI_ZONE_STALL_TIME_LIMIT){
      repositionAfterConcede(match.aiSide);
      document.getElementById('matchStatus').textContent = 'Anti-travamento automático: a IA ficou parada com o disco — realinhado.';
      match.aiZoneStallTimer = 0;
    }
  }

  const WALL_LOOP_LIMIT = 10;
  const WALL_LOOP_Y_TOLERANCE = 14; // exige bater quase no mesmo ponto (poucos "mm" de verdade), não só na mesma parede
  function checkWallLoop(){
    const p = match.objs.puck;
    const inAIHalf = match.aiSide==='top' ? p.y < FIELD_H/2 : p.y > FIELD_H/2;
    if(!inAIHalf){
      match.wallLoopSide = null; match.wallLoopCount = 0; match.wallLoopY = null;
      return;
    }
    // detecta o instante exato do ricochete lateral pela posição colada na parede + sentido pós-quicada
    let wallHit = null;
    if(Math.abs(p.x - PUCK_R) < 0.6 && p.vx > 0) wallHit = 'left';
    else if(Math.abs(p.x - (FIELD_W-PUCK_R)) < 0.6 && p.vx < 0) wallHit = 'right';
    if(!wallHit) return;
    // só conta como o MESMO looping se bateu na mesma parede E quase no mesmo ponto de antes —
    // se o disco bater em alturas diferentes, ele está progredindo (pode escapar pro ataque),
    // não é um vai-e-vem retilíneo de verdade, então a contagem recomeça do zero.
    const samespot = wallHit === match.wallLoopSide && match.wallLoopY !== null && Math.abs(p.y - match.wallLoopY) < WALL_LOOP_Y_TOLERANCE;
    if(samespot){
      match.wallLoopCount++;
    } else {
      match.wallLoopSide = wallHit;
      match.wallLoopCount = 1;
      match.wallLoopY = p.y; // ancora no primeiro toque da nova sequência — some cada repetição precisa
    }                        // continuar perto DESSE ponto original, não só do toque anterior
    if(match.wallLoopCount >= WALL_LOOP_LIMIT){
      repositionAfterConcede(match.aiSide);
      document.getElementById('matchStatus').textContent = 'Anti-travamento automático: looping na parede lateral detectado — realinhado.';
      match.wallLoopSide = null; match.wallLoopCount = 0; match.wallLoopY = null;
    }
  }

  // Reposiciona o disco e os dois paddles como se o lado indicado tivesse acabado de
  // sofrer um gol — usado no gol de verdade e nos anti-travamentos automáticos.
  function repositionAfterConcede(concedingSide){
    const nearTop = concedingSide==='top';
    match.objs.puck.x = FIELD_W/2 + (Math.random()*2-1)*50;
    match.objs.puck.y = nearTop ? 150 : FIELD_H-150;
    match.objs.puck.vx = (Math.random()*2-1)*25;
    match.objs.puck.vy = 0;

    // evita que o paddle apareça encostado no disco e o empurre sem querer pro próprio gol.
    const concedingPaddle = nearTop ? match.objs.top : match.objs.bottom;
    const scoringPaddle = nearTop ? match.objs.bottom : match.objs.top;
    // atrás do disco (mais perto do próprio gol) e com um desvio lateral aleatório,
    // pra quando for tocar o disco não devolver sempre reto — cria ângulos de saída diferentes.
    const lateralOffset = (Math.random()*2-1)*90;
    concedingPaddle.x = Math.max(PADDLE_R, Math.min(FIELD_W-PADDLE_R, match.objs.puck.x + lateralOffset));
    concedingPaddle.y = nearTop ? 70 : FIELD_H-70;
    concedingPaddle.vx = 0; concedingPaddle.vy = 0;
    scoringPaddle.x = FIELD_W/2;
    scoringPaddle.y = nearTop ? FIELD_H-90 : 90;
    scoringPaddle.vx = 0; scoringPaddle.vy = 0;
    match.puckStallTimer = 0;
    match.aiZoneStallTimer = 0;
    match.wallLoopSide = null;
    match.wallLoopCount = 0;
    match.wallLoopY = null;
    match.objs.top.touchesInOwnHalf = 0;
    match.objs.bottom.touchesInOwnHalf = 0;
    match.objs.top.wasTouching = false;
    match.objs.bottom.wasTouching = false;
  }

  function unstickPuck(){
    const p = match.objs.puck;
    const nearTop = p.y < FIELD_H/2;
    p.x = FIELD_W/2 + (Math.random()*2-1)*40;
    p.y = nearTop ? 150 : FIELD_H-150;
    p.vx = (Math.random()*2-1)*70;
    p.vy = (nearTop?1:-1)*90;
    document.getElementById('matchStatus').textContent = 'Disco preso no canto — reposicionado perto da área defensiva.';
  }

  function handleGoal(scoredSide){
    const concedingPaddle = scoredSide==='top' ? match.objs.top : match.objs.bottom;
    const isInvalidOwnGoal = ownGoalRuleEnabled && concedingPaddle.touchesInOwnHalf >= 2;

    if(isInvalidOwnGoal){
      const flash = document.getElementById('goalFlash');
      flash.innerHTML = `<div style="font-size:1.7rem;">Gol anulado!</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:0.85rem;color:var(--cream);margin-top:8px;">Toque duplo do defensor — não conta como gol contra.</div>`;
      flash.classList.remove('hidden');
      match.frozenForGoal = true;
      MusicEngine.blip(220,'triangle');
      setTimeout(()=>{
        flash.classList.add('hidden'); flash.innerHTML='';
        repositionAfterConcede(scoredSide);
        match.frozenForGoal = false;
        document.getElementById('matchStatus').textContent = 'Gol contra anulado (toque duplo na defesa) — disco realinhado.';
      }, 2800); // 1s a mais que o gol normal, pra dar tempo de ler a explicação
      return;
    }

    // scoredSide indica o gol que foi atingido ('top' ou 'bottom'); quem ataca aquele gol marcou o ponto
    const scorerSide = scoredSide==='top' ? 'bottom' : 'top';
    const scorerIsHuman = scorerSide===match.humanSide;
    if(scorerIsHuman) match.scoreHuman++; else match.scoreAI++;
    document.getElementById('scoreHuman').textContent = match.scoreHuman;
    document.getElementById('scoreAI').textContent = match.scoreAI;
    MusicEngine.blip(scorerIsHuman?600:320,'square');

    const flash = document.getElementById('goalFlash');
    flash.innerHTML = `<div>GOL!</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:1rem;color:var(--cream);margin-top:8px;display:flex;align-items:center;gap:6px;justify-content:center;">${flagForTeam(match.cfg.humanTeam,20,13)} ${match.cfg.humanTeam} ${match.scoreHuman} x ${match.scoreAI} ${match.cfg.aiTeam} ${flagForTeam(match.cfg.aiTeam,20,13)}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:0.9rem;color:var(--cyan);margin-top:4px;">${formatClock(match.secondsLeft)}${match.clockMode==='overtime'?' · PRORROGAÇÃO '+match.otNumber:''}</div>`;
    flash.classList.remove('hidden');
    match.frozenForGoal = true;

    // a prorrogação agora joga o minuto inteiro (sem morte súbita): um gol aqui só
    // soma no placar e o jogo segue — quem decide é o fim do cronômetro da prorrogação.
    setTimeout(()=>{
      flash.classList.add('hidden');
      flash.innerHTML = '';
      repositionAfterConcede(scoredSide);
      match.frozenForGoal = false; // o tempo retoma exatamente quando o disco volta à mesa
      document.getElementById('matchStatus').textContent = 'Disco com quem sofreu o gol — jogo retomado!';
    }, 1800);
  }

  function handleClockZero(){
    if(match.scoreHuman !== match.scoreAI){ concludeMatch(); return; }
    if(match.cfg.allowDraw){ concludeMatch(); return; }
    // empate no fim do tempo (ou de uma prorrogação): pausa, avisa, e só continua
    // quando o jogador sortear a próxima prorrogação.
    match.frozenForGoal = true;
    const overlay = document.getElementById('otAnnounceOverlay');
    document.getElementById('otAnnounceSub').textContent =
      `${match.cfg.humanTeam} ${match.scoreHuman} x ${match.scoreAI} ${match.cfg.aiTeam}. Prorrogação de 1 minuto necessária.`;
    overlay.classList.remove('hidden');
    document.getElementById('otAnnounceBtn').onclick = ()=>{
      overlay.classList.add('hidden');
      startOvertimePeriod();
    };
  }

  function startOvertimePeriod(){
    document.getElementById('matchStatus').textContent = 'Sorteando a posse da prorrogação...';
    showCoinFlip((starter)=>{
      const loserOfToss = starter==='human' ? 'ai' : 'human';
      const proceed = (humanSide)=>{
        match.humanSide = humanSide;
        match.aiSide = humanSide==='top' ? 'bottom' : 'top';
        match.clockMode = 'overtime';
        match.otNumber++;
        match.secondsLeft = 60;
        updateClockDisplay();
        const starterSide = starter==='human' ? match.humanSide : match.aiSide;
        repositionAfterConcede(starterSide); // disco e paddles no local de pós-gol sofrido, não no centro
        match.puckStallTimer = 0;
        match.aiZoneStallTimer = 0;
        document.getElementById('matchStatus').textContent =
          (starter==='human' ? 'Você' : 'A IA') + ' tem a posse na prorrogação '+match.otNumber+'!';
        match.frozenForGoal = false;
      };
      if(loserOfToss==='human'){
        showSideChoice('human', proceed);
      } else {
        const humanSide = Math.random()<0.5 ? 'top':'bottom';
        document.getElementById('matchStatus').textContent = 'A IA perdeu o sorteio e escolheu o lado.';
        proceed(humanSide);
      }
    });
  }

  function concludeMatch(){
    match.running = false;
    MusicEngine.stop();
    const outcome = match.scoreHuman>match.scoreAI ? 'win' : match.scoreHuman<match.scoreAI ? 'loss' : 'draw';
    MusicEngine.playJingle(outcome);
    // 'draw' só acontece de fato na Liga (allowDraw=true); Amistoso/Torneio sempre
    // seguem para outra prorrogação completa quando empatam, então nunca chegam
    // a um resultado de empate aqui — por isso não precisa filtrar nada.
    if(outcome==='win') history.wins++; else if(outcome==='draw') history.draws++; else history.losses++;
    saveHistory();
    showMatchEndBanner(outcome);
  }

  function showChampionBanner(title, message, showTrophy, championTeamName){
    const overlay = document.getElementById('championOverlay');
    document.getElementById('championTitle').textContent = title;
    document.getElementById('championSub').textContent = message;
    document.getElementById('championTrophySvg').classList.toggle('hidden', !showTrophy);
    document.getElementById('championFlag').innerHTML = championTeamName ? flagForTeam(championTeamName, 44, 29) : '';
    overlay.classList.remove('hidden');
    document.getElementById('championContinueBtn').onclick = ()=>{ overlay.classList.add('hidden'); };
  }

  function showMatchEndBanner(outcome){
    const overlay = document.getElementById('matchEndOverlay');
    const title = document.getElementById('matchEndTitle');
    const sub = document.getElementById('matchEndSub');
    title.textContent = outcome==='win' ? 'Você venceu!' : outcome==='draw' ? 'Empate!' : 'A IA venceu';
    sub.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${flagForTeam(match.cfg.humanTeam,20,13)} ${match.cfg.humanTeam} ${match.scoreHuman} x ${match.scoreAI} ${match.cfg.aiTeam} ${flagForTeam(match.cfg.aiTeam,20,13)}</span>`;
    overlay.classList.remove('hidden');
    document.getElementById('matchEndContinueBtn').onclick = ()=>{
      overlay.classList.add('hidden');
      finishMatchFlow(outcome);
    };
  }

  function finishMatchFlow(outcome){
    const cfg = match.cfg;
    matchScreen.classList.add('hidden');
    document.getElementById('recenterBtn').classList.add('hidden');
    menuScreen.classList.remove('hidden');
    MenuMusic.start();
    if(cfg.contextType==='friendly'){
      renderModePanel();
      return;
    }
    if(cfg.contextType==='tournament'){
      const result = registerHumanMatchResult(tournament, outcome, match.scoreHuman, match.scoreAI);
      if(result.done && result.titleWon){ history.tournamentTitles++; saveHistory(); }
      saveTournament(); // sempre salva — concluído ou não, pra poder rever o chaveamento inteiro depois
      renderModePanel();
      if(result.done){
        setTimeout(()=>{
          if(result.titleWon){
            showChampionBanner('Campeão do Torneio!', 'Você é o campeão do Torneio, jogando '+prepositionFor(cfg.humanTeam)+' '+cfg.humanTeam+'!', true, cfg.humanTeam);
            MusicEngine.playVictoryFanfare();
          } else {
            showChampionBanner('Torneio encerrado',
              result.eliminated ? 'Você foi eliminado. Campeão do torneio: '+result.champion : 'Fim do torneio. Campeão: '+result.champion, false, result.champion);
          }
        }, 50);
      }
      return;
    }
    if(cfg.contextType==='league'){
      simulateRestOfRound(league);
      const result = concludeLeagueRound(league, match.scoreHuman, match.scoreAI);
      if(result.seasonOver && result.champion===cfg.humanTeam){ history.leagueTitles++; saveHistory(); }
      saveLeague(); // concludeLeagueRound já marca active:false ao terminar, sem descartar a tabela
      renderModePanel();
      if(result.seasonOver){
        setTimeout(()=>{
          if(result.champion===cfg.humanTeam){
            showChampionBanner('Campeão da Liga!', 'Você é o campeão da Liga, jogando '+prepositionFor(cfg.humanTeam)+' '+cfg.humanTeam+'!', true, cfg.humanTeam);
            MusicEngine.playVictoryFanfare();
          } else {
            showChampionBanner('Temporada encerrada', 'Campeã da liga: '+result.champion, false, result.champion);
          }
        }, 50);
      }
      return;
    }
  }

  function forfeitMatch(){
    if(!match || !match.running) return;
    match.running = false;
    MusicEngine.stop();
    matchScreen.classList.add('hidden');
    document.getElementById('recenterBtn').classList.add('hidden');
    menuScreen.classList.remove('hidden');
    MenuMusic.start();
    renderModePanel();
  }
  document.getElementById('forfeitBtn').addEventListener('click', forfeitMatch);

  // =====================================================================
  // RENDERIZAÇÃO DA MESA
  // =====================================================================
  function drawCircleScreen(cx,cy,r,fill,stroke){
    const [sx,sy] = toScreen(cx,cy);
    ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2);
    if(fill){ ctx.fillStyle=fill; ctx.fill(); }
    if(stroke){ ctx.lineWidth=3; ctx.strokeStyle=stroke; ctx.stroke(); }
  }
  function screenRect(cx0,cy0,cx1,cy1){
    const [sx0,sy0]=toScreen(cx0,cy0), [sx1,sy1]=toScreen(cx1,cy1);
    return [Math.min(sx0,sx1),Math.min(sy0,sy1),Math.abs(sx1-sx0),Math.abs(sy1-sy0)];
  }

  function render(){
    const [cw,ch] = canvasSize();
    ctx.clearRect(0,0,cw,ch);
    ctx.fillStyle = '#0d3b3f';
    ctx.fillRect(0,0,cw,ch);

    // linha central
    ctx.strokeStyle = 'rgba(127,231,255,0.4)'; ctx.lineWidth = 3;
    ctx.beginPath();
    const [mx0,my0] = toScreen(0,FIELD_H/2), [mx1,my1] = toScreen(FIELD_W,FIELD_H/2);
    ctx.moveTo(mx0,my0); ctx.lineTo(mx1,my1); ctx.stroke();

    // círculo central
    drawCircleScreen(FIELD_W/2, FIELD_H/2, 62, null, 'rgba(127,231,255,0.35)');

    // gols (retângulos de destaque)
    ctx.fillStyle = 'rgba(255,62,165,0.16)';
    let [gx,gy,gw,gh] = screenRect(GOAL_X0,-6,GOAL_X1,26); ctx.fillRect(gx,gy,gw,gh);
    [gx,gy,gw,gh] = screenRect(GOAL_X0,FIELD_H-26,GOAL_X1,FIELD_H+6); ctx.fillRect(gx,gy,gw,gh);

    // times (labels perto de cada lado)
    ctx.fillStyle = 'rgba(233,237,247,0.55)';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    const teamTop = teamByName(match.humanSide==='top'?match.cfg.humanTeam:match.cfg.aiTeam);
    const teamBottom = teamByName(match.humanSide==='bottom'?match.cfg.humanTeam:match.cfg.aiTeam);
    let [lx,ly] = toScreen(FIELD_W/2, 30); ctx.fillText(teamTop.code, lx, ly);
    [lx,ly] = toScreen(FIELD_W/2, FIELD_H-16); ctx.fillText(teamBottom.code, lx, ly);

    // paddles
    const topTeam = teamTop, bottomTeam = teamBottom;
    drawCircleScreen(match.objs.top.x, match.objs.top.y, PADDLE_R, topTeam.primary, topTeam.secondary);
    drawCircleScreen(match.objs.bottom.x, match.objs.bottom.y, PADDLE_R, bottomTeam.primary, bottomTeam.secondary);

    // disco
    drawCircleScreen(match.objs.puck.x, match.objs.puck.y, PUCK_R, '#f4f7ff', 'rgba(0,0,0,0.4)');
  }

  // =====================================================================
  // ENTRADA DO JOGADOR (mouse / toque)
  // =====================================================================
  function clientToCanonical(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width/rect.width, scaleY = canvas.height/rect.height;
    const sx = (clientX-rect.left)*scaleX, sy = (clientY-rect.top)*scaleY;
    return toCanonical(sx,sy);
  }
  function setPointerTarget(clientX, clientY){
    if(!match) return;
    const [cx,cy] = clientToCanonical(clientX, clientY);
    match.pointerTargetX = cx; match.pointerTargetY = cy;
  }
  function onPointerDown(e){
    if(!match || !match.running) return;
    match.pointerActive = true;
    const p = e.touches ? e.touches[0] : e;
    setPointerTarget(p.clientX, p.clientY);
    e.preventDefault();
  }
  function onPointerMove(e){
    if(!match || !match.pointerActive) return;
    const p = e.touches ? e.touches[0] : e;
    setPointerTarget(p.clientX, p.clientY);
    e.preventDefault();
  }
  function onPointerUp(e){
    if(!match) return;
    match.pointerActive = false;
    const paddle = match.humanSide==='top'?match.objs.top:match.objs.bottom;
    paddle.vx = 0; paddle.vy = 0;
  }
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, {passive:false});
  canvas.addEventListener('touchmove', onPointerMove, {passive:false});
  window.addEventListener('touchend', onPointerUp);

  // =====================================================================
  // INICIALIZAÇÃO
  // =====================================================================
  renderHistory();
  renderModePanel();

  // toca a música do menu desde já; se o navegador bloquear autoplay sem gesto do
  // usuário, ela entra sozinha no primeiro toque/clique em qualquer lugar da página.
  MenuMusic.start();
  function tryResumeMenuMusicOnce(){
    if(!MenuMusic.playing) MenuMusic.start();
    ['click','touchstart','keydown'].forEach(ev=> window.removeEventListener(ev, tryResumeMenuMusicOnce));
  }
  ['click','touchstart','keydown'].forEach(ev=> window.addEventListener(ev, tryResumeMenuMusicOnce, {once:true}));

  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }
})();
