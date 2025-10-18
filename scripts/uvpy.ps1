Param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest)
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  Write-Host "[skip] 'uv' not found; install from https://github.com/astral-sh/uv"
  exit 0
}
$cmd = @("uv","run","--with",".[dev]") + $Rest
& $cmd
exit $LASTEXITCODE
