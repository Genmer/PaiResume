$env:JAVA_HOME = "E:\Code\Env\jdk17"
Write-Host "JAVA_HOME = $env:JAVA_HOME"
Set-Location "e:\Code\Java\PaiResume\server"
& "E:\Code\Env\apache-maven-3.6.3\bin\mvn.cmd" spring-boot:run
