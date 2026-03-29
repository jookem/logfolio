export default function QuoteOfDay({ t, plList = [], streak = null }) {
  const RESILIENCE_QUOTES = [
    { content: "Every great trader was once a losing trader who refused to quit.", author: "Unknown" },
    { content: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { content: "A loss never bothers me after I take it. I forget it overnight. But being wrong and not taking the loss — that is what does the damage.", author: "Jesse Livermore" },
    { content: "Confidence is not about being right. It's about being okay with being wrong.", author: "Unknown" },
    { content: "Even the best traders are wrong half the time. What separates them is how they handle it.", author: "Unknown" },
    { content: "Your first loss is your best loss.", author: "Unknown" },
    { content: "To be a successful trader you have to be able to admit mistakes.", author: "William O'Neil" },
    { content: "Don't focus on making money; focus on protecting what you have.", author: "Paul Tudor Jones" },
    { content: "The consistency you seek is in your mind, not in the markets.", author: "Mark Douglas" },
    { content: "Small losses kept small is the hallmark of a professional trader.", author: "Unknown" },
    { content: "It's not about being perfect. It's about being consistent.", author: "Unknown" },
    { content: "Do more of what works and less of what doesn't.", author: "Steve Clark" },
  ];

  const DISCIPLINE_QUOTES = [
    { content: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { content: "A trader who is not disciplined is a trader who will not last.", author: "Mark Douglas" },
    { content: "The key to trading success is emotional discipline.", author: "Alexander Elder" },
    { content: "The market pays you to be disciplined.", author: "Unknown" },
    { content: "Your edge comes from discipline, not prediction.", author: "Unknown" },
    { content: "A good setup without discipline is just a good idea.", author: "Unknown" },
    { content: "Plan your trade and trade your plan.", author: "Unknown" },
    { content: "Trade what you see, not what you think.", author: "Unknown" },
    { content: "The hard work in trading comes in the preparation. The actual process of trading should be effortless.", author: "Jack Schwager" },
    { content: "Every battle is won before it is fought.", author: "Sun Tzu" },
    { content: "Do not anticipate and move without market confirmation.", author: "Jesse Livermore" },
    { content: "The market rewards preparation and punishes impulse.", author: "Unknown" },
  ];

  const HUMILITY_QUOTES = [
    { content: "The market will humble you the moment you think you've mastered it.", author: "Unknown" },
    { content: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
    { content: "Amateurs think about how much money they can make. Professionals think about how much money they could lose.", author: "Jack Schwager" },
    { content: "The four most dangerous words in investing are: 'This time it's different.'", author: "Sir John Templeton" },
    { content: "Good investing is boring. If you're entertained, you're probably speculating.", author: "George Soros" },
    { content: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
    { content: "The market doesn't care about your feelings.", author: "Unknown" },
    { content: "Size your positions so that a loss won't change your behavior.", author: "Unknown" },
    { content: "Losers average losers.", author: "Paul Tudor Jones" },
    { content: "I am always thinking about losing money as opposed to making money.", author: "Paul Tudor Jones" },
    { content: "In trading you have to be defensive and aggressive at the same time.", author: "Paul Tudor Jones" },
    { content: "Don't focus on making money; focus on protecting what you have.", author: "Paul Tudor Jones" },
  ];

  const FALLBACK_QUOTES = [
    { content: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
    { content: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
    { content: "The goal of a successful trader is to make the best trades. Money is secondary.", author: "Alexander Elder" },
    { content: "In trading, the impossible happens about twice a year.", author: "Henri M. Cauvin" },
    { content: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { content: "The secret to being successful from a trading perspective is to have an indefatigable and an undying and unquenchable thirst for information.", author: "Paul Tudor Jones" },
    { content: "It's not whether you're right or wrong, but how much money you make when you're right and how much you lose when you're wrong.", author: "George Soros" },
    { content: "The most important thing is to have a method for staying with your winners and cutting your losers.", author: "Michael Covel" },
    { content: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { content: "Plan your trade and trade your plan.", author: "Unknown" },
    { content: "The four most dangerous words in investing are: 'This time it's different.'", author: "Sir John Templeton" },
    { content: "The trend is your friend until the end when it bends.", author: "Ed Seykota" },
    { content: "Win or lose, everybody gets what they want out of the market.", author: "Ed Seykota" },
    { content: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
    { content: "Cut your losses quickly and let your winners run.", author: "David Ricardo" },
    { content: "Amateurs think about how much money they can make. Professionals think about how much money they could lose.", author: "Jack Schwager" },
    { content: "The hard work in trading comes in the preparation. The actual process of trading should be effortless.", author: "Jack Schwager" },
    { content: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
    { content: "The elements of good trading are: cutting losses, cutting losses, and cutting losses.", author: "Ed Seykota" },
    { content: "The market pays you to be disciplined.", author: "Unknown" },
    { content: "A good trader has no ego. You have to swallow your pride and get out of the losses.", author: "Tom Baldwin" },
    { content: "The key to trading success is emotional discipline.", author: "Alexander Elder" },
    { content: "Opportunities come infrequently. When it rains gold, put out the bucket, not the thimble.", author: "Warren Buffett" },
    { content: "Cut your losses short and let your winners run.", author: "David Ricardo" },
    { content: "Wide diversification is only required when investors do not understand what they are doing.", author: "Warren Buffett" },
    { content: "The individual investor should act consistently as an investor and not as a speculator.", author: "Benjamin Graham" },
    { content: "In the short run, the market is a voting machine, but in the long run, it is a weighing machine.", author: "Benjamin Graham" },
    { content: "Markets are constantly in a state of uncertainty and flux and money is made by discounting the obvious and betting on the unexpected.", author: "George Soros" },
    { content: "Losers average losers.", author: "Paul Tudor Jones" },
    { content: "Don't focus on making money; focus on protecting what you have.", author: "Paul Tudor Jones" },
    { content: "A trader who is not disciplined is a trader who will not last.", author: "Mark Douglas" },
    { content: "The consistency you seek is in your mind, not in the markets.", author: "Mark Douglas" },
    { content: "Every battle is won before it is fought.", author: "Sun Tzu" },
    { content: "He who knows when he can fight and when he cannot will be victorious.", author: "Sun Tzu" },
    { content: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
    { content: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
    { content: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
    { content: "Know what you own, and know why you own it.", author: "Peter Lynch" },
    { content: "The time of maximum pessimism is the best time to buy.", author: "Sir John Templeton" },
    { content: "Investing without research is like playing poker without looking at your cards.", author: "Peter Lynch" },
    { content: "The intelligent investor is a realist who sells to optimists and buys from pessimists.", author: "Benjamin Graham" },
    { content: "Behind every stock is a company. Find out what it's doing.", author: "Peter Lynch" },
    { content: "A peak performance trader is totally committed to being the best and doing whatever it takes.", author: "Van K. Tharp" },
    { content: "Trade the market in front of you, not the one you want.", author: "Unknown" },
    { content: "The market will pay you back for your patience.", author: "Unknown" },
    { content: "Good investing is boring. If you're entertained, you're probably speculating.", author: "George Soros" },
    { content: "The most contrarian thing of all is not to oppose the crowd but to think for yourself.", author: "Peter Thiel" },
    { content: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { content: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
    { content: "Do not anticipate and move without market confirmation.", author: "Jesse Livermore" },
    { content: "There is only one side to the stock market and it is not the bull side or the bear side, but the right side.", author: "Jesse Livermore" },
    { content: "Markets are never wrong, opinions often are.", author: "Jesse Livermore" },
    { content: "It was never my thinking that made big money for me. It was always my sitting.", author: "Jesse Livermore" },
    { content: "Wall Street never changes. The pockets change, the suckers change, but Wall Street never changes.", author: "Jesse Livermore" },
    { content: "I made my money by selling too soon.", author: "Bernard Baruch" },
    { content: "Never follow the crowd.", author: "Bernard Baruch" },
    { content: "Do more of what works and less of what doesn't.", author: "Steve Clark" },
    { content: "Every trader has strengths and weaknesses. Know yours.", author: "Unknown" },
    { content: "Confidence is not about being right. It's about being okay with being wrong.", author: "Unknown" },
    { content: "A loss never bothers me after I take it. I forget it overnight. But being wrong and not taking the loss — that is what does the damage.", author: "Jesse Livermore" },
    { content: "To be a successful trader you have to be able to admit mistakes.", author: "William O'Neil" },
    { content: "The whole secret to winning in the stock market is to lose the least amount possible when you're not right.", author: "William O'Neil" },
    { content: "Buy the best and forget the rest.", author: "Unknown" },
    { content: "Protect your capital as if it were your life.", author: "Unknown" },
    { content: "Your first loss is your best loss.", author: "Unknown" },
    { content: "Never let a winner turn into a loser.", author: "Unknown" },
    { content: "Trade what you see, not what you think.", author: "Unknown" },
    { content: "Patience is the most powerful edge in trading.", author: "Unknown" },
    { content: "The market rewards preparation and punishes impulse.", author: "Unknown" },
    { content: "Small losses kept small is the hallmark of a professional trader.", author: "Unknown" },
    { content: "Size your positions so that a loss won't change your behavior.", author: "Unknown" },
    { content: "The best trade is sometimes no trade.", author: "Unknown" },
    { content: "Fear and greed are the two enemies of rational investing.", author: "Unknown" },
    { content: "You don't have to be in the market every day.", author: "Unknown" },
    { content: "Preparation is the foundation of all profitable trading.", author: "Unknown" },
    { content: "Never risk more than you can afford to lose emotionally.", author: "Unknown" },
    { content: "The market is a mirror of human psychology.", author: "Unknown" },
    { content: "It's not about being perfect. It's about being consistent.", author: "Unknown" },
    { content: "Even the best traders are wrong half the time. What separates them is how they handle it.", author: "Unknown" },
    { content: "Volatility is the price you pay for returns.", author: "Unknown" },
    { content: "Every great trader was once a losing trader who refused to quit.", author: "Unknown" },
    { content: "Your edge comes from discipline, not prediction.", author: "Unknown" },
    { content: "A trading journal is a trader's most powerful tool.", author: "Unknown" },
    { content: "Review your trades as if someone else made them.", author: "Unknown" },
    { content: "The market doesn't care about your feelings.", author: "Unknown" },
    { content: "Simplicity is the ultimate sophistication in trading.", author: "Unknown" },
    { content: "Master one setup before learning another.", author: "Unknown" },
    { content: "The less you trade, the more you may earn.", author: "Unknown" },
    { content: "Price action is the purest form of market information.", author: "Unknown" },
    { content: "Risk management is not optional. It is the job.", author: "Unknown" },
    { content: "The market will humble you the moment you think you've mastered it.", author: "Unknown" },
    { content: "Great traders think in probabilities, not certainties.", author: "Unknown" },
    { content: "A good setup without discipline is just a good idea.", author: "Unknown" },
    { content: "The best investment you can make is in yourself.", author: "Warren Buffett" },
    { content: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { content: "Success is where preparation and opportunity meet.", author: "Bobby Unser" },
    { content: "Forecasts may tell you a great deal about the forecaster; they tell you nothing about the future.", author: "Warren Buffett" },
    { content: "Diversification is protection against ignorance.", author: "Warren Buffett" },
    { content: "The market is a pendulum that forever swings between unsustainable optimism and unjustified pessimism.", author: "Benjamin Graham" },
    { content: "The investor's chief problem — and even his worst enemy — is likely to be himself.", author: "Benjamin Graham" },
    { content: "Bull markets are born on pessimism, grown on skepticism, mature on optimism, and die on euphoria.", author: "Sir John Templeton" },
    { content: "Compound interest is the eighth wonder of the world.", author: "Albert Einstein" },
    { content: "The most important quality for an investor is temperament, not intellect.", author: "Warren Buffett" },
    { content: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
    { content: "The single greatest edge an investor can have is a long-term orientation.", author: "Seth Klarman" },
    { content: "Value investing is at its core the marriage of a contrarian streak and a calculator.", author: "Seth Klarman" },
    { content: "Successful investing is anticipating the anticipations of others.", author: "John Maynard Keynes" },
    { content: "In trading you have to be defensive and aggressive at the same time.", author: "Paul Tudor Jones" },
    { content: "I am always thinking about losing money as opposed to making money.", author: "Paul Tudor Jones" },
    { content: "Trading is a mental game. Master your mind and you master the market.", author: "Unknown" },
    { content: "The goal is not to be right. The goal is to make money.", author: "Unknown" },
    { content: "Every day the market gives you an opportunity. The question is whether you're ready.", author: "Unknown" },
    { content: "The market is the ultimate teacher. Pay attention to its lessons.", author: "Unknown" },
  ];

  // Determine category from performance context
  const recentMistakes = plList.slice(-10).filter(tr => tr.mistake && tr.mistake !== "None").length;
  let pool, label;
  if (streak?.type === "L" && streak?.count >= 3) {
    pool = RESILIENCE_QUOTES;
    label = "Bounce Back";
  } else if (streak?.type === "W" && streak?.count >= 5) {
    pool = HUMILITY_QUOTES;
    label = "Stay Humble";
  } else if (recentMistakes >= 3) {
    pool = DISCIPLINE_QUOTES;
    label = "Stay Disciplined";
  } else {
    pool = FALLBACK_QUOTES;
    label = "Quote of the Day";
  }

  const quote = pool[Math.floor(Date.now() / 86400000) % pool.length];

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
        position: "relative",
      }}
    >
      <div style={{
        fontSize: 10, color: t.accent, fontFamily: "'Space Mono',monospace",
        textTransform: "uppercase", letterSpacing: 2, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: t.text2, lineHeight: 1.6, fontStyle: "italic", marginBottom: 8 }}>
        "{quote.content}"
      </div>
      <div style={{ fontSize: 11, color: t.text3, fontFamily: "'Space Mono',monospace" }}>
        — {quote.author}
      </div>
    </div>
  );
}
