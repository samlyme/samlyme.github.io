# My website

Why did I build this in Haskell again? Because I wanted to generate my website from Markdown.

Doesn't software like Hugo already exist? Yes.

Why did you build this then?

To learn. Converting Markdown to HTML is actually non-trivial since you have to build a full AST of the Markdown document. This is the hardest part. The syntax of Markdown can be somewhat odd to parse. Then, rendering this to HTML is relatively simple.

Why Haskell? The functional nature and `data` feature allows for extremely elegant implementations of abstract syntax trees. The metalanguage features also let you Too bad I'm not competent enough to actually take advantage of these features properly.

Instead, you will see some rather cursed code in the underlying library I wrote named "husk". 

## Todo:
- Implement the file tree traversal
- Improve navigation