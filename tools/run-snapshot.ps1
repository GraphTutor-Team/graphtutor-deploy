# 运行快照脚本
$scriptPath = Join-Path $PSScriptRoot "snapshot.mjs"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
node $scriptPath

