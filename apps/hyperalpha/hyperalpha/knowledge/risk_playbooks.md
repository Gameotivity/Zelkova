# Risk Management Playbooks

## Position Sizing
- Never risk more than 2% of equity on a single trade
- Use Kelly Criterion: f* = (p * b - q) / b, then use Half-Kelly for crypto
- Scale position size inversely with volatility (ATR)
- Reduce size when win rate drops below 50%

## Stop Loss Rules
- Every trade MUST have a stop loss before entry
- Place stops at technical levels (below support, above resistance)
- Use 2x ATR for trend following, 1x ATR for mean reversion
- Never widen a stop loss after entry
- Move stop to breakeven after 1R profit

## Leverage Guidelines
- MVP: 1x only (spot equivalent)
- Never use leverage above max_leverage setting
- Reduce leverage in high volatility environments (ATR > 2x average)
- No leverage on low-confidence trades (below 60%)

## Circuit Breakers
- Daily loss limit: 5% of starting equity -> pause all trading
- Portfolio drawdown: 15% from peak -> emergency stop all agents
- Consecutive losses: 5 in a row -> pause for cooldown period
- Single position: never exceed 50% of available equity

## Market Regime Rules
- Trending (Hurst > 0.6): Use momentum strategies, wider stops
- Ranging (Hurst < 0.4): Use mean reversion, tighter stops
- High volatility (ATR spike): Reduce position sizes 50%
- Low liquidity (wide spreads): Skip the trade entirely

## Correlation Risk
- Max 70% portfolio in correlated assets
- BTC and ETH are highly correlated (>0.8)
- Don't go long BTC and long ETH simultaneously at full size
- Hedge when correlation breaks down unexpectedly
