# MailerSend Promotional Email Templates

Use these for opted-in Song Guess Game players. Keep the unsubscribe link active and keep the footer disclaimer in every campaign.

Default placeholders:
- `{{name}}`
- `{{play_url}}`
- `{{unlock_url}}`
- `{{multiplayer_url}}`
- `{{unsubscribe_url}}`

Footer disclaimer:
`Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.`

## Campaign 1: Play Now

Subject: Can you guess the song in 0.1 seconds?

Preview text: Short clips, fast guesses, artists, genres, countries, and shareable wins.

Plain text:
```text
Hi {{name}},

Song Guess Game is built for fast music trivia: listen to a tiny clip, guess the song, and see how quickly you can score.

Play by artist, genre, country, or featured playlists. You can also challenge friends in multiplayer rooms and share your score card after a win.

Play now: {{play_url}}

Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.
Unsubscribe: {{unsubscribe_url}}
```

HTML:
```html
<h1>Can you guess the song in 0.1 seconds?</h1>
<p>Hi {{name}},</p>
<p>Song Guess Game is built for fast music trivia: short clips, fast guesses, artist challenges, genre packs, country playlists, and shareable wins.</p>
<p><a href="{{play_url}}" style="background:#00e676;color:#00140a;padding:14px 22px;border-radius:999px;font-weight:900;text-decoration:none;">Play now</a></p>
<p style="color:#667;">Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.</p>
<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
```

## Campaign 2: Unlock Unlimited

Subject: Your 7-day unlimited pass is available

Preview text: Unlimited heardle, all artists, all countries, all genres, multiplayer rooms, and no ads.

Plain text:
```text
Hi {{name}},

Want more than the free Daily 5?

Unlock a 7-day pass and play unlimited heardle across every mode:
- All artists
- All countries
- All genres and eras
- Unlimited replay
- Multiplayer rooms
- No ads while your pass is active

Unlock unlimited: {{unlock_url}}

Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.
Unsubscribe: {{unsubscribe_url}}
```

HTML:
```html
<h1>Play unlimited Song Guess</h1>
<p>Hi {{name}},</p>
<p>Unlock a 7-day pass and keep playing after the free Daily 5.</p>
<ul>
  <li>All artists</li>
  <li>All countries</li>
  <li>All genres and eras</li>
  <li>Unlimited replay</li>
  <li>Multiplayer rooms</li>
  <li>No ads while your pass is active</li>
</ul>
<p><a href="{{unlock_url}}" style="background:#00e676;color:#00140a;padding:14px 22px;border-radius:999px;font-weight:900;text-decoration:none;">Unlock unlimited</a></p>
<p style="color:#667;">Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.</p>
<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
```

## Campaign 3: Multiplayer

Subject: Start a Song Guess room with friends

Preview text: Create a room code, share it, and take turns guessing songs.

Plain text:
```text
Hi {{name}},

Multiplayer rooms are live in Song Guess Game.

Create a room, pick an artist, country, genre, or playlist, then share the room code with friends. Each player gets equal turns, and the final ranking shows who heard it first.

Start a room: {{multiplayer_url}}

Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.
Unsubscribe: {{unsubscribe_url}}
```

HTML:
```html
<h1>Start a Song Guess room</h1>
<p>Hi {{name}},</p>
<p>Create a room, choose the music pack, share the code, and take turns guessing short clips with friends.</p>
<p><a href="{{multiplayer_url}}" style="background:#00e676;color:#00140a;padding:14px 22px;border-radius:999px;font-weight:900;text-decoration:none;">Create room</a></p>
<p style="color:#667;">Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.</p>
<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
```

## Campaign 4: Artist Challenges

Subject: New artist heardle packs are ready

Preview text: Taylor Swift, Drake, The Weeknd, Billie Eilish, Ariana Grande, Sabrina Carpenter, and more.

Plain text:
```text
Hi {{name}},

Artist Heardle packs are ready in Song Guess Game.

Try Taylor Swift, Drake, The Weeknd, Billie Eilish, Ariana Grande, Sabrina Carpenter, and more. Pick an artist, listen to the shortest clip you can, and publish your score to the leaderboard.

Play artist packs: {{play_url}}

Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.
Unsubscribe: {{unsubscribe_url}}
```

HTML:
```html
<h1>New artist heardle packs are ready</h1>
<p>Hi {{name}},</p>
<p>Play Artist Heardle packs for Taylor Swift, Drake, The Weeknd, Billie Eilish, Ariana Grande, Sabrina Carpenter, and more.</p>
<p>Pick an artist, listen to the shortest clip you can, and publish your score to the leaderboard.</p>
<p><a href="{{play_url}}" style="background:#00e676;color:#00140a;padding:14px 22px;border-radius:999px;font-weight:900;text-decoration:none;">Play artist packs</a></p>
<p style="color:#667;">Song Guess Game is not affiliated with any artist, Spotify, Apple Music, or any record label.</p>
<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
```
