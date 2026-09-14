'use strict';

// User-Agent-based bot identification. This is string matching on a header
// the client fully controls, so it identifies *stated* identity, not
// *verified* identity — see bot_verified below and its comment.
//
// Ordered most-specific-first so e.g. Google-InspectionTool (which also
// contains neither "Googlebot" nor generic bot keywords issues) is matched
// before any broader pattern could shadow it.
const KNOWN_BOTS = [
  [/Google-InspectionTool/i, 'Google-InspectionTool'],
  [/Googlebot/i, 'Googlebot'],
  [/bingbot/i, 'Bingbot'],
  [/YandexBot/i, 'YandexBot'],
  [/Baiduspider/i, 'Baiduspider'],
  [/DuckDuckBot/i, 'DuckDuckBot'],
  [/DuckAssistBot/i, 'DuckAssistBot'],
  [/Applebot/i, 'Applebot'],
  [/facebookexternalhit|Facebot/i, 'Facebook crawler'],
  [/Twitterbot/i, 'Twitterbot'],
  [/LinkedInBot/i, 'LinkedInBot'],
  [/AhrefsBot/i, 'AhrefsBot'],
  [/SemrushBot/i, 'SemrushBot'],
  [/MJ12bot/i, 'MJ12bot'],
  [/\bDotBot\b/i, 'DotBot'],
  [/GPTBot/i, 'GPTBot'],
  [/OAI-SearchBot/i, 'OAI-SearchBot'],
  [/ChatGPT-User/i, 'ChatGPT-User'],
  [/ClaudeBot|Claude-Web|Claude-User|anthropic-ai/i, 'ClaudeBot'],
  [/PerplexityBot/i, 'PerplexityBot'],
  [/Bytespider/i, 'Bytespider'],
  [/PetalBot/i, 'PetalBot'],
  [/SeznamBot/i, 'SeznamBot'],
  [/Sogou/i, 'Sogou'],
  [/Exabot/i, 'Exabot'],
  [/CCBot/i, 'CCBot'],
  [/Amazonbot/i, 'Amazonbot'],
  [/Slurp/i, 'Yahoo Slurp'],
  [/YisouSpider/i, 'YisouSpider'],
  [/Screaming Frog SEO Spider/i, 'Screaming Frog'],
  [/UptimeRobot/i, 'UptimeRobot'],
  [/Pingdom/i, 'Pingdom'],
];

// Fallback for anything self-identifying as automated but not in the list
// above (long-tail SEO tools, smaller search engines, scrapers, etc.).
const GENERIC_BOT_PATTERN = /bot|crawler|spider|crawl|slurp|archiver|fetcher/i;

// Real verification (reverse DNS against the operator's domain, e.g.
// Google's documented forward-confirmed-reverse-DNS check, or matching the
// peer IP against the operator's published IP ranges) is not implemented
// here: both options need either a per-request network round trip or an
// out-of-band-refreshed IP range table, which is more than this pass needs.
// This stub keeps the field present and the extension point obvious —
// wire a real check in here later; every caller already reads
// `bot_verified` off the result, so nothing else has to change.
function verifyBot(_req, _botName) {
  return false;
}

function detectBot(userAgent, req) {
  if (!userAgent) {
    return { is_bot: false, bot_name: null, bot_detection_method: null, bot_verified: false };
  }

  for (const [pattern, name] of KNOWN_BOTS) {
    if (pattern.test(userAgent)) {
      return {
        is_bot: true,
        bot_name: name,
        bot_detection_method: 'known_signature',
        bot_verified: verifyBot(req, name),
      };
    }
  }

  if (GENERIC_BOT_PATTERN.test(userAgent)) {
    return {
      is_bot: true,
      bot_name: 'unknown',
      bot_detection_method: 'heuristic',
      bot_verified: false,
    };
  }

  return { is_bot: false, bot_name: null, bot_detection_method: null, bot_verified: false };
}

module.exports = { detectBot };
