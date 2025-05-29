#!/usr/bin/env sh

# abort on errors
set -e

# build
runhaskell main.hs

# navigate into the build output directory
cd build

# if you are deploying to a custom domain
#echo 'myapp.com' > CNAME

# creating a git repo in the build folder
git init
git add -A
git commit -m 'deploy'

# if you are deploying to https://<USERNAME>.github.io
git push -f git@github.com:samlyme/samlyme.github.io.git gh-pages

cd -

