$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$mavenVersion = "3.9.6"
$url = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$mavenVersion/apache-maven-$mavenVersion-bin.zip"
$dest = "$env:USERPROFILE\.m2\wrapper\dists"
$zip = "$env:TEMP\maven-$mavenVersion.zip"
$mavenHome = "$dest\apache-maven-$mavenVersion"

if (Test-Path "$mavenHome\bin\mvn.cmd") {
    Write-Host "Maven $mavenVersion already installed at $mavenHome"
} else {
    Write-Host "Downloading Maven $mavenVersion..."
    Invoke-WebRequest $url -OutFile $zip
    Write-Host "Extracting..."
    if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
    Expand-Archive $zip -DestinationPath $dest -Force
    Remove-Item $zip
    Write-Host "Maven installed at $mavenHome"
}

# Add to PATH for this session
$env:PATH = "$mavenHome\bin;$env:PATH"
Write-Host "Maven added to PATH for this session."
mvn --version
