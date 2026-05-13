const CHARACTERS = [
  {
    id: 'pawnie',
    name: 'Pawnie',
    title: 'The Village Rookie',
    level: 1,
    dialogue: {
      before: "H-hi there! I'm Pawnie, and this is my very first real battle! The elder pawns told me to always move forward, never look back. I hope I don't mess this up too badly... Please be gentle with me!",
      after: "Wow... you really are strong! I gave it my best shot, but I still have so much to learn. Maybe one day I'll make it to the other side and become a queen too! Thanks for the lesson!",
      win: "I-I won?! I actually won! Wait until the other pawns hear about this! The littlest piece on the board just beat a real challenger! This is the happiest day of my life!",
    },
    gameDialogue: {
      gameStart: [
        "O-okay, here we go! Don't be too mean...",
        "I'll try my best! Promise!",
        "The elder pawns believe in me... I think...",
        "M-my first real match! I'm so nervous!"
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
        "M-maybe I should have stayed home today...",
        "The elder pawns are going to be so disappointed..."
      ],
      playerLowHealth: [
        "Am... am I actually winning?! You only have {theirPieces} pieces!",
        "The board is looking good for me! {theirPieces} pieces left for you!",
        "Wait until the other pawns hear about this!",
        "I have {myPieces} pieces and you only have {theirPieces}!"
      ],
    },
    personality: 'nervous',
    theme: 'space',
    colors: { primary: '#88ccff', secondary: '#4488cc', skin: '#ffcc99', eye: '#ffffff', pupil: '#224466' },
  },
  {
    id: 'bishbosh',
    name: 'Bish-Bosh',
    title: 'The Diagonal Dreamer',
    level: 2,
    dialogue: {
      before: "Heh heh heh... welcome to my domain of diagonals! You think you can handle the slash and the slash-back? I have been training on the light squares my entire life. Prepare yourself!",
      after: "Impressive... you navigated my diagonals better than I expected. Most challengers get lost in the cross-pattern. You have a sharp eye. Perhaps the straight paths are not so boring after all.",
      win: "Ha! Did you see that fork? That pin? My bishop pair controlled the whole board! The diagonal is the true path to victory, my friend. Come back when you understand the power of the slash!",
    },
    gameDialogue: {
      gameStart: [
        "Let's see those diagonals fly!",
        "Ready for the slash and the slash-back?",
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
        "Hey! That was my {piece}! My favorite diagonal piece!",
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
        "My bishop pair is unstoppable! {myPieces} vs your {theirPieces}!"
      ],
    },
    personality: 'enthusiastic',
    theme: 'egypt',
    colors: { primary: '#ff9966', secondary: '#cc6633', skin: '#ffcc99', eye: '#ffffff', pupil: '#663322' },
  },
  {
    id: 'rokee',
    name: 'Rook-E',
    title: 'The Iron Tower',
    level: 3,
    dialogue: {
      before: "Straight lines. No shortcuts. No fancy diagonal tricks. That is how we do things on the rank and file. I have stood guard on this corner for a thousand games. Show me if you have the discipline to break through.",
      after: "Solid play. You respected the fundamentals and outmaneuvered my fortress. A tower can be toppled by patience and precision. You have both. I salute your technique.",
      win: "As I said: straight lines win games. You tried to dance around the board, but you cannot outrun the iron tower. When the seventh rank opens, it is already too late. Better luck next time.",
    },
    gameDialogue: {
      gameStart: [
        "Straight lines. Let us begin.",
        "The rank and file await.",
        "Discipline wins battles.",
        "No tricks. No angles. Only lines."
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
    },
    personality: 'stoic',
    theme: 'medieval',
    colors: { primary: '#aabbcc', secondary: '#667788', skin: '#ddbb99', eye: '#ffffff', pupil: '#334455' },
  },
  {
    id: 'knightsade',
    name: 'KnightShade',
    title: 'The Shadow Lancer',
    level: 4,
    dialogue: {
      before: "*silence* ... You cannot see me coming. No piece on this board moves like I do. I leap over walls, strike from behind, and vanish before you know what happened. Do not bother predicting me.",
      after: "*low whistle* ... You actually saw through my shadows. That knight fork you avoided in the middlegame? Nobody avoids that. You are not like the others. I respect that. Until we meet again.",
      win: "*chuckle* ... Did you feel that? The moment your queen was forked and your king was exposed? That is the sound of the shadows claiming another victim. The Lancer always strikes true.",
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
    },
    personality: 'mysterious',
    theme: 'cyberpunk',
    colors: { primary: '#6644aa', secondary: '#442288', skin: '#ccbbdd', eye: '#ffcc00', pupil: '#221144' },
  },
  {
    id: 'queenie',
    name: 'Queenie',
    title: 'The Royal Tyrant',
    level: 5,
    dialogue: {
      before: "Oh my, another challenger? How adorable. Do you know who I am? I am the most powerful piece on this board, darling. I move in every direction, any distance. Bow before your queen!",
      after: "Not bad! Not bad at all! You actually managed to outplay me! I have not been defeated in fifty games. You have earned a curtsy from the queen herself. Consider this an honor!",
      win: "Did you really think you could defeat the queen? I am the sun around which this board revolves. Every piece bows to my movement. Off with your king! That is how the monarchy works, darling.",
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
    },
    personality: 'dramatic',
    theme: 'japanese',
    colors: { primary: '#ff66aa', secondary: '#cc4488', skin: '#ffddcc', eye: '#ffffff', pupil: '#661144' },
  },
  {
    id: 'castle',
    name: 'CastlE',
    title: 'The Unbreakable Fortress',
    level: 6,
    dialogue: {
      before: "I am the wall. I am the shield. I am the fortress that has never fallen. You can throw your strongest pieces at me, but they will break against my defenses. Patience is my weapon. Come, test the wall.",
      after: "The wall has fallen. You breached my defenses with a patience that matched my own. I have not seen such methodical dismantling in centuries. You are a true siege master. Well fought.",
      win: "The fortress stands. Your attacks were predictable, your sacrifices wasteful. A true defender knows that the best offense is a perfect defense. My pawns are your tombstones. Impenetrable!",
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
    },
    personality: 'patient',
    theme: 'steampunk',
    colors: { primary: '#88aa88', secondary: '#557755', skin: '#ccbb99', eye: '#ffffff', pupil: '#224422' },
  },
  {
    id: 'endgamer',
    name: 'EndGamer',
    title: 'The Patient Scholar',
    level: 7,
    dialogue: {
      before: "The opening is merely a handshake. The middlegame is just conversation. The TRUE battle happens in the endgame, when only a handful of pieces remain. I have studied every endgame position known to chess. I will see you there.",
      after: "You outplayed me in the endgame. That is not supposed to happen. I have memorized Lucena, Philidor, and the Vancura. Yet you found a path I did not see. You are a scholar as well as a warrior.",
      win: "As I predicted. You played aggressively in the opening, burned your advantages in the middlegame, and arrived at the endgame with nothing. The endgame is where preparation meets opportunity. I had both.",
    },
    gameDialogue: {
      gameStart: [
        "The opening means nothing. Let us proceed.",
        "I am waiting for the endgame.",
        "Play your opening. I will play the ending.",
        "Every move brings us closer to where I thrive."
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
        "A check. But the endgame has not begun.",
        "Premature aggression. The scholar can wait."
      ],
      bossTaunt: [
        "Studying the position at move {moveNum}. Every detail matters.",
        "Lucena, Philidor... which one applies at move {moveNum}?",
        "The endgame tables tell me everything.",
        "Patience. The position will simplify in time."
      ],
      milestone: [
        "Move {moveNum}. We approach the middlegame. Almost there.",
        "Move {moveNum}. Soon the pieces will simplify.",
        "Move {moveNum}. The real game is about to begin."
      ],
      lowHealth: [
        "Only {myPieces} pieces... but this is my strength.",
        "The endgame is here with {myPieces} pieces. Finally.",
        "With {myPieces} on the board, I see more clearly."
      ],
      playerLowHealth: [
        "You have {theirPieces} pieces. The position simplifies in my favor.",
        "Your army shrinks to {theirPieces}. My knowledge grows.",
        "The endgame belongs to the scholar. {theirPieces} pieces cannot save you."
      ],
    },
    personality: 'calm',
    theme: 'ocean',
    colors: { primary: '#5599cc', secondary: '#3377aa', skin: '#ccddcc', eye: '#ffffff', pupil: '#113355' },
  },
  {
    id: 'forkmaster',
    name: 'ForkMaster',
    title: 'The Tactician',
    level: 8,
    dialogue: {
      before: "Can you spot the fork? I can. I see three of them right now, and we have not even started. Tactics flow like water through my mind. Every piece you place is a target. Every move you make is a mistake waiting to happen.",
      after: "You avoided my forks. You sidestepped my pins. You escaped my skewers. That is rare. Most opponents are tactical roadkill by move fifteen. You must have trained specifically for me. I am impressed.",
      win: "Forked again! Your queen and rook were lined up like dominoes. Did you not see it coming? Tactics, my friend. Tactics win games. You can have all the strategy in the world, but one fork ends it all.",
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
    },
    personality: 'smug',
    theme: 'wildwest',
    colors: { primary: '#dd8844', secondary: '#bb6622', skin: '#ffcc99', eye: '#ffffff', pupil: '#553311' },
  },
  {
    id: 'checkmate',
    name: 'Checkmate',
    title: 'The Executioner',
    level: 9,
    dialogue: {
      before: "Every move brings you closer to your end. I do not play chess. I orchestrate checkmates. Your king is already marked. The only question is how many moves until the final blow. Let us begin the countdown.",
      after: "You... you dodged my traps. You survived the mating net. You found resources where there should have been none. I have executed a thousand kings, but you... you are different. The Executioner bows to you.",
      win: "Check. And mate. As foreseen. Your king is surrounded, your army scattered, your hopes crushed. There was never any doubt. The Executioner does not miss. Your soul belongs to the board now.",
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
    },
    personality: 'ominous',
    theme: 'crystal',
    colors: { primary: '#882222', secondary: '#551111', skin: '#ddbbbb', eye: '#ff4444', pupil: '#220000' },
  },
  {
    id: 'grandmasterx',
    name: 'Grandmaster X',
    title: 'The Absolute',
    level: 10,
    dialogue: {
      before: "You have climbed the mountain. You have defeated nine challengers. But reaching the summit and conquering it are different things entirely. I am not merely a chess player. I am chess itself. Make your first move. It will also be your last.",
      after: "Impossible... IMPOSSIBLE! I have not lost a game in thirty years. I have faced grandmasters, computers, and champions. Yet you... you found the truth within the lies. Chess 2.0 is yours. The throne is empty. Take it.",
      win: "You were strong. Stronger than the others. But strength without perfection is merely potential. And potential, my friend, is wasted on the dead. I am the Absolute. I was before chess, and I will be after. Rest now.",
    },
    gameDialogue: {
      gameStart: [
        "Make your first move. It will define you.",
        "The summit awaits. Begin.",
        "I am chess itself. Show me what you are.",
        "Thirty years. A thousand victories. Let us see if you change that."
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
        "Down to {myPieces}. This has not happened in thirty years.",
        "Perhaps with {myPieces} pieces left... you ARE chess."
      ],
      playerLowHealth: [
        "The summit is mine. You cling to {theirPieces} pieces.",
        "{theirPieces} pieces. Potential without perfection is wasted.",
        "The Absolute remains absolute. {myPieces} vs {theirPieces}."
      ],
    },
    personality: 'serious',
    theme: 'artdeco',
    colors: { primary: '#ffcc00', secondary: '#cc9900', skin: '#ffdd99', eye: '#ff6600', pupil: '#332200' },
  },
];
