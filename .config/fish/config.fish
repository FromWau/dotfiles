alias icat='kitty +kitten icat'

alias mirror=' sudo reflector --country AT --latest 50 --sort rate --save /etc/pacman.d/mirrorlist'

alias ls='exa --icons -a'
alias ps='procs'
alias grep='rg'
alias vim='nvim'


starship init fish | source
