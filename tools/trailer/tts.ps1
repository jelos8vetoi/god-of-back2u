$ErrorActionPreference = 'Stop'
$dir = $args[0]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
$s = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$s.Voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like '*Pavel*' } | Select-Object -First 1
"voice: " + $s.Voice.DisplayName
$lines = [IO.File]::ReadAllText((Join-Path $dir 'vo.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
foreach ($l in $lines) {
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ru-RU'><prosody rate='-12%' pitch='-12%'>" + $l[1] + "</prosody></speak>"
  $st = Await ($s.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $r = New-Object Windows.Storage.Streams.DataReader($st.GetInputStreamAt(0))
  $n = Await ($r.LoadAsync([uint32]$st.Size)) ([uint32])
  $b = New-Object byte[] $n; $r.ReadBytes($b)
  [IO.File]::WriteAllBytes((Join-Path $dir ($l[0] + '.wav')), $b)
  $l[0] + ' ' + $n + ' bytes'
}
