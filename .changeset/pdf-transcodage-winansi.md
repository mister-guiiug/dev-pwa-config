---
'@mister-guiiug/dev-wpa-config': minor
---

`/pdf` : l'encodeur honore vraiment le WinAnsi que la fonte déclare. Le
texte passait en Latin-1 : tout point de code > 0xFF devenait « ? » — y
compris €, ’, “ ”, —, –, …, œ, ™, que CP1252 place pourtant sur les
positions 0x80–0x9F. Une table de transcodage Unicode → CP1252 couvre ces
27 caractères ; le reste (émoji, grec…) devient toujours « ? », et une
paire de substitution n'en produit qu'un seul.
