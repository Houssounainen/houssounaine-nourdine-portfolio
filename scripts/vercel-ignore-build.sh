#!/usr/bin/env bash
set -u

if [ "${VERCEL_PROJECT_PRODUCTION_URL:-}" != "houssounainenourdine.vercel.app" ]; then
  exit 0
fi

if git diff --quiet HEAD^ HEAD --   index.html   classique   v2   assets   robots.txt   site.webmanifest   sitemap.xml   vercel.json   scripts/vercel-ignore-build.sh
then
  exit 0
fi

exit 1
