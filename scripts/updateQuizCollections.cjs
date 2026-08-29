const fs = require("fs");

const collections = [
  // 1. Official Spotify Playlists Flagships
  {
    id: 'spotify-rap-maroc',
    title: 'Rap Maroc (Official Spotify)',
    titleArabic: 'سبوتيفاي: راب ماروك',
    description: 'The official Spotify Rap Maroc playlist featuring the hottest bangers from Casablanca to Tangier.',
    category: 'Spotify Official',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/2f2d297e178898d778097b7c66c2a90a/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 16,
    songIds: [
      'toto-mghayer', 'toto-salina', 'toto-dellali', 'toto-silhouette', 'toto-darbeda',
      'dizzy-m3a-l3essba', 'dizzy-nota', 'dizzy-moul-ballon', 'stormy-nikey', 'stormy-africano',
      'snor-de9a-de9a', 'snor-hkaya', 'tagne-fratello', 'tagne-flouka', 'smallx-liyana', 'dollypran-trax'
    ],
    isHot: true,
    isOfficialSpotify: true,
    spotifyPlaylistName: 'Spotify • Rap Maroc',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX6tPtU8XwSrn',
    tags: ['Official Playlist', 'Spotify Flagship', 'Moroccan Rap']
  },
  {
    id: 'spotify-maghreb-pop',
    title: 'Maghreb Pop (Official Spotify)',
    titleArabic: 'سبوتيفاي: مغرب بوب',
    description: 'Catchy modern Moroccan & Maghrebi pop hits heard across North Africa and the diaspora.',
    category: 'Spotify Official',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/d2b0e3341b6cabf610dec963e3d527da/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 14,
    songIds: [
      'saad-lm3allem', 'saad-ghaltana', 'saad-enty', 'saad-casablanca', 'saad-ghazali',
      'hatim-hasdouna', 'hatim-bla-3onwan', 'hatim-yama', 'hatim-alawal',
      'zouhair-decapotable', 'zouhair-mucho-amor', 'zouhair-bghit-w-ga3ma-hassit',
      'douzi-mina', 'douzi-bikhtissar'
    ],
    isHot: true,
    isOfficialSpotify: true,
    spotifyPlaylistName: 'Spotify • Maghreb Pop',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX2pukq1P8c7m',
    tags: ['Official Playlist', 'Spotify Flagship', 'Moroccan Pop']
  },
  {
    id: 'spotify-top-50-morocco',
    title: 'Top 50 Morocco (Official Spotify)',
    titleArabic: 'سبوتيفاي: توب 50 المغرب',
    description: 'The most streamed tracks right now across Spotify charts in the Kingdom of Morocco.',
    category: 'Spotify Official',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/0bc314c995544cfb1eeae73673ca00d6/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 15,
    songIds: [
      'toto-salina', 'toto-mghayer', 'dizzy-m3a-l3essba', 'kouz1-magic', 'kouz1-love',
      'manal-taj', 'manal-slay', 'snor-de9a-de9a', 'tagne-youm-wara-youm', 'zouhair-decapotable',
      'saad-casablanca', 'stormy-maghribi', 'ahmed-chawki-habibi', 'asma-lmnawar-ando-zin', 'khaled-cest-la-vie'
    ],
    isHot: true,
    isOfficialSpotify: true,
    spotifyPlaylistName: 'Spotify • Top 50 Morocco',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZEVXbNFJfUmvstRi',
    tags: ['Official Playlist', 'Charts', 'Daily Top']
  },
  {
    id: 'spotify-chaabi-maroc',
    title: 'Chaabi Maroc (Official Spotify)',
    titleArabic: 'سبوتيفاي: شعبي مغربي',
    description: 'Authentic Chaabi groove, violin melodies, and celebration anthems for weddings and parties.',
    category: 'Spotify Official',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/5f58c70ca0c5e933405c1022dfa646c2/1000x1000-000000-80-0-0.jpg',
    difficulty: 'MEDIUM',
    songsCount: 10,
    songIds: [
      'najat-kedba', 'najat-j-en-ai-marre', 'najat-choufi-ghirou',
      'daoudi-3tini-saki', 'daoudi-aita', 'statia-hwa-dani',
      'senhaji-kheddouj', 'senhaji-zid-dardeg',
      'abdelaziz-stati-visa', 'abdelaziz-stati-zwina'
    ],
    isHot: true,
    isOfficialSpotify: true,
    spotifyPlaylistName: 'Spotify • Chaabi Maroc',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcK4mFw8x0Yt',
    tags: ['Official Playlist', 'Traditional', 'Party Vibes']
  },
  {
    id: 'spotify-fresh-finds-maroc',
    title: 'Fresh Finds Maroc (Official Spotify)',
    titleArabic: 'سبوتيفاي: اكتشافات المغرب',
    description: 'Underground innovators and boundary-pushing next-gen Moroccan sounds.',
    category: 'Spotify Official',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/d7a8d56f6cb190f8ca773eb9d5ff78be/1000x1000-000000-80-0-0.jpg',
    difficulty: 'HARD',
    songsCount: 8,
    songIds: [
      'snor-dawkheni', 'dollypran-trax', 'khtek-kickoff', 'kouz1-jupter',
      'kouz1-brave', 'manal-3ari', 'stormy-africano', 'smallx-liyana'
    ],
    isOfficialSpotify: true,
    spotifyPlaylistName: 'Spotify • Fresh Finds Maroc',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXaQ3F7uK9z2j',
    tags: ['Official Playlist', 'Fresh Finds', 'Alternative']
  },

  // 2. Hip-Hop & Drill Master Packs
  {
    id: 'moroccan-rap-royalty',
    title: 'Moroccan Rap Royalty',
    titleArabic: 'ملوك الراب المغربي',
    description: 'The heavyweight titans: ElGrandeToto, Dizzy DROS, Muslim, Don Bigg, Small X & Stormy.',
    category: 'Hip-Hop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/2f2d297e178898d778097b7c66c2a90a/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 16,
    songIds: [
      'toto-mghayer', 'toto-salina', 'toto-dellali', 'toto-silhouette', 'toto-darbeda',
      'dizzy-m3a-l3essba', 'dizzy-nota', 'dizzy-moul-ballon', 'dizzy-cazafonia', 'dizzy-chouf-chouf',
      'stormy-nikey', 'stormy-africano', 'stormy-maghribi', 'muslim-al-rissala', 'muslim-domi', 'don-bigg-17', 'smallx-liyana'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • Best of Moroccan Rap',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Moroccan%20Rap%20Royalty',
    tags: ['Rap', 'Royalty', 'Casablanca', 'Tangier']
  },
  {
    id: 'elgrandetoto-complete',
    title: 'ElGrandeToto Anthology',
    titleArabic: 'سبيسيال إل غراندي طوطو',
    description: 'From BNJ City Block and Caméléon to 27 and record-shattering global collaborations.',
    category: 'Hip-Hop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/2f2d297e178898d778097b7c66c2a90a/1000x1000-000000-80-0-0.jpg',
    difficulty: 'MEDIUM',
    songsCount: 5,
    songIds: [
      'toto-mghayer', 'toto-salina', 'toto-dellali', 'toto-silhouette', 'toto-darbeda'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • This Is ElGrandeToto',
    spotifyPlaylistUrl: 'https://open.spotify.com/artist/6vOStvYxT0jVnL8sE7qN8a',
    tags: ['Artist Pack', 'ElGrandeToto', 'Drill/Trap']
  },
  {
    id: 'dizzy-dros-discography',
    title: 'Dizzy DROS Masterclass',
    titleArabic: 'ديزي دروس: الأسطورة',
    description: 'From Cazafonia and 3azzy 3andou Stylo to M3a L3essba, Nota, and Moul Ballon.',
    category: 'Hip-Hop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/9f38eb45bb40a831e133e9d8995ba1a6/1000x1000-000000-80-0-0.jpg',
    difficulty: 'MEDIUM',
    songsCount: 5,
    songIds: [
      'dizzy-m3a-l3essba', 'dizzy-nota', 'dizzy-moul-ballon', 'dizzy-cazafonia', 'dizzy-chouf-chouf'
    ],
    spotifyPlaylistName: 'Spotify • This Is Dizzy DROS',
    spotifyPlaylistUrl: 'https://open.spotify.com/artist/5gqA2g3aB87L9cOq4bXzK0',
    tags: ['Artist Pack', 'Dizzy DROS', 'Casa Rap']
  },
  {
    id: 'moroccan-drill-trap',
    title: 'Moroccan Drill & Dark Trap',
    titleArabic: 'دريل وتراب مغربي',
    description: 'Heavy 808s and razor flows from SNOR, Dollypran, Tagne and Khtek.',
    category: 'Drill/Trap',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/d7a8d56f6cb190f8ca773eb9d5ff78be/1000x1000-000000-80-0-0.jpg',
    difficulty: 'HARD',
    songsCount: 10,
    songIds: [
      'snor-de9a-de9a', 'snor-hkaya', 'snor-dawkheni',
      'dollypran-trax', 'tagne-fratello', 'tagne-flouka', 'tagne-youm-wara-youm',
      'khtek-kickoff', 'stormy-nikey', 'smallx-liyana'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • Moroccan Drill',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Moroccan%20Drill%20Trap',
    tags: ['Drill', '808s', 'Street']
  },
  {
    id: 'kouz1-melodic-wave',
    title: 'Kouz1 & Melodic Afro-Wave',
    titleArabic: 'موجة كوزوان والأنغام العصرية',
    description: 'Smooth autotune, Afro-Moroccan rhythms, and viral romance tracks by Kouz1.',
    category: 'Hip-Hop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/0bc314c995544cfb1eeae73673ca00d6/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 4,
    songIds: ['kouz1-magic', 'kouz1-love', 'kouz1-brave', 'kouz1-jupter'],
    spotifyPlaylistName: 'Spotify • This Is Kouz1',
    spotifyPlaylistUrl: 'https://open.spotify.com/artist/7zH6rP2Vn0yJqEw6mQz7sK',
    tags: ['Melodic', 'Afrobeats', 'Kouz1']
  },
  {
    id: 'muslim-tangier-legacy',
    title: 'Muslim & Tanger Legacy',
    titleArabic: 'مسلم وتراث الهيب هوب الطنجاوي',
    description: 'The conscious voice of Tangier street realism: Al Rissala, Domi, and Kabous.',
    category: 'Hip-Hop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/9fa0aa8c332ee9e8311cb9397ea3b71d/1000x1000-000000-80-0-0.jpg',
    difficulty: 'MEDIUM',
    songsCount: 5,
    songIds: [
      'muslim-al-rissala', 'muslim-domi', 'muslim-kabous', 'don-bigg-17', 'don-bigg-maghrabi'
    ],
    spotifyPlaylistName: 'Spotify • Muslim Anthems',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Muslim%20Rap%20Maroc',
    tags: ['Old School', 'Tangier', 'Conscious Rap']
  },
  {
    id: 'casablanca-anthems',
    title: 'Casablanca Street Anthems',
    titleArabic: 'أغاني كازابلانكا ودرب السلطان',
    description: 'Raw energy straight from Derb Sultan, Maarif, Sbata and Ain Sebaa.',
    category: 'Hip-Hop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/9f38eb45bb40a831e133e9d8995ba1a6/1000x1000-000000-80-0-0.jpg',
    difficulty: 'HARD',
    songsCount: 8,
    songIds: [
      'toto-darbeda', 'dizzy-cazafonia', 'dizzy-chouf-chouf', 'dizzy-moul-ballon',
      'toto-silhouette', 'saad-casablanca', 'stormy-africano', 'don-bigg-17'
    ],
    spotifyPlaylistName: 'Spotify • Casa Nostra',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Casablanca%20Rap%20Playlist',
    tags: ['Casablanca', 'Street', 'Anthems']
  },

  // 3. Pop & Mega Icons
  {
    id: 'moroccan-pop-anthems',
    title: 'Moroccan Pop Mega-Hits',
    titleArabic: 'أكبر أغاني البوب المغربي',
    description: 'Billion-view anthems by Saad Lamjarred, Zouhair Bahaoui, Douzi & Hatim Ammor.',
    category: 'Pop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/d2b0e3341b6cabf610dec963e3d527da/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 16,
    songIds: [
      'saad-lm3allem', 'saad-ghaltana', 'saad-enty', 'saad-casablanca', 'saad-ghazali',
      'hatim-hasdouna', 'hatim-bla-3onwan', 'hatim-yama', 'hatim-alawal',
      'zouhair-decapotable', 'zouhair-mucho-amor', 'zouhair-bghit-w-ga3ma-hassit',
      'douzi-mina', 'douzi-bikhtissar', 'ahmed-chawki-habibi', 'ahmed-chawki-kayna-wla'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • Moroccan Pop Essentials',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Moroccan%20Pop%20Hits',
    tags: ['Pop', 'Mega-Hits', 'Radio']
  },
  {
    id: 'saad-lamjarred-anthology',
    title: 'Saad Lamjarred Record Breakers',
    titleArabic: 'أفضل أغاني سعد لمجرد',
    description: 'From LM3ALLEM and Enty to Casablanca, Ghaltana, and Ghazali Ghazali.',
    category: 'Pop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/d2b0e3341b6cabf610dec963e3d527da/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 5,
    songIds: [
      'saad-lm3allem', 'saad-ghaltana', 'saad-enty', 'saad-casablanca', 'saad-ghazali'
    ],
    spotifyPlaylistName: 'Spotify • This Is Saad Lamjarred',
    spotifyPlaylistUrl: 'https://open.spotify.com/artist/2wXW0XF6q9B3jL0eZ6q8d7',
    tags: ['Artist Pack', 'Saad Lamjarred', 'Pop']
  },
  {
    id: 'queens-of-morocco',
    title: 'Queens of Moroccan Music',
    titleArabic: 'نجمات الموسيقى المغربية',
    description: 'Trailblazing anthems by Manal, Asma Lmnawar, Najat Aatabou, Statia & Salma Rachid.',
    category: 'Icons',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/df67215951a84f50fe7dca7aa9aa9410/1000x1000-000000-80-0-0.jpg',
    difficulty: 'MEDIUM',
    songsCount: 13,
    songIds: [
      'manal-taj', 'manal-slay', 'manal-3ari', 'manal-call-me', 'manal-makhelaw-magalo',
      'asma-lmnawar-ando-zin', 'asma-safi', 'salma-rachid-sma3ni',
      'najat-kedba', 'najat-j-en-ai-marre', 'najat-choufi-ghirou', 'statia-hwa-dani', 'khtek-kickoff'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • EQUAL Maroc',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX8LqUvA0jX8k',
    tags: ['Female Artists', 'EQUAL', 'Icons']
  },
  {
    id: 'manal-benchlikha-pack',
    title: 'Manal Pop & Urban Hits',
    titleArabic: 'منال بنشليخة: إبداع وتميز',
    description: 'Taj, Slay with Toto, 3ARI, Call Me, and Makhelaw Magalo.',
    category: 'Icons',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/df67215951a84f50fe7dca7aa9aa9410/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 5,
    songIds: ['manal-taj', 'manal-slay', 'manal-3ari', 'manal-call-me', 'manal-makhelaw-magalo'],
    spotifyPlaylistName: 'Spotify • This Is Manal',
    spotifyPlaylistUrl: 'https://open.spotify.com/artist/4XgNlPZ8w0eXpQ9sE7rK8m',
    tags: ['Artist Pack', 'Manal', 'Urban Pop']
  },

  // 4. Chaabi & Folkloric Rhythms
  {
    id: 'chaabi-wedding-bangers',
    title: 'Chaabi Wedding Bangers & Aita',
    titleArabic: 'روائع الشعبي والأعراس',
    description: 'Celebration rhythms from Najat Aatabou, Stati, Daoudi, Senhaji & Statia.',
    category: 'Chaabi',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/5f58c70ca0c5e933405c1022dfa646c2/1000x1000-000000-80-0-0.jpg',
    difficulty: 'MEDIUM',
    songsCount: 10,
    songIds: [
      'najat-kedba', 'najat-j-en-ai-marre', 'najat-choufi-ghirou',
      'daoudi-3tini-saki', 'daoudi-aita', 'statia-hwa-dani',
      'senhaji-kheddouj', 'senhaji-zid-dardeg',
      'abdelaziz-stati-visa', 'abdelaziz-stati-zwina'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • Chaabi Party Hits',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Chaabi%20Morocco%20Spotify',
    tags: ['Chaabi', 'Weddings', 'Aita']
  },
  {
    id: 'najat-aatabou-queen-pack',
    title: 'Najat Aatabou Ultimate Queen',
    titleArabic: 'نجاة عتابو: ليدي الشعبي',
    description: 'Immortal feminist Chaabi anthems that sampled Chemical Brothers and conquered the globe.',
    category: 'Chaabi',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/5f58c70ca0c5e933405c1022dfa646c2/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 3,
    songIds: ['najat-kedba', 'najat-j-en-ai-marre', 'najat-choufi-ghirou'],
    spotifyPlaylistName: 'Spotify • This Is Najat Aatabou',
    spotifyPlaylistUrl: 'https://open.spotify.com/artist/5w0w6mZ4qQ2mP8eY5lK9sP',
    tags: ['Legend', 'Feminist Icon', 'Chaabi']
  },

  // 5. Classics & 70s Heritage
  {
    id: 'classics-nass-el-ghiwane',
    title: 'Ghiwane & 70s Heritage',
    titleArabic: 'الزمن الجميل وناس الغيوان',
    description: 'Soul of Morocco: Nass El Ghiwane, Jil Jilala, Lemchaheb and immortal poetry.',
    category: 'Classics',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/4249a5b3a9a138bb6579294e5eef7257/1000x1000-000000-80-0-0.jpg',
    difficulty: 'HARD',
    songsCount: 6,
    songIds: [
      'nass-siniya', 'nass-mahmouma', 'nass-allah-ya-moulana',
      'jil-laayoune', 'jil-chamaa', 'lemchaheb-daouini'
    ],
    spotifyPlaylistName: 'Spotify • Nass El Ghiwane Essentials',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Nass%20El%20Ghiwane%20Spotify',
    tags: ['Ghiwane', '70s', 'Heritage']
  },
  {
    id: 'atlas-amazigh-roots',
    title: 'Atlas & Amazigh Roots',
    titleArabic: 'التراث الأمازيغي والأطلس',
    description: 'Loutar rhythms, Mohamed Rouicha and magical mountain poetry.',
    category: 'Amazigh',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/433f81e35492d5257cb993fbdf613d9b/1000x1000-000000-80-0-0.jpg',
    difficulty: 'HARD',
    songsCount: 3,
    songIds: [
      'rouicha-inas-inas', 'rouicha-chhal-men-lila', 'amarg-fusion-arwah'
    ],
    spotifyPlaylistName: 'Spotify • Amazigh Heritage',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Amazigh%20Rouicha%20Spotify',
    tags: ['Amazigh', 'Rouicha', 'Loutar']
  },

  // 6. Rai & Gnawa Magic
  {
    id: 'rai-maghreb-vibes',
    title: 'Rai Classics Celebrated in Morocco',
    titleArabic: 'أروع أغاني الراي بالمغرب',
    description: 'Cheb Khaled, Cheb Mami, Cheb Hasni and golden Rai tracks known by all Moroccans.',
    category: 'Rai',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/3fb46e104e1bc2a9a4be298cf5a5ca08/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 5,
    songIds: [
      'khaled-didi', 'khaled-aicha', 'khaled-cest-la-vie',
      'mami-layali', 'hasni-choufou-3ch9i'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • Rai Classics',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    tags: ['Rai', 'Khaled', 'Hasni']
  },
  {
    id: 'gnawa-mystic-fusion',
    title: 'Gnawa & Mystic Trance',
    titleArabic: 'كناوة والفيوجن الصوفي',
    description: 'Deep guembri grooves and krakeb chants from Maâlem Hamid El Kasri.',
    category: 'Gnawa',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/9fa0aa8c332ee9e8311cb9397ea3b71d/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EXPERT',
    songsCount: 3,
    songIds: [
      'hamid-el-kasri-lalla-aicha', 'hamid-el-kasri-youmala', 'hamid-el-kasri-mira'
    ],
    spotifyPlaylistName: 'Spotify • Gnawa Morocco',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Gnawa%20Hamid%20El%20Kasri',
    tags: ['Gnawa', 'Essaouira', 'Trance']
  },

  // 7. Trending & Viral
  {
    id: 'tiktok-viral-morocco',
    title: 'TikTok Viral Moroccan Trends',
    titleArabic: 'ترندات تيك توك المغرب',
    description: 'The tracks that took over your FYP across Morocco & the diaspora.',
    category: 'Trending',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/2f2d297e178898d778097b7c66c2a90a/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 8,
    songIds: [
      'toto-salina', 'kouz1-magic', 'zouhair-decapotable', 'snor-de9a-de9a',
      'manal-taj', 'saad-lm3allem', 'tagne-fratello', 'kouz1-love'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • Viral Hits Morocco',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Morocco%20Viral%20TikTok%20Spotify',
    tags: ['Viral', 'TikTok', 'Trending']
  },
  {
    id: 'moroccan-summer-nights',
    title: 'Moroccan Summer Nights / ليالي الصيف',
    titleArabic: 'أجواء صيف المغرب والبحر',
    description: 'Warm ocean breeze, beach lounges in Tangier & Taghazout, and upbeat pop anthems.',
    category: 'Pop',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/d2b0e3341b6cabf610dec963e3d527da/1000x1000-000000-80-0-0.jpg',
    difficulty: 'EASY',
    songsCount: 8,
    songIds: [
      'zouhair-decapotable', 'saad-casablanca', 'hatim-hasdouna', 'ahmed-chawki-habibi',
      'toto-dellali', 'kouz1-love', 'douzi-mina', 'khaled-cest-la-vie'
    ],
    isHot: true,
    spotifyPlaylistName: 'Spotify • Moroccan Summer',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Moroccan%20Summer%20Hits',
    tags: ['Summer', 'Beach', 'Vacation']
  },
  {
    id: 'moroccan-roadtrip-vibes',
    title: 'Atlas Roadtrip & Midnight Drives',
    titleArabic: 'موسيقى السفر والطريق الطويلة',
    description: 'Hypnotic driving beats for the highway from Marrakech across the High Atlas to the Sahara.',
    category: 'Classics',
    coverImage: 'https://cdn-images.dzcdn.net/images/cover/4249a5b3a9a138bb6579294e5eef7257/1000x1000-000000-80-0-0.jpg',
    difficulty: 'MEDIUM',
    songsCount: 8,
    songIds: [
      'rouicha-inas-inas', 'nass-allah-ya-moulana', 'jil-laayoune', 'hamid-el-kasri-youmala',
      'toto-mghayer', 'snor-hkaya', 'tagne-flouka', 'muslim-al-rissala'
    ],
    spotifyPlaylistName: 'Spotify • Moroccan Roadtrip',
    spotifyPlaylistUrl: 'https://open.spotify.com/search/Moroccan%20Roadtrip%20Spotify',
    tags: ['Roadtrip', 'Scenic', 'Atmospheric']
  }
];

const ts = `import { QuizCollection } from '../types';

export const QUIZ_COLLECTIONS: QuizCollection[] = ${JSON.stringify(collections, null, 2)};
`;

fs.writeFileSync("src/data/quizCollections.ts", ts);
console.log("Updated src/data/quizCollections.ts with", collections.length, "curated collections & official Spotify playlists!");
