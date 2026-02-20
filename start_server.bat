@echo off
title Servidor Local - Painel de Avisos (Supabase)
cls
echo =======================================================
echo Iniciando o servidor local para o projeto...
echo =======================================================
echo.
echo Para parar o servidor, pressione CTRL + C nesta janela.
echo.
echo Se o navegador nao abrir automaticamente, acesse:
echo http://127.0.0.1:8080
echo.

:: Tenta usar o http-server via npx (Node.js)
:: -c-1 desabilita o cache para ver as mudancas instantaneamente
:: -o abre o navegador padrao automaticamente
call npx http-server . -p 8080 -c-1 -o

if %errorlevel% neq 0 (
    echo.
    echo ERRO: Nao foi possivel iniciar o servidor.
    echo Verifique se voce tem o Node.js instalado.
    echo Voce tambem pode tentar usar a extensao 'Live Server' no VS Code.
    pause
)
