import { Song, TitleDisplayMode } from '../types';

export type { TitleDisplayMode };

// Curated translations for global and regional hits
const SONG_TRANSLATIONS: Record<string, { translatedTitle: string; translatedArtist?: string; romanized?: string }> = {
  // Moroccan & Maghrebi hits
  'dizzy-lallamoulati': { translatedTitle: 'My Lady & Queen', romanized: 'Lalla Moulati' },
  'dizzy-m3a-l3echrane': { translatedTitle: 'With The Homies', romanized: 'M3a L3echrane' },
  'toto-mghayer': { translatedTitle: 'Changed / Transformed', romanized: 'Mghayer' },
  'toto-staline': { translatedTitle: 'Stalin (Unstoppable)', romanized: 'Staline' },
  'toto-love-nwantiti': { translatedTitle: 'Love in Small Doses', romanized: 'Love Nwantiti' },
  'saad-lm3allem': { translatedTitle: 'The Boss / The Master', romanized: 'LM3ALLEM' },
  'saad-ghazali': { translatedTitle: 'My Beautiful Gazelle', romanized: 'Ghazali' },
  'saad-enty': { translatedTitle: 'You (The One)', romanized: 'Enty' },
  'manal-slay': { translatedTitle: 'Slay (Ruling the Scene)', romanized: 'Slay' },
  'manal-taj': { translatedTitle: 'The Royal Crown', romanized: 'Taj' },
  'manal-niya': { translatedTitle: 'Pure Intentions / Good Faith', romanized: 'Niya' },
  'manal-3ari': { translatedTitle: 'My Honor & Dignity', romanized: '3ari' },
  'muslim-dmm': { translatedTitle: 'Heart of Gold (Dam)', romanized: 'DMM' },
  'muslim-lmarhoum': { translatedTitle: 'The Departed Soul', romanized: 'Lmarhoum' },
  'muslim-al-risala': { translatedTitle: 'The Message to the World', romanized: 'Al Risala' },
  'stormy-afrique': { translatedTitle: 'Africa My Roots', romanized: 'Afrique' },
  'stormy-maghreb': { translatedTitle: 'Morocco / The Maghreb', romanized: 'Maghreb' },
  'kouz1-magic': { translatedTitle: 'Magic Spell', romanized: 'Magic' },
  'kouz1-love': { translatedTitle: 'True Love', romanized: 'Love' },
  'tagne-hustler': { translatedTitle: 'The Street Hustler', romanized: 'Hustler' },
  'tagne-flouka': { translatedTitle: 'Small Fishing Boat', romanized: 'Flouka' },
  'lbenj-sbata': { translatedTitle: 'Sbata (The Hood)', romanized: 'Sbata' },
  'lbenj-noir-et-blanc': { translatedTitle: 'Black and White', romanized: 'Noir et Blanc' },
  'shatha-bent-el-akaber': { translatedTitle: 'Daughter of Nobles', romanized: 'Bent El Akaber' },
  'inikon-maroc': { translatedTitle: 'Morocco Stand Up', romanized: 'Maroc' },
  'snor-debbana': { translatedTitle: 'The Fly (Buzzing Round)', romanized: 'Debbana' },
  'snor-hkaya': { translatedTitle: 'A Life Story', romanized: 'Hkaya' },
  'nass-siniya': { translatedTitle: 'The Tea Tray', romanized: 'Essiniya' },
  'nass-allah-ya-moulana': { translatedTitle: 'God, Our Sovereign Lord', romanized: 'Allah Ya Moulana' },
  'nass-mahmouma': { translatedTitle: 'Heavy-Hearted', romanized: 'Mahmouma' },
  'jil-le3youn-3neya': { translatedTitle: 'The Eyes of My Soul', romanized: 'Le3youn 3neya' },
  'lemchaheb-daouini': { translatedTitle: 'Heal My Wounds', romanized: 'Daouini' },
  'chaabi-lalla-laaroussa': { translatedTitle: 'The Radiant Bride', romanized: 'Lalla Laaroussa' },
  'senhaji-khedija': { translatedTitle: 'Khadija (Beloved)', romanized: 'Khadija' },
  'daoudi-chouffi': { translatedTitle: 'Look at Me', romanized: 'Chouffi' },
  'tahour-aarassi': { translatedTitle: 'Wedding Celebration', romanized: 'Aarassi' },
  'stati-visita': { translatedTitle: 'The Family Visit', romanized: 'Visita' },

  // Egyptian & Middle Eastern hits
  'amr-nour-el-ein': { translatedTitle: 'Light of My Eyes / Habibi', romanized: 'Nour El Ein' },
  'amr-tamally-maak': { translatedTitle: 'Always With You', romanized: 'Tamally Maak' },
  'amr-habibi-ya-nour-el-ain': { translatedTitle: 'My Darling, Light of Eyes', romanized: 'Habibi Ya Nour El Ain' },
  'adaweyah-bint-el-sultan': { translatedTitle: 'Daughter of the Sultan', romanized: 'Bint El Sultan' },
  'nancy-inta-eyh': { translatedTitle: 'What Kind of Person Are You?', romanized: 'Inta Eyh' },
  'nancy-ah-w-noss': { translatedTitle: 'Yes, Absolutely!', romanized: 'Ah W Noss' },
  'sherine-kollaha-ghayrana': { translatedTitle: 'They Are All Jealous', romanized: 'Kollaha Ghayrana' },
  'sherine-masha3er': { translatedTitle: 'Deep Emotions', romanized: 'Masha\'er' },
  'tamer-kol-marra': { translatedTitle: 'Every Single Time', romanized: 'Kol Marra' },
  'tamer-ya-bent-el-eh': { translatedTitle: 'Oh, What a Girl!', romanized: 'Ya Bent El Eh' },
  'wegz-el-bakht': { translatedTitle: 'Destiny & Fortune', romanized: 'El Bakht' },
  'wegz-dorak-gai': { translatedTitle: 'Your Turn Is Next', romanized: 'Dorak Gai' },
  'marwan-pablo-ghaba': { translatedTitle: 'The Jungle / Forest', romanized: 'Ghaba' },
  'marwan-moussa-sheraton': { translatedTitle: 'Sheraton Heights', romanized: 'Sheraton' },
  'hussain-al-jassmi-bel-bont-el-areed': { translatedTitle: 'In Bold Letters / Full View', romanized: 'Bel Bont El Areed' },
  'al-jassmi-boshret-kheir': { translatedTitle: 'Good Omen / Good News', romanized: 'Boshret Kheir' },
  'abdul-majeed-han-al-ghareeb': { translatedTitle: 'The Traveler Longs for Home', romanized: 'Han Al Ghareeb' },
  'mohamed-abdu-al-amaken': { translatedTitle: 'All These Places', romanized: 'Al Amaken' },
  'balqees-entehi': { translatedTitle: 'It Is Finished', romanized: 'Entehi' },
  'balqees-ya-hawa': { translatedTitle: 'Oh Breeze of Love', romanized: 'Ya Hawa' },
  'hamza-namira-dari-ya-alby': { translatedTitle: 'Hide It, Oh My Heart', romanized: 'Dari Ya Alby' },
  'cairokee-ya-el-miedan': { translatedTitle: 'Oh Square of Freedom', romanized: 'Ya El Miedan' },

  // Korean / K-Pop
  'psy-gangnam-style': { translatedTitle: 'Gangnam Lifestyle', romanized: 'Gangnam Style' },
  'bts-dynamite': { translatedTitle: 'Dynamite (Lighting the Night)', romanized: 'Dynamite' },
  'bts-butter': { translatedTitle: 'Smooth Like Butter', romanized: 'Butter' },
  'bts-boy-with-luv': { translatedTitle: 'A Poem for Small Things', romanized: 'Boy With Luv / Jag-eun Geosdeul-eul Wi-han Si' },
  'blackpink-ddu-du': { translatedTitle: 'DDU-DU DDU-DU (Hit You With That)', romanized: 'Ddu-Du Ddu-Du' },
  'blackpink-how-you-like-that': { translatedTitle: 'How You Like That', romanized: 'How You Like That' },
  'blackpink-pink-venom': { translatedTitle: 'Pink Venom', romanized: 'Pink Venom' },
  'newjeans-hype-boy': { translatedTitle: 'Hype Boy', romanized: 'Hype Boy' },
  'newjeans-omg': { translatedTitle: 'Oh My God (OMG)', romanized: 'OMG' },
  'newjeans-super-shy': { translatedTitle: 'Super Shy', romanized: 'Super Shy' },
  'twice-what-is-love': { translatedTitle: 'What is Love?', romanized: 'What is Love?' },
  'ive-love-dive': { translatedTitle: 'Dive into Love', romanized: 'Love Dive' },
  'aespa-supernova': { translatedTitle: 'Cosmic Supernova', romanized: 'Supernova' },

  // Japanese / J-Pop & Anime
  'fujii-shinunoga-e-wa': { translatedTitle: 'I\'d Rather Die (Than Live Without You)', romanized: 'Shinunoga E-Wa' },
  'fujii-matsuri': { translatedTitle: 'Sacred Festival', romanized: 'Matsuri' },
  'yoasobi-idol': { translatedTitle: 'The Ultimate Idol', romanized: 'Aidoru' },
  'yoasobi-yoru-ni-kakeru': { translatedTitle: 'Racing into the Night', romanized: 'Yoru ni Kakeru' },
  'creepy-nuts-bling-bang': { translatedTitle: 'Bling-Bang-Bang-Born (Magic Born)', romanized: 'Bling-Bang-Bang-Born' },
  'kenshi-yonezu-lemon': { translatedTitle: 'Lemon (Bitter Memory)', romanized: 'Remon' },
  'kenshi-kick-back': { translatedTitle: 'Kick Back (Chainsaw Beat)', romanized: 'Kikku Bakku' },
  'eve-kaikai-kitan': { translatedTitle: 'Mysterious Tales of Jujutsu', romanized: 'Kaikai Kitan' },
  'lisa-gurenge': { translatedTitle: 'Red Lotus Blossom', romanized: 'Gurenge' },
  'king-gnu-specialz': { translatedTitle: 'You Are My Special', romanized: 'Specialz' },

  // Latin / Spanish / Portuguese
  'luis-fonsi-despacito': { translatedTitle: 'Slowly / Gentle Motion', romanized: 'Despacito' },
  'j-balvin-mi-gente': { translatedTitle: 'My People Worldwide', romanized: 'Mi Gente' },
  'bad-bunny-titi-me-pregunto': { translatedTitle: 'Auntie Asked Me (About Girlfriends)', romanized: 'Tití Me Preguntó' },
  'bad-bunny-dakiti': { translatedTitle: 'Dakiti Beach Nights', romanized: 'Dákiti' },
  'bad-bunny-monaco': { translatedTitle: 'Monaco Luxury', romanized: 'Monaco' },
  'rosalia-despecha': { translatedTitle: 'Unbothered & Free (Heartbreak Party)', romanized: 'Despechá' },
  'rosalia-malamente': { translatedTitle: 'Badly / Ill Omen', romanized: 'Malamente' },
  'bizarrap-shakira': { translatedTitle: 'Out of Your League (Music Sessions #53)', romanized: 'Bzrp Music Sessions #53' },
  'bizarrap-quevedo': { translatedTitle: 'Stay (Quédate)', romanized: 'Bzrp Music Sessions #52 (Quédate)' },
  'karol-g-provenza': { translatedTitle: 'Provence Neighborhood', romanized: 'Provenza' },
  'karol-g-tqg': { translatedTitle: 'Too Big For You (Te Quedó Grande)', romanized: 'TQG' },
  'anitta-envolver': { translatedTitle: 'Enthrall / Wrap Around', romanized: 'Envolver' },
  'michel-telo-ai-se-eu-te-pego': { translatedTitle: 'Oh, If I Catch You!', romanized: 'Ai Se Eu Te Pego' },

  // Indian / Bollywood & Punjabi
  'arijit-tum-hi-ho': { translatedTitle: 'You Are The One (My Entire Life)', romanized: 'Tum Hi Ho' },
  'arijit-kesariya': { translatedTitle: 'Saffron Hue (Of Your Love)', romanized: 'Kesariya' },
  'ap-dhillon-brown-munde': { translatedTitle: 'Brown Boys (Representing Worldwide)', romanized: 'Brown Munde' },
  'ap-dhillon-excuses': { translatedTitle: 'Making Excuses', romanized: 'Excuses' },
  'diljit-g-goat': { translatedTitle: 'Greatest of All Time (G.O.A.T.)', romanized: 'G.O.A.T.' },
  'diljit-lover': { translatedTitle: 'True Lover', romanized: 'Lover' },
  'sidhu-295': { translatedTitle: 'Section 295 (Targeted Truth)', romanized: '295' },
  'naatu-naatu': { translatedTitle: 'Dance Wildly / Raw Energy', romanized: 'Naatu Naatu' },

  // Turkish
  'tarkan-simarik': { translatedTitle: 'Spoiled / Kiss Kiss', romanized: 'Şımarık' },
  'tarkan-duydum-ki-unutssun': { translatedTitle: 'I Heard You Forgot Me', romanized: 'Dudu' },
  'ezhel-geceler': { translatedTitle: 'City Nights', romanized: 'Geceler' },
  'ezhel-felaket': { translatedTitle: 'Disaster / Beautiful Catastrophe', romanized: 'Felaket' },
  'sefo-bilmem-mi': { translatedTitle: 'Don\'t I Know It?', romanized: 'Bilmem Mi?' },
  'reynmen-derdim-olsun': { translatedTitle: 'Let It Be My Grief', romanized: 'Derdim Olsun' },

  // French
  'stromae-papaoutai': { translatedTitle: 'Dad, Where Are You?', romanized: 'Papaoutai' },
  'stromae-alors-on-danse': { translatedTitle: 'So We Dance (Despite It All)', romanized: 'Alors on Danse' },
  'stromae-sante': { translatedTitle: 'Cheers / To Your Health (Workers Tribute)', romanized: 'Santé' },
  'aya-nakamura-djadja': { translatedTitle: 'Djadja (False Rumor Spreader)', romanized: 'Djadja' },
  'aya-nakamura-copines': { translatedTitle: 'My Girlfriends', romanized: 'Copines' },
  'gims-bella': { translatedTitle: 'Beautiful Lady', romanized: 'Bella' },
  'gims-sapés-comme-jamais': { translatedTitle: 'Dressed Up Like Never Before', romanized: 'Sapés comme jamais' },
  'jul-jc-vd': { translatedTitle: 'Cruising the Boulevard', romanized: 'Bande Organisée' },
  'ninho-jefe': { translatedTitle: 'The Boss (Jefe)', romanized: 'Jefe' },
  'indila-derniere-danse': { translatedTitle: 'Last Dance of Paris', romanized: 'Dernière Danse' },

  // German
  'rammstein-du-hast': { translatedTitle: 'You Have / You Hate Me', romanized: 'Du Hast' },
  'rammstein-deutschland': { translatedTitle: 'Germany (My Blood and Love)', romanized: 'Deutschland' },
  'apache-roller': { translatedTitle: 'Cruising on the Scooter', romanized: 'Roller' },
  'peter-fox-schuttel-deinen-speck': { translatedTitle: 'Shake What You\'ve Got', romanized: 'Schüttel Deinen Speck' },
  'cro-traum': { translatedTitle: 'Dream Girl', romanized: 'Traum' },

  // Italian
  'maneskin-zitti-e-buoni': { translatedTitle: 'Shut Up and Behave', romanized: 'Zitti E Buoni' },
  'maneskin-beggin': { translatedTitle: 'Begging For You', romanized: 'Beggin\'' },
  'fedez-disco-paradise': { translatedTitle: 'Disco Paradise Beach', romanized: 'Disco Paradise' },
  'mahmood-soldi': { translatedTitle: 'Money (Soldi)', romanized: 'Soldi' },
  'mahmood-brividi': { translatedTitle: 'Shivers Down the Spine', romanized: 'Brividi' },

  // Nigerian / Afrobeats & Ghanaian
  'burna-last-last': { translatedTitle: 'At the End of the Day (Breakfast Served)', romanized: 'Last Last' },
  'burna-ye': { translatedTitle: 'Ye (Living My Life)', romanized: 'Ye' },
  'burna-city-boys': { translatedTitle: 'City Boys Living Bold', romanized: 'City Boys' },
  'rema-calm-down': { translatedTitle: 'Calm Down (Baby Make You Lock Down)', romanized: 'Calm Down' },
  'wizkid-essence': { translatedTitle: 'Pure Essence (You Don\'t Need Nobody)', romanized: 'Essence' },
  'davido-unavailable': { translatedTitle: 'Unavailable to Distractions', romanized: 'Unavailable' },
  'davido-fall': { translatedTitle: 'Falling Deep for You', romanized: 'Fall' },
  'asake-lonely-at-the-top': { translatedTitle: 'Lonely at the Top', romanized: 'Lonely At The Top' },
  'black-sherif-kwaku-the-traveller': { translatedTitle: 'Kwaku The Wanderer (Remember I Was Young)', romanized: 'Kwaku the Traveller' },
  'king-promise-terminator': { translatedTitle: 'The Unstoppable Terminator', romanized: 'Terminator' },
  'stonebwoy-into-the-future': { translatedTitle: 'Into The Future Ahead', romanized: 'Into the Future' }
};

/**
 * Returns the appropriate display title and subtitle given user preference
 */
export function getSongTitleDisplay(
  song: Song,
  mode: TitleDisplayMode = 'both'
): {
  primaryTitle: string;
  secondaryTitle?: string;
  badgeLabel?: string;
  artistDisplay: string;
} {
  const transData = SONG_TRANSLATIONS[song.id] || (song.translatedTitle ? { translatedTitle: song.translatedTitle } : undefined);
  const originalNative = song.titleArabic || song.nativeTitle;
  const originalNativeArtist = song.artistArabic || song.nativeArtist;
  const romanized = transData?.romanized || song.romanizedTitle || song.title;
  const englishMeaning = transData?.translatedTitle || song.translatedTitle;

  const defaultArtist = originalNativeArtist && mode === 'original' 
    ? `${originalNativeArtist} (${song.artist})` 
    : song.artist;

  switch (mode) {
    case 'original':
      if (originalNative) {
        return {
          primaryTitle: originalNative,
          secondaryTitle: romanized !== originalNative ? romanized : undefined,
          badgeLabel: 'Original Script',
          artistDisplay: originalNativeArtist ? `${originalNativeArtist} • ${song.artist}` : song.artist
        };
      }
      return {
        primaryTitle: song.title,
        secondaryTitle: englishMeaning && englishMeaning !== song.title ? `"${englishMeaning}"` : undefined,
        badgeLabel: 'Standard',
        artistDisplay: song.artist
      };

    case 'romanized':
      return {
        primaryTitle: romanized,
        secondaryTitle: originalNative ? originalNative : undefined,
        badgeLabel: 'Romanized (Latin)',
        artistDisplay: song.artist
      };

    case 'translated':
      if (englishMeaning) {
        return {
          primaryTitle: englishMeaning,
          secondaryTitle: originalNative ? `${originalNative} • ${romanized}` : romanized,
          badgeLabel: 'Translated Meaning',
          artistDisplay: song.artist
        };
      }
      return {
        primaryTitle: song.title,
        secondaryTitle: originalNative ? originalNative : undefined,
        badgeLabel: 'Standard English',
        artistDisplay: song.artist
      };

    case 'both':
    default:
      if (originalNative) {
        return {
          primaryTitle: song.title,
          secondaryTitle: `${originalNative}${englishMeaning && englishMeaning !== song.title ? ` • "${englishMeaning}"` : ''}`,
          badgeLabel: 'Dual Display',
          artistDisplay: originalNativeArtist ? `${song.artist} (${originalNativeArtist})` : song.artist
        };
      }
      return {
        primaryTitle: song.title,
        secondaryTitle: englishMeaning && englishMeaning !== song.title ? `"${englishMeaning}"` : undefined,
        badgeLabel: undefined,
        artistDisplay: song.artist
      };
  }
}
