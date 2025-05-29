module Main where

import Control.Monad
import Data.List (isSuffixOf)
import Data.Map qualified as Map
import Husk.Html (a_, concatHtml, escape, li_, ul_)
import Husk.Parser (parse)
import Husk.Renderer (render)
import System.Directory
import System.FilePath

main :: IO ()
main = do
  let contentRoot = "content"
      outputRoot = "build"
  mdFiles <- collectMdFiles contentRoot

  -- Group by directory
  let filesByDir =
        Map.fromListWith (++) $
          [(takeDirectory rel, [(full, rel)]) | (full, rel) <- mdFiles]

  -- Process each file
  forM_ mdFiles $ \(fullPath, relPath) -> do
    let outPath = outputRoot </> replaceExtension relPath "html"
        dir = takeDirectory relPath
        fileName = takeFileName relPath

    mdContent <- readFile fullPath

    -- Generate nav for index.md in each directory
    navHtml <- case fileName of
      "index.md" -> pure (show (li_ (a_ (escape "fuck") "ur-mom")))
      -- do
      --   let subPages =
      --         [ replaceExtension (takeFileName r) "html"
      --           | (_, r) <- Map.findWithDefault [] dir filesByDir,
      --             takeFileName r /= "index.md"
      --         ]
      --   pure $ generateNav subPages
      _ -> pure ""

    let finalHtml = markdownToHtml mdContent ++ navHtml ++ "die"

    ensureDirForFile outPath
    writeFile outPath finalHtml

markdownToHtml = show . render . parse

-- Recursively list all .md files in a directory
listMdFiles :: FilePath -> IO [FilePath]
listMdFiles dir = do
  contents <- listDirectory dir
  paths <- forM contents $ \name -> do
    let path = dir </> name
    isDir <- doesDirectoryExist path
    if isDir
      then listMdFiles path
      else return [path | ".md" `isSuffixOf` path]
  return (concat paths)

-- Convert a content file path to the corresponding build file path
toBuildPath :: FilePath -> FilePath
toBuildPath contentPath =
  let relative = makeRelative "content" contentPath
      htmlPath = replaceExtension relative "html"
   in "build" </> htmlPath

-- Ensure directory exists for a file path
ensureDirForFile :: FilePath -> IO ()
ensureDirForFile filePath = createDirectoryIfMissing True (takeDirectory filePath)

generateNav :: [FilePath] -> String
generateNav links =
  let baseNames = map takeBaseName links
   in show
        ( ul_
            ( concatHtml
                ( map (li_ . a_ (escape "")) baseNames
                )
            )
        )

collectMdFiles :: FilePath -> IO [(FilePath, FilePath)]
collectMdFiles base = go base
  where
    go dir = do
      entries <- listDirectory dir
      fmap concat . forM entries $ \entry -> do
        let path = dir </> entry
        isDir <- doesDirectoryExist path
        if isDir
          then go path
          else
            if ".md" `isSuffixOf` entry
              then return [(path, makeRelative base path)]
              else return []
