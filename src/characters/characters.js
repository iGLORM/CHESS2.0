const CHARACTERS = [
  {
    id: 'pawnie',
    name: 'Pawnie',
    title: 'The Village Rookie',
    level: 1,
    dialogue: {
      before: "One normal game, no tricks! Let's see what your hands remember, even if your head doesn't.",
      after: "You play like you've done this a thousand times. Maybe you have! The Training Camp is just up the hill.",
      win: "I won?! Huh. Maybe your memory needs a few more games to wake up. Again?",
      rematch: "You came back! Okay, okay. Same deal: one normal game. I'll try to be less lucky this time.",
    },
    gameDialogue: {
      gameStart: [
        "O-okay, here we go! Don't be too mean...",
        "I'll try my best! Promise!",
        "The elder pawns believe in me... I think...",
        "Your first game since you woke up! No pressure. For either of us!"
      ],
      bossCapture: [
        "I... I got your {piece}! Did you see that?!",
        "W-was that okay? I took your {piece}!",
        "Oh! I actually captured your {piece}! I have {myPieces} pieces on my side!",
        "The elder pawns would be so proud... I got a {piece}!"
      ],
      playerCapture: [
        "Ouch! That was my {piece}!",
        "N-no! My {piece}! I only have {myPieces} pieces left...",
        "Please be gentle with my pieces...",
        "You took my {piece}... that's not very nice..."
      ],
      bossCheck: [
        "Is that... check? Did I really just check your king?!",
        "W-wait, your king is in danger! I did that!",
        "Oh my gosh, check! The elder pawns would be so proud!"
      ],
      playerCheck: [
        "Eek! My king! Someone help!",
        "Oh no oh no oh no... my king is in trouble!",
        "The elder pawns didn't prepare me for checks!"
      ],
      bossTaunt: [
        "I'm thinking really hard about this...",
        "Give me a moment... {moveNum} moves in and it's getting complex!",
        "The elder pawns said patience is key...",
        "Um... so many squares to think about..."
      ],
      milestone: [
        "We're at move {moveNum} already? Wow!",
        "{moveNum} moves in and I haven't lost yet... right?",
        "This is the longest game I've ever played! Move {moveNum}!",
        "The elder pawns never played {moveNum} moves! I think..."
      ],
      lowHealth: [
        "I only have {myPieces} pieces left...",
        "This isn't going well... {myPieces} pieces is not many...",
        "M-maybe I should have practised more with the elder pawns...",
        "The elder pawns are going to be so disappointed..."
      ],
      playerLowHealth: [
        "Am... am I actually winning?! You only have {theirPieces} pieces!",
        "The board is looking good for me! {theirPieces} pieces left for you!",
        "Wait until the other pawns hear about this!",
        "I have {myPieces} pieces and you only have {theirPieces}!"
      ],
      bossCaptureBig: [
        "Y-your {piece}?! I took your {piece}! Is that allowed?!",
        "A {piece}! The elder pawns will never believe this!",
      ],
      playerCaptureBig: [
        "M-my {piece}! That was my best piece!",
        "Nooo, not my {piece}! I needed that!",
      ],
    },
    personality: 'nervous',
    theme: 'pawnhollow',
    colors: { primary: '#88ccff', secondary: '#4488cc', skin: '#ffcc99', eye: '#ffffff', pupil: '#224466' },
  },
  {
    id: 'bishbosh',
    name: 'Bish-Bosh',
    title: 'The Diagonal Dreamer',
    level: 2,
    dialogue: {
      before: "Heh heh heh... welcome to the Slanted Sands, where everything leans my way! Pawnie wrote that you were coming. Four bishops, no knights. Nothing personal: rules are rules! And... hm. Have we met before?",
      after: "You walked my diagonals like you were born on them. Maybe straight lines have their uses after all... Take my compass. Carefully. It leans. Then head north, to the Iron Keep.",
      win: "Ha! Four bishops, four diagonals, zero escape! The sand always slides toward me. Come back when you've learned to lean!",
      rematch: "Back for more slanting? Good! I've tilted the dunes an extra degree, just for you.",
    },
    gameDialogue: {
      gameStart: [
        "Let's see those diagonals fly!",
        "Four bishops, zero knights. Who needs horses anyway?",
        "The diagonal is calling!",
        "Heh heh... I've been sharpening my angles all day!"
      ],
      bossCapture: [
        "Heh heh! Slashed your {piece} right off the board!",
        "Did you see that angle? Your {piece} didn't!",
        "The slash strikes again! One {piece}, gone!",
        "Your {piece} wandered onto my diagonal. Big mistake!"
      ],
      playerCapture: [
        "Hey! That was my {piece}! I was going to slant it somewhere nice!",
        "You dare take my {piece}? You crossed MY diagonal!",
        "Okay okay, you got my {piece}... lucky shot...",
        "Down to {myPieces} pieces but my angles are still sharp!"
      ],
      bossCheck: [
        "Check! The diagonal delivers!",
        "Your king can't escape the slash!",
        "Heh heh, your king is caught on my angle!"
      ],
      playerCheck: [
        "Whoa! My king needs a diagonal escape!",
        "That's not supposed to happen! Not to me!"
      ],
      bossTaunt: [
        "I see angles you can't even imagine...",
        "The diagonals whisper to me... move {moveNum} is crucial...",
        "Calculating the perfect slash...",
        "So many diagonals, so little time!"
      ],
      milestone: [
        "Move {moveNum}! The diagonals are heating up!",
        "{moveNum} moves in and every angle is alive!",
        "You're better than I expected at move {moveNum}!"
      ],
      lowHealth: [
        "Down to {myPieces} pieces... my diagonal army is thinning!",
        "The cross-pattern is breaking with only {myPieces} pieces...",
        "I need to rethink my angles... {myPieces} pieces left..."
      ],
      playerLowHealth: [
        "The diagonal dominates! Only {theirPieces} pieces left for you!",
        "See? Straight lines are overrated! You're down to {theirPieces}!",
        "Four bishops beat two every time! {myPieces} vs your {theirPieces}!"
      ],
      bossCaptureBig: [
        "Your {piece}! Sliced clean off the board! Heh heh!",
        "A whole {piece}! The diagonals feast tonight!",
      ],
      playerCaptureBig: [
        "My {piece}?! Okay, THAT one hurt.",
        "Not the {piece}! Who let you through my diagonals?!",
      ],
    },
    personality: 'enthusiastic',
    theme: 'slantedsands',
    colors: { primary: '#ff9966', secondary: '#cc6633', skin: '#ffcc99', eye: '#ffffff', pupil: '#663322' },
  },
  {
    id: 'rokee',
    name: 'Rook-E',
    title: 'The Iron Tower',
    level: 3,
    dialogue: {
      before: "Halt. I know your step. You will not pass my gate a second time. You enter without your rooks, and taking one of mine will cost you a challenge.",
      after: "The gate is open. You broke a fortress with half an army. I will not forget it. The Iron Key is yours, by right of siege.",
      win: "As expected. A keep does not fall to an army without towers. Rebuild your discipline and knock again.",
      rematch: "You return to my gate. Good. Persistence is the first rule of any siege.",
    },
    gameDialogue: {
      gameStart: [
        "Straight lines. Let us begin.",
        "The rank and file await.",
        "Discipline wins battles.",
        "You have no towers today. I have two. Begin."
      ],
      bossCapture: [
        "Your {piece}. Removed. Efficiently.",
        "The tower claims your {piece}.",
        "Straight through your {piece}. No deviation.",
        "One {piece} fewer in your ranks."
      ],
      playerCapture: [
        "You took my {piece}. A minor breach. The wall holds.",
        "One {piece} lost. The fortress remains with {myPieces} standing.",
        "Acceptable losses. My {piece} served its purpose."
      ],
      bossCheck: [
        "Your king stands exposed on the file.",
        "Check. The tower sees all straight lines.",
        "Nowhere to run along the rank or file."
      ],
      playerCheck: [
        "The wall bends but does not break.",
        "A direct assault. Noted. I will adapt."
      ],
      bossTaunt: [
        "Patience. The tower considers all lines.",
        "I do not rush. I endure. Move {moveNum}. Steady.",
        "Every rank. Every file. Calculated.",
        "The position demands precision, not speed."
      ],
      milestone: [
        "Move {moveNum}. You have discipline. I respect that.",
        "The siege continues at move {moveNum}.",
        "Neither of us yields. {moveNum} moves of discipline."
      ],
      lowHealth: [
        "The fortress is crumbling... {myPieces} stones remain.",
        "My defenses grow thin. Only {myPieces} pieces hold the line.",
        "Even iron towers can fall... but not without a fight."
      ],
      playerLowHealth: [
        "The wall advances. You retreat to {theirPieces} pieces.",
        "Discipline always wins. You have only {theirPieces} left.",
        "Your army scatters before the tower. {theirPieces} remain."
      ],
      bossCaptureBig: [
        "Your {piece}. A tower falls. Mine stand.",
        "Your {piece} is removed. That was your strength.",
      ],
      playerCaptureBig: [
        "My {piece}. That is a real breach. Close ranks.",
        "You took my {piece}. The keep shudders.",
      ],
    },
    personality: 'stoic',
    theme: 'ironkeep',
    colors: { primary: '#aabbcc', secondary: '#667788', skin: '#ddbb99', eye: '#ffffff', pupil: '#334455' },
  },
  {
    id: 'knightsade',
    name: 'The Knight of the Mist',
    title: 'The Shadow Lancer',
    level: 4,
    dialogue: {
      before: "*from the fog* ... Bish-Bosh's friend, at last. I am on your side, but my lantern only goes to one who wins it. On the Moors you see only what your pieces touch. Watch for my eyes.",
      after: "*the mist lifts* ... You found me in my own fog. Few ever do. Take my lantern. It shows what people hide. Queenie's palace lies south, across the sea.",
      win: "*a whisper at your shoulder* ... The mist keeps what it takes. Your army wandered in and did not wander out.",
      rematch: "*somewhere to your left* ... Back in the fog so soon? The eyes remember you.",
    },
    gameDialogue: {
      gameStart: [
        "*silence* ... The shadows are watching.",
        "You will not see me coming.",
        "*whisper* ... Let the game begin.",
        "The darkness stirs. It senses your fear."
      ],
      bossCapture: [
        "*vanishes* ... Your {piece} dissolves into shadow.",
        "The shadow strikes your {piece} and disappears.",
        "You never saw it coming. Your {piece} is gone.",
        "Your {piece} wandered into the dark. It will not return."
      ],
      playerCapture: [
        "*hiss* ... My {piece} was caught in the light.",
        "Clever. You found my {piece}. But shadows regenerate.",
        "You found one. {myPieces} shadows remain.",
        "My {piece} falls... but the darkness only deepens."
      ],
      bossCheck: [
        "Your king hides from shadows in vain.",
        "*chuckle* ... Check from the darkness.",
        "The shadow lances through to your king."
      ],
      playerCheck: [
        "*startled* ... The light reaches my king.",
        "An unexpected move. The shadows shift."
      ],
      bossTaunt: [
        "The shadows are deliberating...",
        "*silence* ... Move {moveNum}. The darkness deepens.",
        "I see paths you cannot imagine.",
        "The shadows whisper your next three moves to me."
      ],
      milestone: [
        "Move {moveNum}. You last longer than most. Interesting.",
        "The shadows grow restless after {moveNum} moves.",
        "Few survive this deep into my domain. Move {moveNum}..."
      ],
      lowHealth: [
        "The shadows thin to {myPieces}... but never vanish.",
        "You push the darkness back... only {myPieces} remain...",
        "*grudging respect* ... Well played. But shadow endures."
      ],
      playerLowHealth: [
        "The shadows consume your army. Only {theirPieces} remain.",
        "Darkness swallows all eventually. {theirPieces} pieces left.",
        "Your pieces fall like whispers into the void."
      ],
      bossCaptureBig: [
        "*a shape in the mist* ... Your {piece} is mine. You never saw the hand.",
        "Your {piece} walked into the fog. It will not walk out.",
      ],
      playerCaptureBig: [
        "*a hiss* ... My {piece}. You see more than you should.",
        "My {piece}, pulled into the light. Clever.",
      ],
      eyes: [
        "*two lights blink in the fog* ... Did you see me? Look again.",
        "*eyes in the mist* ... I am closer than you think.",
      ],
    },
    personality: 'mysterious',
    theme: 'mistymoors',
    colors: { primary: '#6644aa', secondary: '#442288', skin: '#ccbbdd', eye: '#ffcc00', pupil: '#221144' },
  },
  {
    id: 'queenie',
    name: 'Queenie',
    title: 'The Royal Tyrant',
    level: 5,
    dialogue: {
      before: "Welcome to MY palace, darling. That foggy busybody sent you, didn't he? Two queens on my back rank, and both of them are me. When I capture, you had better be good at games.",
      after: "Outplayed in my own ballroom?! How scandalous. Fine, darling, you may have my signet. And the curtsy. Once.",
      win: "Did you really think you could win in my palace? Every tile here is marble and every move is mine. Off you go, sweetie!",
      rematch: "Back again? How flattering. The court does love a rerun. Try not to trip on the marble this time.",
    },
    gameDialogue: {
      gameStart: [
        "The queen graces you with her presence!",
        "Bow, darling. The game begins.",
        "This will be over quickly, sweetie.",
        "You may kiss the board before I destroy you on it."
      ],
      bossCapture: [
        "Your {piece}? Mine now. The queen takes what she wants!",
        "Off with your {piece}'s head!",
        "Another {piece} removed from the board. How satisfying!",
        "The queen claims your {piece}. As is her right!"
      ],
      playerCapture: [
        "How DARE you take my {piece}! That was one of my favorites!",
        "You took my {piece}?! You will pay for that insolence!",
        "My {piece}! I only have {myPieces} loyal subjects left!",
        "Seizing a queen's {piece} is an act of war, darling!"
      ],
      bossCheck: [
        "Your king kneels before the queen! Check!",
        "Check! Bow before royalty, darling!",
        "The queen commands your king to surrender!"
      ],
      playerCheck: [
        "You threaten MY king? The audacity!",
        "This is treason, darling! Guards!"
      ],
      bossTaunt: [
        "A queen considers all her options...",
        "Do not rush royalty. Move {moveNum} demands elegance.",
        "Every direction. Any distance. My choice.",
        "The crown weighs heavy with decisions..."
      ],
      milestone: [
        "Move {moveNum}? Still here? How persistent of you.",
        "You amuse the queen at move {moveNum}. Continue.",
        "I expected this to be over by move {moveNum}!"
      ],
      lowHealth: [
        "My court is down to {myPieces}! This is unacceptable!",
        "Only {myPieces} loyal subjects?! This is NOT how a queen should be treated!",
        "Where are my loyal subjects?! Only {myPieces} remain!"
      ],
      playerLowHealth: [
        "The monarchy prevails! You cling to {theirPieces} pitiful pieces!",
        "Your army of {theirPieces} bows to the queen!",
        "This is the natural order, darling. {myPieces} royals vs your {theirPieces}."
      ],
      bossCaptureBig: [
        "Your {piece}? Off with its head! Darling, how careless.",
        "I'll have your {piece} bronzed for the ballroom!",
      ],
      playerCaptureBig: [
        "My {piece}?! Do you know what that cost?!",
        "You took my {piece}! GUARDS! Someone faint on my behalf!",
      ],
    },
    personality: 'dramatic',
    theme: 'royalpalace',
    colors: { primary: '#ff66aa', secondary: '#cc4488', skin: '#ffddcc', eye: '#ffffff', pupil: '#661144' },
  },
  {
    id: 'castle',
    name: 'CastlE',
    title: 'The Unbreakable Fortress',
    level: 6,
    dialogue: {
      before: "The Clockwork Citadel. My brother's gate fell. My walls will not. Four gear walls stand at the heart of the board. Nothing passes through them. Lose a challenge and the square locks. Begin your siege.",
      after: "The gears have stopped. You broke a siege that has held for centuries. Take the seal of those orders. The map you came for is not here. Ask the EndGamer.",
      win: "The walls held. They always hold. Patience is a gear that never slips. Wind yourself up and try again.",
      rematch: "Tick. Tock. You have returned to my walls. They have not moved. Neither have I.",
    },
    gameDialogue: {
      gameStart: [
        "The wall stands ready. Come.",
        "You may begin your siege.",
        "I have all the time in the world.",
        "The fortress has never fallen. You will not change that."
      ],
      bossCapture: [
        "Your {piece}. Absorbed into the wall.",
        "The fortress claims your {piece}. One more prisoner.",
        "Your {piece} broke against my defenses.",
        "My defense claimed your {piece}. That is my offense."
      ],
      playerCapture: [
        "You took my {piece}. A brick falls. The wall remains.",
        "My {piece} is gone. {myPieces} stones still stand.",
        "Every fortress loses a stone or two. I have {myPieces}.",
        "One {piece}. The siege continues."
      ],
      bossCheck: [
        "The fortress presses forward. Check.",
        "Even walls can attack. Your king learns this now.",
        "Check. The wall advances."
      ],
      playerCheck: [
        "A crack in the wall. I will repair it.",
        "You found a weakness. Temporarily."
      ],
      bossTaunt: [
        "I can wait forever.",
        "The wall does not hurry. Move {moveNum}. Still standing.",
        "Patience outlasts aggression.",
        "You siege. I endure. That is all."
      ],
      milestone: [
        "Move {moveNum}. The siege drags on. I am comfortable.",
        "You cannot outlast the fortress. {moveNum} moves prove nothing.",
        "Time is my ally. {moveNum} moves is nothing to a wall."
      ],
      lowHealth: [
        "The wall is breached... {myPieces} stones hold.",
        "My fortress shows cracks... only {myPieces} remain...",
        "I must shore up the defenses with {myPieces} pieces..."
      ],
      playerLowHealth: [
        "Your siege has failed. {theirPieces} pieces left standing.",
        "The fortress stands with {myPieces}. Your army of {theirPieces} does not.",
        "Impenetrable. As always. You have {theirPieces} left."
      ],
      bossCaptureBig: [
        "Your {piece} crumbles against my walls.",
        "Your {piece}. The citadel keeps what it takes.",
      ],
      playerCaptureBig: [
        "My {piece}. A wall has fallen. Tick... tock...",
        "You broke my {piece}. The gears grind.",
      ],
      lock: [
        "Locked. The gears turn against you for three turns.",
        "Click. That square is mine now. Tick, tock.",
      ],
    },
    personality: 'patient',
    theme: 'clockworkcitadel',
    colors: { primary: '#88aa88', secondary: '#557755', skin: '#ccbb99', eye: '#ffffff', pupil: '#224422' },
  },
  {
    id: 'endgamer',
    name: 'EndGamer',
    title: 'The Patient Scholar',
    level: 7,
    dialogue: {
      before: "Welcome to the Grand Library. Yes, I have your map. Openings are a handshake, middlegames are small talk. I have skipped them for you. Here is an ending. Solve it, and the map is yours.",
      after: "You found a path my books did not list. Remarkable. I shall add a new chapter under your name. The fragment is yours, and your map.",
      win: "As the books predicted. An ending is a question with one right answer, and I have read every answer. Study, and return.",
      rematch: "Back to the stacks? I have pulled a new ending off the shelf. Same equal material. Different trap.",
    },
    gameDialogue: {
      gameStart: [
        "Page one of the ending. Equal material. Unequal knowledge.",
        "No openings. No middlegame. Only the part that decides.",
        "I have read this position a hundred times. Have you?",
        "Every ending has one right path. Let us see if you find it."
      ],
      bossCapture: [
        "Your {piece}. One less piece for the endgame. Good.",
        "Simplification favors the prepared. Your {piece} agrees.",
        "Fewer pieces. Your {piece} exits. Closer to my domain.",
        "Your {piece} traded for position. The scholar approves."
      ],
      playerCapture: [
        "You took my {piece}. Material is temporary. Knowledge is permanent.",
        "Take my {piece}. The endgame still favors me with {myPieces} pieces.",
        "You trade pieces. I trade for position. My {piece} served its purpose.",
        "One {piece} less. {myPieces} remain. The theory still applies."
      ],
      bossCheck: [
        "Check. The endgame approaches.",
        "Your king wanders into familiar territory for me.",
        "Check. I have studied this pattern extensively."
      ],
      playerCheck: [
        "A check. The books list that one. Page forty.",
        "Checks are loud. Endings are won quietly."
      ],
      bossTaunt: [
        "Studying the position at move {moveNum}. Every detail matters.",
        "Lucena, Philidor... which one applies at move {moveNum}?",
        "The endgame tables tell me everything.",
        "Patience. The position will simplify in time."
      ],
      milestone: [
        "Move {moveNum}. Most readers have closed the book by now.",
        "Move {moveNum}. You are writing in my margins.",
        "Move {moveNum}. This ending is running long. Interesting."
      ],
      lowHealth: [
        "Only {myPieces} pieces... this is not how the chapter ends.",
        "You are rewriting my ending. I do not approve.",
        "{myPieces} pieces. The books did not mention this line."
      ],
      playerLowHealth: [
        "You have {theirPieces} pieces. The position simplifies in my favor.",
        "Your army shrinks to {theirPieces}. My knowledge grows.",
        "The endgame belongs to the scholar. {theirPieces} pieces cannot save you."
      ],
      bossCaptureBig: [
        "Your {piece}. That ending was decided three pages ago.",
        "Without your {piece}, this is a theoretical win. For me.",
      ],
      playerCaptureBig: [
        "My {piece}. The books did not list that line.",
        "That {piece} was chapter and verse. Hm.",
      ],
    },
    personality: 'calm',
    theme: 'grandlibrary',
    colors: { primary: '#5599cc', secondary: '#3377aa', skin: '#ccddcc', eye: '#ffffff', pupil: '#113355' },
  },
  {
    id: 'forkmaster',
    name: 'ForkMaster',
    title: 'The Tactician',
    level: 8,
    dialogue: {
      before: "Welcome to Forked Gulch, partner. That bounty on your head is worth a fortune. Out here one fork takes two. Line up any two of your queen, rooks, bishops or knights, and I'll shoot 'em both.",
      after: "You rode right past my forks, and the ones you couldn't dodge didn't slow you down. I'm impressed. The poster's yours, fair and square.",
      win: "Bang, bang! Two pieces, one shot. That's how we do it in the Gulch. Holster up and come back when you can spot a fork.",
      rematch: "Back in town? Good. I've been polishing both barrels.",
    },
    gameDialogue: {
      gameStart: [
        "I already see three forks. Do you?",
        "Every piece you place is a target.",
        "Tactics. Pure tactics. Let's go.",
        "The board is a puzzle. I already have the answer."
      ],
      bossCapture: [
        "Forked your {piece}! Classic.",
        "Did you see that pin on your {piece}? Of course not.",
        "Your {piece}? Tactical roadkill. As expected.",
        "One {piece} down. I see two more tactics already."
      ],
      playerCapture: [
        "You spotted my {piece}. Lucky shot.",
        "You got my {piece}? That won't happen again.",
        "One {piece}. I'll take three of yours. Just watch.",
        "You took my {piece} but missed the real trap."
      ],
      bossCheck: [
        "Check! With a fork attached, naturally.",
        "Your king AND your rook. Pick one.",
        "Check! See the skewer behind it? You will."
      ],
      playerCheck: [
        "A check? That's not a tactic, that's desperation.",
        "Checking without purpose. Amateur move."
      ],
      bossTaunt: [
        "Calculating... so many forks, so little time.",
        "Move {moveNum}. The pins and skewers are lining up perfectly.",
        "I see a tactic in every position.",
        "Your pieces are practically forking themselves."
      ],
      milestone: [
        "Move {moveNum} and you're surviving? Impressive. Slightly.",
        "Most opponents are done by move {moveNum}.",
        "You must have trained specifically for me. {moveNum} moves in!"
      ],
      lowHealth: [
        "Down to {myPieces}... fewer pieces means fewer forks... wait, no.",
        "You're dismantling my tactical playground! {myPieces} pieces left!",
        "I need more pieces to fork! Only {myPieces} left!"
      ],
      playerLowHealth: [
        "Fork after fork! You're down to {theirPieces} pieces!",
        "Your army of {theirPieces} is my tactical buffet.",
        "See? Tactics always win. {myPieces} vs {theirPieces}. Game over."
      ],
      bossCaptureBig: [
        "Your {piece}! Easiest bounty in the Gulch.",
        "Yee-haw! That {piece} was worth the ride!",
      ],
      playerCaptureBig: [
        "My {piece}?! Somebody shot the sheriff!",
        "Well I'll be. You got my {piece}, partner.",
      ],
      doubleTake: [
        "Two for one! Yee-haw!",
        "Bang, bang! Should've kept 'em apart, partner.",
        "One shot, two pieces. That's the Gulch.",
      ],
    },
    personality: 'smug',
    theme: 'forkedgulch',
    colors: { primary: '#dd8844', secondary: '#bb6622', skin: '#ffcc99', eye: '#ffffff', pupil: '#553311' },
  },
  {
    id: 'checkmate',
    name: 'Checkmate',
    title: 'The Executioner',
    level: 9,
    dialogue: {
      before: "The Obsidian Court. You have forty moves to mate me. When the sand in my hourglass runs out, the sentence is carried out. On you.",
      after: "Checkmate. To me, of all pieces. The glass cracks and the sand stops. Take the fragment, and my hourglass. You have earned your time.",
      win: "Check. And mate. As foreseen. There was never enough sand for you.",
      timeout: "The sand ran out. It always does. Your forty moves are spent, and your king with them.",
      rematch: "The hourglass has been turned over. Forty moves again. Spend them better.",
    },
    gameDialogue: {
      gameStart: [
        "The countdown begins now.",
        "Every move brings the end closer.",
        "Your king is already marked.",
        "I do not play chess. I orchestrate endings."
      ],
      bossCapture: [
        "Your {piece}. One less defender for your king.",
        "The net tightens around your {piece}'s absence.",
        "Your {piece} falls. The end approaches.",
        "Your {piece} was in the way of the checkmate. It is not anymore."
      ],
      playerCapture: [
        "You took my {piece}. You delay the inevitable.",
        "My {piece}? A sacrifice. How touching. And futile.",
        "Take my pieces. I have {myPieces}. The checkmate still comes.",
        "One {piece} lost. The executioner needs only a king to finish."
      ],
      bossCheck: [
        "Check. The execution draws near.",
        "Your king runs. But there is nowhere to hide.",
        "Check. Feel the noose tightening?"
      ],
      playerCheck: [
        "A temporary reprieve. Nothing more.",
        "You threaten my king? Bold. And foolish."
      ],
      bossTaunt: [
        "I am orchestrating your demise...",
        "Move {moveNum}. The mating net is taking shape...",
        "Can you feel it? The walls closing in?",
        "Every move you make writes your own ending."
      ],
      milestone: [
        "Move {moveNum}. You survive. For now.",
        "The execution has been delayed {moveNum} moves. Not cancelled.",
        "Most fall before move {moveNum}. You are stubborn."
      ],
      lowHealth: [
        "You dismantle my army to {myPieces}... but not my purpose.",
        "The executioner needs only one piece. I have {myPieces}.",
        "{myPieces} pieces. The checkmate remains inevitable."
      ],
      playerLowHealth: [
        "Your king stands with only {theirPieces} defenders. As foreseen.",
        "The execution proceeds on schedule. {theirPieces} pieces left.",
        "There is no escape from the executioner. {theirPieces} cannot save you."
      ],
      bossCaptureBig: [
        "Your {piece}. The sentence is carried out early.",
        "Your {piece} is executed. The rest wait their turn.",
      ],
      playerCaptureBig: [
        "My {piece}. A delay. Nothing more.",
        "You took my {piece}. The sand keeps falling regardless.",
      ],
      clockLow: [
        "{left} moves left. I can hear the sand.",
        "{left} moves. The sentence is nearly due.",
      ],
    },
    personality: 'ominous',
    theme: 'obsidiancourt',
    colors: { primary: '#882222', secondary: '#551111', skin: '#ddbbbb', eye: '#ff4444', pupil: '#220000' },
  },
  {
    id: 'grandmasterx',
    name: 'Grandmaster X',
    title: 'The Absolute',
    level: 10,
    dialogue: {
      before: "You came back. Of course you did. Here every capture is a test, and I know exactly which tests you fail. Mate me if you can. You will have to do it more than once.",
      after: "Three times... You checkmated me three times. And yet the crystal holds. I hold. This is not over.",
      win: "Stay down this time. The board stays broken. Broken, it cannot choose anyone. Broken, it is safe.",
      rematch: "You return. They always return... no. None of them ever came back. Only you. Very well. Again.",
    },
    gameDialogue: {
      gameStart: [
        "Make your first move. It will define you.",
        "The summit awaits. Begin.",
        "I am chess itself. Show me what you are.",
        "An age alone on this board. Let us see if you change that."
      ],
      bossCapture: [
        "Your {piece}. Perfection requires sacrifice. Yours.",
        "Your {piece} removed. As calculated thirty moves ago.",
        "The Absolute does not err. Your {piece} confirms it.",
        "Your {piece} served your plan. My plan was better."
      ],
      playerCapture: [
        "You took my {piece}. Interesting. You found a real move.",
        "My {piece} falls. That changes nothing in the grand position.",
        "A strong choice taking my {piece}. I have seen stronger.",
        "My {piece}. {myPieces} remain. The Absolute adapts."
      ],
      bossCheck: [
        "Check. The truth is inescapable.",
        "Your king faces the Absolute.",
        "Check. This is not aggression. It is inevitability."
      ],
      playerCheck: [
        "A check. I expected it four moves ago.",
        "Bold. But calculated. By both of us."
      ],
      bossTaunt: [
        "I am considering every possibility.",
        "Move {moveNum}. The position reveals its secrets to me.",
        "Perfection takes time. Even at move {moveNum}.",
        "The Absolute sees all lines to their conclusion."
      ],
      milestone: [
        "Move {moveNum}. You have earned your place at this board.",
        "Few reach move {moveNum} against me.",
        "Move {moveNum}. The game deepens. As does my respect."
      ],
      lowHealth: [
        "{myPieces} pieces. You challenge the Absolute... and you succeed?",
        "Down to {myPieces}. This has not happened in an age.",
        "Perhaps with {myPieces} pieces left... you ARE chess."
      ],
      playerLowHealth: [
        "The summit is mine. You cling to {theirPieces} pieces.",
        "{theirPieces} pieces. Potential without perfection is wasted.",
        "The Absolute remains absolute. {myPieces} vs {theirPieces}."
      ],
      bossCaptureBig: [
        "Your {piece}. I took it the moment you learned to move it.",
        "Your {piece}. The crystal remembers every mistake.",
      ],
      playerCaptureBig: [
        "My {piece}. You are more than they said.",
        "My {piece}... The crystal hums. It knows you.",
      ],
    },
    personality: 'serious',
    theme: 'crystal',
    colors: { primary: '#ffcc00', secondary: '#cc9900', skin: '#ffdd99', eye: '#ff6600', pupil: '#332200' },
  },
];
