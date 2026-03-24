Write-Host "== GraphTutor 本地 AI（LM Studio）自检 =="
$base = "http://localhost:1234/v1"
try {
  $r = Invoke-WebRequest "$base/models" -TimeoutSec 2 -ErrorAction Stop
  Write-Host "✅ 已检测到 LM Studio 本地服务：$base"
  Write-Host "   如需启用，请将 server/.env 配置为："
  Write-Host "   LLM_PROVIDER=OPENAI"
  Write-Host "   OPENAI_BASE_URL=$base"
  Write-Host "   OPENAI_API_KEY=lm-studio"
  Write-Host "   OPENAI_MODEL=<LM Studio中选用的模型名>"
  exit 0
} catch {}
Write-Host "⚠️  未检测到 LM Studio 本地服务。"
Write-Host "   请先安装并启动："
Write-Host "   1) 打开 LM Studio，下载如 Qwen2.5-3B-Instruct"
Write-Host "   2) Developer/Server 页面点击 Start Server"
Write-Host "   3) 然后修改 server/.env 如上，重启后端"
exit 1
