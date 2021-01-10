set rtp+=/usr/bin/fzf
call plug#begin()

Plug 'dense-analysis/ale'
Plug 'vim-airline/vim-airline'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'preservim/nerdtree'
Plug 'kaicataldo/material.vim'

call plug#end()

if (has('termguicolors'))
  set termguicolors
endif

let g:material_theme_style = 'darker'
let g:airline_theme = 'material'
colorscheme material

set encoding=utf-8

set number

" 2spc tabs
set tabstop=2
set shiftwidth=2
set expandtab

" Enable folding
set foldmethod=indent
set foldlevel=99

" Listchars
set list listchars=tab:»·,trail:·,nbsp:·

" ALE - https://github.com/dense-analysis/ale
let g:ale_linters = {
\ "javascript": ['eslint'],
\ "python": ['flake8'],
\}
let g:ale_linters_explicit = 1
" Only run linters on save.
let g:ale_lint_on_text_changed = 'never'
let g:ale_lint_on_insert_leave = 0
" Don't run linters on opening file
let g:ale_lint_on_enter = 0
let g:ale_fixers = {
\ "javascript": ["prettier"],
\ "css": ["prettier"],
\ "python": ["black"],
\}
let g:ale_fix_on_save = 1
let g:ale_fix_on_enter = 0

" ALE + Airline integration
let g:airline#extensions#ale#enabled = 1

" Shortcuts
let mapleader=","

  " Reload conf with ,sc
  nnoremap <silent> <leader>sc :source $MYVIMRC<CR>

  " switch panes with leader+<arrow/hjkl>
  map <silent> <leader><up> <C-w><up>
  map <silent> <leader>k <C-w><up>
  map <silent> <leader><down> <C-w><down>
  map <silent> <leader>j <C-w><down>
  map <silent> <leader><left> <C-w><left>
  map <silent> <leader>h <C-w><left>
  map <silent> <leader><right> <C-w><right>
  map <silent> <leader>l <C-w><right>

  " NERDTree
  nnoremap <silent> <leader>m :NERDTreeToggle<CR>

  command! -bang UserFiles call fzf#vim#files('~', <bang>0)

  " open fzf with Ctrl+P
  nnoremap <C-p> :UserFiles<Cr>
