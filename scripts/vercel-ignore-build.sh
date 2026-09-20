#!/usr/bin/env bash
set -u

if [ "${VERCEL_PROJECT_PRODUCTION_URL:-}" != "houssounainenourdine.vercel.app" ]; then
  exit 0
fi

if git diff --quiet HEAD^ HEAD --   index.html   styles.css   script.js   motion.css   motion.js   association.css   association.js   assets   robots.txt   site.webmanifest   sitemap.xml   vercel.json   scripts/vercel-ignore-build.sh
then
  exit 0
fi

exit 1
