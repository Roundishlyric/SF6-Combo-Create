const characterImages = {
  'A.K.I.': 'AKI_0.png',
  Akuma: 'Akuma_0.png',
  Alex: 'Alex_0.png',
  Blanka: 'Blanka_0.png',
  'C. Viper': 'Viper_0.png',
  Cammy: 'Cammy_0.png',
  'Chun-Li': 'ChunLi_0.png',
  'Dee Jay': 'DeeJay_0.png',
  Dhalsim: 'Dhalsim_0.png',
  Ed: 'Ed_0.png',
  Elena: 'Elena_0.png',
  'E. Honda': 'Honda_0.png',
  Guile: 'Guile_0.png',
  Ingrid: 'Ingrid_0.png',
  'J.P.': 'JP_0.png',
  Jamie: 'Jamie_0.png',
  Juri: 'Juri_0.png',
  Ken: 'Ken_0.png',
  Kimberly: 'Kimberly_0.png',
  Lily: 'Lily_0.png',
  Luke: 'Luke_0.png',
  'M. Bison': 'Bison_0.png',
  Mai: 'Mai_0.png',
  Manon: 'Manon_0.png',
  Marisa: 'Marisa_0.png',
  Rashid: 'Rashid_0.png',
  Ryu: 'Ryu_0.png',
  Sagat: 'Sagat_0.png',
  Terry: 'Terry_0.png',
  Zangief: 'Zangief_0.png',
};

export const getCharacterImage = (character) => {
  const imageFile = characterImages[character];
  return imageFile ? `/images/${imageFile.replace('_0.png', '_thumb.png')}` : '';
};
