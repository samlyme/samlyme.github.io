import Control.Monad
import Data.List
import Husk.Html (html_)
import Husk.Parser (parse)
import Husk.Renderer (render)
import System.Directory
import System.FilePath

-- Replace this with your real Markdown parser
markdownToHtml :: String -> String
markdownToHtml = show . html_ "my title" . render . parse

-- Ensure that the output directory exists
ensureDirForFile :: FilePath -> IO ()
ensureDirForFile = createDirectoryIfMissing True . takeDirectory

-- Recursively collect all .md files under `base`
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

-- Main: convert all Markdown files under /content to /build
main :: IO ()
main = do
  let inputRoot = "content"
      outputRoot = "build"
  mdFiles <- collectMdFiles inputRoot

  forM_ mdFiles $ \(fullPath, relPath) -> do
    let outputPath = outputRoot </> replaceExtension relPath "html"
    mdContent <- readFile fullPath
    let html = markdownToHtml mdContent
    ensureDirForFile outputPath
    writeFile outputPath html
    putStrLn $ "Generated " ++ outputPath
