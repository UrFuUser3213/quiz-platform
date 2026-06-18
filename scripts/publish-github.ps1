# Публикация QuizLive на GitHub
# Требования: GitHub CLI (gh) и авторизация: gh auth login

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Установите GitHub CLI: winget install GitHub.cli"
    Write-Host "Затем: gh auth login"
    exit 1
}

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Выполните: gh auth login"
    exit 1
}

$repoName = "quiz-platform"
$visibility = "public"

Write-Host "Создаю репозиторий $repoName на GitHub..."
gh repo create $repoName --source=. --public --remote=origin --description "QuizLive — платформа интерактивных квизов в реальном времени" --push

if ($LASTEXITCODE -eq 0) {
    $url = gh repo view --json url -q .url
    Write-Host ""
    Write-Host "Готово: $url"
    Write-Host "Добавьте ссылку в docs/REPORT.md"
}
