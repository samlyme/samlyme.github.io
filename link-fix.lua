-- link-fix.lua
-- Rewrite any link target ending in “.md” to “.html”
function Link(el)
  local t = el.target
  if t:match("%.md$") then
    el.target = t:gsub("%.md$", ".html")
  end
  return el
end