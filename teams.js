// Ratings are flavor stats (roughly 65-92), representing the strength of the
// supporting roster/defense around whichever QB you build - not official data.
const TEAMS = [
  { name: 'Buffalo Bills', abbr: 'BUF', conf: 'AFC', div: 'East', rating: 88, color: '#00338D' },
  { name: 'Miami Dolphins', abbr: 'MIA', conf: 'AFC', div: 'East', rating: 75, color: '#008E97' },
  { name: 'New York Jets', abbr: 'NYJ', conf: 'AFC', div: 'East', rating: 69, color: '#125740' },
  { name: 'New England Patriots', abbr: 'NE', conf: 'AFC', div: 'East', rating: 66, color: '#002244' },

  { name: 'Baltimore Ravens', abbr: 'BAL', conf: 'AFC', div: 'North', rating: 87, color: '#241773' },
  { name: 'Pittsburgh Steelers', abbr: 'PIT', conf: 'AFC', div: 'North', rating: 79, color: '#FFB612' },
  { name: 'Cincinnati Bengals', abbr: 'CIN', conf: 'AFC', div: 'North', rating: 82, color: '#FB4F14' },
  { name: 'Cleveland Browns', abbr: 'CLE', conf: 'AFC', div: 'North', rating: 71, color: '#FF3C00' },

  { name: 'Houston Texans', abbr: 'HOU', conf: 'AFC', div: 'South', rating: 81, color: '#A71930' },
  { name: 'Jacksonville Jaguars', abbr: 'JAX', conf: 'AFC', div: 'South', rating: 74, color: '#006778' },
  { name: 'Indianapolis Colts', abbr: 'IND', conf: 'AFC', div: 'South', rating: 72, color: '#002C5F' },
  { name: 'Tennessee Titans', abbr: 'TEN', conf: 'AFC', div: 'South', rating: 68, color: '#4B92DB' },

  { name: 'Kansas City Chiefs', abbr: 'KC', conf: 'AFC', div: 'West', rating: 90, color: '#E31837' },
  { name: 'Los Angeles Chargers', abbr: 'LAC', conf: 'AFC', div: 'West', rating: 80, color: '#0080C6' },
  { name: 'Denver Broncos', abbr: 'DEN', conf: 'AFC', div: 'West', rating: 76, color: '#FB4F14' },
  { name: 'Las Vegas Raiders', abbr: 'LV', conf: 'AFC', div: 'West', rating: 70, color: '#A5ACAF' },

  { name: 'Philadelphia Eagles', abbr: 'PHI', conf: 'NFC', div: 'East', rating: 89, color: '#004C54' },
  { name: 'Dallas Cowboys', abbr: 'DAL', conf: 'NFC', div: 'East', rating: 83, color: '#869397' },
  { name: 'Washington Commanders', abbr: 'WAS', conf: 'NFC', div: 'East', rating: 76, color: '#FFB612' },
  { name: 'New York Giants', abbr: 'NYG', conf: 'NFC', div: 'East', rating: 68, color: '#0B2265' },

  { name: 'Detroit Lions', abbr: 'DET', conf: 'NFC', div: 'North', rating: 90, color: '#0076B6' },
  { name: 'Green Bay Packers', abbr: 'GB', conf: 'NFC', div: 'North', rating: 84, color: '#FFB612' },
  { name: 'Minnesota Vikings', abbr: 'MIN', conf: 'NFC', div: 'North', rating: 79, color: '#4F2683' },
  { name: 'Chicago Bears', abbr: 'CHI', conf: 'NFC', div: 'North', rating: 75, color: '#C83803' },

  { name: 'Tampa Bay Buccaneers', abbr: 'TB', conf: 'NFC', div: 'South', rating: 78, color: '#D50A0A' },
  { name: 'Atlanta Falcons', abbr: 'ATL', conf: 'NFC', div: 'South', rating: 74, color: '#A71930' },
  { name: 'New Orleans Saints', abbr: 'NO', conf: 'NFC', div: 'South', rating: 70, color: '#D3BC8D' },
  { name: 'Carolina Panthers', abbr: 'CAR', conf: 'NFC', div: 'South', rating: 65, color: '#0085CA' },

  { name: 'San Francisco 49ers', abbr: 'SF', conf: 'NFC', div: 'West', rating: 88, color: '#AA0000' },
  { name: 'Los Angeles Rams', abbr: 'LAR', conf: 'NFC', div: 'West', rating: 82, color: '#FFA300' },
  { name: 'Seattle Seahawks', abbr: 'SEA', conf: 'NFC', div: 'West', rating: 78, color: '#69BE28' },
  { name: 'Arizona Cardinals', abbr: 'ARI', conf: 'NFC', div: 'West', rating: 71, color: '#97233F' }
];
