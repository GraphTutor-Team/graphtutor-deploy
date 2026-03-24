# 补齐 tabBar 图标：用已生成的 PNG 复制为占位
$d = $PSScriptRoot
Copy-Item "$d\tab-home.png" "$d\tab-practice.png" -Force -ErrorAction SilentlyContinue
Copy-Item "$d\tab-home.png" "$d\tab-plan.png" -Force -ErrorAction SilentlyContinue
Copy-Item "$d\tab-home.png" "$d\tab-user.png" -Force -ErrorAction SilentlyContinue
Copy-Item "$d\tab-home-active.png" "$d\tab-plan-active.png" -Force -ErrorAction SilentlyContinue
Copy-Item "$d\tab-home-active.png" "$d\tab-user-active.png" -Force -ErrorAction SilentlyContinue
Write-Host "Done. Check tab-*.png in images folder."
