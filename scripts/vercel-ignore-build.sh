#!/usr/bin/env bash
set -u

# Identifier le portfolio par ses fichiers, indépendamment du compte Vercel.
if [ ! -f index.html ] || [ ! -d v2 ]; then
  exit 0
fi

if git diff --quiet HEAD^ HEAD --   index.html   classique   v2   projets   assets   robots.txt   site.webmanifest   sitemap.xml   vercel.json   scripts/vercel-ignore-build.sh
then
  exit 0
fi

exit 1
