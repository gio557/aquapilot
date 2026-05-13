export const NORMATIVA_DEFAULT = [
  {
    categoria:"Parametri Fisico-Chimici Base", colore:"#0055BB",
    params:[
      {id:"pH",   nome:"pH",                   unita:"",     legge_max:9.5,  legge_min:5.5,  target_max:8.5,  target_min:6.5,  preAllarme:90, rif:"Tab.3 n.3"},
      {id:"T",    nome:"Temperatura",           unita:"°C",   legge_max:30,   legge_min:null, target_max:25,   target_min:null, preAllarme:85, rif:"Tab.3 n.4"},
      {id:"COD",  nome:"COD",                   unita:"mg/L", legge_max:160,  legge_min:null, target_max:125,  target_min:null, preAllarme:80, rif:"Tab.3 n.7"},
      {id:"BOD5", nome:"BOD₅ (20°C)",           unita:"mg/L", legge_max:40,   legge_min:null, target_max:25,   target_min:null, preAllarme:80, rif:"Tab.3 n.8"},
      {id:"SST",  nome:"Solidi Sospesi Totali", unita:"mg/L", legge_max:80,   legge_min:null, target_max:35,   target_min:null, preAllarme:80, rif:"Tab.3 n.9"},
      {id:"OG",   nome:"Oli e Grassi",          unita:"mg/L", legge_max:20,   legge_min:null, target_max:10,   target_min:null, preAllarme:80, rif:"Tab.3 n.5"},
    ]
  },
  {
    categoria:"Nutrienti — Azoto e Fosforo", colore:"#006E38",
    params:[
      {id:"NH4",  nome:"Azoto Ammoniacale (NH₄⁺)", unita:"mg/L", legge_max:15, legge_min:null, target_max:8,  target_min:null, preAllarme:80, rif:"Tab.3 n.10"},
      {id:"NO3",  nome:"Azoto Nitrico (NO₃⁻)",     unita:"mg/L", legge_max:20, legge_min:null, target_max:10, target_min:null, preAllarme:80, rif:"Tab.3 n.12"},
      {id:"NTOT", nome:"Azoto Totale (N-tot)",      unita:"mg/L", legge_max:15, legge_min:null, target_max:10, target_min:null, preAllarme:80, rif:"Tab.3 n.13"},
      {id:"PTOT", nome:"Fosforo Totale (P-tot)",    unita:"mg/L", legge_max:2,  legge_min:null, target_max:1,  target_min:null, preAllarme:80, rif:"Tab.3 n.14"},
    ]
  },
  {
    categoria:"Metalli Pesanti", colore:"#B85000",
    params:[
      {id:"AS",   nome:"Arsenico (As)",   unita:"mg/L", legge_max:0.5,  legge_min:null, target_max:0.1,  target_min:null, preAllarme:80, rif:"Tab.3 n.20"},
      {id:"CD",   nome:"Cadmio (Cd)",     unita:"mg/L", legge_max:0.02, legge_min:null, target_max:0.01, target_min:null, preAllarme:80, rif:"Tab.3 n.21"},
      {id:"CU",   nome:"Rame (Cu)",       unita:"mg/L", legge_max:1,    legge_min:null, target_max:0.5,  target_min:null, preAllarme:80, rif:"Tab.3 n.24"},
      {id:"ZN",   nome:"Zinco (Zn)",      unita:"mg/L", legge_max:1,    legge_min:null, target_max:0.5,  target_min:null, preAllarme:80, rif:"Tab.3 n.31"},
      {id:"NI",   nome:"Nichel (Ni)",     unita:"mg/L", legge_max:4,    legge_min:null, target_max:2,    target_min:null, preAllarme:80, rif:"Tab.3 n.28"},
      {id:"PB",   nome:"Piombo (Pb)",     unita:"mg/L", legge_max:0.3,  legge_min:null, target_max:0.1,  target_min:null, preAllarme:80, rif:"Tab.3 n.29"},
    ]
  },
  {
    categoria:"Parametri Anorganici & Organici", colore:"#6622BB",
    params:[
      {id:"CL",   nome:"Cloruri (Cl⁻)",      unita:"mg/L", legge_max:1200, legge_min:null, target_max:800, target_min:null, preAllarme:85, rif:"Tab.3 n.35"},
      {id:"SO4",  nome:"Solfati (SO₄²⁻)",    unita:"mg/L", legge_max:1000, legge_min:null, target_max:700, target_min:null, preAllarme:85, rif:"Tab.3 n.36"},
      {id:"FENO", nome:"Fenoli Totali",       unita:"mg/L", legge_max:0.5,  legge_min:null, target_max:0.1, target_min:null, preAllarme:80, rif:"Tab.3 n.40"},
      {id:"TENS", nome:"Tensioattivi Totali", unita:"mg/L", legge_max:4,    legge_min:null, target_max:2,   target_min:null, preAllarme:80, rif:"Tab.3 n.41"},
    ]
  },
];

export const NORMATIVA_TAB4 = [
  {
    categoria:"Parametri Fisico-Chimici Base", colore:"#0055BB",
    params:[
      {id:"pH",   nome:"pH",                   unita:"",     legge_max:10,  legge_min:5.5,  target_max:9.0,  target_min:6.0,  preAllarme:90, rif:"Tab.4 n.3"},
      {id:"T",    nome:"Temperatura",           unita:"°C",   legge_max:40,  legge_min:null, target_max:35,   target_min:null, preAllarme:85, rif:"Tab.4 n.4"},
      {id:"COD",  nome:"COD",                   unita:"mg/L", legge_max:500, legge_min:null, target_max:400,  target_min:null, preAllarme:80, rif:"Tab.4 n.7"},
      {id:"BOD5", nome:"BOD₅ (20°C)",           unita:"mg/L", legge_max:250, legge_min:null, target_max:200,  target_min:null, preAllarme:80, rif:"Tab.4 n.8"},
      {id:"SST",  nome:"Solidi Sospesi Totali", unita:"mg/L", legge_max:200, legge_min:null, target_max:150,  target_min:null, preAllarme:80, rif:"Tab.4 n.9"},
      {id:"OG",   nome:"Oli e Grassi",          unita:"mg/L", legge_max:40,  legge_min:null, target_max:30,   target_min:null, preAllarme:80, rif:"Tab.4 n.5"},
    ]
  },
  {
    categoria:"Nutrienti — Azoto e Fosforo", colore:"#006E38",
    params:[
      {id:"NH4",  nome:"Azoto Ammoniacale (NH₄⁺)", unita:"mg/L", legge_max:30,   legge_min:null, target_max:25,   target_min:null, preAllarme:80, rif:"Tab.4 n.10"},
      {id:"NO3",  nome:"Azoto Nitrico (NO₃⁻)",     unita:"mg/L", legge_max:null, legge_min:null, target_max:null, target_min:null, preAllarme:80, rif:"Tab.4 n.12"},
      {id:"NTOT", nome:"Azoto Totale (N-tot)",      unita:"mg/L", legge_max:null, legge_min:null, target_max:null, target_min:null, preAllarme:80, rif:"Tab.4 n.13"},
      {id:"PTOT", nome:"Fosforo Totale (P-tot)",    unita:"mg/L", legge_max:10,   legge_min:null, target_max:8,    target_min:null, preAllarme:80, rif:"Tab.4 n.14"},
    ]
  },
  {
    categoria:"Metalli Pesanti", colore:"#B85000",
    params:[
      {id:"AS",   nome:"Arsenico (As)",   unita:"mg/L", legge_max:0.5,  legge_min:null, target_max:0.2,  target_min:null, preAllarme:80, rif:"Tab.4 n.20"},
      {id:"CD",   nome:"Cadmio (Cd)",     unita:"mg/L", legge_max:0.02, legge_min:null, target_max:0.01, target_min:null, preAllarme:80, rif:"Tab.4 n.21"},
      {id:"CU",   nome:"Rame (Cu)",       unita:"mg/L", legge_max:4,    legge_min:null, target_max:2,    target_min:null, preAllarme:80, rif:"Tab.4 n.24"},
      {id:"ZN",   nome:"Zinco (Zn)",      unita:"mg/L", legge_max:3,    legge_min:null, target_max:2,    target_min:null, preAllarme:80, rif:"Tab.4 n.31"},
      {id:"NI",   nome:"Nichel (Ni)",     unita:"mg/L", legge_max:4,    legge_min:null, target_max:3,    target_min:null, preAllarme:80, rif:"Tab.4 n.28"},
      {id:"PB",   nome:"Piombo (Pb)",     unita:"mg/L", legge_max:0.3,  legge_min:null, target_max:0.2,  target_min:null, preAllarme:80, rif:"Tab.4 n.29"},
    ]
  },
  {
    categoria:"Parametri Anorganici & Organici", colore:"#6622BB",
    params:[
      {id:"CL",   nome:"Cloruri (Cl⁻)",      unita:"mg/L", legge_max:1200, legge_min:null, target_max:1000, target_min:null, preAllarme:85, rif:"Tab.4 n.35"},
      {id:"SO4",  nome:"Solfati (SO₄²⁻)",    unita:"mg/L", legge_max:1000, legge_min:null, target_max:800,  target_min:null, preAllarme:85, rif:"Tab.4 n.36"},
      {id:"FENO", nome:"Fenoli Totali",       unita:"mg/L", legge_max:1,    legge_min:null, target_max:0.5,  target_min:null, preAllarme:80, rif:"Tab.4 n.40"},
      {id:"TENS", nome:"Tensioattivi Totali", unita:"mg/L", legge_max:8,    legge_min:null, target_max:6,    target_min:null, preAllarme:80, rif:"Tab.4 n.41"},
    ]
  },
];

export const NORMATIVA_AIA = [
  {
    categoria:"Parametri Fisico-Chimici Base", colore:"#0055BB",
    params:[
      {id:"pH",   nome:"pH",                   unita:"",     legge_max:9.0, legge_min:6.0,  target_max:8.5, target_min:6.5,  preAllarme:90, rif:"AIA art.6"},
      {id:"T",    nome:"Temperatura",           unita:"°C",   legge_max:28,  legge_min:null, target_max:24,  target_min:null, preAllarme:85, rif:"AIA art.6"},
      {id:"COD",  nome:"COD",                   unita:"mg/L", legge_max:125, legge_min:null, target_max:100, target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"BOD5", nome:"BOD₅ (20°C)",           unita:"mg/L", legge_max:25,  legge_min:null, target_max:20,  target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"SST",  nome:"Solidi Sospesi Totali", unita:"mg/L", legge_max:35,  legge_min:null, target_max:25,  target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"OG",   nome:"Oli e Grassi",          unita:"mg/L", legge_max:15,  legge_min:null, target_max:8,   target_min:null, preAllarme:80, rif:"AIA art.6"},
    ]
  },
  {
    categoria:"Nutrienti — Azoto e Fosforo", colore:"#006E38",
    params:[
      {id:"NH4",  nome:"Azoto Ammoniacale (NH₄⁺)", unita:"mg/L", legge_max:10, legge_min:null, target_max:6,   target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"NO3",  nome:"Azoto Nitrico (NO₃⁻)",     unita:"mg/L", legge_max:15, legge_min:null, target_max:8,   target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"NTOT", nome:"Azoto Totale (N-tot)",      unita:"mg/L", legge_max:10, legge_min:null, target_max:8,   target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"PTOT", nome:"Fosforo Totale (P-tot)",    unita:"mg/L", legge_max:1,  legge_min:null, target_max:0.5, target_min:null, preAllarme:80, rif:"AIA art.6"},
    ]
  },
  {
    categoria:"Metalli Pesanti", colore:"#B85000",
    params:[
      {id:"AS",   nome:"Arsenico (As)",   unita:"mg/L", legge_max:0.1,  legge_min:null, target_max:0.05,  target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"CD",   nome:"Cadmio (Cd)",     unita:"mg/L", legge_max:0.01, legge_min:null, target_max:0.005, target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"CU",   nome:"Rame (Cu)",       unita:"mg/L", legge_max:0.5,  legge_min:null, target_max:0.2,   target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"ZN",   nome:"Zinco (Zn)",      unita:"mg/L", legge_max:0.5,  legge_min:null, target_max:0.2,   target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"NI",   nome:"Nichel (Ni)",     unita:"mg/L", legge_max:2,    legge_min:null, target_max:1,     target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"PB",   nome:"Piombo (Pb)",     unita:"mg/L", legge_max:0.1,  legge_min:null, target_max:0.05,  target_min:null, preAllarme:80, rif:"AIA art.6"},
    ]
  },
  {
    categoria:"Parametri Anorganici & Organici", colore:"#6622BB",
    params:[
      {id:"CL",   nome:"Cloruri (Cl⁻)",      unita:"mg/L", legge_max:800, legge_min:null, target_max:600,  target_min:null, preAllarme:85, rif:"AIA art.6"},
      {id:"SO4",  nome:"Solfati (SO₄²⁻)",    unita:"mg/L", legge_max:600, legge_min:null, target_max:500,  target_min:null, preAllarme:85, rif:"AIA art.6"},
      {id:"FENO", nome:"Fenoli Totali",       unita:"mg/L", legge_max:0.1, legge_min:null, target_max:0.05, target_min:null, preAllarme:80, rif:"AIA art.6"},
      {id:"TENS", nome:"Tensioattivi Totali", unita:"mg/L", legge_max:2,   legge_min:null, target_max:1,    target_min:null, preAllarme:80, rif:"AIA art.6"},
    ]
  },
];

export const NORMATIVA_SETS = {
  "Tab. 3 – Acque superficiali": NORMATIVA_DEFAULT,
  "Tab. 4 – Fognatura":          NORMATIVA_TAB4,
  "Autorizzazione AIA":          NORMATIVA_AIA,
  "Personalizzato":              NORMATIVA_DEFAULT,
};
