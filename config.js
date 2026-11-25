// Static fallback for GitHub Pages and other static hosts.
// server.mjs overrides this route at runtime on local/Render deployments, so
// environment variables there still take precedence.
//
// If you host the front end on GitHub Pages, set apiBaseUrl to your Render
// service URL (for example "https://toxibh-flix.onrender.com") so TMDB data is
// fetched through the server-side proxy. Leave it empty when served by Render.
window.APP_CONFIG = {
  siteName: 'Toxibh Flix',
  tmdbConfigured: false,
  apiBaseUrl: '',
  screenscape: {
    template: 'https://web.screenscape.fun/embed?tmdb={tmdbId}&type=movie&lan=eng',
    tvTemplate: 'https://web.screenscape.fun/embed?tmdb={tmdbId}&type=tv&s={s}&e={e}&lan=eng',
    configured: true,
  },
};
