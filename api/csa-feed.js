export default function handler(req, res) {
  const now = new Date().toISOString();

  const tickers = [
    "BTC/CAD", "ETH/CAD", "SOL/CAD", "USDC/CAD", "XRP/CAD", "DOGE/CAD",
    "ADA/CAD", "SHIB/CAD", "AVAX/CAD", "DOT/CAD", "BCH/CAD", "LINK/CAD",
    "POL/CAD", "NEAR/CAD", "LTC/CAD", "ICP/CAD", "DAI/CAD", "UNI/CAD",
    "FIL/CAD", "ETC/CAD", "ATOM/CAD", "XLM/CAD", "ARB/CAD", "MKR/CAD",
    "HBAR/CAD", "INJ/CAD", "OP/CAD", "GRT/CAD", "PEPE/CAD", "LDO/CAD",
    "TIA/CAD", "SEI/CAD", "ALGO/CAD", "AAVE/CAD", "AXS/CAD", "CHZ/CAD",
    "XTZ/CAD", "BONK/CAD", "WLD/CAD", "EOS/CAD", "MANA/CAD", "APE/CAD",
    "CRV/CAD", "1INCH/CAD", "COMP/CAD", "BAT/CAD", "DASH/CAD", "LRC/CAD",
    "WBTC/CAD", "YFI/CAD", "SUSHI/CAD", "WIF/CAD", "GALA/CAD", "RENDER/CAD",
    "EIGEN/CAD", "FLOKI/CAD", "JUP/CAD", "PYTH/CAD", "TRUMP/CAD", "TON/CAD",
    "SUI/CAD", "BERA/CAD", "PENGU/CAD", "PUMP/CAD"
  ];

  const data = tickers.map(ticker => ({
    ticker,
    midPrice: 0,
    bidPrice: 0,
    askPrice: 0,
    lastPrice: 0,
    open24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    vwap24h: 0,
    tradeCount24h: 0
  }));

  res.status(200).json({
    asOf: now,
    exchange: "Coinsquare",
    instrumentType: "SPOT",
    tickers: data
  });
}
